import { Sidebar } from './Sidebar'
import { FlowCanvas } from './canvas/FlowCanvas'
import type { TrafficAnimationConfig } from '@/types/scenario'

interface GameBoardProps {
  animateAllEdges?: boolean
  trafficAnimation?: TrafficAnimationConfig
}

export function GameBoard({ animateAllEdges = false, trafficAnimation }: GameBoardProps) {
  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 relative">
        <FlowCanvas animateAllEdges={animateAllEdges} trafficAnimation={trafficAnimation} />
      </div>
    </div>
  )
}
