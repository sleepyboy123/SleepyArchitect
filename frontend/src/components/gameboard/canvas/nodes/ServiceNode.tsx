import { Handle, Position, type NodeProps } from '@xyflow/react'
import { X } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { useGameStore } from '@/store/useGameStore'
import { type ServiceNodeData } from '@/types/game'
import { cn } from '@/lib/utils'

export function ServiceNode({ id, data, selected }: NodeProps) {
  const { label, iconSrc, tooltip } = data as ServiceNodeData
  const removeNode = useGameStore(s => s.removeNode)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'group relative flex flex-col items-center justify-center gap-1 p-2 rounded-md border bg-card shadow-sm select-none w-16 h-[82px]',
            selected && 'border-primary ring-1 ring-primary',
            !selected && 'border-border'
          )}
        >
          {/* Delete button */}
          <button
            className="absolute -top-2 -right-2 z-10 rounded-full bg-destructive text-destructive-foreground w-4 h-4 flex items-center justify-center hover:bg-destructive/80 transition-colors"
            onClick={(e) => { e.stopPropagation(); removeNode(id) }}
            aria-label={`Remove ${label}`}
          >
            <X className="w-2.5 h-2.5" />
          </button>

          {/* Icon */}
          <img src={iconSrc} alt={label} className="w-8 h-8" />

          {/* Label */}
          <span className="text-[10px] font-medium text-center leading-tight text-foreground line-clamp-2">
            {label}
          </span>

          {/* Handles on all 4 sides - loose connection mode allows any-to-any */}
          {/* 20x20 hit area makes handles much easier to grab; fade in on node hover */}
          <Handle
            type="source" position={Position.Top} id="top"
            style={{ width: 20, height: 20 }}
            className="!bg-muted-foreground !rounded-full !opacity-0 group-hover:!opacity-70 !transition-opacity !duration-150"
          />
          <Handle
            type="source" position={Position.Left} id="left"
            style={{ width: 20, height: 20 }}
            className="!bg-muted-foreground !rounded-full !opacity-0 group-hover:!opacity-70 !transition-opacity !duration-150"
          />
          <Handle
            type="source" position={Position.Right} id="right"
            style={{ width: 20, height: 20 }}
            className="!bg-muted-foreground !rounded-full !opacity-0 group-hover:!opacity-70 !transition-opacity !duration-150"
          />
          <Handle
            type="source" position={Position.Bottom} id="bottom"
            style={{ width: 20, height: 20 }}
            className="!bg-muted-foreground !rounded-full !opacity-0 group-hover:!opacity-70 !transition-opacity !duration-150"
          />
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-48 text-center">
        <p className="text-xs">{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  )
}
