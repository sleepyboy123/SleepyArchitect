import { Sidebar } from './Sidebar'
import { FlowCanvas } from './canvas/FlowCanvas'

export function GameBoard() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 relative">
        <FlowCanvas />
      </div>
    </div>
  )
}
