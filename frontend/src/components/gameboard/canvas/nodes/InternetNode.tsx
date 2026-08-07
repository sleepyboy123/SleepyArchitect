import { Handle, Position } from '@xyflow/react'

export function InternetNode() {
  return (
    <div
      className="relative group flex flex-col items-center gap-1 select-none w-20 cursor-default"
      style={{ pointerEvents: 'all' }}
    >
      <img src="/aws-icons/vpc.svg" alt="Internet" className="w-12 h-12" />
      <span className="text-xs font-medium text-foreground">The Internet</span>
      <Handle type="source" position={Position.Right} className="!bg-muted-foreground" />

      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-popover text-popover-foreground text-xs rounded-md px-2 py-1.5 w-[220px] text-center shadow-md border border-border z-50 pointer-events-none">
        The public internet - traffic originates here before hitting the IGW
      </div>
    </div>
  )
}
