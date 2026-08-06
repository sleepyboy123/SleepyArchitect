import { cn } from '@/lib/utils'
import type { SidebarItem } from '@/types/game'

interface SidebarItemProps {
  item: SidebarItem
}

export function SidebarItemTile({ item }: SidebarItemProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('serviceType', item.serviceType)
    e.dataTransfer.setData('iconSrc', item.iconSrc)
    e.dataTransfer.setData('label', item.label)
    e.dataTransfer.setData('tooltip', item.tooltip)
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={cn(
        'flex flex-col items-center gap-1 p-2 rounded-md border border-border',
        'cursor-grab active:cursor-grabbing bg-card hover:bg-accent transition-colors',
        'select-none w-full'
      )}
      title={item.tooltip}
    >
      <img src={item.iconSrc} alt={item.label} className="w-8 h-8" />
      <span className="text-[10px] font-medium text-center leading-tight text-foreground">
        {item.label}
      </span>
    </div>
  )
}
