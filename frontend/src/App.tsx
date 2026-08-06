import { TooltipProvider } from '@/components/ui/tooltip'
import { GameBoard } from '@/components/gameboard/GameBoard'

export default function App() {
  return (
    <TooltipProvider delayDuration={300}>
      <GameBoard />
    </TooltipProvider>
  )
}
