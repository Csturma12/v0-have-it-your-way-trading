'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
// IMPORTANT: react-grid-layout v2.2.3 (this project's installed version) is a
// complete rewrite with a new API. The flat props this file uses
// — compactType, preventCollision, draggableHandle, draggableCancel,
//   resizeHandles, isResizable, isDraggable, margin, containerPadding —
// are the *v1* API. In v2 these were grouped into nested config objects
// (gridConfig, dragConfig, resizeConfig, etc.) and the bare top-level
// names are silently ignored on the default v2 entry point. That's why
// every previous fix appeared to land but nothing changed at runtime —
// the library was throwing away our props.
//
// Importing from 'react-grid-layout/legacy' gives us the v1-compatible
// wrapper that accepts all flat props as before. This preserves every
// piece of behavior the working stock-market-analysis-app reference
// relies on (which is also v1-shaped) without rewriting hundreds of
// layout config lines into v2's nested shape.
import GridLayoutImport from 'react-grid-layout/legacy'
const GridLayout = GridLayoutImport as any
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { Lock, Unlock, RotateCcw, Plus, X, GripVertical, Save, Check, Trash2, Star, ChevronUp, ChevronDown } from 'lucide-react'
import { useUserLayouts } from '@/lib/hooks/use-user-layouts'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TradingViewChart } from './tradingview-chart'
import { TradingViewAdvancedChart } from './tradingview-advanced-chart'
import { SectorPillBox } from './sector-pill-box'
import { ThemePillBox } from './theme-pill-box'
import { WatchlistPanel } from './watchlist-panel'
import { NewsWidget } from './news-widget'
import { MarketOverview } from './market-overview'
import { TechnicalIndicators } from './technical-indicators'
import { OptionsChain } from './options-chain'
import { MarketSectorPills } from './market-sector-pills'
import { CommoditiesPills } from './commodities-pills'
import { CompanyProfile } from './company-profile'
import { Fundamentals } from './fundamentals'
import { AnalystRatings } from './analyst-ratings'
import { Metrics } from './metrics'
import { Catalysts } from './catalysts'
import { PatternWatchlist } from './pattern-watchlist'
import { TickerHeaderBar } from './ticker-header-bar'
import { GexLevels } from './gex-levels'
import { TickerInfo } from './ticker-info'
import { SupportResistance } from './support-resistance'
import { CatalystsRisk } from './catalysts-risk'
import { QuickTradeBox } from './quick-trade-box'
import { QuickTradeIdeas } from './quick-trade-ideas'
import { WidgetErrorBoundary } from './widget-error-boundary'
import { NewsTickerBanner } from './news-ticker-banner'
import { DarkPoolBlocks } from './dark-pool-blocks'
import { OptionsFlow } from './options-flow'
import { DarkPoolFlow } from './dark-pool-flow'
import { KeyLevels } from './key-levels'
import { IVSurface } from './iv-surface'
import { SignalsFeed } from './signals-feed'
import { OiChanges } from './oi-changes'
// Combo widgets — unify related panels into a single grid cell to save space
import { DarkPoolCombo } from './dark-pool-combo'
import { OptionsCombo } from './options-combo'
import { LevelsCombo } from './levels-combo'
import {
  Cpu,
  Scale,
  Server,
  Shield,
  Flame,
  Stethoscope,
  Zap,
  Globe,
  BarChart2,
} from 'lucide-react'

// ─── Sortable wrapper for sidebar pill boxes ────────────────────────────────
function SortablePillItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 50 : 'auto',
      }}
      className="relative group/sortable"
    >
      {/* Drag handle — appears on hover at the left edge */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-0 bottom-0 w-3 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover/sortable:opacity-100 transition-opacity z-10"
        title="Drag to reorder"
      >
        <GripVertical className="w-2.5 h-2.5 text-muted-foreground/50" />
      </div>
      <div className="pl-3">
        {children}
      </div>
    </div>
  )
}

// STORAGE_KEY removed — localStorage persistence replaced with in-memory state.
// TODO: Supabase-backed named layout templates
// Layout is intentionally NOT persisted by default — the default layout is always restored
// on page load. Only explicit "Save Layout" in edit mode writes to storage.

const ALL_RESIZE_HANDLES: Array<'s' | 'w' | 'e' | 'n' | 'sw' | 'nw' | 'se' | 'ne'> = [
  's', 'w', 'e', 'n', 'sw', 'nw', 'se', 'ne',
]

// ─── Sector ticker data (10-20 per sector) ──────────────────────────────────

const SECTOR_DATA = {
  'sector-ai': {
    title: 'AI & Technology',
    accent: 'green' as const,
    tickers: [
      { symbol: 'NVDA', price: 924.73, change: 4.21, signal: 'BUY' as const, conviction: 0.94, trending: 1, isHolding: true },
      { symbol: 'META', price: 514.82, change: 2.87, signal: 'BUY' as const, conviction: 0.91, trending: 2 },
      { symbol: 'MSFT', price: 415.30, change: 1.54, signal: 'BUY' as const, conviction: 0.88, trending: 3 },
      { symbol: 'GOOGL', price: 175.20, change: 1.93, signal: 'BUY' as const, conviction: 0.86, trending: 4 },
      { symbol: 'AMD', price: 162.45, change: 3.14, signal: 'BUY' as const, conviction: 0.84, trending: 5 },
      { symbol: 'AMZN', price: 189.34, change: 1.22, signal: 'BUY' as const, conviction: 0.82, trending: 6 },
      { symbol: 'PLTR', price: 24.80, change: 3.88, signal: 'BUY' as const, conviction: 0.80, trending: 7, isHolding: true },
      { symbol: 'NOW', price: 892.40, change: 1.65, signal: 'BUY' as const, conviction: 0.78, trending: 8 },
      { symbol: 'CRM', price: 282.10, change: 0.94, signal: 'HOLD' as const, conviction: 0.72, trending: 9 },
      { symbol: 'ADBE', price: 482.30, change: 0.55, signal: 'HOLD' as const, conviction: 0.68, trending: 10 },
      { symbol: 'ORCL', price: 124.55, change: -0.44, signal: 'HOLD' as const, conviction: 0.65, trending: 11 },
      { symbol: 'IBM', price: 192.80, change: -0.88, signal: 'HOLD' as const, conviction: 0.60, trending: 12 },
      { symbol: 'SNOW', price: 142.30, change: -1.22, signal: 'SELL' as const, conviction: 0.72, trending: 13 },
      { symbol: 'DDOG', price: 128.40, change: -1.55, signal: 'SELL' as const, conviction: 0.68, trending: 14 },
      { symbol: 'ZS', price: 202.10, change: -2.10, signal: 'SELL' as const, conviction: 0.65, trending: 15 },
    ],
  },
  'sector-banking': {
    title: 'Banking & Finance',
    accent: 'gold' as const,
    tickers: [
      { symbol: 'JPM', price: 213.40, change: 2.10, signal: 'BUY' as const, conviction: 0.92, trending: 1 },
      { symbol: 'GS', price: 472.15, change: 1.85, signal: 'BUY' as const, conviction: 0.89, trending: 2 },
      { symbol: 'MS', price: 102.80, change: 1.40, signal: 'BUY' as const, conviction: 0.86, trending: 3 },
      { symbol: 'V', price: 284.50, change: 1.22, signal: 'BUY' as const, conviction: 0.84, trending: 4 },
      { symbol: 'MA', price: 472.30, change: 1.05, signal: 'BUY' as const, conviction: 0.82, trending: 5 },
      { symbol: 'BAC', price: 38.92, change: 0.75, signal: 'BUY' as const, conviction: 0.79, trending: 6 },
      { symbol: 'BRK.B', price: 412.20, change: 0.65, signal: 'BUY' as const, conviction: 0.77, trending: 7 },
      { symbol: 'SCHW', price: 72.40, change: 0.42, signal: 'HOLD' as const, conviction: 0.70, trending: 8 },
      { symbol: 'WFC', price: 57.34, change: 0.28, signal: 'HOLD' as const, conviction: 0.68, trending: 9 },
      { symbol: 'BLK', price: 824.30, change: -0.18, signal: 'HOLD' as const, conviction: 0.65, trending: 10 },
      { symbol: 'C', price: 64.10, change: -0.32, signal: 'HOLD' as const, conviction: 0.62, trending: 11 },
      { symbol: 'AXP', price: 229.60, change: -0.55, signal: 'SELL' as const, conviction: 0.74, trending: 12 },
      { symbol: 'USB', price: 42.80, change: -1.10, signal: 'SELL' as const, conviction: 0.70, trending: 13 },
      { symbol: 'PNC', price: 162.40, change: -1.44, signal: 'SELL' as const, conviction: 0.66, trending: 14 },
    ],
  },
  'sector-energy': {
    title: 'Energy & Industrials',
    accent: 'red' as const,
    tickers: [
      { symbol: 'XOM', price: 112.40, change: 2.44, signal: 'BUY' as const, conviction: 0.90, trending: 1 },
      { symbol: 'SLB', price: 43.20, change: 3.10, signal: 'BUY' as const, conviction: 0.87, trending: 2 },
      { symbol: 'CVX', price: 154.30, change: 1.67, signal: 'BUY' as const, conviction: 0.84, trending: 3 },
      { symbol: 'COP', price: 122.80, change: 1.42, signal: 'BUY' as const, conviction: 0.81, trending: 4 },
      { symbol: 'EOG', price: 128.50, change: 1.18, signal: 'BUY' as const, conviction: 0.78, trending: 5 },
      { symbol: 'PXD', price: 224.30, change: 0.95, signal: 'BUY' as const, conviction: 0.75, trending: 6 },
      { symbol: 'HAL', price: 34.55, change: 0.83, signal: 'HOLD' as const, conviction: 0.71, trending: 7 },
      { symbol: 'DVN', price: 44.20, change: 0.55, signal: 'HOLD' as const, conviction: 0.68, trending: 8 },
      { symbol: 'MPC', price: 172.40, change: 0.22, signal: 'HOLD' as const, conviction: 0.65, trending: 9 },
      { symbol: 'PSX', price: 143.20, change: -0.38, signal: 'HOLD' as const, conviction: 0.62, trending: 10 },
      { symbol: 'VLO', price: 135.10, change: -0.72, signal: 'SELL' as const, conviction: 0.70, trending: 11 },
      { symbol: 'OXY', price: 59.40, change: -1.20, signal: 'SELL' as const, conviction: 0.72, trending: 12 },
      { symbol: 'MRO', price: 26.80, change: -1.55, signal: 'SELL' as const, conviction: 0.68, trending: 13 },
    ],
  },
  'sector-healthcare': {
    title: 'Healthcare & BioPharma',
    accent: 'cyan' as const,
    tickers: [
      { symbol: 'LLY', price: 804.20, change: 3.54, signal: 'BUY' as const, conviction: 0.96, trending: 1, isHolding: true },
      { symbol: 'NVO', price: 122.40, change: 2.90, signal: 'BUY' as const, conviction: 0.93, trending: 2 },
      { symbol: 'UNH', price: 524.30, change: 1.88, signal: 'BUY' as const, conviction: 0.90, trending: 3 },
      { symbol: 'ABBV', price: 175.60, change: 1.72, signal: 'BUY' as const, conviction: 0.88, trending: 4 },
      { symbol: 'TMO', price: 582.40, change: 1.44, signal: 'BUY' as const, conviction: 0.85, trending: 5 },
      { symbol: 'MRK', price: 128.30, change: 0.88, signal: 'BUY' as const, conviction: 0.82, trending: 6 },
      { symbol: 'DHR', price: 252.10, change: 0.65, signal: 'BUY' as const, conviction: 0.79, trending: 7 },
      { symbol: 'ABT', price: 112.40, change: 0.44, signal: 'HOLD' as const, conviction: 0.72, trending: 8 },
      { symbol: 'AMGN', price: 282.10, change: 0.22, signal: 'HOLD' as const, conviction: 0.70, trending: 9 },
      { symbol: 'JNJ', price: 152.40, change: -0.18, signal: 'HOLD' as const, conviction: 0.66, trending: 10 },
      { symbol: 'GILD', price: 78.30, change: -0.55, signal: 'HOLD' as const, conviction: 0.63, trending: 11 },
      { symbol: 'BMY', price: 52.80, change: -0.94, signal: 'SELL' as const, conviction: 0.68, trending: 12 },
      { symbol: 'PFE', price: 26.10, change: -1.44, signal: 'SELL' as const, conviction: 0.72, trending: 13 },
      { symbol: 'BIIB', price: 202.40, change: -2.10, signal: 'SELL' as const, conviction: 0.65, trending: 14 },
    ],
  },
  'sector-consumer': {
    title: 'Consumer & Retail',
    accent: 'green' as const,
    tickers: [
      { symbol: 'COST', price: 882.40, change: 2.24, signal: 'BUY' as const, conviction: 0.92, trending: 1 },
      { symbol: 'WMT', price: 68.20, change: 1.55, signal: 'BUY' as const, conviction: 0.88, trending: 2 },
      { symbol: 'AMZN', price: 189.34, change: 1.22, signal: 'BUY' as const, conviction: 0.85, trending: 3 },
      { symbol: 'HD', price: 344.10, change: 0.92, signal: 'BUY' as const, conviction: 0.82, trending: 4 },
      { symbol: 'LOW', price: 228.40, change: 0.78, signal: 'BUY' as const, conviction: 0.79, trending: 5 },
      { symbol: 'TJX', price: 104.20, change: 0.65, signal: 'BUY' as const, conviction: 0.76, trending: 6 },
      { symbol: 'PG', price: 168.30, change: 0.44, signal: 'HOLD' as const, conviction: 0.72, trending: 7 },
      { symbol: 'KO', price: 62.40, change: 0.28, signal: 'HOLD' as const, conviction: 0.68, trending: 8 },
      { symbol: 'PEP', price: 172.80, change: 0.15, signal: 'HOLD' as const, conviction: 0.65, trending: 9 },
      { symbol: 'MCD', price: 278.50, change: -0.34, signal: 'HOLD' as const, conviction: 0.62, trending: 10 },
      { symbol: 'SBUX', price: 78.30, change: -0.88, signal: 'SELL' as const, conviction: 0.71, trending: 11 },
      { symbol: 'NKE', price: 85.20, change: -1.10, signal: 'SELL' as const, conviction: 0.68, trending: 12 },
      { symbol: 'TGT', price: 142.60, change: -1.55, signal: 'SELL' as const, conviction: 0.72, trending: 13 },
      { symbol: 'DG', price: 128.40, change: -2.20, signal: 'SELL' as const, conviction: 0.75, trending: 14 },
    ],
  },
  'sector-semis': {
    title: 'Semiconductors',
    accent: 'gold' as const,
    tickers: [
      { symbol: 'NVDA', price: 924.73, change: 4.21, signal: 'BUY' as const, conviction: 0.96, trending: 1, isHolding: true },
      { symbol: 'AVGO', price: 1422.10, change: 3.20, signal: 'BUY' as const, conviction: 0.93, trending: 2 },
      { symbol: 'AMD', price: 162.45, change: 3.14, signal: 'BUY' as const, conviction: 0.90, trending: 3 },
      { symbol: 'TSM', price: 142.80, change: 2.55, signal: 'BUY' as const, conviction: 0.88, trending: 4 },
      { symbol: 'MU', price: 128.40, change: 2.44, signal: 'BUY' as const, conviction: 0.86, trending: 5 },
      { symbol: 'AMAT', price: 202.30, change: 1.82, signal: 'BUY' as const, conviction: 0.83, trending: 6 },
      { symbol: 'LRCX', price: 984.20, change: 1.55, signal: 'BUY' as const, conviction: 0.80, trending: 7 },
      { symbol: 'MRVL', price: 72.40, change: 1.22, signal: 'BUY' as const, conviction: 0.77, trending: 8 },
      { symbol: 'KLAC', price: 762.50, change: 0.94, signal: 'HOLD' as const, conviction: 0.72, trending: 9 },
      { symbol: 'SNPS', price: 582.30, change: 0.55, signal: 'HOLD' as const, conviction: 0.68, trending: 10 },
      { symbol: 'CDNS', price: 292.40, change: 0.22, signal: 'HOLD' as const, conviction: 0.65, trending: 11 },
      { symbol: 'QCOM', price: 174.20, change: -0.65, signal: 'HOLD' as const, conviction: 0.62, trending: 12 },
      { symbol: 'ON', price: 72.80, change: -1.10, signal: 'SELL' as const, conviction: 0.70, trending: 13 },
      { symbol: 'INTC', price: 31.40, change: -2.10, signal: 'SELL' as const, conviction: 0.78, trending: 14 },
      { symbol: 'TXN', price: 172.30, change: -1.44, signal: 'SELL' as const, conviction: 0.65, trending: 15 },
    ],
  },
}

// ─── Theme ticker data (10-20 per theme) ────────────────────────────────────

const THEME_DATA = {
  'theme-ai': {
    title: 'AI Industry',
    icon: Cpu,
    tickers: [
      { symbol: 'NVDA', price: 924.73, change: 4.21, signal: 'BUY' as const, conviction: 0.96, trending: 1, isHolding: true },
      { symbol: 'SMCI', price: 744.20, change: 5.12, signal: 'BUY' as const, conviction: 0.93, trending: 2 },
      { symbol: 'MSFT', price: 415.30, change: 1.54, signal: 'BUY' as const, conviction: 0.90, trending: 3 },
      { symbol: 'GOOGL', price: 175.20, change: 1.93, signal: 'BUY' as const, conviction: 0.87, trending: 4 },
      { symbol: 'META', price: 514.82, change: 2.87, signal: 'BUY' as const, conviction: 0.85, trending: 5 },
      { symbol: 'PLTR', price: 24.80, change: 3.88, signal: 'BUY' as const, conviction: 0.83, trending: 6, isHolding: true },
      { symbol: 'AMD', price: 162.45, change: 3.14, signal: 'BUY' as const, conviction: 0.80, trending: 7 },
      { symbol: 'ORCL', price: 124.55, change: 2.33, signal: 'BUY' as const, conviction: 0.78, trending: 8 },
      { symbol: 'NOW', price: 892.40, change: 1.65, signal: 'BUY' as const, conviction: 0.75, trending: 9 },
      { symbol: 'CRM', price: 282.10, change: 0.94, signal: 'HOLD' as const, conviction: 0.70, trending: 10 },
      { symbol: 'SNOW', price: 142.30, change: -0.44, signal: 'HOLD' as const, conviction: 0.65, trending: 11 },
      { symbol: 'PATH', price: 12.40, change: -1.22, signal: 'SELL' as const, conviction: 0.68, trending: 12 },
    ],
  },
  'theme-infra': {
    title: 'AI Infrastructure',
    icon: Server,
    tickers: [
      { symbol: 'VST', price: 89.40, change: 6.22, signal: 'BUY' as const, conviction: 0.95, trending: 1, isHolding: true },
      { symbol: 'AVGO', price: 1422.10, change: 3.20, signal: 'BUY' as const, conviction: 0.92, trending: 2 },
      { symbol: 'CEG', price: 224.80, change: 4.10, signal: 'BUY' as const, conviction: 0.90, trending: 3 },
      { symbol: 'ANET', price: 312.50, change: 2.44, signal: 'BUY' as const, conviction: 0.87, trending: 4 },
      { symbol: 'NXT', price: 52.40, change: 2.10, signal: 'BUY' as const, conviction: 0.84, trending: 5 },
      { symbol: 'DELL', price: 142.80, change: 1.88, signal: 'BUY' as const, conviction: 0.81, trending: 6 },
      { symbol: 'HPE', price: 18.40, change: 1.22, signal: 'BUY' as const, conviction: 0.78, trending: 7 },
      { symbol: 'EQIX', price: 892.30, change: 0.77, signal: 'HOLD' as const, conviction: 0.72, trending: 8 },
      { symbol: 'DLR', price: 142.20, change: 0.44, signal: 'HOLD' as const, conviction: 0.68, trending: 9 },
      { symbol: 'ETN', price: 312.40, change: -0.22, signal: 'HOLD' as const, conviction: 0.65, trending: 10 },
      { symbol: 'AME', price: 172.80, change: -0.55, signal: 'SELL' as const, conviction: 0.62, trending: 11 },
    ],
  },
  'theme-defense': {
    title: 'Defense & Govt',
    icon: Shield,
    tickers: [
      { symbol: 'PLTR', price: 24.80, change: 3.88, signal: 'BUY' as const, conviction: 0.93, trending: 1, isHolding: true },
      { symbol: 'RTX', price: 112.40, change: 1.55, signal: 'BUY' as const, conviction: 0.88, trending: 2 },
      { symbol: 'LMT', price: 482.30, change: 1.22, signal: 'BUY' as const, conviction: 0.85, trending: 3 },
      { symbol: 'GD', price: 292.80, change: 0.92, signal: 'BUY' as const, conviction: 0.82, trending: 4 },
      { symbol: 'NOC', price: 512.10, change: 0.65, signal: 'BUY' as const, conviction: 0.79, trending: 5 },
      { symbol: 'LHX', price: 224.40, change: 0.44, signal: 'HOLD' as const, conviction: 0.72, trending: 6 },
      { symbol: 'HII', price: 272.30, change: 0.22, signal: 'HOLD' as const, conviction: 0.68, trending: 7 },
      { symbol: 'LDOS', price: 152.40, change: -0.18, signal: 'HOLD' as const, conviction: 0.65, trending: 8 },
      { symbol: 'SAIC', price: 124.80, change: -0.55, signal: 'HOLD' as const, conviction: 0.62, trending: 9 },
      { symbol: 'BA', price: 178.40, change: -2.33, signal: 'SELL' as const, conviction: 0.74, trending: 10 },
    ],
  },
  'theme-energy': {
    title: 'Energy Transition',
    icon: Flame,
    tickers: [
      { symbol: 'XOM', price: 112.40, change: 2.44, signal: 'BUY' as const, conviction: 0.90, trending: 1 },
      { symbol: 'SLB', price: 43.20, change: 3.10, signal: 'BUY' as const, conviction: 0.87, trending: 2 },
      { symbol: 'CVX', price: 154.30, change: 1.67, signal: 'BUY' as const, conviction: 0.84, trending: 3 },
      { symbol: 'NEE', price: 72.40, change: 1.44, signal: 'BUY' as const, conviction: 0.81, trending: 4 },
      { symbol: 'COP', price: 122.80, change: 1.12, signal: 'BUY' as const, conviction: 0.78, trending: 5 },
      { symbol: 'FSLR', price: 172.30, change: 0.88, signal: 'BUY' as const, conviction: 0.75, trending: 6 },
      { symbol: 'ENPH', price: 112.40, change: 0.55, signal: 'HOLD' as const, conviction: 0.70, trending: 7 },
      { symbol: 'VST', price: 89.40, change: 0.22, signal: 'HOLD' as const, conviction: 0.67, trending: 8 },
      { symbol: 'CEG', price: 224.80, change: -0.44, signal: 'HOLD' as const, conviction: 0.64, trending: 9 },
      { symbol: 'OXY', price: 59.40, change: -1.20, signal: 'SELL' as const, conviction: 0.72, trending: 10 },
      { symbol: 'RUN', price: 12.80, change: -2.55, signal: 'SELL' as const, conviction: 0.68, trending: 11 },
    ],
  },
  'theme-health': {
    title: 'Healthcare Innovation',
    icon: Stethoscope,
    tickers: [
      { symbol: 'LLY', price: 804.20, change: 3.54, signal: 'BUY' as const, conviction: 0.97, trending: 1, isHolding: true },
      { symbol: 'NVO', price: 122.40, change: 2.90, signal: 'BUY' as const, conviction: 0.94, trending: 2 },
      { symbol: 'ABBV', price: 175.60, change: 1.72, signal: 'BUY' as const, conviction: 0.90, trending: 3 },
      { symbol: 'VRTX', price: 424.30, change: 1.55, signal: 'BUY' as const, conviction: 0.87, trending: 4 },
      { symbol: 'REGN', price: 982.40, change: 1.22, signal: 'BUY' as const, conviction: 0.84, trending: 5 },
      { symbol: 'ISRG', price: 412.80, change: 0.88, signal: 'BUY' as const, conviction: 0.81, trending: 6 },
      { symbol: 'DXCM', price: 72.40, change: 0.55, signal: 'HOLD' as const, conviction: 0.74, trending: 7 },
      { symbol: 'AMGN', price: 282.10, change: 0.22, signal: 'HOLD' as const, conviction: 0.70, trending: 8 },
      { symbol: 'MRNA', price: 102.30, change: -0.88, signal: 'HOLD' as const, conviction: 0.65, trending: 9 },
      { symbol: 'PFE', price: 26.10, change: -1.44, signal: 'SELL' as const, conviction: 0.72, trending: 10 },
      { symbol: 'BNTX', price: 82.40, change: -2.10, signal: 'SELL' as const, conviction: 0.68, trending: 11 },
    ],
  },
  'theme-semis': {
    title: 'Chip Cycle',
    icon: Zap,
    tickers: [
      { symbol: 'NVDA', price: 924.73, change: 4.21, signal: 'BUY' as const, conviction: 0.96, trending: 1, isHolding: true },
      { symbol: 'AMD', price: 162.45, change: 3.14, signal: 'BUY' as const, conviction: 0.92, trending: 2 },
      { symbol: 'MU', price: 128.40, change: 2.44, signal: 'BUY' as const, conviction: 0.89, trending: 3 },
      { symbol: 'AVGO', price: 1422.10, change: 3.20, signal: 'BUY' as const, conviction: 0.86, trending: 4 },
      { symbol: 'TSM', price: 142.80, change: 2.55, signal: 'BUY' as const, conviction: 0.83, trending: 5 },
      { symbol: 'AMAT', price: 202.30, change: 1.82, signal: 'BUY' as const, conviction: 0.80, trending: 6 },
      { symbol: 'LRCX', price: 984.20, change: 1.44, signal: 'BUY' as const, conviction: 0.77, trending: 7 },
      { symbol: 'MRVL', price: 72.40, change: 0.88, signal: 'HOLD' as const, conviction: 0.72, trending: 8 },
      { symbol: 'KLAC', price: 762.50, change: 0.55, signal: 'HOLD' as const, conviction: 0.68, trending: 9 },
      { symbol: 'QCOM', price: 174.20, change: -0.65, signal: 'HOLD' as const, conviction: 0.64, trending: 10 },
      { symbol: 'INTC', price: 31.40, change: -2.10, signal: 'SELL' as const, conviction: 0.78, trending: 11 },
      { symbol: 'ARM', price: 142.30, change: -1.55, signal: 'SELL' as const, conviction: 0.65, trending: 12 },
    ],
  },
  'theme-macro': {
    title: 'Macro & Global',
    icon: Globe,
    tickers: [
      { symbol: 'GLD', price: 214.30, change: 1.88, signal: 'BUY' as const, conviction: 0.85, trending: 1 },
      { symbol: 'SLV', price: 28.40, change: 2.44, signal: 'BUY' as const, conviction: 0.80, trending: 2 },
      { symbol: 'UUP', price: 28.20, change: 0.55, signal: 'HOLD' as const, conviction: 0.68, trending: 3 },
      { symbol: 'SPY', price: 542.80, change: 0.45, signal: 'HOLD' as const, conviction: 0.65, trending: 4 },
      { symbol: 'QQQ', price: 482.10, change: 0.88, signal: 'HOLD' as const, conviction: 0.62, trending: 5 },
      { symbol: 'IWM', price: 202.30, change: -0.22, signal: 'HOLD' as const, conviction: 0.60, trending: 6 },
      { symbol: 'EFA', price: 82.40, change: -0.55, signal: 'HOLD' as const, conviction: 0.58, trending: 7 },
      { symbol: 'EEM', price: 42.10, change: -0.88, signal: 'SELL' as const, conviction: 0.70, trending: 8 },
      { symbol: 'TLT', price: 92.40, change: -1.10, signal: 'SELL' as const, conviction: 0.72, trending: 9 },
      { symbol: 'HYG', price: 78.30, change: -0.44, signal: 'SELL' as const, conviction: 0.65, trending: 10 },
    ],
  },
  'theme-earnings': {
    title: 'Earnings Momentum',
    icon: BarChart2,
    tickers: [
      { symbol: 'META', price: 514.82, change: 2.87, signal: 'BUY' as const, conviction: 0.94, trending: 1 },
      { symbol: 'AMZN', price: 189.34, change: 1.22, signal: 'BUY' as const, conviction: 0.90, trending: 2 },
      { symbol: 'GOOGL', price: 175.20, change: 1.93, signal: 'BUY' as const, conviction: 0.87, trending: 3 },
      { symbol: 'NFLX', price: 624.30, change: 1.55, signal: 'BUY' as const, conviction: 0.84, trending: 4 },
      { symbol: 'MSFT', price: 415.30, change: 1.54, signal: 'BUY' as const, conviction: 0.81, trending: 5 },
      { symbol: 'NOW', price: 892.40, change: 1.22, signal: 'BUY' as const, conviction: 0.78, trending: 6 },
      { symbol: 'CRM', price: 282.10, change: 0.94, signal: 'HOLD' as const, conviction: 0.72, trending: 7 },
      { symbol: 'AAPL', price: 182.50, change: -0.22, signal: 'HOLD' as const, conviction: 0.68, trending: 8 },
      { symbol: 'ADBE', price: 482.30, change: -0.55, signal: 'HOLD' as const, conviction: 0.65, trending: 9 },
      { symbol: 'TSLA', price: 178.20, change: -2.44, signal: 'SELL' as const, conviction: 0.72, trending: 10 },
      { symbol: 'PYPL', price: 62.40, change: -1.88, signal: 'SELL' as const, conviction: 0.68, trending: 11 },
    ],
  },
  'theme-political': {
    title: 'Political & M&A',
    icon: Scale,
    tickers: [
      { symbol: 'GLD', price: 214.30, change: 1.88, signal: 'BUY' as const, conviction: 0.86, trending: 1 },
      { symbol: 'XLF', price: 42.15, change: 1.22, signal: 'BUY' as const, conviction: 0.79, trending: 2 },
      { symbol: 'DJT', price: 32.40, change: 8.44, signal: 'BUY' as const, conviction: 0.72, trending: 3 },
      { symbol: 'SPY', price: 542.80, change: 0.45, signal: 'HOLD' as const, conviction: 0.65, trending: 4 },
      { symbol: 'XLE', price: 92.30, change: 0.22, signal: 'HOLD' as const, conviction: 0.62, trending: 5 },
      { symbol: 'XLV', price: 142.10, change: -0.18, signal: 'HOLD' as const, conviction: 0.60, trending: 6 },
      { symbol: 'TLT', price: 92.40, change: -1.10, signal: 'SELL' as const, conviction: 0.72, trending: 7 },
      { symbol: 'UUP', price: 28.20, change: -0.33, signal: 'SELL' as const, conviction: 0.65, trending: 8 },
    ],
  },
}

// ─── Right-side grid widgets ─────────────────────────���───────────────────────

type RightWidgetType =
  | 'chart' | 'watchlist' | 'news' | 'market-overview' | 'technicals'
  | 'options-chain' | 'company-profile' | 'fundamentals' | 'analyst-ratings'
  | 'metrics' | 'catalysts' | 'gex-levels' | 'ticker-info'
  | 'support-resistance' | 'catalysts-risk' | 'quick-trade' | 'trade-ideas'
  | 'dark-pool-blocks'
  // Bundle-backed UW widgets (single shared SWR fetch via useTickerBundle)
  | 'options-flow' | 'dark-pool-flow' | 'key-levels'
  | 'iv-surface' | 'signals-feed' | 'oi-changes'
  // Combo widgets — combine related panels into one grid cell
  | 'dark-pool-combo' | 'options-combo' | 'levels-combo'

interface RightWidget {
  id: string
  type: RightWidgetType
  title: string
}

// Master widget registry grouped by section.
// Section sub-headers shown in the Widgets dropdown so users can scan
// quickly and find the right widget without scrolling a flat list of 17.
const WIDGET_SECTIONS: Array<{ section: string; widgets: RightWidget[] }> = [
  {
    section: 'Stock Info',
    widgets: [
      { id: 'ticker-info',        type: 'ticker-info',        title: 'Ticker Info' },
      { id: 'company-profile',    type: 'company-profile',    title: 'Company Profile' },
      { id: 'fundamentals',       type: 'fundamentals',       title: 'Fundamentals' },
      { id: 'metrics',            type: 'metrics',            title: 'Metrics' },
    ],
  },
  {
    section: 'Charts & Technicals',
    widgets: [
      { id: 'chart',              type: 'chart',              title: 'Chart' },
      { id: 'technicals',         type: 'technicals',         title: 'Technical Indicators' },
      { id: 'support-resistance', type: 'support-resistance', title: 'Support & Resistance' },
    ],
  },
  {
    section: 'Catalysts & Analyst',
    widgets: [
      { id: 'analyst-ratings',    type: 'analyst-ratings',    title: 'Analyst Ratings' },
      { id: 'catalysts',          type: 'catalysts',          title: 'Catalysts' },
      { id: 'catalysts-risk',     type: 'catalysts-risk',     title: 'Catalysts & Risk' },
      { id: 'news',               type: 'news',               title: 'Market News' },
    ],
  },
  {
    section: 'Combos',
    widgets: [
      // Combine related panels into a single grid cell to save space.
      // Each combo dispatches to the same underlying widgets, so saved
      // layouts referencing the standalone IDs continue to work.
      { id: 'options-combo',      type: 'options-combo',      title: 'Options Chain + Flow' },
      { id: 'dark-pool-combo',    type: 'dark-pool-combo',    title: 'Dark Pool Blocks + Flow' },
      { id: 'levels-combo',       type: 'levels-combo',       title: 'Levels (Key / S&R / GEX)' },
    ],
  },
  {
    section: 'Options & Flow',
    widgets: [
      { id: 'options-chain',      type: 'options-chain',      title: 'Options Chain' },
      { id: 'options-flow',       type: 'options-flow',       title: 'Options Flow (Live)' },
      { id: 'oi-changes',         type: 'oi-changes',         title: 'OI Changes' },
      { id: 'gex-levels',         type: 'gex-levels',         title: 'GEX Levels' },
      { id: 'key-levels',         type: 'key-levels',         title: 'Key Levels & Max Pain' },
      { id: 'iv-surface',         type: 'iv-surface',         title: 'IV Surface' },
      { id: 'dark-pool-blocks',   type: 'dark-pool-blocks',   title: 'Dark Pool / Blocks' },
      { id: 'dark-pool-flow',     type: 'dark-pool-flow',     title: 'Dark Pool Flow (Live)' },
      { id: 'signals-feed',       type: 'signals-feed',       title: 'Signals (Flow + Congress + Insider)' },
    ],
  },
  {
    section: 'Trading',
    widgets: [
      { id: 'quick-trade',        type: 'quick-trade',        title: 'Quick Trade' },
      { id: 'trade-ideas',        type: 'trade-ideas',        title: 'Trade Ideas' },
      { id: 'watchlist',          type: 'watchlist',          title: 'Watchlist' },
    ],
  },
  {
    section: 'Market',
    widgets: [
      { id: 'market-overview',    type: 'market-overview',    title: 'Market Overview' },
    ],
  },
]

// Flattened version derived from sections — used for layout lookups, default set, addWidget
const ALL_AVAILABLE_WIDGETS: RightWidget[] = WIDGET_SECTIONS.flatMap(s => s.widgets)

// react-grid-layout: which sides of each widget show resize handles.
// CRITICAL: this must be set on EVERY individual layout item (not just as a
// prop on <GridLayout/>) for react-grid-layout to render all 8 handles.
// When a layout item lacks a `resizeHandles` field, RGL falls back to its
// internal default of ['se'] only — which is exactly the bug the user was
// seeing (only the SE corner resized, every other side felt locked). The
// working stock-market-analysis-app reference does exactly this — sets the
// field on every item — and that's the thing we were missing.
const ALL_HANDLES = ['s', 'n', 'e', 'w', 'se', 'sw', 'ne', 'nw'] as const

// FACTORY DEFAULT LAYOUT
// Captured from the user's browser-customized "published" layout on 2026-05-02.
// This is the exact arrangement every new user sees on first login, and the
// "Default Layout" entry in the layout menu always restores this snapshot.
// It is NOT one of the user's 5 saved layouts — it lives in code and is
// always available regardless of how many custom layouts they have.
//
// To re-capture in the future: open published site -> DevTools -> Console:
//   copy(localStorage.getItem('v0-widget-grid-layout-v7'))
// Then strip the runtime fields (`moved`, `static`, `resizeHandles`) — those
// are added by react-grid-layout at runtime and shouldn't be persisted in
// the source default. visibleLayout in this file re-stamps resizeHandles
// on every render.
const DEFAULT_LAYOUT: any[] = [
  { i: 'ticker-info',     x: 0,  y: 0,   w: 3,  h: 8  },
  { i: 'iv-surface',      x: 0,  y: 8,   w: 3,  h: 11 },
  { i: 'company-profile', x: 3,  y: 0,   w: 5,  h: 19 },
  { i: 'levels-combo',    x: 8,  y: 0,   w: 4,  h: 19 },
  { i: 'technicals',      x: 12, y: 0,   w: 4,  h: 19 },
  { i: 'fundamentals',    x: 16, y: 0,   w: 4,  h: 19 },
  { i: 'analyst-ratings', x: 20, y: 0,   w: 4,  h: 13 },
  { i: 'signals-feed',    x: 20, y: 13,  w: 4,  h: 15 },
  { i: 'chart',           x: 0,  y: 19,  w: 13, h: 67 },
  { i: 'metrics',         x: 13, y: 19,  w: 3,  h: 31 },
  { i: 'catalysts-risk',  x: 16, y: 19,  w: 4,  h: 31 },
  { i: 'news',            x: 20, y: 28,  w: 4,  h: 45 },
  { i: 'watchlist',       x: 13, y: 50,  w: 4,  h: 79 },
  { i: 'options-combo',   x: 0,  y: 86,  w: 13, h: 54 },
  { i: 'trade-ideas',     x: 17, y: 98,  w: 7,  h: 18 },
]

// Default widget set shown on first load — matches DEFAULT_LAYOUT above.
// Order matters because rightWidgets controls the sidebar order.
const DEFAULT_WIDGET_IDS = DEFAULT_LAYOUT.map(l => l.i)
const DEFAULT_RIGHT_WIDGETS: RightWidget[] = DEFAULT_WIDGET_IDS
  .map(id => ALL_AVAILABLE_WIDGETS.find(w => w.id === id))
  .filter((w): w is RightWidget => Boolean(w))

interface SavedState {
  layout: any[]
  rightWidgets: RightWidget[]
  userSaved?: boolean
}

interface WidgetGridProps {
  selectedTicker: string
  onSelectTicker: (t: string) => void
}

export function WidgetGrid({ selectedTicker, onSelectTicker }: WidgetGridProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  
  const [layout, setLayout] = useState(DEFAULT_LAYOUT)
  const [rightWidgets, setRightWidgets] = useState<RightWidget[]>(DEFAULT_RIGHT_WIDGETS)
  // Edit mode is ON by default so all widgets are immediately drag/resize-able
  // from all 4 corners + 4 edges. User can toggle it off via the Lock button
  // to prevent accidental moves.
  // Default to LOCKED. User clicks "Edit Layout" in the layout menu to
  // unlock dragging/resizing. Most users want a fixed Bloomberg-style
  // dashboard, not an accidentally-resized one.
  const [isEditMode, setIsEditMode] = useState(false)

  // (Collapse-to-header state lives further down, alongside the persistence
  // keys — see COLLAPSED_KEY / COLLAPSED_H / collapsedHeights / toggleCollapse.)

  const [showLayoutMenu, setShowLayoutMenu] = useState(false)
  const [layoutSaved, setLayoutSaved] = useState(false)
  
  // SAVED LAYOUTS — Supabase-backed via useUserLayouts.
  // Each user can store up to 5 named layouts in public.user_layouts. The
  // 5-cap is enforced server-side by a Postgres trigger. This hook also
  // auto-migrates any pre-Supabase localStorage layouts on first login.
  // The factory DEFAULT_LAYOUT (above) is always available regardless of
  // how many user layouts exist — it lives in code and shows up under
  // "System Layouts" in the menu.
  const {
    user,
    layouts: userLayouts,
    saveLayout: saveLayoutToSupabase,
    deleteLayout: deleteLayoutFromSupabase,
    setAsDefault: setAsDefaultInSupabase,
  } = useUserLayouts()

  // Adapter: map Supabase rows back to the {name, layout, widgets} shape
  // the existing layout menu UI was already built around. Zero UI changes
  // needed downstream — just point the existing references at this.
  const savedLayouts = useMemo(
    () => userLayouts.map(l => ({
      id: l.id,
      name: l.name,
      layout: l.layout,
      widgets: l.widgets as RightWidget[],
    })),
    [userLayouts]
  )

  // The user's chosen default name is now derived from Supabase rather than
  // tracked locally. The DB trigger guarantees only one row has is_default=true.
  const defaultLayoutNameFromDb = useMemo(
    () => userLayouts.find(l => l.isDefault)?.name ?? null,
    [userLayouts]
  )

  const [newLayoutName, setNewLayoutName] = useState('')
  const [layoutSaveError, setLayoutSaveError] = useState<string | null>(null)
  const [wrapperWidth, setWrapperWidth] = useState(1200)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Sidebar drag-to-reorder state — persisted to localStorage (SSR-safe)
  const [sectorOrder, setSectorOrder] = useState<string[]>(() => Object.keys(SECTOR_DATA))
  const [themeOrder, setThemeOrder]   = useState<string[]>(() => Object.keys(THEME_DATA))

  // Hydrate from localStorage AFTER mount (avoids SSR/hydration mismatch)
  useEffect(() => {
    try {
      const sec = localStorage.getItem('sidebar-sector-order')
      if (sec) {
        const parsed = JSON.parse(sec) as string[]
        if (Array.isArray(parsed) && parsed.every(k => k in SECTOR_DATA)) setSectorOrder(parsed)
      }
    } catch { /* ignore */ }
    try {
      const thm = localStorage.getItem('sidebar-theme-order')
      if (thm) {
        const parsed = JSON.parse(thm) as string[]
        if (Array.isArray(parsed) && parsed.every(k => k in THEME_DATA)) setThemeOrder(parsed)
      }
    } catch { /* ignore */ }
  }, [])

  const sectorSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const themeSensors  = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const handleSectorDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setSectorOrder(prev => {
      const next = arrayMove(prev, prev.indexOf(String(active.id)), prev.indexOf(String(over.id)))
      try { localStorage.setItem('sidebar-sector-order', JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }, [])

  const handleThemeDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setThemeOrder(prev => {
      const next = arrayMove(prev, prev.indexOf(String(active.id)), prev.indexOf(String(over.id)))
      try { localStorage.setItem('sidebar-theme-order', JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }, [])

  // Track only wrapper width for responsive grid. Height is NOT tracked
  // because rowHeight is now fixed (see below) — measuring wrapper height
  // caused a feedback loop where taller widgets made the wrapper taller,
  // which made rowHeight bigger, which made widgets even taller.
  useEffect(() => {
    const updateSize = () => {
      if (wrapperRef.current) {
        setWrapperWidth(wrapperRef.current.offsetWidth)
      }
    }
    updateSize()
    const resizeObserver = new ResizeObserver(updateSize)
    if (wrapperRef.current) resizeObserver.observe(wrapperRef.current)
    return () => resizeObserver.disconnect()
  }, [])

  // Fixed 10px rowHeight. With our default layout (~80 rows tall) the whole
  // dashboard is ~800px — fits a standard laptop viewport without scroll.
  // Users can unlock "Edit Layout" mode to resize widgets if they want.
  const rowHeight = 10

  // localStorage key for the LIVE working draft only. Saved/named layouts
  // and the user's chosen default both live in Supabase now (see
  // useUserLayouts hook above). The draft key keeps in-progress edits
  // alive across HMR / refresh without hitting the database on every drag.
  //
  // Bump VERSION when DEFAULT_LAYOUT changes to force every browser to
  // discard its stale draft and pick up the new default. v8 = ships the
  // captured published layout (15 widgets, freeform). The cleanup loop
  // below auto-deletes all earlier vN keys so users don't accumulate
  // stale data, and (more importantly) so the old draft can't override
  // the new default on first mount.
  const LAYOUT_VERSION = 8
  const STORAGE_KEY = `v0-widget-grid-layout-v${LAYOUT_VERSION}`
  // Track whether we've finished the first-mount restore. We don't want to
  // overwrite localStorage with the empty initial state before we've loaded.
  const [hasHydrated, setHasHydrated] = useState(false)

  // Per-widget collapsed state. Map of widget id -> the height (in grid rows)
  // the widget had BEFORE collapsing, so we can restore it on expand. While
  // an id is in this map, the widget renders as a header-only strip and its
  // layout `h` is forced to COLLAPSED_H.
  const COLLAPSED_KEY = `v0-widget-grid-collapsed-v${LAYOUT_VERSION}`
  const COLLAPSED_H = 3 // 3 rows × 10px rowHeight = ~30px, fits the header
  const [collapsedHeights, setCollapsedHeights] = useState<Record<string, number>>({})
  // Note: per-widget `isCollapsed` is computed inside the render loop from
  // `layoutItem.h <= COLLAPSED_H` — that's the source of truth so collapse
  // survives layout import/load. The `collapsedHeights` map only tracks the
  // height to restore to when expanding.

  // Restore on mount + clean up old layout versions
  useEffect(() => {
    try {
      // Delete every cached layout key from older versions so the user's
      // browser doesn't accumulate stale data forever. Saved-layouts and
      // default-name keys are NOT cleaned here — useUserLayouts handles
      // those during its one-time migration into Supabase.
      Object.keys(localStorage)
        .filter(k => k.startsWith('v0-widget-grid-layout-v') && k !== STORAGE_KEY)
        .forEach(k => localStorage.removeItem(k))
      Object.keys(localStorage)
        .filter(k => k.startsWith('v0-widget-grid-collapsed-v') && k !== COLLAPSED_KEY)
        .forEach(k => localStorage.removeItem(k))

      // Restore per-widget collapsed state (map of id -> previous height)
      try {
        const collapsedRaw = localStorage.getItem(COLLAPSED_KEY)
        if (collapsedRaw) {
          const parsedCollapsed = JSON.parse(collapsedRaw)
          if (parsedCollapsed && typeof parsedCollapsed === 'object') {
            setCollapsedHeights(parsedCollapsed)
          }
        }
      } catch { /* ignore */ }

      // Restore the live working draft from STORAGE_KEY. This is still
      // localStorage-backed (not Supabase): it's the in-progress layout
      // the user is currently editing — we don't want every drag/resize
      // hitting the database. Saved/named layouts and the user's default
      // pick now come from Supabase via useUserLayouts (see effect below
      // that overrides this draft once Supabase data is ready).
      //
      // Strip any legacy minH/minW/maxH/maxW from persisted layouts so
      // older drafts don't re-introduce constraints we no longer want.
      const stripConstraints = (item: any) => {
        const { minH, minW, maxH, maxW, ...rest } = item
        return rest
      }
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed?.layout && Array.isArray(parsed.layout)) {
          setLayout(parsed.layout.map(stripConstraints))
        }
        if (parsed?.rightWidgets && Array.isArray(parsed.rightWidgets)) {
          setRightWidgets(parsed.rightWidgets)
        }
      }
    } catch { /* ignore corrupt storage */ }
    setHasHydrated(true)
  }, [])

  // Once Supabase layouts are loaded for an authenticated user, apply the
  // user's chosen default (is_default=true). This overrides whatever was
  // restored from the localStorage draft so cross-device default actually
  // wins. We only run this ONCE per login (tracked by hasAppliedDbDefault)
  // so that subsequent local edits aren't blown away every render.
  const [hasAppliedDbDefault, setHasAppliedDbDefault] = useState(false)
  useEffect(() => {
    if (hasAppliedDbDefault) return
    if (!user) return
    if (userLayouts.length === 0) return
    const defaultRow = userLayouts.find(l => l.isDefault)
    if (defaultRow) {
      setLayout(defaultRow.layout)
      setRightWidgets(defaultRow.widgets as RightWidget[])
    }
    setHasAppliedDbDefault(true)
  }, [user, userLayouts, hasAppliedDbDefault])

  // Save the LIVE layout on every change (only after hydration)
  useEffect(() => {
    if (!hasHydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ layout, rightWidgets }))
    } catch { /* quota / private mode */ }
  }, [layout, rightWidgets, hasHydrated])

  // (Saved layouts and the chosen default are now persisted in Supabase by
  // useUserLayouts — no local persistence effect needed for those.)

  // Persist the per-widget collapsed map so collapses survive refresh
  useEffect(() => {
    if (!hasHydrated) return
    try {
      if (Object.keys(collapsedHeights).length > 0) {
        localStorage.setItem(COLLAPSED_KEY, JSON.stringify(collapsedHeights))
      } else {
        localStorage.removeItem(COLLAPSED_KEY)
      }
    } catch { /* quota / private mode */ }
  }, [collapsedHeights, hasHydrated])

  // Mark a saved layout as the user's default (loads on every login).
  // Looks up the row by name in the Supabase-backed list. Passing null
  // would have meant "clear the default" — we no longer expose that
  // because removing the star is now done by clicking another star
  // (DB trigger ensures only one is_default=true per user).
  const setAsDefault = async (name: string | null) => {
    if (!name) return
    const row = userLayouts.find(l => l.name === name)
    if (!row) return
    const { error } = await setAsDefaultInSupabase(row.id)
    if (error) console.error('[v0] setAsDefault failed:', error)
  }

  // Save the live layout to Supabase under newLayoutName.
  // - If a layout with that name exists, overwrite it (the hook handles this)
  // - If it's a brand-new name and the user already has 5 layouts, the
  //   Postgres BEFORE INSERT trigger raises an error and the hook returns
  //   it as a friendly message — we display it under the name input.
  const saveLayoutWithName = async () => {
    const trimmed = newLayoutName.trim()
    if (!trimmed) return
    setLayoutSaveError(null)
    if (!user) {
      setLayoutSaveError('Sign in to save layouts')
      return
    }
    const { error } = await saveLayoutToSupabase(trimmed, layout, rightWidgets)
    if (error) {
      setLayoutSaveError(error)
      return
    }
    setNewLayoutName('')
    setLayoutSaved(true)
    setTimeout(() => setLayoutSaved(false), 2000)
  }

  // Save layout shortcut (toolbar button) — no name, just flashes confirmation.
  // Live edits are already persisted to localStorage on every change, so this
  // is purely a visual ack. To save under a name, use the layout menu.
  const saveLayout = () => {
    setLayoutSaved(true)
    setTimeout(() => setLayoutSaved(false), 2000)
  }

  // Load a saved layout by name. Layouts come straight from Supabase already
  // stripped of runtime fields; visibleLayout re-stamps resizeHandles.
  const loadSavedLayout = (saved: { name: string; layout: any[]; widgets: RightWidget[] }) => {
    setLayout(saved.layout)
    setRightWidgets(saved.widgets)
    setShowLayoutMenu(false)
  }

  // Delete a saved layout from Supabase. The DB cascades nothing destructive
  // (it's a leaf table); if the deleted row was the default, the user simply
  // has no default until they pick a new one (or DEFAULT_LAYOUT loads).
  const deleteSavedLayout = async (name: string) => {
    const row = userLayouts.find(l => l.name === name)
    if (!row) return
    const { error } = await deleteLayoutFromSupabase(row.id)
    if (error) console.error('[v0] deleteSavedLayout failed:', error)
  }

  // Reset to factory DEFAULT_LAYOUT (the snapshot baked into this file).
  // Drops the local working draft; does NOT touch Supabase saved layouts.
  // To clear the user's chosen default in Supabase, they pick a different
  // saved layout's star, or delete the row.
  const resetLayout = () => {
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
    setLayout(DEFAULT_LAYOUT)
    setRightWidgets(DEFAULT_RIGHT_WIDGETS)
    setShowLayoutMenu(false)
  }

  // No-op: widget visibility changes are in-memory only
  useEffect(() => {
    // TODO: persist rightWidgets to Supabase when template saving is implemented
  }, [rightWidgets])

  const removeWidget = (id: string) => {
    setRightWidgets(w => w.filter(x => x.id !== id))
    setLayout(l => l.filter(x => x.i !== id))
    // Drop any collapse state for the removed widget
    setCollapsedHeights(prev => {
      if (!(id in prev)) return prev
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  // Toggle a widget between collapsed (header-only) and its prior height.
  // Collapse: stash the current `h` in collapsedHeights, set layout `h` to
  // COLLAPSED_H. Expand: restore the saved `h` and clear the entry.
  // Layout compaction (vertical) handles re-flowing neighbors automatically.
  const toggleCollapse = (id: string) => {
    setLayout(prevLayout => {
      const item = prevLayout.find(l => l.i === id)
      if (!item) return prevLayout
      if (id in collapsedHeights) {
        const restoredH = collapsedHeights[id]
        setCollapsedHeights(prev => {
          const next = { ...prev }
          delete next[id]
          return next
        })
        return prevLayout.map(l => (l.i === id ? { ...l, h: restoredH } : l))
      } else {
        setCollapsedHeights(prev => ({ ...prev, [id]: item.h }))
        return prevLayout.map(l => (l.i === id ? { ...l, h: COLLAPSED_H } : l))
      }
    })
  }

  // Add a widget. No min/max constraints anywhere — user can freely
  // resize once it's on the grid.
  const addWidget = (meta: RightWidget) => {
    const def = DEFAULT_LAYOUT.find(l => l.i === meta.id) ?? {
      i: meta.id, x: 0, y: Infinity, w: 4, h: 15,
    }
    setRightWidgets(w => [...w, meta])
    setLayout(l => [...l, def])
  }

  // Build the layout array we pass to <GridLayout/>. Single responsibility:
  // stamp resizeHandles on every item so RGL renders all 8 handles. Without
  // a per-item resizeHandles field, RGL silently falls back to ['se'] only.
  //
  // NOTE: we used to also stamp `isResizable: false` whenever h <= COLLAPSED_H
  // ("collapsed" widgets). That created a UX trap — when a user dragged the
  // N (top) edge down to shrink a widget, the moment h crossed the threshold
  // the widget instantly became non-resizable on the next render, "locking"
  // it until the user expanded via the chevron. That's the source of the
  // "widgets get locked when they touch the top bar" symptom. Removed.
  // Every widget stays freely resizable from all 8 sides at all heights.
  const visibleLayout = useMemo(
    () => layout
      .filter(l => rightWidgets.some(w => w.id === l.i))
      .map(l => ({ ...l, resizeHandles: [...ALL_HANDLES] })),
    [layout, rightWidgets]
  )

  const renderRight = (widget: RightWidget) => {
    if (widget.type === 'chart')           return <TradingViewAdvancedChart ticker={selectedTicker} onChangeTicker={onSelectTicker} />
    if (widget.type === 'company-profile')   return <CompanyProfile ticker={selectedTicker} />
    if (widget.type === 'ticker-info')       return <TickerInfo ticker={selectedTicker} />
    if (widget.type === 'support-resistance')return <SupportResistance ticker={selectedTicker} />
    if (widget.type === 'fundamentals')      return <Fundamentals ticker={selectedTicker} />
    if (widget.type === 'analyst-ratings') return <AnalystRatings ticker={selectedTicker} />
    if (widget.type === 'metrics')         return <Metrics ticker={selectedTicker} />
    if (widget.type === 'catalysts')       return <Catalysts ticker={selectedTicker} />
    if (widget.type === 'catalysts-risk')  return <CatalystsRisk ticker={selectedTicker} />
    if (widget.type === 'gex-levels')      return <GexLevels ticker={selectedTicker} />
    if (widget.type === 'watchlist')       return <WatchlistPanel onSelectTicker={onSelectTicker} selectedTicker={selectedTicker} />
    if (widget.type === 'news')            return <NewsWidget onSelectTicker={onSelectTicker} selectedTicker={selectedTicker} />
    if (widget.type === 'market-overview') return <MarketOverview onSelectTicker={onSelectTicker} />
    if (widget.type === 'technicals')      return <TechnicalIndicators ticker={selectedTicker} />
    if (widget.type === 'options-chain')   return <OptionsChain ticker={selectedTicker} />
    if (widget.type === 'quick-trade')     return <QuickTradeBox selectedTicker={selectedTicker} price={null} />
    if (widget.type === 'trade-ideas')     return <QuickTradeIdeas onSelectIdea={(ticker) => onSelectTicker(ticker)} />
    if (widget.type === 'dark-pool-blocks') return <DarkPoolBlocks ticker={selectedTicker} />
    if (widget.type === 'options-flow')    return <OptionsFlow ticker={selectedTicker} />
    if (widget.type === 'dark-pool-flow')  return <DarkPoolFlow ticker={selectedTicker} />
    if (widget.type === 'key-levels')      return <KeyLevels ticker={selectedTicker} />
    if (widget.type === 'iv-surface')      return <IVSurface ticker={selectedTicker} />
    if (widget.type === 'signals-feed')    return <SignalsFeed ticker={selectedTicker} />
    if (widget.type === 'oi-changes')      return <OiChanges ticker={selectedTicker} />
    // Combo widgets — wrap related panels in one cell
    if (widget.type === 'dark-pool-combo') return <DarkPoolCombo ticker={selectedTicker} />
    if (widget.type === 'options-combo')   return <OptionsCombo ticker={selectedTicker} />
    if (widget.type === 'levels-combo')    return <LevelsCombo ticker={selectedTicker} />
    return null
  }

  return (
    <div className={`flex h-full overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : ''}`}>

      {/* ── LEFT SIDEBAR: sectors + themes, sortable, scrollable ── */}
      {!isFullscreen && (
        <aside className="w-[280px] flex-shrink-0 border-r border-border overflow-y-auto bg-card/20">
        <div className="p-1.5 space-y-1">
          {/* Sectors Header */}
          <div className="px-2 pt-1 pb-0.5 flex items-center gap-1.5">
            <span className="text-[9px] font-mono font-bold tracking-widest uppercase text-muted-foreground">
              SECTORS
            </span>
            <span className="text-[8px] font-mono text-muted-foreground/40 ml-auto">drag to reorder</span>
          </div>
          <DndContext sensors={sectorSensors} collisionDetection={closestCenter} onDragEnd={handleSectorDragEnd}>
            <SortableContext items={sectorOrder} strategy={verticalListSortingStrategy}>
              {sectorOrder.map(key => {
                const sector = SECTOR_DATA[key as keyof typeof SECTOR_DATA]
                if (!sector) return null
                return (
                  <SortablePillItem key={key} id={key}>
                    <SectorPillBox
                      title={sector.title}
                      accent={sector.accent}
                      tickers={sector.tickers}
                      onSelectTicker={onSelectTicker}
                    />
                  </SortablePillItem>
                )
              })}
            </SortableContext>
          </DndContext>

          {/* Themes Header */}
          <div className="px-2 pt-3 pb-0.5 border-t border-border/30 mt-2 flex items-center gap-1.5">
            <span className="text-[9px] font-mono font-bold tracking-widest uppercase text-muted-foreground">
              THEMES
            </span>
            <span className="text-[8px] font-mono text-muted-foreground/40 ml-auto">drag to reorder</span>
          </div>
          <DndContext sensors={themeSensors} collisionDetection={closestCenter} onDragEnd={handleThemeDragEnd}>
            <SortableContext items={themeOrder} strategy={verticalListSortingStrategy}>
              {themeOrder.map(key => {
                const theme = THEME_DATA[key as keyof typeof THEME_DATA]
                if (!theme) return null
                return (
                  <SortablePillItem key={key} id={key}>
                    <ThemePillBox
                      title={theme.title}
                      icon={theme.icon}
                      tickers={theme.tickers}
                      onSelectTicker={onSelectTicker}
                    />
                  </SortablePillItem>
                )
              })}
            </SortableContext>
          </DndContext>

          {/* Market Overview Pills — sectors, gainers, losers, most active */}
          <div className="px-2 pt-3 pb-0.5 border-t border-border/30 mt-2">
            <span className="text-[9px] font-mono font-bold tracking-widest uppercase text-muted-foreground">
              MARKET OVERVIEW
            </span>
          </div>
          <MarketSectorPills onSelectTicker={onSelectTicker} />

          {/* Commodities — oil, gas, metals, ag (ETF proxies) */}
          <div className="px-2 pt-3 pb-0.5 border-t border-border/30 mt-2">
            <span className="text-[9px] font-mono font-bold tracking-widest uppercase text-muted-foreground">
              COMMODITIES
            </span>
          </div>
          <CommoditiesPills onSelectTicker={onSelectTicker} />

        </div>
        </aside>
      )}

      {/* ── RIGHT AREA: toolbar + draggable/resizable grid ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-card/30 flex-shrink-0">
          
          {/* Widgets Dropdown Menu */}
          <div className="relative">
            <button
              onClick={() => setShowLayoutMenu(v => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wider uppercase transition-colors border bg-muted/50 text-muted-foreground border-border hover:text-foreground"
            >
              ⚙ Layouts & Widgets
            </button>
            
            {showLayoutMenu && (
              <div className="absolute top-full mt-1 left-0 z-30 w-64 bg-card border border-border rounded-lg shadow-2xl">
                {/* Edit Layout Option */}
                <button
                  onClick={() => { setIsEditMode(v => !v); setShowLayoutMenu(false) }}
                  className="w-full text-left px-3 py-2 text-[10px] font-mono hover:bg-primary/10 border-b border-border flex items-center gap-2"
                >
                  {isEditMode ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  {isEditMode ? 'Stop Editing' : 'Edit Layout'}
                </button>

                {isEditMode && (
                  <>
                    {/* Reset */}
                    <button
                      onClick={() => { resetLayout(); setShowLayoutMenu(false) }}
                      className="w-full text-left px-3 py-2 text-[10px] font-mono hover:bg-red-500/10 hover:text-red-400 border-b border-border flex items-center gap-2"
                    >
                      <RotateCcw className="w-3 h-3" /> Reset to Default
                    </button>

                    {/* Flat inline list of all widgets — no section sub-headers.
                        Order is preserved from WIDGET_SECTIONS via ALL_AVAILABLE_WIDGETS
                        (which is .flatMap'd in the same declaration order). */}
                    <div className="max-h-80 overflow-y-auto border-b border-border">
                      {ALL_AVAILABLE_WIDGETS.map(w => {
                        const isActive = !!rightWidgets.find(rw => rw.id === w.id)
                        return (
                          <button
                            key={w.id}
                            onClick={() => {
                              if (isActive) {
                                setRightWidgets(prev => prev.filter(rw => rw.id !== w.id))
                              } else {
                                addWidget(w)
                              }
                            }}
                            className={`w-full text-left px-3 py-1.5 text-[9px] font-mono flex items-center justify-between group transition-colors ${
                              isActive
                                ? 'text-foreground hover:bg-red-500/10 hover:text-red-400'
                                : 'text-muted-foreground hover:bg-green-500/10 hover:text-green-400'
                            }`}
                          >
                            <span>{w.title}</span>
                            <span className={`text-[8px] ${isActive ? 'text-primary/60 group-hover:text-red-400' : 'text-muted-foreground/40 group-hover:text-green-400'}`}>
                              {isActive ? 'visible' : '+ add'}
                            </span>
                          </button>
                        )
                      })}
                    </div>

                    {/* Save Current Layout — backed by Supabase, capped at 5 per user */}
                    <div className="px-3 py-2 border-b border-border">
                      <div className="flex gap-1 mb-1">
                        <input
                          type="text"
                          placeholder={user ? 'Layout name...' : 'Sign in to save'}
                          value={newLayoutName}
                          disabled={!user}
                          onChange={(e) => { setNewLayoutName(e.target.value); setLayoutSaveError(null) }}
                          onKeyDown={(e) => e.key === 'Enter' && saveLayoutWithName()}
                          className="flex-1 h-5 text-[9px] font-mono bg-muted/30 border border-border/50 rounded px-1.5 disabled:opacity-50"
                        />
                        <button
                          onClick={saveLayoutWithName}
                          disabled={!user}
                          className="px-2 py-1 text-[9px] font-mono bg-primary/20 hover:bg-primary/30 border border-primary/30 rounded disabled:opacity-50"
                        >
                          Save
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-[8px] font-mono">
                        <span className="text-muted-foreground/60">
                          {user ? `${savedLayouts.length} / 5 layouts` : 'Sign in to save layouts'}
                        </span>
                        {layoutSaveError && (
                          <span className="text-red-400 truncate ml-2" title={layoutSaveError}>
                            {layoutSaveError}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Saved Layouts */}
                    {savedLayouts.length > 0 && (
                      <>
                        <div className="px-3 py-1.5 text-[8px] font-mono font-bold text-muted-foreground uppercase">
                          Saved Layouts
                        </div>
                        {savedLayouts.map(saved => {
                          const isDefault = saved.name === defaultLayoutNameFromDb
                          return (
                            <div key={saved.name} className="flex items-center gap-1 px-3 py-1.5 border-b border-border hover:bg-muted/20">
                              <button
                                onClick={() => setAsDefault(saved.name)}
                                className={isDefault ? 'text-amber-400' : 'text-muted-foreground hover:text-amber-400'}
                                title={isDefault ? 'Default layout — loads on every login.' : 'Set as default — load this layout on every login.'}
                              >
                                <Star className={`w-2.5 h-2.5 ${isDefault ? 'fill-amber-400' : ''}`} />
                              </button>
                              <button
                                onClick={() => { loadSavedLayout(saved); setShowLayoutMenu(false) }}
                                className="flex-1 text-left text-[10px] font-mono hover:text-primary"
                              >
                                {saved.name}
                                {isDefault && <span className="ml-1.5 text-[8px] text-amber-400">DEFAULT</span>}
                              </button>
                              <button
                                onClick={() => deleteSavedLayout(saved.name)}
                                className="text-muted-foreground hover:text-red-400"
                                title="Delete saved layout"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          )
                        })}
                      </>
                    )}

                    {/* System Layouts */}
                    <div className="px-3 py-1.5 text-[8px] font-mono font-bold text-muted-foreground uppercase border-t border-border">
                      System Layouts
                    </div>
                    <button
                      onClick={() => { resetLayout(); setShowLayoutMenu(false) }}
                      className="w-full text-left px-3 py-1.5 text-[10px] font-mono hover:bg-muted/20 hover:text-primary"
                    >
                      Default Layout
                    </button>
                  </>
                )}

                <div className="border-t border-border px-3 py-1.5">
                  <button
                    onClick={() => setIsFullscreen(v => !v)}
                    className="w-full flex items-center gap-2 text-left text-[10px] font-mono hover:text-primary"
                  >
                    {isFullscreen ? '⛶' : '⛶'} {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Live news ticker — flexes to fill the rest of the toolbar */}
          <NewsTickerBanner />
        </div>

        {/* Grid — resize handle CSS lives in app/globals.css.
            Handles are positioned INSIDE each widget's bounds (not outside),
            so they can never be clipped by overflow:auto on this wrapper or
            eaten by neighboring widgets. Every widget is resizable from all
            8 sides regardless of its position in the grid. */}
        <div ref={wrapperRef} className={`flex-1 overflow-y-auto overflow-x-hidden widget-scroll ${isEditMode ? '' : 'rgl-locked'}`}>
          <GridLayout
            className="layout"
            layout={visibleLayout}
            cols={24}
            rowHeight={rowHeight}
            // 2px margin between widgets (matches the working
            // stock-market-analysis-app reference). The tiny gap is
            // critical: it gives every resize handle clean airspace
            // around the widget edge instead of placing handles inside
            // a neighbor's body. With margin=[0,0] (flush) the
            // neighbor's body wins every click on the shared boundary
            // — handles render but are completely unreachable. 2px is
            // small enough that widgets still feel flush visually but
            // big enough that all 8 resize handles work on every
            // widget, every row, every time.
            margin={[2, 2]}
            containerPadding={[0, 0]}
            isDraggable={isEditMode}
            isResizable={isEditMode}
            // Global fallback. The actual per-item resizeHandles set in
            // visibleLayout is what drives rendering — this prop is here
            // as a safety net only.
            resizeHandles={[...ALL_HANDLES]}
            draggableHandle=".widget-drag-handle"
            // CRITICAL: tells react-draggable to suppress drag-start when
            // the mousedown target is a resize handle. Without this, the
            // widget's title bar (.widget-drag-handle) — which sits at
            // top:0 and is wider than the resize handles — wins the
            // mousedown even when the user clicks on a corner/edge handle
            // that visually overlaps the title bar. That's the symptom of
            // "everything locks up when I click near the top bar" — every
            // click on the N / NW / NE handles was actually starting a
            // drag instead of a resize. draggableCancel uses closest() so
            // it correctly identifies clicks on the handle elements.
            draggableCancel=".react-resizable-handle"
            // Free-form, no-overlap positioning (the user's stated rules):
            //   compactType={null}      — widgets stay exactly where placed
            //                             (no auto-pack toward top of column).
            //                             Place anything anywhere on the grid.
            //   preventCollision={true} — drags / resizes that would overlap
            //                             a neighbor are blocked. Only rule.
            // Combined with margin=[2,2] above, every widget is freely
            // movable and resizable from all 4 corners + all 4 edges,
            // and overlap is the single enforced constraint.
            compactType={null}
            preventCollision={true}
            onLayoutChange={(newLayout: any) => {
              setLayout(newLayout)
            }}
            width={wrapperWidth}
          >
            {rightWidgets.map(widget => {
              const layoutItem = layout.find((l: any) => l.i === widget.id)
              // Local boolean — also covers the case where layout `h` equals
              // COLLAPSED_H but no entry exists in the map (e.g. fresh load).
              const isCollapsed = !!layoutItem && layoutItem.h <= COLLAPSED_H
              return (
                <div
                  key={widget.id}
                  className={`h-full bg-card border border-border flex flex-col relative ${isEditMode ? 'ring-2 ring-primary/30' : ''}`}
                >
                  {/* Widget header / drag bar */}
                  <div className={`widget-drag-handle flex items-center justify-between px-2 py-1 border-b border-border/50 bg-muted/30 ${isEditMode ? 'cursor-grab' : ''}`}>
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isEditMode && <GripVertical className="w-3 h-3 text-green-500 shrink-0" />}
                      <span className="text-[10px] font-mono font-bold uppercase text-muted-foreground truncate">
                        {widget.title}
                      </span>
                      {/* Show ticker in header for all widgets except company-profile (redundant there) */}
                      {selectedTicker && widget.type !== 'company-profile' && widget.type !== 'watchlist' && widget.type !== 'news' && widget.type !== 'trade-ideas' && widget.type !== 'market-overview' && (
                        <span className="text-[9px] font-mono text-primary/70 shrink-0">— {selectedTicker}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Collapse / expand button — always visible */}
                      <button
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); toggleCollapse(widget.id) }}
                        className="text-muted-foreground hover:text-primary"
                        title={isCollapsed ? 'Expand' : 'Collapse to header'}
                      >
                        {isCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                      </button>
                      {isEditMode && (
                        <button
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => { e.stopPropagation(); removeWidget(widget.id) }}
                          className="text-muted-foreground hover:text-red-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Widget content — hidden entirely when collapsed so it
                      truly disappears (not just visually clipped). */}
                  {!isCollapsed && (
                    <div className="flex-1 min-h-0 overflow-auto">
                      <WidgetErrorBoundary widgetName={widget.title}>
                        {renderRight(widget)}
                      </WidgetErrorBoundary>
                    </div>
                  )}
                </div>
              )
            })}
          </GridLayout>
        </div>
      </div>
    </div>
  )
}
