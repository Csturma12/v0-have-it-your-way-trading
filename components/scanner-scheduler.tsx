'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Field, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Clock,
  Play,
  Pause,
  RefreshCw,
  Zap,
  AlertCircle,
  CheckCircle2,
  Timer,
} from 'lucide-react'
import type { WatchlistItem } from './watchlist-input'

interface ScannerSchedulerProps {
  watchlist: WatchlistItem[]
  onScanComplete: (signals: TradingSignal[], summary: string) => void
  isScanning: boolean
  setIsScanning: (scanning: boolean) => void
}

interface TradingSignal {
  ticker: string
  action: 'BUY' | 'SELL' | 'NO TRADE'
  setup: 'BREAKOUT' | 'PULLBACK' | 'REVERSAL' | 'MOMENTUM' | 'NO SETUP'
  confidence: number
  entry: number | null
  stop: number | null
  target: number | null
  risk_reward: number | null
  reason: string
  invalid_if: string
  rank: number | null
}

const SCAN_INTERVALS = [
  { value: '5', label: '5 minutes' },
  { value: '10', label: '10 minutes' },
  { value: '15', label: '15 minutes' },
]

// US Market hours: 9:30 AM - 4:00 PM EST
function isMarketOpen(): boolean {
  const now = new Date()
  const estOffset = -5 // EST offset from UTC
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  const est = new Date(utc + 3600000 * estOffset)

  const day = est.getDay()
  const hours = est.getHours()
  const minutes = est.getMinutes()
  const timeInMinutes = hours * 60 + minutes

  // Weekend check
  if (day === 0 || day === 6) return false

  // Market hours: 9:30 AM (570 minutes) to 4:00 PM (960 minutes)
  return timeInMinutes >= 570 && timeInMinutes < 960
}

function getMarketStatus(): { open: boolean; message: string; nextEvent: string } {
  const now = new Date()
  const estOffset = -5
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  const est = new Date(utc + 3600000 * estOffset)

  const day = est.getDay()
  const hours = est.getHours()
  const minutes = est.getMinutes()
  const timeInMinutes = hours * 60 + minutes

  if (day === 0 || day === 6) {
    return {
      open: false,
      message: 'Market Closed (Weekend)',
      nextEvent: 'Opens Monday 9:30 AM EST',
    }
  }

  if (timeInMinutes < 570) {
    const minsUntilOpen = 570 - timeInMinutes
    const hoursUntil = Math.floor(minsUntilOpen / 60)
    const minsUntil = minsUntilOpen % 60
    return {
      open: false,
      message: 'Pre-Market',
      nextEvent: `Opens in ${hoursUntil}h ${minsUntil}m`,
    }
  }

  if (timeInMinutes >= 960) {
    return {
      open: false,
      message: 'Market Closed',
      nextEvent: 'Opens tomorrow 9:30 AM EST',
    }
  }

  const minsUntilClose = 960 - timeInMinutes
  const hoursUntil = Math.floor(minsUntilClose / 60)
  const minsUntil = minsUntilClose % 60
  return {
    open: true,
    message: 'Market Open',
    nextEvent: `Closes in ${hoursUntil}h ${minsUntil}m`,
  }
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function ScannerScheduler({
  watchlist,
  onScanComplete,
  isScanning,
  setIsScanning,
}: ScannerSchedulerProps) {
  const [isEnabled, setIsEnabled] = useState(false)
  const [interval, setInterval] = useState('5')
  const [automationEnabled, setAutomationEnabled] = useState(false)
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null)
  const [nextScanTime, setNextScanTime] = useState<Date | null>(null)
  const [countdown, setCountdown] = useState<string>('')
  const [scanCount, setScanCount] = useState(0)
  const [marketStatus, setMarketStatus] = useState(getMarketStatus())

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)

  const runScan = useCallback(async () => {
    if (watchlist.length === 0) return

    setIsScanning(true)

    try {
      const response = await fetch('/api/analyze-watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ watchlist }),
      })

      const result = await response.json()

      if (response.ok) {
        onScanComplete(result.signals || [], result.summary || '')
        setLastScanTime(new Date())
        setScanCount((prev) => prev + 1)
      }
    } catch {
      // Silent fail for scheduled scans
    } finally {
      setIsScanning(false)
    }
  }, [watchlist, onScanComplete, setIsScanning])

  // Update market status every minute
  useEffect(() => {
    const updateStatus = () => setMarketStatus(getMarketStatus())
    updateStatus()
    const statusInterval = setInterval(updateStatus, 60000)
    return () => clearInterval(statusInterval)
  }, [])

  // Handle scheduled scanning
  useEffect(() => {
    if (!isEnabled || watchlist.length === 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
        countdownRef.current = null
      }
      setNextScanTime(null)
      setCountdown('')
      return
    }

    const intervalMs = parseInt(interval) * 60 * 1000

    const scheduleNextScan = () => {
      const next = new Date(Date.now() + intervalMs)
      setNextScanTime(next)
    }

    const executeScan = () => {
      // Only scan during market hours if automation is enabled
      if (automationEnabled && !isMarketOpen()) {
        scheduleNextScan()
        return
      }

      runScan()
      scheduleNextScan()
    }

    // Run initial scan immediately
    executeScan()

    // Set up interval
    timerRef.current = setInterval(executeScan, intervalMs)

    // Set up countdown
    countdownRef.current = setInterval(() => {
      if (nextScanTime) {
        const remaining = nextScanTime.getTime() - Date.now()
        if (remaining > 0) {
          const mins = Math.floor(remaining / 60000)
          const secs = Math.floor((remaining % 60000) / 1000)
          setCountdown(`${mins}:${secs.toString().padStart(2, '0')}`)
        }
      }
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [isEnabled, interval, automationEnabled, watchlist, runScan, nextScanTime])

  const handleManualScan = () => {
    runScan()
    if (isEnabled) {
      const intervalMs = parseInt(interval) * 60 * 1000
      setNextScanTime(new Date(Date.now() + intervalMs))
    }
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Timer className="w-5 h-5" />
              Scanner Scheduler
            </CardTitle>
            <CardDescription>
              Automated watchlist scanning during market hours
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={
              marketStatus.open
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                : 'bg-muted text-muted-foreground'
            }
          >
            {marketStatus.open ? (
              <CheckCircle2 className="w-3 h-3 mr-1" />
            ) : (
              <AlertCircle className="w-3 h-3 mr-1" />
            )}
            {marketStatus.message}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Market Status */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">{marketStatus.nextEvent}</span>
          </div>
          {lastScanTime && (
            <span className="text-xs text-muted-foreground">
              Last scan: {formatTime(lastScanTime)}
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="grid gap-4">
          {/* Enable Scanner */}
          <div className="flex items-center justify-between">
            <Field className="flex-1">
              <FieldLabel className="text-sm">Enable Auto-Scanner</FieldLabel>
              <p className="text-xs text-muted-foreground">
                Automatically scan watchlist at set intervals
              </p>
            </Field>
            <Switch
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
              disabled={watchlist.length === 0}
            />
          </div>

          {/* Scan Interval */}
          <Field>
            <FieldLabel className="text-sm">Scan Interval</FieldLabel>
            <Select value={interval} onValueChange={setInterval} disabled={!isEnabled}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCAN_INTERVALS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Automation Toggle */}
          <div className="flex items-center justify-between p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-700">Market Hours Only</p>
              <p className="text-xs text-amber-600">
                Only scan during US market hours (9:30 AM - 4:00 PM EST)
              </p>
            </div>
            <Switch
              checked={automationEnabled}
              onCheckedChange={setAutomationEnabled}
              disabled={!isEnabled}
            />
          </div>
        </div>

        {/* Status Display */}
        {isEnabled && (
          <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-3">
              <div
                className={`w-2 h-2 rounded-full ${
                  isScanning ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                }`}
              />
              <div>
                <p className="text-sm font-medium">
                  {isScanning ? 'Scanning...' : 'Scanner Active'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {scanCount} scan{scanCount !== 1 ? 's' : ''} completed
                </p>
              </div>
            </div>
            {nextScanTime && !isScanning && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Next scan in</p>
                <p className="text-lg font-mono font-bold text-primary">{countdown}</p>
              </div>
            )}
          </div>
        )}

        {/* Manual Scan Button */}
        <div className="flex gap-2">
          <Button
            onClick={handleManualScan}
            disabled={isScanning || watchlist.length === 0}
            className="flex-1"
            variant={isEnabled ? 'outline' : 'default'}
          >
            {isScanning ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Scan Now
              </>
            )}
          </Button>
          {isEnabled && (
            <Button
              variant="outline"
              onClick={() => setIsEnabled(false)}
              className="px-3"
            >
              {isEnabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
          )}
        </div>

        {watchlist.length === 0 && (
          <p className="text-xs text-center text-muted-foreground">
            Add tickers to your watchlist to enable scanning
          </p>
        )}
      </CardContent>
    </Card>
  )
}
