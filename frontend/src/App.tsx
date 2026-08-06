import { Routes, Route } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ScenarioSelectPage } from '@/pages/ScenarioSelectPage'
import { GameplayPage } from '@/pages/GameplayPage'
import { AnswerPage } from '@/pages/AnswerPage'

export default function App() {
  return (
    <TooltipProvider delayDuration={300}>
      <Routes>
        <Route path="/" element={<ScenarioSelectPage />} />
        <Route path="/play/:scenarioId" element={<GameplayPage />} />
        <Route path="/answer/:scenarioId" element={<AnswerPage />} />
      </Routes>
    </TooltipProvider>
  )
}
