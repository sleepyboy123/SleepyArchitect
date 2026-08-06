import { useEffect, useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { useGameStore } from '@/store/useGameStore'
import { ALL_SCENARIOS } from '@/scenarios'
import { submitDesign } from '@/scenarios/engine'
import { GameBoard } from '@/components/gameboard/GameBoard'
import { TicketBanner } from '@/components/gameboard/TicketBanner'
import { ResultModal } from '@/components/gameboard/ResultModal'
import type { ValidationResult } from '@/types/scenario'

export function GameplayPage() {
  const { scenarioId } = useParams<{ scenarioId: string }>()
  const currentScenarioId = useGameStore(s => s.currentScenarioId)
  const currentTicketIndex = useGameStore(s => s.currentTicketIndex)
  const nodes = useGameStore(s => s.nodes)
  const edges = useGameStore(s => s.edges)
  const startScenario = useGameStore(s => s.startScenario)
  const advanceTicket = useGameStore(s => s.advanceTicket)

  const [result, setResult] = useState<ValidationResult | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)

  const scenario = scenarioId ? ALL_SCENARIOS[scenarioId] : null

  useEffect(() => {
    if (!scenarioId || !scenario) return
    // Also resets when the player has completed all tickets and navigates back to replay
    if (scenarioId !== currentScenarioId || currentTicketIndex >= scenario.tickets.length) {
      startScenario(scenarioId)
    }
  }, [scenarioId, currentScenarioId, currentTicketIndex, scenario, startScenario])

  if (!scenario) return <Navigate to="/" replace />

  const ticket = scenario.tickets[currentTicketIndex]
  const isLastTicket = currentTicketIndex === scenario.tickets.length - 1

  function handleSubmit() {
    if (!scenarioId) return
    setIsAnimating(true)
    setTimeout(() => {
      setIsAnimating(false)
      setResult(submitDesign(scenarioId!, currentTicketIndex, nodes, edges))
    }, 2000)
  }

  function handleNextTicket() {
    advanceTicket()
    setResult(null)
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
      {ticket && <TicketBanner message={ticket.message} />}
      <div className="flex-1 overflow-hidden">
        <GameBoard onSubmit={handleSubmit} animateAllEdges={isAnimating} />
      </div>
      {result && (
        <ResultModal
          result={result}
          isLastTicket={isLastTicket}
          onNextTicket={result.passed ? handleNextTicket : undefined}
          onRetry={() => setResult(null)}
        />
      )}
    </div>
  )
}
