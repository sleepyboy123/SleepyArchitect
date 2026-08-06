import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react'

export function TrafficEdge({
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  markerEnd,
}: EdgeProps) {
  const [edgePath] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })
  return (
    <BaseEdge
      path={edgePath}
      markerEnd={markerEnd}
      style={{
        stroke: 'hsl(var(--primary))',
        strokeWidth: 2,
        strokeDasharray: '6 3',
        animation: 'traffic-flow 1s linear infinite',
      }}
    />
  )
}
