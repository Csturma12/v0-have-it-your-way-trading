'use client'

import { useState, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { Lock, Unlock, RotateCcw, Plus } from 'lucide-react'
import { DraggableWidget } from './draggable-widget'
import { SectorPillBox } from './sector-pill-box'
import { ThemesColumn } from './themes-column'
import { TradingViewChart } from './tradingview-chart'
import { WatchlistPanel } from './watchlist-panel'

const STORAGE_KEY = 'trading-dashboard-widgets-v2'

type WidgetSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'

interface WidgetConfig {
  id: string
  type:
    | 'chart'
    | 'watchlist'
    | 'themes'
    | 'sector-ai'
    | 'sector-banking'
    | 'sector-energy'
    | 'sector-healthcare'
    | 'sector-consumer'
    | 'sector-semis'
  title: string
  size: WidgetSize
}

const SIZE_CLASSES: Record<WidgetSize, string> = {
  sm: 'col-span-12 md:col-span-3 row-span-2 min-h-[260px]',
  md: 'col-span-12 md:col-span-4 row-span-2 min-h-[320px]',
  lg: 'col-span-12 md:col-span-6 row-span-3 min-h-[400px]',
  xl: 'col-span-12 md:col-span-8 row-span-4 min-h-[520px]',
  full: 'col-span-12 row-span-4 min-h-[600px]',
}

const DEFAULT_LAYOUT: WidgetConfig[] = [
  { id: 'sector-ai', type: 'sector-ai', title: 'AI & Tech', size: 'sm' },
  { id: 'themes', type: 'themes', title: 'Themes', size: 'md' },
  { id: 'watchlist', type: 'watchlist', title: 'Watchlist', size: 'sm' },
  { id: 'sector-banking', type: 'sector-banking', title: 'Banking', size: 'sm' },
  { id: 'sector-healthcare', type: 'sector-healthcare', title: 'Healthcare', size: 'sm' },
  { id: 'sector-energy', type: 'sector-energy', title: 'Energy', size: 'sm' },
  { id: 'chart', type: 'chart', title: 'Chart', size: 'full' },
  { id: 'sector-consumer', type: 'sector-consumer', title: 'Consumer', size: 'md' },
  { id: 'sector-semis', type: 'sector-semis', title: 'Semiconductors', size: 'md' },
]

const SECTOR_DATA = {
  'sector-ai': {
    title: 'AI & Technology',
    accent: 'green' as const,
    tickers: ['NVDA', 'MSFT', 'GOOGL', 'META', 'AMZN', 'AMD', 'ORCL', 'CRM'],
    alerts: [
      { ticker: 'NVDA', signal: 'BUY' as const, confidence: 0.92, reason: 'Breakout above $950 resistance' },
      { ticker: 'AMD', signal: 'BUY' as const, confidence: 0.85, reason: 'AI chip demand surge' },
      { ticker: 'META', signal: 'BUY' as const, confidence: 0.78, reason: 'Strong ad revenue growth' },
    ],
  },
  'sector-banking': {
    title: 'Banking & Finance',
    accent: 'gold' as const,
    tickers: ['JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'AXP', 'BRK.B'],
    alerts: [
      { ticker: 'JPM', signal: 'BUY' as const, confidence: 0.88, reason: 'NII expansion beat estimates' },
      { ticker: 'GS', signal: 'BUY' as const, confidence: 0.82, reason: 'M&A pipeline strengthening' },
      { ticker: 'AXP', signal: 'SELL' as const, confidence: 0.75, reason: 'Consumer spending slowing' },
    ],
  },
  'sector-energy': {
    title: 'Energy & Industrials',
    accent: 'red' as const,
    tickers: ['XOM', 'CVX', 'COP', 'SLB', 'HAL', 'OXY', 'PSX', 'VLO'],
    alerts: [
      { ticker: 'XOM', signal: 'BUY' as const, confidence: 0.85, reason: 'Oil price momentum' },
      { ticker: 'SLB', signal: 'BUY' as const, confidence: 0.80, reason: 'Drilling activity increase' },
      { ticker: 'OXY', signal: 'SELL' as const, confidence: 0.72, reason: 'Debt concerns persist' },
    ],
  },
  'sector-healthcare': {
    title: 'Healthcare & BioPharma',
    accent: 'cyan' as const,
    tickers: ['LLY', 'NVO', 'JNJ', 'MRK', 'ABBV', 'PFE', 'BMY', 'AMGN'],
    alerts: [
      { ticker: 'LLY', signal: 'BUY' as const, confidence: 0.95, reason: 'GLP-1 dominance continues' },
      { ticker: 'NVO', signal: 'BUY' as const, confidence: 0.90, reason: 'Wegovy demand surge' },
      { ticker: 'PFE', signal: 'SELL' as const, confidence: 0.68, reason: 'COVID revenue decline' },
    ],
  },
  'sector-consumer': {
    title: 'Consumer & Retail',
    accent: 'green' as const,
    tickers: ['AMZN', 'WMT', 'COST', 'TGT', 'HD', 'MCD', 'SBUX', 'NKE'],
    alerts: [
      { ticker: 'COST', signal: 'BUY' as const, confidence: 0.88, reason: 'Membership growth strong' },
      { ticker: 'WMT', signal: 'BUY' as const, confidence: 0.82, reason: 'E-commerce gains' },
      { ticker: 'TGT', signal: 'SELL' as const, confidence: 0.70, reason: 'Margin pressure' },
    ],
  },
  'sector-semis': {
    title: 'Semiconductors',
    accent: 'gold' as const,
    tickers: ['NVDA', 'AMD', 'INTC', 'QCOM', 'AVGO', 'MU', 'AMAT', 'KLAC'],
    alerts: [
      { ticker: 'AVGO', signal: 'BUY' as const, confidence: 0.90, reason: 'AI networking demand' },
      { ticker: 'MU', signal: 'BUY' as const, confidence: 0.85, reason: 'Memory price recovery' },
      { ticker: 'INTC', signal: 'SELL' as const, confidence: 0.75, reason: 'Foundry delays' },
    ],
  },
}

interface WidgetGridProps {
  selectedTicker: string
  onSelectTicker: (t: string) => void
}

export function WidgetGrid({ selectedTicker, onSelectTicker }: WidgetGridProps) {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(DEFAULT_LAYOUT)
  const [isEditMode, setIsEditMode] = useState(false)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as WidgetConfig[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          setWidgets(parsed)
        }
      }
    } catch {
      // ignore
    }
    setHydrated(true)
  }, [])

  // Persist
  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets))
    } catch {
      // ignore
    }
  }, [widgets, hydrated])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setWidgets((items) => {
      const oldIndex = items.findIndex((w) => w.id === active.id)
      const newIndex = items.findIndex((w) => w.id === over.id)
      return arrayMove(items, oldIndex, newIndex)
    })
  }

  const removeWidget = (id: string) => {
    setWidgets((items) => items.filter((w) => w.id !== id))
  }

  const cycleSize = (id: string) => {
    const order: WidgetSize[] = ['sm', 'md', 'lg', 'xl', 'full']
    setWidgets((items) =>
      items.map((w) => {
        if (w.id !== id) return w
        const next = order[(order.indexOf(w.size) + 1) % order.length]
        return { ...w, size: next }
      })
    )
  }

  const resetLayout = () => {
    setWidgets(DEFAULT_LAYOUT)
  }

  const availableToAdd = DEFAULT_LAYOUT.filter(
    (def) => !widgets.find((w) => w.id === def.id)
  )

  const addWidget = (config: WidgetConfig) => {
    setWidgets((items) => [...items, config])
    setShowAddMenu(false)
  }

  const renderWidget = (widget: WidgetConfig) => {
    if (widget.type === 'chart') {
      return <TradingViewChart ticker={selectedTicker} />
    }
    if (widget.type === 'watchlist') {
      return (
        <WatchlistPanel
          onSelectTicker={onSelectTicker}
          selectedTicker={selectedTicker}
        />
      )
    }
    if (widget.type === 'themes') {
      return <ThemesColumn onSelectTicker={onSelectTicker} />
    }
    const sector = SECTOR_DATA[widget.type as keyof typeof SECTOR_DATA]
    if (sector) {
      return (
        <div className="p-3 h-full overflow-y-auto">
          <SectorPillBox
            title={sector.title}
            accent={sector.accent}
            tickers={sector.tickers}
            alerts={sector.alerts}
            onSelectTicker={onSelectTicker}
          />
        </div>
      )
    }
    return null
  }

  return (
    <div className="flex flex-col h-full">
      {/* Edit toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/30 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditMode((v) => !v)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono font-bold tracking-wider uppercase transition-colors border ${
              isEditMode
                ? 'bg-theme-green/20 text-theme-green border-theme-green/40 hover:bg-theme-green/30'
                : 'bg-muted/50 text-muted-foreground border-border hover:text-foreground'
            }`}
          >
            {isEditMode ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            {isEditMode ? 'Editing Layout' : 'Edit Layout'}
          </button>

          {isEditMode && (
            <>
              <button
                onClick={resetLayout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-semibold text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted border border-border"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
              {availableToAdd.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowAddMenu((v) => !v)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-semibold text-theme-green bg-theme-green/10 hover:bg-theme-green/20 border border-theme-green/30"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Widget
                  </button>
                  {showAddMenu && (
                    <div className="absolute top-full mt-1 left-0 z-30 w-56 bg-card border border-border rounded-lg shadow-2xl overflow-hidden">
                      {availableToAdd.map((w) => (
                        <button
                          key={w.id}
                          onClick={() => addWidget(w)}
                          className="w-full text-left px-3 py-2 text-xs font-mono hover:bg-theme-green/10 hover:text-theme-green border-b border-border last:border-b-0"
                        >
                          + {w.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-3 text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
          {isEditMode ? (
            <span className="text-theme-green animate-pulse">
              Drag widgets to reorder · Click size badge to resize
            </span>
          ) : (
            <span>{widgets.length} widgets active</span>
          )}
        </div>
      </div>

      {/* Widget grid */}
      <div className="flex-1 overflow-y-auto bg-background">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={widgets.map((w) => w.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-12 auto-rows-[80px] gap-3 p-3">
              {widgets.map((widget) => (
                <DraggableWidget
                  key={widget.id}
                  id={widget.id}
                  title={widget.title}
                  isEditMode={isEditMode}
                  onRemove={removeWidget}
                  className={SIZE_CLASSES[widget.size]}
                >
                  {/* Size cycler badge in edit mode */}
                  {isEditMode && (
                    <button
                      onClick={() => cycleSize(widget.id)}
                      className="absolute bottom-2 right-2 z-20 px-2 py-0.5 bg-theme-gold/20 text-theme-gold text-[9px] font-mono font-bold tracking-widest uppercase border border-theme-gold/40 rounded hover:bg-theme-gold/30"
                      title="Cycle widget size"
                    >
                      {widget.size}
                    </button>
                  )}
                  {renderWidget(widget)}
                </DraggableWidget>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  )
}
