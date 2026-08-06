import { useState } from 'react'
import type { NodeProps } from '@xyflow/react'
import type { SubnetNodeData } from '@/types/game'
import {
  SLOTS_PER_ROW,
  SLOT_WIDTH,
  SLOT_HEIGHT,
  SLOT_START_X,
  SLOT_START_Y,
  getSlotPosition,
} from '@/types/game'
import { cn } from '@/lib/utils'

const TOTAL_SLOTS = 10

export function SubnetNode({ data }: NodeProps) {
  const { label, subnetType, occupiedSlots } = data as SubnetNodeData
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null)

  const subnetWidth = SLOT_START_X * 2 + SLOTS_PER_ROW * SLOT_WIDTH
  const subnetHeight = SLOT_START_Y + 2 * SLOT_HEIGHT + 20

  return (
    <div
      className={cn(
        'rounded-md border-2 border-dashed relative',
        subnetType === 'public' ? 'border-green-500/60 bg-green-50/30 dark:bg-green-950/20' : 'border-blue-500/60 bg-blue-50/30 dark:bg-blue-950/20'
      )}
      style={{ width: subnetWidth, height: subnetHeight }}
    >
      <div className="flex items-center gap-1 px-2 py-1">
        <img
          src={subnetType === 'public' ? '/aws-icons/public-subnet.svg' : '/aws-icons/private-subnet.svg'}
          alt={label}
          className="w-4 h-4 shrink-0"
        />
        <span className={cn(
          'text-xs font-semibold uppercase tracking-wide',
          subnetType === 'public' ? 'text-green-700 dark:text-green-400' : 'text-blue-700 dark:text-blue-400'
        )}>
          {label}
        </span>
      </div>

      {Array.from({ length: TOTAL_SLOTS }, (_, i) => {
        const pos = getSlotPosition(i)
        const isOccupied = i in occupiedSlots
        const isHovered = hoveredSlot === i

        return (
          <div
            key={i}
            data-slot-index={i}
            className={cn(
              'absolute rounded border border-dashed transition-colors',
              isOccupied
                ? 'border-transparent'
                : 'border-border/40',
              isHovered && !isOccupied && 'border-primary bg-primary/10',
            )}
            style={{
              left: pos.x,
              top: pos.y,
              width: SLOT_WIDTH - 8,
              height: SLOT_HEIGHT - 8,
            }}
            onDragEnter={() => !isOccupied && setHoveredSlot(i)}
            onDragLeave={() => setHoveredSlot(null)}
          />
        )
      })}
    </div>
  )
}
