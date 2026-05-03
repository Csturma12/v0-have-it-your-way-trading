'use client'

import { useState, ReactNode, useMemo, useEffect, useRef } from 'react'
import { RefreshCw } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * TabbedWidget — reusable Webull-style tabbed container.
 *
 * Modeled after Webull's right-rail "Quotes | Profile | Comments | Community"
 * pattern (see screenshot the user provided): one box, related data
 * grouped behind tabs at the top, optional second row of sub-tabs.
 *
 * Why this is better than separate widgets:
 *  - Reduces grid clutter — 5 widgets become 1 with 5 tabs.
 *  - Cuts API spend — only the active tab mounts/fetches.
 *  - Mental grouping — related data lives next to itself.
 *  - User can still drag/resize the container as one widget.
 *
 * The primitive is intentionally dumb: it's just a tab strip + a body
 * slot. Each tab supplies its own content component. Tabs are lazy-
 * mounted (component is undefined until the tab is opened at least
 * once) so initial render is cheap. After first activation the
 * component stays mounted but hidden via `display: none`, so SWR
 * caches and intervals don't lose state when the user tabs back.
 *
 * Visual language matches existing widgets (text-[9px] font-mono
 * uppercase tracking-wider, primary-color underline for active).
 */
export interface TabbedWidgetTab {
  id: string
  label: string
  icon?: LucideIcon
  /** Tooltip shown on hover */
  title?: string
  /** Render the content. Called only after the tab is first opened. */
  render: () => ReactNode
}

export interface TabbedWidgetProps {
  /** Title shown in the header next to tabs */
  title: string
  /** Optional small label after the title (e.g. ticker symbol) */
  subtitle?: string
  /** Optional icon shown next to the title */
  icon?: LucideIcon
  /** Custom color class for the icon (default: text-primary) */
  iconColor?: string
  /** Tabs to render */
  tabs: TabbedWidgetTab[]
  /** Optional refresh callback — shows a refresh button when provided */
  onRefresh?: () => void
  /** Show spinner on refresh button */
  isRefreshing?: boolean
  /** Initial tab id (defaults to first tab) */
  defaultTab?: string
  /** Optional secondary controls rendered to the right of tabs */
  rightSlot?: ReactNode
}

export function TabbedWidget({
  title,
  subtitle,
  icon: Icon,
  iconColor = 'text-primary',
  tabs,
  onRefresh,
  isRefreshing = false,
  defaultTab,
  rightSlot,
}: TabbedWidgetProps) {
  const [activeId, setActiveId] = useState<string>(defaultTab ?? tabs[0]?.id ?? '')

  // Track which tabs have been opened at least once. Once mounted, they
  // stay mounted (hidden via display:none when inactive) so SWR cache
  // and component state survive tab switches.
  const visited = useRef<Set<string>>(new Set([activeId]))
  if (!visited.current.has(activeId)) visited.current.add(activeId)

  // If the active tab is removed (e.g. tabs change), fall back to the
  // first available tab.
  useEffect(() => {
    if (!tabs.find(t => t.id === activeId)) {
      setActiveId(tabs[0]?.id ?? '')
    }
  }, [tabs, activeId])

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header: title + tab strip + refresh */}
      <div className="border-b border-border/40 flex-shrink-0">
        <div className="px-2 py-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {Icon && <Icon className={`w-3 h-3 flex-shrink-0 ${iconColor}`} />}
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider truncate">
              {title}
            </span>
            {subtitle && (
              <span className="text-[8px] font-mono text-muted-foreground truncate">
                {subtitle}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {rightSlot}
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-0.5 hover:bg-muted/50 rounded"
                title="Refresh"
              >
                <RefreshCw className={`w-2.5 h-2.5 text-muted-foreground ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Tab strip — Webull-style with primary underline for active */}
        <div className="flex items-end gap-0 px-1 overflow-x-auto scrollbar-thin">
          {tabs.map(tab => {
            const TabIcon = tab.icon
            const isActive = tab.id === activeId
            return (
              <button
                key={tab.id}
                onClick={() => setActiveId(tab.id)}
                title={tab.title}
                className={`flex items-center gap-1 px-2 py-1 text-[9px] font-mono uppercase tracking-wider whitespace-nowrap transition-colors border-b-2 ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {TabIcon && <TabIcon className="w-2.5 h-2.5" />}
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Body — all visited tabs stay mounted, only active is shown */}
      <div className="flex-1 min-h-0 relative">
        {tabs.map(tab => {
          const isActive = tab.id === activeId
          const wasVisited = visited.current.has(tab.id)
          if (!wasVisited) return null
          return (
            <div
              key={tab.id}
              className={`absolute inset-0 ${isActive ? '' : 'hidden'}`}
              aria-hidden={!isActive}
            >
              {tab.render()}
            </div>
          )
        })}
      </div>
    </div>
  )
}
