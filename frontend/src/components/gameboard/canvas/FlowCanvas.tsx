import { useCallback, useMemo, useRef } from 'react'
import { ReactFlow, ReactFlowProvider, Background, useReactFlow, ConnectionMode } from '@xyflow/react'
import type { Node, Edge, NodeChange } from '@xyflow/react'
import { useGameStore } from '@/store/useGameStore'
import { InternetNode } from './nodes/InternetNode'
import { IgwNode } from './nodes/IgwNode'
import { VpcNode } from './nodes/VpcNode'
import { SubnetNode } from './nodes/SubnetNode'
import { ServiceNode } from './nodes/ServiceNode'
import { TrafficEdge } from './edges/TrafficEdge'
import type { TrafficAnimationConfig } from '@/types/game'
import {
  SLOT_START_X,
  SLOT_START_Y,
  SLOTS_PER_ROW,
  SLOT_WIDTH,
  SLOT_HEIGHT,
  SUBNET_WIDTH,
  SUBNET_HEIGHT,
  getSlotPosition,
  type SubnetNodeData,
  type ServiceNodeData,
} from '@/types/game'

const SUBNET_IDS = ['public-subnet', 'private-subnet']

function getAbsoluteNodePosition(nodeId: string, allNodes: Node[]): { x: number; y: number } {
  const node = allNodes.find(n => n.id === nodeId)
  if (!node) return { x: 0, y: 0 }
  if (!node.parentId) return { x: node.position.x, y: node.position.y }
  const parentPos = getAbsoluteNodePosition(node.parentId, allNodes)
  return { x: parentPos.x + node.position.x, y: parentPos.y + node.position.y }
}

// Perpendicular distance from point P to segment AB
function distanceToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(px - ax, py - ay)
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

// Fallback for edges where DOM hit-detection misses (e.g. both endpoints inside the same subnet).
// Uses straight-line approximation between node centres; threshold is in flow-coordinate pixels.
function findNearestEdge(
  flowPos: { x: number; y: number },
  edges: Edge[],
  allNodes: Node[],
  threshold = 25,
): Edge | null {
  // Approximate node centre offsets (service node is ~60x80 px in flow coords)
  const CX = 30, CY = 40
  let best: Edge | null = null
  let bestDist = threshold
  for (const edge of edges) {
    const src = getAbsoluteNodePosition(edge.source, allNodes)
    const tgt = getAbsoluteNodePosition(edge.target, allNodes)
    const dist = distanceToSegment(
      flowPos.x, flowPos.y,
      src.x + CX, src.y + CY,
      tgt.x + CX, tgt.y + CY,
    )
    if (dist < bestDist) { bestDist = dist; best = edge }
  }
  return best
}

interface DragPayload {
  serviceType: ServiceNodeData['serviceType']
  iconSrc: string
  label: string
  tooltip: string
}

function extractDragPayload(e: React.DragEvent, validServiceTypes: Set<string>): DragPayload | null {
  const serviceType = e.dataTransfer.getData('serviceType')
  const iconSrc = e.dataTransfer.getData('iconSrc')
  const label = e.dataTransfer.getData('label')
  const tooltip = e.dataTransfer.getData('tooltip')
  if (
    !serviceType ||
    !validServiceTypes.has(serviceType) ||
    !iconSrc.startsWith('/aws-icons/')
  ) return null
  return { serviceType: serviceType as ServiceNodeData['serviceType'], iconSrc, label, tooltip }
}

interface MidEdgeResult {
  insertSlot: number
  slotsToShift: Array<{ nodeId: string; to: number }>
}

function resolveMidEdgeInsertion(
  edge: Edge,
  allNodes: Node[],
  occupied: Record<number, string>,
): MidEdgeResult | null {
  const targetNode = allNodes.find(n => n.id === edge.target)
  if (!targetNode) return null

  const targetData = targetNode.data as ServiceNodeData
  const targetSlot = typeof targetData.slotIndex === 'number' ? targetData.slotIndex : -1

  let insertSlot = -1
  const slotsToShift: Array<{ nodeId: string; to: number }> = []

  if (targetSlot >= 0) {
    const targetRow = Math.floor(targetSlot / SLOTS_PER_ROW)
    const targetCol = targetSlot % SLOTS_PER_ROW
    const slotBefore = targetCol > 0 ? targetRow * SLOTS_PER_ROW + (targetCol - 1) : -1

    if (slotBefore >= 0 && !(slotBefore in occupied)) {
      // Free slot immediately before target - use it, no shift needed
      insertSlot = slotBefore
    } else {
      // Cascade push: find first free slot to the right in the same row
      const rowEnd = targetRow * SLOTS_PER_ROW + (SLOTS_PER_ROW - 1)
      let freeSlot = -1
      for (let s = targetSlot + 1; s <= rowEnd; s++) {
        if (!(s in occupied)) { freeSlot = s; break }
      }
      if (freeSlot >= 0) {
        // Build shift list right-to-left so each move doesn't clobber the next
        for (let s = freeSlot - 1; s >= targetSlot; s--) {
          if (s in occupied) slotsToShift.push({ nodeId: occupied[s], to: s + 1 })
        }
        insertSlot = targetSlot
      }
    }
  }

  // Fallback: targetSlot unknown, or entire row was full - try any free slot
  if (insertSlot < 0) {
    insertSlot = Array.from({ length: SLOTS_PER_ROW * 2 }, (_, i) => i).find(i => !(i in occupied)) ?? -1
  }

  if (insertSlot < 0) return null
  return { insertSlot, slotsToShift }
}

interface SubnetDropResult {
  subnetId: string
  slotIndex: number
}

function resolveSubnetDrop(
  flowPos: { x: number; y: number },
  allNodes: Node[],
): SubnetDropResult | null {
  for (const subnetId of SUBNET_IDS) {
    const subnetNode = allNodes.find(n => n.id === subnetId)
    if (!subnetNode) continue

    const absPos = getAbsoluteNodePosition(subnetId, allNodes)

    if (
      flowPos.x >= absPos.x &&
      flowPos.x <= absPos.x + SUBNET_WIDTH &&
      flowPos.y >= absPos.y &&
      flowPos.y <= absPos.y + SUBNET_HEIGHT
    ) {
      const relX = flowPos.x - absPos.x
      const relY = flowPos.y - absPos.y
      const col = Math.floor((relX - SLOT_START_X) / SLOT_WIDTH)
      const row = Math.floor((relY - SLOT_START_Y) / SLOT_HEIGHT)

      if (col < 0 || col >= SLOTS_PER_ROW || row < 0 || row > 1) return null

      const slotIndex = row * SLOTS_PER_ROW + col
      const occupied = (subnetNode.data as SubnetNodeData).occupiedSlots
      if (slotIndex in occupied) return null

      return { subnetId, slotIndex }
    }
  }
  return null
}

// Like resolveSubnetDrop but does NOT reject occupied slots.
// Used by onNodeDragStop so it can decide what to do with an occupied target.
function resolveSubnetSlot(
  flowPos: { x: number; y: number },
  allNodes: Node[],
): SubnetDropResult | null {
  for (const subnetId of SUBNET_IDS) {
    const subnetNode = allNodes.find(n => n.id === subnetId)
    if (!subnetNode) continue

    const absPos = getAbsoluteNodePosition(subnetId, allNodes)

    if (
      flowPos.x >= absPos.x &&
      flowPos.x <= absPos.x + SUBNET_WIDTH &&
      flowPos.y >= absPos.y &&
      flowPos.y <= absPos.y + SUBNET_HEIGHT
    ) {
      const relX = flowPos.x - absPos.x
      const relY = flowPos.y - absPos.y
      const col = Math.floor((relX - SLOT_START_X) / SLOT_WIDTH)
      const row = Math.floor((relY - SLOT_START_Y) / SLOT_HEIGHT)

      if (col < 0 || col >= SLOTS_PER_ROW || row < 0 || row > 1) return null

      const slotIndex = row * SLOTS_PER_ROW + col
      return { subnetId, slotIndex }
    }
  }
  return null
}

interface FlowCanvasProps {
  animateAllEdges?: boolean
  trafficAnimation?: TrafficAnimationConfig
}

export const nodeTypes = {
  internetNode: InternetNode,
  igwNode: IgwNode,
  vpcNode: VpcNode,
  subnetNode: SubnetNode,
  serviceNode: ServiceNode,
}

export const edgeTypes = {
  trafficEdge: TrafficEdge,
}

function FlowCanvasInner({ animateAllEdges = false, trafficAnimation }: FlowCanvasProps) {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useGameStore()
  const removeNode = useGameStore(s => s.removeNode)
  const sidebarItems = useGameStore(s => s.sidebarItems)
  const validServiceTypes = useMemo(() => new Set(sidebarItems.map(i => i.serviceType)), [sidebarItems])

  // React Flow's built-in deleteKeyCode fires onNodesChange({ type:'remove' }) which goes
  // through applyNodeChanges - skipping our custom removeNode that clears occupiedSlots.
  // Intercept here: handle removes manually, pass everything else through unchanged.
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    const removes = changes.filter(c => c.type === 'remove')
    const rest = changes.filter(c => c.type !== 'remove')
    for (const change of removes) {
      const node = useGameStore.getState().nodes.find(n => n.id === change.id)
      if (node?.type === 'serviceNode') removeNode(change.id)
    }
    if (rest.length) onNodesChange(rest)
  }, [onNodesChange, removeNode])

  const displayEdges = edges.map(e => ({
    ...e,
    type: 'trafficEdge',
    data: animateAllEdges
      ? { ...e.data, isAnimating: true, trafficAnimation }
      : e.data,
  }))
  const { screenToFlowPosition } = useReactFlow()
  const addServiceNode = useGameStore(s => s.addServiceNode)
  const splitEdge = useGameStore(s => s.splitEdge)
  const moveNodeToSlot = useGameStore(s => s.moveNodeToSlot)
  const moveNodeToSubnet = useGameStore(s => s.moveNodeToSubnet)

  // Tracks which React Flow edge (by id) the cursor is directly over during a drag.
  // Populated via React Flow's official onEdgeMouseEnter/Leave events - no DOM coupling.
  const hoveredEdgeRef = useRef<string | null>(null)

  const onNodeDragStop = useCallback((_event: MouseEvent | TouchEvent, node: Node) => {
    if (node.type !== 'serviceNode') return
    const allNodes = useGameStore.getState().nodes
    const oldSlotIndex = (node.data as ServiceNodeData).slotIndex

    const absolutePos = getAbsoluteNodePosition(node.id, allNodes)
    const result = resolveSubnetSlot(absolutePos, allNodes)

    if (!result) {
      // Dropped outside any valid subnet slot - snap back
      moveNodeToSlot(node.id, oldSlotIndex)
      return
    }

    if (result.subnetId !== node.parentId) {
      // Cross-subnet move: find a free slot in the target subnet
      const targetSubnetNode = allNodes.find(n => n.id === result.subnetId)
      if (!targetSubnetNode) {
        moveNodeToSlot(node.id, oldSlotIndex)
        return
      }
      const occupied = (targetSubnetNode.data as SubnetNodeData).occupiedSlots
      let targetSlot = result.slotIndex
      if (targetSlot in occupied) {
        // Exact drop slot is taken - find first free slot in target subnet
        const totalSlots = SLOTS_PER_ROW * 2
        const freeSlot = Array.from({ length: totalSlots }, (_, i) => i).find(i => !(i in occupied))
        if (freeSlot === undefined) {
          // Target subnet is full - snap back
          moveNodeToSlot(node.id, oldSlotIndex)
          return
        }
        targetSlot = freeSlot
      }
      moveNodeToSubnet(node.id, result.subnetId, targetSlot)
    } else {
      // Intra-subnet move
      const subnetNode = allNodes.find(n => n.id === node.parentId)
      if (!subnetNode) return
      const occupied = (subnetNode.data as SubnetNodeData).occupiedSlots
      if (result.slotIndex in occupied && occupied[result.slotIndex] !== node.id) {
        // Target slot is occupied by another node - snap back
        moveNodeToSlot(node.id, oldSlotIndex)
        return
      }
      moveNodeToSlot(node.id, result.slotIndex)
    }
  }, [moveNodeToSlot, moveNodeToSubnet])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'

    // Walk up from the element under the cursor to find a React Flow edge group.
    // React Flow renders edge groups as <g class="react-flow__edge" data-id="...">
    // with a wide transparent interaction path, so this is a reliable hit area.
    // NOTE: onEdgeMouseEnter/Leave cannot be used here - they don't fire during HTML drags.
    let el = document.elementFromPoint(e.clientX, e.clientY)
    while (el && !el.classList.contains('react-flow__edge')) {
      el = el.parentElement
    }
    hoveredEdgeRef.current = el?.getAttribute('data-id') ?? null
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const payload = extractDragPayload(e, validServiceTypes)
    if (!payload) return
    const { serviceType, iconSrc, label, tooltip } = payload
    const extraHandles = sidebarItems.find(i => i.serviceType === serviceType)?.extraHandles

    const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    const nodeId = `${serviceType}-${Date.now()}`
    const allNodes = useGameStore.getState().nodes

    // --- Mid-edge insertion ---
    // Primary: DOM hit-detection (works for edges that cross subnet boundaries).
    // Fallback: proximity check for intra-subnet edges whose slot <div>s intercept elementFromPoint.
    let hoveredEdgeId = hoveredEdgeRef.current
    if (!hoveredEdgeId) {
      const allEdges = useGameStore.getState().edges
      const nearest = findNearestEdge(flowPos, allEdges, allNodes)
      if (nearest) hoveredEdgeId = nearest.id
    }
    if (hoveredEdgeId) {
      const edge = useGameStore.getState().edges.find(ed => ed.id === hoveredEdgeId)
      if (edge) {
        const targetNode = allNodes.find(n => n.id === edge.target)
        if (targetNode?.parentId && SUBNET_IDS.includes(targetNode.parentId)) {
          const subnetNode = allNodes.find(n => n.id === targetNode.parentId)
          if (subnetNode) {
            const occupied = (subnetNode.data as SubnetNodeData).occupiedSlots
            const result = resolveMidEdgeInsertion(edge, allNodes, occupied)
            if (result) {
              for (const shift of result.slotsToShift) moveNodeToSlot(shift.nodeId, shift.to)
              addServiceNode({
                id: nodeId, type: 'serviceNode',
                position: getSlotPosition(result.insertSlot),
                parentId: targetNode.parentId, draggable: true,
                data: { serviceType, label, iconSrc, tooltip, slotIndex: result.insertSlot, extraHandles },
              })
              splitEdge(edge.id, nodeId)
              return
            }
          }
        }
        // Geometric midpoint fallback (target not in subnet, or subnet full)
        const srcAbs = getAbsoluteNodePosition(edge.source, allNodes)
        const tgtAbs = getAbsoluteNodePosition(edge.target, allNodes)
        addServiceNode({
          id: nodeId, type: 'serviceNode',
          position: { x: (srcAbs.x + tgtAbs.x) / 2 - 30, y: (srcAbs.y + tgtAbs.y) / 2 - 40 },
          draggable: true,
          data: { serviceType, label, iconSrc, tooltip, slotIndex: -1, extraHandles },
        })
        splitEdge(edge.id, nodeId)
        return
      }
    }

    // --- Plain subnet drop ---
    const subnetDrop = resolveSubnetDrop(flowPos, allNodes)
    if (subnetDrop) {
      addServiceNode({
        id: nodeId, type: 'serviceNode',
        position: getSlotPosition(subnetDrop.slotIndex),
        parentId: subnetDrop.subnetId, draggable: true,
        data: { serviceType, label, iconSrc, tooltip, slotIndex: subnetDrop.slotIndex, extraHandles },
      })
    }
  }, [screenToFlowPosition, addServiceNode, splitEdge, moveNodeToSlot, validServiceTypes, sidebarItems])

  return (
    <ReactFlow
      nodes={nodes}
      edges={displayEdges}
      deleteKeyCode={['Backspace', 'Delete']}
      onNodesChange={handleNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      connectionMode={ConnectionMode.Loose}
      onNodeDragStop={onNodeDragStop}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      defaultEdgeOptions={{ type: 'trafficEdge' }}
      panOnDrag={false}
      zoomOnScroll={false}
      zoomOnPinch={false}
      zoomOnDoubleClick={false}
      panOnScroll={false}
      preventScrolling={false}
      fitView
      fitViewOptions={{ padding: 0.15 }}
      className="bg-background"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <Background />
    </ReactFlow>
  )
}

export function FlowCanvas({ animateAllEdges = false, trafficAnimation }: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner animateAllEdges={animateAllEdges} trafficAnimation={trafficAnimation} />
    </ReactFlowProvider>
  )
}
