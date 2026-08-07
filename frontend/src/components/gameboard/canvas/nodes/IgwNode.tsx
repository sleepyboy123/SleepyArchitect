import { Handle, Position } from '@xyflow/react'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'

export function IgwNode() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col items-center gap-1 select-none w-20 cursor-default" style={{ pointerEvents: 'all' }}>
            <Handle type="target" position={Position.Left} className="!bg-muted-foreground" />
            <img src="/aws-icons/igw.svg" alt="Internet Gateway" className="w-12 h-12" />
            <span className="text-xs font-medium text-foreground">IGW</span>
            <Handle type="source" position={Position.Right} className="!bg-muted-foreground" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-center">
          Internet Gateway - the entry point for traffic from the public internet into your VPC
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
