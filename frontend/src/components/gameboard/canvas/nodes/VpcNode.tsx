import type { NodeProps } from '@xyflow/react'
import type { VpcNodeData } from '@/types/game'
import { cn } from '@/lib/utils'

export function VpcNode({ data, selected }: NodeProps) {
  const { label } = data as VpcNodeData
  return (
    <div
      className={cn(
        'w-full h-full rounded-lg border-2 border-dashed border-border bg-muted/20',
        selected && 'border-primary'
      )}
    >
      <div className="px-2 py-1">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
      </div>
    </div>
  )
}
