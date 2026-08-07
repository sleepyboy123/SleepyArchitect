import { Handle, Position } from '@xyflow/react'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'

export function InternetNode() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col items-center gap-1 select-none w-20" style={{ pointerEvents: 'all' }}>
            <img src="/aws-icons/vpc.svg" alt="Internet" className="w-12 h-12" />
            <span className="text-xs font-medium text-foreground">The Internet</span>
            <Handle type="source" position={Position.Right} className="!bg-muted-foreground" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-center">
          The public internet - traffic originates here before hitting the IGW
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
