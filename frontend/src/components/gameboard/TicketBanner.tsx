import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface TicketBannerProps {
  message: string
}

export function TicketBanner({ message }: TicketBannerProps) {
  const [expanded, setExpanded] = useState(true)
  const isLong = message.length > 120

  return (
    <div className="border-b bg-card px-6 py-3 flex items-start gap-3 shrink-0 min-h-[52px]">
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-relaxed ${!expanded && isLong ? 'line-clamp-1' : ''}`}>
          {message}
        </p>
      </div>
      {isLong && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="shrink-0 mt-0.5 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={expanded ? 'Collapse ticket' : 'Expand ticket'}
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      )}
    </div>
  )
}
