import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface TicketBannerProps {
  message: string
}

export function TicketBanner({ message }: TicketBannerProps) {
  const [expanded, setExpanded] = useState(true)
  const isLong = message.length > 120

  return (
    <div className="shrink-0 bg-amber-50 dark:bg-amber-950/40 border-b-2 border-amber-200 dark:border-amber-800 px-4 py-3">
      <div className="flex items-start gap-3 max-w-4xl mx-auto">
        {/* Boss avatar */}
        <div className="shrink-0 w-9 h-9 rounded-full bg-amber-400 dark:bg-amber-600 flex items-center justify-center text-lg leading-none shadow-sm select-none">
          👔
        </div>

        {/* Message bubble */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
              Bossman
            </span>
            <span className="text-[10px] text-amber-500/70 dark:text-amber-600 font-medium">New ticket</span>
          </div>
          <p className={`text-sm leading-relaxed text-foreground ${!expanded && isLong ? 'line-clamp-1' : ''}`}>
            {message}
          </p>
        </div>

        {isLong && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="shrink-0 mt-5 text-amber-600/70 hover:text-amber-700 dark:text-amber-500/70 dark:hover:text-amber-400 transition-colors"
            aria-label={expanded ? 'Collapse ticket' : 'Expand ticket'}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  )
}
