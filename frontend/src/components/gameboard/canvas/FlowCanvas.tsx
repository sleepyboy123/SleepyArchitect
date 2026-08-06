import { useCallback, useRef } from 'react'
import { ReactFlow, ReactFlowProvider, Background, useReactFlow } from '@xyflow/react'
import type { Node, Edge } from '@xyflow/react'
import { useGameStore } from '@/store/useGameStore'
import { InternetNode } from './nodes/InternetNode'
import { IgwNode } from './nodes/IgwNode'
import { VpcNode } from './nodes/VpcNode'
import { SubnetNode } from './nodes/SubnetNode'
import { ServiceNode } from './nodes/ServiceNode'
import { TrafficEdge } from './edges/TrafficEdge'
import {
  SLOT_START_X,
  SLOT_START_Y,
  SLOTS_PER_ROW,
  SLOT_WIDTH,
  SLOT_HEIGHT,
  SUBNET_WIDTH,
  SUBNET_HEIGHT,
  SIDEBAR_ITEMS,
  getSlotPosition,
  type SubnetNodeData,
  type ServiceNodeData,
} from '@/types/game'

const VALID_SERVICE_TYPES = new Set(SIDEBAR_ITEMS.map(i => i.serviceType))
const SUBNET_IDS = ['public-subnet', 'private-subnet']

// Still needed for the geometric midpoint fallback (non-subnet edges)
function getAbsoluteNodePosition(nodeId: string, allNodes: Node[]): { x: number; y: number } {
  const node = allNodes.find(n => n.id === nodeId)
  if (!node) return { x: 0, y: 0 }
  if (!node.parentId) return { x: node.position.x, y: node.position.y }
  const parentPos = getAbsoluteNodePosition(node.parentId, allNodes)
  return { x: parentPos.x + node.position.x, y: parentPos.y + node.position.y }
}

interface DragPayload {
  serviceType: ServiceNodeData['serviceType']
  iconSrc: string
  label: string
  tooltip: string
}

function extractDragPayload(e: React.DragEvent): DragPayload | null {
  const serviceType = e.dataTransfer.getData('serviceType')
  const iconSrc = e.dataTransfer.getData('iconSrc')
  const label = e.dataTransfer.getData('label')
  const tooltip = e.dataTransfer.getData('tooltip')
  if (
    !serviceType ||
    !VALID_SERVICE_TYPES.has(serviceType as ServiceNodeData['serviceType']) ||
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
    insertSlot = Array.from({ length: 10 }, (_, i) => i).find(i => !(i in occupied)) ?? -1
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

interface FlowCanvasProps {
  animateAllEdges?: boolean
}

const nodeTypes = {
  internetNode: InternetNode,
  igwNode: IgwNode,
  vpcNode: VpcNode,
  subnetNode: SubnetNode,
  serviceNode: ServiceNode,
}

const edgeTypes = {
  trafficEdge: TrafficEdge,
}

function FlowCanvasInner({ animateAllEdges = false }: FlowCanvasProps) {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useGameStore()

  const displayEdges = animateAllEdges
    ? edges.map(e => ({ ...e, animated: true }))
    : edges
  const { screenToFlowPosition } = useReactFlow()
  const addServiceNode = useGameStore(s => s.addServiceNode)
  const splitEdge = useGameStore(s => s.splitEdge)
  const moveNodeToSlot = useGameStore(s => s.moveNodeToSlot)

  // Tracks which React Flow edge (by id) the cursor is directly over during a drag.
  // Populated via React Flow's official onEdgeMouseEnter/Leave events - no DOM coupling.
  const hoveredEdgeRef = useRef<string | null>(null)

  const onNodeDragStop = useCallback((_event: MouseEvent | TouchEvent, node: Node) => {
    if (node.type !== 'serviceNode') return
    const allNodes = useGameStore.getState().nodes
    const subnetNode = allNodes.find(n => n.id === node.parentId)
    if (!subnetNode) return

    const col = Math.round((node.position.x - SLOT_START_X) / SLOT_WIDTH)
    const row = Math.round((node.position.y - SLOT_START_Y) / SLOT_HEIGHT)
    const clampedCol = Math.max(0, Math.min(SLOTS_PER_ROW - 1, col))
    const clampedRow = Math.max(0, Math.min(1, row))
    const newSlotIndex = clampedRow * SLOTS_PER_ROW + clampedCol

    const oldSlotIndex = (node.data as ServiceNodeData).slotIndex
    const occupied = (subnetNode.data as SubnetNodeData).occupiedSlots

    if (newSlotIndex in occupied && occupied[newSlotIndex] !== node.id) {
      moveNodeToSlot(node.id, oldSlotIndex)
      return
    }

    moveNodeToSlot(node.id, newSlotIndex)
  }, [moveNodeToSlot])

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
    const payload = extractDragPayload(e)
    if (!payload) return
    const { serviceType, iconSrc, label, tooltip } = payload

    const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    const nodeId = `${serviceType}-${Date.now()}`
    const allNodes = useGameStore.getState().nodes

    // --- Mid-edge insertion ---
    const hoveredEdgeId = hoveredEdgeRef.current
    if (hoveredEdgeId) {
      const edge = useGameStore.getState().edges.find(ed => ed.id === hoveredEdgeId)
      if (edge) {
        const targetNode = allNodes.find(n => n.id === edge.target)
        if (targetNode?.parentId && SUBNET_IDS.includes(targetNode.parentId)) {
          const subnetNode = allNodes.find(n => n.id === targetNode.parentId)!
          const occupied = (subnetNode.data as SubnetNodeData).occupiedSlots
          const result = resolveMidEdgeInsertion(edge, allNodes, occupied)
          if (result) {
            for (const shift of result.slotsToShift) moveNodeToSlot(shift.nodeId, shift.to)
            addServiceNode({
              id: nodeId, type: 'serviceNode',
              position: getSlotPosition(result.insertSlot),
              parentId: targetNode.parentId, extent: 'parent', draggable: true,
              data: { serviceType, label, iconSrc, tooltip, slotIndex: result.insertSlot },
            })
            splitEdge(edge.id, nodeId)
            return
          }
        }
        // Geometric midpoint fallback (target not in subnet, or subnet full)
        const srcAbs = getAbsoluteNodePosition(edge.source, allNodes)
        const tgtAbs = getAbsoluteNodePosition(edge.target, allNodes)
        addServiceNode({
          id: nodeId, type: 'serviceNode',
          position: { x: (srcAbs.x + tgtAbs.x) / 2 - 30, y: (srcAbs.y + tgtAbs.y) / 2 - 40 },
          draggable: true,
          data: { serviceType, label, iconSrc, tooltip, slotIndex: -1 },
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
        parentId: subnetDrop.subnetId, extent: 'parent', draggable: true,
        data: { serviceType, label, iconSrc, tooltip, slotIndex: subnetDrop.slotIndex },
      })
    }
  }, [screenToFlowPosition, addServiceNode, splitEdge, moveNodeToSlot])

  return (
    <ReactFlow
      nodes={nodes}
      edges={displayEdges}
      deleteKeyCode={['Backspace', 'Delete']}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeDragStop={onNodeDragStop}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      defaultEdgeOptions={{ type: 'default' }}
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

export function FlowCanvas({ animateAllEdges = false }: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner animateAllEdges={animateAllEdges} />
    </ReactFlowProvider>
  )
}
