import { useState } from 'react'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'
import { SidebarItemTile } from './SidebarItem'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [query, setQuery] = useState('')
  const sidebarItems = useGameStore(s => s.sidebarItems)

  const filtered = query.trim()
    ? sidebarItems.filter(item =>
        item.label.toLowerCase().includes(query.toLowerCase()) ||
        item.serviceType.toLowerCase().includes(query.toLowerCase())
      )
    : sidebarItems

  return (
    <aside
      aria-label="AWS Services"
      className={cn(
        'relative flex flex-col h-full border-r border-border bg-card transition-all duration-200',
        collapsed ? 'w-8' : 'w-44'
      )}
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="absolute -right-3 top-4 z-10 rounded-full border border-border bg-card p-0.5 hover:bg-accent transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {!collapsed && (
        <div className="flex flex-col h-full overflow-hidden">
          <div className="p-2 pb-1 shrink-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-1 pt-1 pb-1.5">
              Services
            </p>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search..."
                aria-label="Search services"
                className="w-full pl-6 pr-2 py-1 text-xs rounded border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 p-2 pt-1.5 overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <p className="text-[10px] text-muted-foreground px-1 py-2 text-center">No results</p>
            ) : (
              filtered.map(item => (
                <SidebarItemTile key={item.serviceType} item={item} />
              ))
            )}
          </div>
        </div>
      )}
    </aside>
  )
}
