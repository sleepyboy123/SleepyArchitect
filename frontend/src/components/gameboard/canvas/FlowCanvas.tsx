import { useCallback } from 'react'
import { ReactFlow, ReactFlowProvider, Background, useReactFlow } from '@xyflow/react'
import type { Node } from '@xyflow/react'
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
  getSlotPosition,
  type SubnetNodeData,
} from '@/types/game'

function getAbsoluteNodePosition(nodeId: string, allNodes: Node[]): { x: number; y: number } {
  const node = allNodes.find(n => n.id === nodeId)
  if (!node) return { x: 0, y: 0 }
  if (!node.parentId) return { x: node.position.x, y: node.position.y }
  const parentPos = getAbsoluteNodePosition(node.parentId, allNodes)
  return { x: parentPos.x + node.position.x, y: parentPos.y + node.position.y }
}

function distanceToSegment(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq))
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy)
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

function FlowCanvasInner() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useGameStore()
  const { screenToFlowPosition } = useReactFlow()
  const addServiceNode = useGameStore(s => s.addServiceNode)
  const splitEdge = useGameStore(s => s.splitEdge)

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const serviceType = e.dataTransfer.getData('serviceType')
    const iconSrc = e.dataTransfer.getData('iconSrc')
    const label = e.dataTransfer.getData('label')
    const tooltip = e.dataTransfer.getData('tooltip')
    if (!serviceType) return

    const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY })

    // --- Mid-edge insertion check ---
    const MID_EDGE_THRESHOLD = 60
    const allEdges = useGameStore.getState().edges
    const allNodesSnap = useGameStore.getState().nodes

    for (const edge of allEdges) {
      const sourceNode = allNodesSnap.find(n => n.id === edge.source)
      const targetNode = allNodesSnap.find(n => n.id === edge.target)
      if (!sourceNode || !targetNode) continue

      const srcAbs = getAbsoluteNodePosition(edge.source, allNodesSnap)
      const tgtAbs = getAbsoluteNodePosition(edge.target, allNodesSnap)

      const dist = distanceToSegment(flowPos, srcAbs, tgtAbs)

      if (dist < MID_EDGE_THRESHOLD) {
        const midX = (srcAbs.x + tgtAbs.x) / 2
        const midY = (srcAbs.y + tgtAbs.y) / 2
        const nodeId = `${serviceType}-${Date.now()}`
        const newNode = {
          id: nodeId,
          type: 'serviceNode',
          position: { x: midX - 30, y: midY - 40 },
          draggable: false,
          data: { serviceType, label, iconSrc, tooltip, slotIndex: -1 },
        }
        addServiceNode(newNode)
        splitEdge(edge.id, nodeId)
        return
      }
    }
    // --- End mid-edge check ---

    const allNodes = useGameStore.getState().nodes
    const subnetIds = ['public-subnet', 'private-subnet']

    for (const subnetId of subnetIds) {
      const subnetNode = allNodes.find(n => n.id === subnetId)
      if (!subnetNode) continue

      const absPos = getAbsoluteNodePosition(subnetId, allNodes)
      const subnetW = SLOT_START_X * 2 + SLOTS_PER_ROW * SLOT_WIDTH
      const subnetH = SLOT_START_Y + 2 * SLOT_HEIGHT + 20

      if (
        flowPos.x >= absPos.x &&
        flowPos.x <= absPos.x + subnetW &&
        flowPos.y >= absPos.y &&
        flowPos.y <= absPos.y + subnetH
      ) {
        const relX = flowPos.x - absPos.x
        const relY = flowPos.y - absPos.y
        const col = Math.floor((relX - SLOT_START_X) / SLOT_WIDTH)
        const row = Math.floor((relY - SLOT_START_Y) / SLOT_HEIGHT)

        if (col < 0 || col >= SLOTS_PER_ROW || row < 0 || row > 1) return

        const slotIndex = row * SLOTS_PER_ROW + col
        const occupied = (subnetNode.data as SubnetNodeData).occupiedSlots
        if (slotIndex in occupied) return

        const slotPos = getSlotPosition(slotIndex)
        const nodeId = `${serviceType}-${Date.now()}`

        addServiceNode({
          id: nodeId,
          type: 'serviceNode',
          position: slotPos,
          parentId: subnetId,
          extent: 'parent',
          draggable: false,
          data: { serviceType, label, iconSrc, tooltip, slotIndex },
        })
        return
      }
    }
  }, [screenToFlowPosition, addServiceNode, splitEdge])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      defaultEdgeOptions={{ type: 'default' }}
      nodesDraggable={false}
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

export function FlowCanvas() {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner />
    </ReactFlowProvider>
  )
}
