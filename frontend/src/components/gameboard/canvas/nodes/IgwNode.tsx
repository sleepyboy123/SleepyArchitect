import { Handle, Position } from '@xyflow/react'

export function IgwNode() {
  return (
    <div
      className="relative group flex flex-col items-center gap-1 select-none w-20 cursor-default"
      style={{ pointerEvents: 'all' }}
    >
      <Handle type="target" position={Position.Left} className="!bg-muted-foreground" />
      <img src="/aws-icons/igw.svg" alt="Internet Gateway" className="w-12 h-12" />
      <span className="text-xs font-medium text-foreground">IGW</span>
      <Handle type="source" position={Position.Right} className="!bg-muted-foreground" />

      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-popover text-popover-foreground text-xs rounded-md px-2 py-1.5 w-[220px] text-center shadow-md border border-border z-50 pointer-events-none">
        Internet Gateway - the entry point for traffic from the public internet into your VPC
      </div>
    </div>
  )
}
