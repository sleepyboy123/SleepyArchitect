import { CheckCircle2, XCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { ValidationResult } from '@/types/scenario'

interface ResultModalProps {
  result: ValidationResult
  isLastTicket: boolean
  onNextTicket?: () => void
  onRetry: () => void
  onResetScenario?: () => void
}

export function ResultModal({ result, isLastTicket, onNextTicket, onRetry, onResetScenario }: ResultModalProps) {
  const navigate = useNavigate()

  const title = result.passed && isLastTicket
    ? 'You Win! 🎉'
    : result.passed
    ? 'Ticket Passed!'
    : 'Not quite right'

  const titleColor = result.passed ? 'text-green-500' : 'text-red-500'

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onRetry() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className={titleColor}>{title}</DialogTitle>
          <DialogDescription className="sr-only">
            {result.passed
              ? isLastTicket
                ? 'You have completed all tickets. Review your objectives and go back to scenarios.'
                : 'Your design passed this ticket. Review your objectives and move to the next ticket.'
              : 'Your design did not pass. Review your objectives and try again.'}
          </DialogDescription>
        </DialogHeader>

        {result.objectives.length > 0 && (
          <div className="space-y-2 py-2">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Objectives
            </p>
            {result.objectives.map((obj) => (
              <div key={obj.label} className="flex items-center gap-2 text-sm">
                {obj.met
                  ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  : <XCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                }
                <span className={obj.met ? '' : 'text-muted-foreground'}>{obj.label}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={onRetry}>
            Try Again
          </Button>
          {result.passed && (
            isLastTicket
              ? <>
                  <Button variant="outline" onClick={onResetScenario}>Reset Scenario</Button>
                  <Button onClick={() => { onNextTicket?.(); navigate('/') }}>Back to Scenarios</Button>
                </>
              : <Button onClick={onNextTicket}>Next Ticket</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
