import { useParams, Navigate } from 'react-router-dom'
import { ReactFlow, ReactFlowProvider, Background } from '@xyflow/react'
import { ALL_SCENARIOS } from '@/scenarios'
import { InternetNode } from '@/components/gameboard/canvas/nodes/InternetNode'
import { IgwNode } from '@/components/gameboard/canvas/nodes/IgwNode'
import { VpcNode } from '@/components/gameboard/canvas/nodes/VpcNode'
import { SubnetNode } from '@/components/gameboard/canvas/nodes/SubnetNode'
import { ServiceNode } from '@/components/gameboard/canvas/nodes/ServiceNode'
import { TrafficEdge } from '@/components/gameboard/canvas/edges/TrafficEdge'

const nodeTypes = {
  internetNode: InternetNode,
  igwNode: IgwNode,
  vpcNode: VpcNode,
  subnetNode: SubnetNode,
  serviceNode: ServiceNode,
}

const edgeTypes = { trafficEdge: TrafficEdge }

export function AnswerPage() {
  const { scenarioId } = useParams<{ scenarioId: string }>()
  const scenario = scenarioId ? ALL_SCENARIOS[scenarioId] : null
  if (!scenario) return <Navigate to="/" replace />

  return (
    <div className="h-screen w-screen bg-background">
      <ReactFlowProvider>
        <ReactFlow
          nodes={scenario.answerNodes}
          edges={scenario.answerEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          nodesDraggable={false}
          nodesConnectable={false}
          panOnDrag={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          className="bg-background"
        >
          <Background />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  )
}
