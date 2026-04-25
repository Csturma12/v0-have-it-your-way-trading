'use client'

import { useState, useEffect, useMemo } from 'react'
import GridLayout, { WidthProvider, type Layout } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { Lock, Unlock, RotateCcw, Plus, X, GripVertical } from 'lucide-react'
import { SectorPillBox } from './sector-pill-box'
import { ThemesColumn } from './themes-column'
import { TradingViewChart } from './tradingview-chart'
import { WatchlistPanel } from './watchlist-panel'

const ResponsiveGridLayout = WidthProvider(GridLayout)

const STORAGE_KEY = 'trading-dashboard-rgl-v3'

// Resize from any side or corner: north, south, east, west + 4 corners
const ALL_RESIZE_HANDLES: Array<'s' | 'w' | 'e' | 'n' | 'sw' | 'nw' | 'se' | 'ne'> = [
  's', 'w', 'e', 'n', 'sw', 'nw', 'se', 'ne',
]

type WidgetType =
  | 'chart'
  | 'watchlist'
  | 'themes'
  | 'sector-ai'
  | 'sector-banking'
  | 'sector-energy'
  | 'sector-healthcare'
  | 'sector-consumer'
  | 'sector-semis'

interface WidgetMeta {
  id: string
  type: WidgetType
  title: string
}

interface SavedState {
  layout: Layout[]
  widgets: WidgetMeta[]
}

const ALL_WIDGETS: WidgetMeta[] = [
  { id: 'sector-ai', type: 'sector-ai', title: 'AI & Tech' },
  { id: 'themes', type: 'themes', title: 'Themes' },
  { id: 'watchlist', type: 'watchlist', title: 'Watchlist' },
  { id: 'sector-banking', type: 'sector-banking', title: 'Banking' },
  { id: 'sector-healthcare', type: 'sector-healthcare', title: 'Healthcare' },
  { id: 'sector-energy', type: 'sector-energy', title: 'Energy' },
  { id: 'sector-consumer', type: 'sector-consumer', title: 'Consumer' },
  { id: 'sector-semis', type: 'sector-semis', title: 'Semiconductors' },
  { id: 'chart', type: 'chart', title: 'Chart' },
]

// Default 12-col grid - 2x2 quadrant layout (rowHeight=48)
// Top-left quarter: 2 cols x 2 sectors stacked (sectors 1-4)
// Top-right quarter: 2 cols x sectors + watchlist (sectors 5-6 + watchlist)
// Bottom-left quarter: themes (2-column internal grid)
// Bottom-right quarter: chart
const DEFAULT_LAYOUT: Layout[] = [
  // === TOP-LEFT QUADRANT === (cols 0-5, rows 0-11)
  { i: 'sector-ai', x: 0, y: 0, w: 3, h: 6, minW: 2, minH: 3 },
  { i: 'sector-banking', x: 0, y: 6, w: 3, h: 6, minW: 2, minH: 3 },
  { i: 'sector-energy', x: 3, y: 0, w: 3, h: 6, minW: 2, minH: 3 },
  { i: 'sector-healthcare', x: 3, y: 6, w: 3, h: 6, minW: 2, minH: 3 },
  // === TOP-RIGHT QUADRANT === (cols 6-11, rows 0-11)
  { i: 'sector-consumer', x: 6, y: 0, w: 3, h: 6, minW: 2, minH: 3 },
  { i: 'sector-semis', x: 6, y: 6, w: 3, h: 6, minW: 2, minH: 3 },
  { i: 'watchlist', x: 9, y: 0, w: 3, h: 12, minW: 2, minH: 4 },
  // === BOTTOM-LEFT QUADRANT === (cols 0-5, rows 12-23)
  { i: 'themes', x: 0, y: 12, w: 6, h: 12, minW: 3, minH: 4 },
  // === BOTTOM-RIGHT QUADRANT === (cols 6-11, rows 12-23)
  { i: 'chart', x: 6, y: 12, w: 6, h: 12, minW: 4, minH: 5 },
]

const DEFAULT_WIDGETS: WidgetMeta[] = ALL_WIDGETS.slice()

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
  const [layout, setLayout] = useState<Layout[]>(DEFAULT_LAYOUT)
  const [widgets, setWidgets] = useState<WidgetMeta[]>(DEFAULT_WIDGETS)
  const [isEditMode, setIsEditMode] = useState(false)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as SavedState
        if (parsed.layout && parsed.widgets) {
          setLayout(parsed.layout)
          setWidgets(parsed.widgets)
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
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ layout, widgets } satisfies SavedState)
      )
    } catch {
      // ignore
    }
  }, [layout, widgets, hydrated])

  const handleLayoutChange = (newLayout: Layout[]) => {
    setLayout(newLayout)
  }

  const removeWidget = (id: string) => {
    setWidgets((items) => items.filter((w) => w.id !== id))
    setLayout((items) => items.filter((l) => l.i !== id))
  }

  const resetLayout = () => {
    setLayout(DEFAULT_LAYOUT)
    setWidgets(DEFAULT_WIDGETS)
  }

  const availableToAdd = useMemo(
    () => ALL_WIDGETS.filter((def) => !widgets.find((w) => w.id === def.id)),
    [widgets]
  )

  const addWidget = (meta: WidgetMeta) => {
    const defaultLayoutItem = DEFAULT_LAYOUT.find((l) => l.i === meta.id) ?? {
      i: meta.id,
      x: 0,
      y: Infinity, // drops at the bottom
      w: 3,
      h: 5,
      minW: 2,
      minH: 3,
    }
    setWidgets((items) => [...items, meta])
    setLayout((items) => [...items, defaultLayoutItem])
    setShowAddMenu(false)
  }

  const renderWidgetContent = (widget: WidgetMeta) => {
    if (widget.type === 'chart') {
      return <TradingViewChart ticker={selectedTicker} />
    }
    if (widget.type === 'watchlist') {
      return (
        <WatchlistPanel onSelectTicker={onSelectTicker} selectedTicker={selectedTicker} />
      )
    }
    if (widget.type === 'themes') {
      return <ThemesColumn onSelectTicker={onSelectTicker} />
    }
    const sector = SECTOR_DATA[widget.type as keyof typeof SECTOR_DATA]
    if (sector) {
      return (
        <div className="p-2 h-full overflow-y-auto">
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

  // Filter layout to only contain items that match current widgets (defensive)
  const visibleLayout = useMemo(
    () => layout.filter((l) => widgets.some((w) => w.id === l.i)),
    [layout, widgets]
  )

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-border bg-card/30 flex-shrink-0 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
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

        <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
          {isEditMode ? (
            <span className="text-theme-green animate-pulse">
              Drag header to move · Drag any edge or corner to resize
            </span>
          ) : (
            <span>{widgets.length} widgets active</span>
          )}
        </div>
      </div>

      {/* Grid workspace */}
      <div
        className={`flex-1 overflow-y-auto bg-background ${isEditMode ? '' : 'rgl-locked'}`}
      >
        <ResponsiveGridLayout
          className="layout"
          layout={visibleLayout}
          cols={12}
          rowHeight={48}
          margin={[8, 8]}
          containerPadding={[10, 10]}
          isDraggable={isEditMode}
          isResizable={isEditMode}
          resizeHandles={ALL_RESIZE_HANDLES}
          draggableHandle=".widget-drag-handle"
          compactType="vertical"
          preventCollision={false}
          onLayoutChange={handleLayoutChange}
          // Required for SSR safety - WidthProvider handles measurement
        >
          {widgets.map((widget) => (
            <div
              key={widget.id}
              className={`relative bg-card/40 border rounded-lg overflow-hidden flex flex-col ${
                isEditMode
                  ? 'border-theme-green/40 border-dashed'
                  : 'border-border'
              }`}
            >
              {/* Header strip - drag handle in edit mode */}
              <div
                className={`widget-drag-handle flex items-center justify-between px-2 py-1 border-b transition-colors flex-shrink-0 ${
                  isEditMode
                    ? 'bg-theme-green/10 border-theme-green/30 cursor-grab active:cursor-grabbing'
                    : 'bg-card/60 border-border'
                }`}
              >
                <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-widest uppercase">
                  {isEditMode && (
                    <GripVertical className="w-3 h-3 text-theme-green" />
                  )}
                  <span
                    className={isEditMode ? 'text-theme-green' : 'text-muted-foreground'}
                  >
                    {widget.title}
                  </span>
                </div>
                {isEditMode && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeWidget(widget.id)
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="p-0.5 rounded text-theme-red hover:bg-theme-red/20 border border-transparent hover:border-theme-red/40"
                    title="Remove widget"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Body */}
              <div className="flex-1 min-h-0 overflow-hidden">
                {renderWidgetContent(widget)}
              </div>
            </div>
          ))}
        </ResponsiveGridLayout>
      </div>
    </div>
  )
}
