'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import GridLayout, { type Layout } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { Lock, Unlock, RotateCcw, Plus, X, GripVertical, Save, Check } from 'lucide-react'
import { SectorPillBox } from './sector-pill-box'
import { ThemePillBox } from './theme-pill-box'
import { TradingViewChart } from './tradingview-chart'
import { WatchlistPanel } from './watchlist-panel'
import { NewsWidget } from './news-widget'
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

const STORAGE_KEY = 'trading-dashboard-rgl-v9'
// Layout is intentionally NOT persisted — the default layout is always restored
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

type RightWidgetType = 'chart' | 'watchlist' | 'news'

interface RightWidget {
  id: string
  type: RightWidgetType
  title: string
}

const DEFAULT_RIGHT_WIDGETS: RightWidget[] = [
  { id: 'chart',     type: 'chart',     title: 'Chart' },
  { id: 'watchlist', type: 'watchlist', title: 'Watchlist' },
  { id: 'news',      type: 'news',      title: 'Market News' },
]

const DEFAULT_LAYOUT: Layout[] = [
  { i: 'chart',     x: 0, y: 0,  w: 8, h: 14 },
  { i: 'watchlist', x: 8, y: 0,  w: 4, h: 14 },
  { i: 'news',      x: 0, y: 14, w: 12, h: 10 },
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
  const [layoutSaved, setLayoutSaved] = useState(false)
  const [wrapperWidth, setWrapperWidth] = useState(1200)

  // Track wrapper width for responsive grid
  useEffect(() => {
    const updateWidth = () => {
      if (wrapperRef.current) {
        setWrapperWidth(wrapperRef.current.offsetWidth)
      }
    }
    updateWidth()
    const resizeObserver = new ResizeObserver(updateWidth)
    if (wrapperRef.current) resizeObserver.observe(wrapperRef.current)
    return () => resizeObserver.disconnect()
  }, [])

  // On mount: restore the widget list (which panels are visible) but ALWAYS
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
    if (widget.type === 'chart')     return <TradingViewChart ticker={selectedTicker} />
    if (widget.type === 'watchlist') return <WatchlistPanel onSelectTicker={onSelectTicker} selectedTicker={selectedTicker} />
    if (widget.type === 'news')      return <NewsWidget onSelectTicker={onSelectTicker} />
    return null
  }

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── LEFT SIDEBAR: sectors + themes, scrollable ── */}
      <aside className="w-[280px] flex-shrink-0 border-r border-border overflow-y-auto bg-card/20">
        <div className="p-1.5 space-y-1">
          {/* Sectors Header */}
          <div className="px-2 pt-1 pb-0.5">
            <span className="text-[9px] font-mono font-bold tracking-widest uppercase text-muted-foreground">
              SECTORS
            </span>
          </div>
          {Object.entries(SECTOR_DATA).map(([key, sector]) => (
            <SectorPillBox
              key={key}
              title={sector.title}
              accent={sector.accent}
              tickers={sector.tickers}
              onSelectTicker={onSelectTicker}
            />
          ))}

          {/* Themes Header */}
          <div className="px-2 pt-3 pb-0.5 border-t border-border/30 mt-2">
            <span className="text-[9px] font-mono font-bold tracking-widest uppercase text-muted-foreground">
              THEMES
            </span>
          </div>
          {Object.entries(THEME_DATA).map(([key, theme]) => (
            <ThemePillBox
              key={key}
              title={theme.title}
              icon={theme.icon}
              tickers={theme.tickers}
              onSelectTicker={onSelectTicker}
            />
          ))}
        </div>
      </aside>

      {/* ── RIGHT AREA: toolbar + draggable/resizable grid ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center gap-3 px-3 py-1.5 border-b border-border bg-card/30 flex-shrink-0">
          <button
            onClick={() => setIsEditMode(v => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wider uppercase transition-colors border ${
              isEditMode
                ? 'bg-green-500/20 text-green-400 border-green-500/40'
                : 'bg-muted/50 text-muted-foreground border-border hover:text-foreground'
            }`}
          >
            {isEditMode ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
            {isEditMode ? 'Editing' : 'Edit Layout'}
          </button>

          {isEditMode && (
            <>
              <button
                onClick={resetLayout}
                className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-mono text-muted-foreground hover:text-foreground bg-muted/50 border border-border"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>

              {availableToAdd.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowAddMenu(v => !v)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-mono text-green-400 bg-green-500/10 border border-green-500/30"
                  >
                    <Plus className="w-3 h-3" /> Add Widget
                  </button>
                  {showAddMenu && (
                    <div className="absolute top-full mt-1 left-0 z-30 w-48 bg-card border border-border rounded-lg shadow-2xl">
                      {availableToAdd.map(w => (
                        <button
                          key={w.id}
                          onClick={() => addWidget(w)}
                          className="w-full text-left px-3 py-2 text-[10px] font-mono hover:bg-green-500/10 hover:text-green-400 border-b border-border last:border-b-0"
                        >
                          + {w.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <span className="text-[9px] font-mono text-muted-foreground">
                Drag header to move &nbsp;|&nbsp; Drag any edge or corner to resize
              </span>

              <button
                onClick={saveLayout}
                className={`ml-auto flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-mono font-bold border transition-all ${
                  layoutSaved
                    ? 'bg-green-500/20 text-green-400 border-green-500/40'
                    : 'bg-muted/50 text-muted-foreground border-border hover:text-foreground'
                }`}
              >
                {layoutSaved ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
                {layoutSaved ? 'Saved' : 'Save Layout'}
              </button>
            </>
          )}
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
        <div ref={wrapperRef} className={`flex-1 overflow-auto p-2 ${isEditMode ? '' : 'rgl-locked'}`}>
          <GridLayout
            className="layout"
            layout={visibleLayout}
            cols={12}
            rowHeight={48}
            margin={[1, 1]}
            containerPadding={[4, 4]}
            isDraggable={isEditMode}
            isResizable={isEditMode}
            resizeHandles={['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se']}
            draggableHandle=".widget-drag-handle"
            compactType={null}
            preventCollision={true}
            onLayoutChange={(newLayout) => setLayout(newLayout)}
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
