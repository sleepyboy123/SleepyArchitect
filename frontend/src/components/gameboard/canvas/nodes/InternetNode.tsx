import { Handle, Position } from '@xyflow/react'

export function InternetNode() {
  return (
    <div className="flex flex-col items-center gap-1 select-none w-20">
      <img src="/aws-icons/vpc.svg" alt="Internet" className="w-12 h-12" />
      <span className="text-xs font-medium text-foreground">The Internet</span>
      <Handle type="source" position={Position.Right} className="!bg-muted-foreground" />
    </div>
  )
}
