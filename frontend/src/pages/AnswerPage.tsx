import { useParams, Navigate } from 'react-router-dom'
import { ReactFlow, ReactFlowProvider, Background, ConnectionMode } from '@xyflow/react'
import { ALL_SCENARIOS } from '@/scenarios'
import { nodeTypes, edgeTypes } from '@/components/gameboard/canvas/FlowCanvas'

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
          connectionMode={ConnectionMode.Loose}
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
