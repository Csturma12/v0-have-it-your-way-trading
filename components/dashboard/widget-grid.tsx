'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import GridLayout, { type Layout } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { Lock, Unlock, RotateCcw, Plus, X, GripVertical, Save, Check, Trash2 } from 'lucide-react'
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

const STORAGE_KEY = 'trading-dashboard-rgl-v23'
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

// ─── Right-side grid widgets ─────────────────────────────────────────────────

type RightWidgetType = 'chart' | 'watchlist' | 'news' | 'market-overview' | 'technicals' | 'options-chain'

interface RightWidget {
  id: string
  type: RightWidgetType
  title: string
}

const DEFAULT_RIGHT_WIDGETS: RightWidget[] = [
  { id: 'chart',           type: 'chart',           title: 'Chart' },
  { id: 'watchlist',       type: 'watchlist',       title: 'Watchlist' },
  { id: 'market-overview', type: 'market-overview', title: 'Market Overview' },
  { id: 'news',            type: 'news',            title: 'Market News' },
]

const DEFAULT_LAYOUT: Layout[] = [
  { i: 'chart',           x: 0, y: 0, w: 8, h: 5, minH: 4 },
  { i: 'watchlist',       x: 8, y: 0, w: 4, h: 3, minH: 3, maxH: 5 },
  { i: 'market-overview', x: 8, y: 3, w: 4, h: 3, minH: 3, maxH: 5 },
  { i: 'news',            x: 0, y: 5, w: 12, h: 3, minH: 2, maxH: 4 },
]

interface SavedState {
  layout: Layout[]
  rightWidgets: RightWidget[]
  userSaved?: boolean
}

interface WidgetGridProps {
  selectedTicker: string
  onSelectTicker: (t: string) => void
}

export function WidgetGrid({ selectedTicker, onSelectTicker }: WidgetGridProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  
  const [layout, setLayout] = useState<Layout[]>(DEFAULT_LAYOUT)
  const [rightWidgets, setRightWidgets] = useState<RightWidget[]>(DEFAULT_RIGHT_WIDGETS)
  const [isEditMode, setIsEditMode] = useState(false)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showLayoutMenu, setShowLayoutMenu] = useState(false)
  const [layoutSaved, setLayoutSaved] = useState(false)
  const [wrapperWidth, setWrapperWidth] = useState(1200)
  const [wrapperHeight, setWrapperHeight] = useState(800)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Sidebar drag-to-reorder state — persisted to localStorage
  const [sectorOrder, setSectorOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('sidebar-sector-order')
      if (saved) {
        const parsed = JSON.parse(saved) as string[]
        // Validate all keys still exist
        if (parsed.every(k => k in SECTOR_DATA)) return parsed
      }
    } catch { /* ignore */ }
    return Object.keys(SECTOR_DATA)
  })
  const [themeOrder, setThemeOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('sidebar-theme-order')
      if (saved) {
        const parsed = JSON.parse(saved) as string[]
        if (parsed.every(k => k in THEME_DATA)) return parsed
      }
    } catch { /* ignore */ }
    return Object.keys(THEME_DATA)
  })

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

  // Track wrapper width AND height for responsive grid
  useEffect(() => {
    const updateSize = () => {
      if (wrapperRef.current) {
        setWrapperWidth(wrapperRef.current.offsetWidth)
        setWrapperHeight(wrapperRef.current.offsetHeight)
      }
    }
    updateSize()
    const resizeObserver = new ResizeObserver(updateSize)
    if (wrapperRef.current) resizeObserver.observe(wrapperRef.current)
    return () => resizeObserver.disconnect()
  }, [])

  // Compute rowHeight so the full grid fits exactly within the wrapper height.
  // Total rows in the default layout = chart h(13) + news h(5) + margins/padding.
  // We target 18 rows total with 2px margin and 8px padding (top+bottom).
  // Base rows for the default layout — chart can grow beyond this dynamically
  const TOTAL_ROWS = 8
  const MARGIN = 1   // matches margin={[1,1]}
  const PADDING = 4  // matches containerPadding={[4,4]}
  const rowHeight = Math.floor(
    (wrapperHeight - PADDING * 2 - MARGIN * (TOTAL_ROWS + 1)) / TOTAL_ROWS
  )

  // Load saved layouts from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('saved-layouts')
      // Load saved layouts if they exist
      if (saved) {
        // Keep for future use when implementing saved layouts UI
      }
    } catch { /* ignore */ }
  }, [])

  // reset positions to DEFAULT_LAYOUT so the grid never drifts between sessions.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as SavedState
        if (parsed.rightWidgets) {
          setRightWidgets(parsed.rightWidgets)
        }
        // Restore layout positions only if the user explicitly saved them
        if (parsed.layout && parsed.userSaved) {
          setLayout(parsed.layout)
        }
      }
    } catch { /* ignore */ }
  }, [])

  // Manual save — only triggered by the "Save Layout" button in edit mode
  const saveLayout = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ layout, rightWidgets, userSaved: true } satisfies SavedState))
      setLayoutSaved(true)
      setTimeout(() => setLayoutSaved(false), 2000)
    } catch { /* ignore */ }
  }



  // Persist widget visibility changes automatically (not position/size)
  useEffect(() => {
    try {
      const existing = localStorage.getItem(STORAGE_KEY)
      const parsed = existing ? JSON.parse(existing) : {}
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...parsed, rightWidgets }))
    } catch { /* ignore */ }
  }, [rightWidgets])

  const removeWidget = (id: string) => {
    setRightWidgets(w => w.filter(x => x.id !== id))
    setLayout(l => l.filter(x => x.i !== id))
  }

  const resetLayout = () => {
    setLayout(DEFAULT_LAYOUT)
    setRightWidgets(DEFAULT_RIGHT_WIDGETS)
  }

  const availableToAdd = useMemo(
    () => DEFAULT_RIGHT_WIDGETS.filter(d => !rightWidgets.find(w => w.id === d.id)),
    [rightWidgets]
  )

  const addWidget = (meta: RightWidget) => {
    const def = DEFAULT_LAYOUT.find(l => l.i === meta.id) ?? {
      i: meta.id, x: 0, y: Infinity, w: 6, h: 8,
    }
    setRightWidgets(w => [...w, meta])
    setLayout(l => [...l, def])
    setShowAddMenu(false)
  }

  const visibleLayout = useMemo(
    () => layout.filter(l => rightWidgets.some(w => w.id === l.i)),
    [layout, rightWidgets]
  )

  const renderRight = (widget: RightWidget) => {
    if (widget.type === 'chart')           return <TradingViewAdvancedChart ticker={selectedTicker} onChangeTicker={onSelectTicker} />
    if (widget.type === 'watchlist')       return <WatchlistPanel onSelectTicker={onSelectTicker} selectedTicker={selectedTicker} />
    if (widget.type === 'news')            return <NewsWidget onSelectTicker={onSelectTicker} selectedTicker={selectedTicker} />
    if (widget.type === 'market-overview') return <MarketOverview onSelectTicker={onSelectTicker} />
    if (widget.type === 'technicals')      return <TechnicalIndicators ticker={selectedTicker} />
    if (widget.type === 'options-chain')   return <OptionsChain ticker={selectedTicker} />
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
              ⚙ Widgets
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

                    {/* Add Widget */}
                    {availableToAdd.length > 0 && (
                      <button
                        onClick={() => setShowAddMenu(v => !v)}
                        className="w-full text-left px-3 py-2 text-[10px] font-mono hover:bg-green-500/10 hover:text-green-400 border-b border-border flex items-center gap-2"
                      >
                        <Plus className="w-3 h-3" /> Add Widget
                      </button>
                    )}

                    {showAddMenu && (
                      <div className="pl-3 border-b border-border">
                        {availableToAdd.map(w => (
                          <button
                            key={w.id}
                            onClick={() => { addWidget(w); setShowAddMenu(false); setShowLayoutMenu(false) }}
                            className="w-full text-left px-3 py-1.5 text-[9px] font-mono hover:bg-green-500/10 hover:text-green-400"
                          >
                            + {w.title}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Save Current Layout */}
                    <div className="px-3 py-2 border-b border-border">
                      <div className="flex gap-1 mb-1">
                        <input
                          type="text"
                          placeholder="Layout name..."
                          value={newLayoutName}
                          onChange={(e) => setNewLayoutName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && saveLayoutWithName()}
                          className="flex-1 h-5 text-[9px] font-mono bg-muted/30 border border-border/50 rounded px-1.5"
                        />
                        <button
                          onClick={saveLayoutWithName}
                          className="px-2 py-1 text-[9px] font-mono bg-primary/20 hover:bg-primary/30 border border-primary/30 rounded"
                        >
                          Save
                        </button>
                      </div>
                    </div>

                    {/* Saved Layouts */}
                    {savedLayouts.length > 0 && (
                      <>
                        <div className="px-3 py-1.5 text-[8px] font-mono font-bold text-muted-foreground uppercase">
                          Saved Layouts
                        </div>
                        {savedLayouts.map(saved => (
                          <div key={saved.name} className="flex items-center gap-1 px-3 py-1.5 border-b border-border hover:bg-muted/20">
                            <button
                              onClick={() => { loadSavedLayout(saved); setShowLayoutMenu(false) }}
                              className="flex-1 text-left text-[10px] font-mono hover:text-primary"
                            >
                              {saved.name}
                            </button>
                            <button
                              onClick={() => deleteSavedLayout(saved.name)}
                              className="text-muted-foreground hover:text-red-400"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
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

          <span className="text-[9px] font-mono text-muted-foreground">
            Layout locked
          </span>
        </div>

        {/* Grid */}
        <style jsx global>{`
          .react-grid-item > .react-resizable-handle {
            position: absolute;
            width: 14px;
            height: 14px;
            background: rgba(34, 197, 94, 0.6);
            border-radius: 2px;
            z-index: 10;
          }
          .react-grid-item > .react-resizable-handle::after {
            content: '';
            position: absolute;
            width: 6px;
            height: 6px;
            border-right: 2px solid rgba(255,255,255,0.8);
            border-bottom: 2px solid rgba(255,255,255,0.8);
          }
          .react-resizable-handle-sw { bottom: 0; left: 0; cursor: sw-resize; }
          .react-resizable-handle-sw::after { transform: rotate(135deg); bottom: 3px; left: 3px; }
          .react-resizable-handle-se { bottom: 0; right: 0; cursor: se-resize; }
          .react-resizable-handle-se::after { transform: rotate(45deg); bottom: 3px; right: 3px; }
          .react-resizable-handle-nw { top: 0; left: 0; cursor: nw-resize; }
          .react-resizable-handle-nw::after { transform: rotate(-135deg); top: 3px; left: 3px; }
          .react-resizable-handle-ne { top: 0; right: 0; cursor: ne-resize; }
          .react-resizable-handle-ne::after { transform: rotate(-45deg); top: 3px; right: 3px; }
          .react-resizable-handle-w { left: 0; top: 50%; transform: translateY(-50%); cursor: w-resize; width: 8px; height: 20px; }
          .react-resizable-handle-e { right: 0; top: 50%; transform: translateY(-50%); cursor: e-resize; width: 8px; height: 20px; }
          .react-resizable-handle-n { top: 0; left: 50%; transform: translateX(-50%); cursor: n-resize; width: 20px; height: 8px; }
          .react-resizable-handle-s { bottom: 0; left: 50%; transform: translateX(-50%); cursor: s-resize; width: 20px; height: 8px; }
          .react-resizable-handle-w::after, .react-resizable-handle-e::after,
          .react-resizable-handle-n::after, .react-resizable-handle-s::after { display: none; }
        `}</style>
        <div ref={wrapperRef} className={`flex-1 overflow-hidden p-2 ${isEditMode ? '' : 'rgl-locked'}`}>
          <GridLayout
            className="layout"
            layout={visibleLayout}
            cols={12}
            rowHeight={rowHeight}
            margin={[1, 1]}
            containerPadding={[4, 4]}
            isDraggable={isEditMode}
            isResizable={isEditMode}
            resizeHandles={['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se']}
            draggableHandle=".widget-drag-handle"
            compactType={null}
            preventCollision={true}
            onLayoutChange={(newLayout) => {
              // Enforce maxH constraints to prevent chart from growing too large
              const constrainedLayout = newLayout.map(item => {
                const original = DEFAULT_LAYOUT.find(d => d.i === item.i)
                if (!original) return item
                // Enforce the maxH from DEFAULT_LAYOUT
                if (item.h > original.maxH!) {
                  return { ...item, h: original.maxH! }
                }
                return item
              })
              setLayout(constrainedLayout)
            }}
            width={wrapperWidth}
          >
            {rightWidgets.map(widget => (
              <div
                key={widget.id}
                className={`h-full bg-card border border-border rounded-lg overflow-hidden flex flex-col relative ${isEditMode ? 'ring-2 ring-primary/30' : ''}`}
              >
                {/* Resize handles - only visible in edit mode */}
                {isEditMode && (
                  <>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary/50 cursor-n-resize hover:bg-primary rounded-b" title="Resize top" />
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary/50 cursor-s-resize hover:bg-primary rounded-t" title="Resize bottom" />
                    <div className="absolute top-1/2 -translate-y-1/2 left-0 h-12 w-1 bg-primary/50 cursor-w-resize hover:bg-primary rounded-r" title="Resize left" />
                    <div className="absolute top-1/2 -translate-y-1/2 right-0 h-12 w-1 bg-primary/50 cursor-e-resize hover:bg-primary rounded-l" title="Resize right" />
                  </>
                )}
                {/* Widget header / drag bar */}
                <div className={`widget-drag-handle flex items-center justify-between px-2 py-1 border-b border-border/50 bg-muted/30 ${isEditMode ? 'cursor-grab' : ''}`}>
                  <div className="flex items-center gap-1.5">
                    {isEditMode && <GripVertical className="w-3 h-3 text-green-500" />}
                    <span className="text-[10px] font-mono font-bold uppercase text-muted-foreground">
                      {widget.title}
                    </span>
                  </div>
                  {isEditMode && (
                    <button onClick={() => removeWidget(widget.id)} className="text-muted-foreground hover:text-red-400">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {/* Widget content */}
                <div className="flex-1 min-h-0 overflow-hidden">
                  {renderRight(widget)}
                </div>
              </div>
            ))}
          </GridLayout>
        </div>
      </div>
    </div>
  )
}
