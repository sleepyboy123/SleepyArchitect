import { ReactFlow, ReactFlowProvider, Background } from '@xyflow/react'
import { useGameStore } from '@/store/useGameStore'
import { InternetNode } from './nodes/InternetNode'
import { IgwNode } from './nodes/IgwNode'
import { VpcNode } from './nodes/VpcNode'
import { SubnetNode } from './nodes/SubnetNode'
import { TrafficEdge } from './edges/TrafficEdge'

const nodeTypes = {
  internetNode: InternetNode,
  igwNode: IgwNode,
  vpcNode: VpcNode,
  subnetNode: SubnetNode,
}

const edgeTypes = {
  trafficEdge: TrafficEdge,
}

function FlowCanvasInner() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useGameStore()

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
