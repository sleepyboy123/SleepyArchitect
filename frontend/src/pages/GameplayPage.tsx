import { useEffect, useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'
import { ALL_SCENARIOS } from '@/scenarios'
import { submitDesign } from '@/scenarios/engine'
import { GameBoard } from '@/components/gameboard/GameBoard'
import { TicketBanner } from '@/components/gameboard/TicketBanner'
import { ResultModal } from '@/components/gameboard/ResultModal'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import type { ValidationResult } from '@/types/scenario'

export function GameplayPage() {
  const { scenarioId } = useParams<{ scenarioId: string }>()
  const currentScenarioId = useGameStore(s => s.currentScenarioId)
  const currentTicketIndex = useGameStore(s => s.currentTicketIndex)
  const startScenario = useGameStore(s => s.startScenario)
  const advanceTicket = useGameStore(s => s.advanceTicket)
  const clearBoard = useGameStore(s => s.clearBoard)

  const [result, setResult] = useState<ValidationResult | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)

  const scenario = scenarioId ? ALL_SCENARIOS[scenarioId] : null

  useEffect(() => {
    if (!scenarioId || !scenario) return
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
      const { nodes, edges } = useGameStore.getState()
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
      {ticket && <TicketBanner key={ticket.id} message={ticket.message} />}

      <div className="flex-1 overflow-hidden min-h-0">
        <GameBoard animateAllEdges={isAnimating} trafficAnimation={ticket?.trafficAnimation} />
      </div>

      {/* Action bar - sits below the canvas, never overlaps it */}
      <div className="shrink-0 border-t border-border bg-card px-6 py-2.5 flex items-center justify-between">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
              <Trash2 className="w-3.5 h-3.5" />
              Clear Board
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear the board?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove all services and connections from the canvas.
                This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={clearBoard}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Clear Board
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button onClick={handleSubmit} disabled={isAnimating} size="sm">
          {isAnimating ? 'Submitting...' : 'Submit Design'}
        </Button>
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
