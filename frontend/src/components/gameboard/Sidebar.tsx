import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { SIDEBAR_ITEMS } from '@/types/game'
import { SidebarItemTile } from './SidebarItem'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      aria-label="AWS Services"
      className={cn(
        'relative flex flex-col h-full border-r border-border bg-card transition-all duration-200',
        collapsed ? 'w-8' : 'w-40'
      )}
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="absolute -right-3 top-4 z-10 rounded-full border border-border bg-card p-0.5 hover:bg-accent transition-colors shadow-sm"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {!collapsed && (
        <div className="flex flex-col gap-2 p-2 overflow-y-auto">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-1 pt-1">
            Services
          </p>
          {SIDEBAR_ITEMS.map(item => (
            <SidebarItemTile key={item.serviceType} item={item} />
          ))}
        </div>
      )}
    </aside>
  )
}
