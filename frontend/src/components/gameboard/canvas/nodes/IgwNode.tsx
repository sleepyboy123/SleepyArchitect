import { Handle, Position } from '@xyflow/react'

export function IgwNode() {
  return (
    <div className="flex flex-col items-center gap-1 select-none w-20">
      <Handle type="target" position={Position.Left} className="!bg-muted-foreground" />
      <img src="/aws-icons/igw.svg" alt="Internet Gateway" className="w-12 h-12" />
      <span className="text-xs font-medium text-foreground">IGW</span>
      <Handle type="source" position={Position.Right} className="!bg-muted-foreground" />
    </div>
  )
}
