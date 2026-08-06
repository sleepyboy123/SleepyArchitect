import { getBezierPath, type EdgeProps } from '@xyflow/react'
import type { TrafficAnimationConfig } from '@/types/game'

export function TrafficEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition, markerEnd, data, style
}: EdgeProps) {
  const [edgePath] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })

  const isAnimating = Boolean(data?.isAnimating)
  const anim = (data?.trafficAnimation ?? {}) as TrafficAnimationConfig
  const bubbleCount = anim.bubbleCount ?? 3
  const bubbleColor = anim.bubbleColor ?? 'hsl(var(--primary))'
  const bubbleSpeed = anim.bubbleSpeed ?? 2
  const pathId = `edge-path-${id}`

  return (
    <g>
      <path
        id={pathId}
        d={edgePath}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={2}
        markerEnd={markerEnd}
        style={style}
      />
      {isAnimating && Array.from({ length: bubbleCount }, (_, i) => (
        <circle key={i} r={4} fill={bubbleColor} opacity={0.9}>
          <animateMotion
            dur={`${bubbleSpeed}s`}
            repeatCount="indefinite"
            begin={`${-(i / bubbleCount) * bubbleSpeed}s`}
            rotate="auto"
          >
            <mpath href={`#${pathId}`} />
          </animateMotion>
        </circle>
      ))}
    </g>
  )
}
