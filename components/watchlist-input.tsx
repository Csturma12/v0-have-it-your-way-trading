'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { List, Plus, X, Zap } from 'lucide-react'

export interface WatchlistItem {
  ticker: string
  price: string
  open: string
  high: string
  low: string
  change: string
  volume: string
}

interface WatchlistInputProps {
  onAnalyze: (watchlist: WatchlistItem[]) => void
  isLoading: boolean
}

const POPULAR_TICKERS = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'AMD']

export function WatchlistInput({ onAnalyze, isLoading }: WatchlistInputProps) {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [newTicker, setNewTicker] = useState('')
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editData, setEditData] = useState<Partial<WatchlistItem>>({})

  const addTicker = (ticker: string) => {
    const upperTicker = ticker.toUpperCase().trim()
    if (!upperTicker) return
    if (watchlist.some((item) => item.ticker === upperTicker)) return

    setWatchlist((prev) => [
      ...prev,
      { ticker: upperTicker, price: '', open: '', high: '', low: '', change: '', volume: '' },
    ])
    setNewTicker('')
  }

  const removeTicker = (index: number) => {
    setWatchlist((prev) => prev.filter((_, i) => i !== index))
    if (editingIndex === index) {
      setEditingIndex(null)
      setEditData({})
    }
  }

  const toggleEdit = (index: number) => {
    if (editingIndex === index) {
      // Save changes
      setWatchlist((prev) =>
        prev.map((item, i) => (i === index ? { ...item, ...editData } : item))
      )
      setEditingIndex(null)
      setEditData({})
    } else {
      setEditingIndex(index)
      setEditData(watchlist[index])
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (watchlist.length === 0) return
    onAnalyze(watchlist)
  }

  const loadSampleWatchlist = () => {
    setWatchlist([
      { ticker: 'AAPL', price: '178.50', open: '176.00', high: '180.00', low: '175.50', change: '1.4', volume: '52M' },
      { ticker: 'TSLA', price: '242.00', open: '238.00', high: '245.00', low: '235.00', change: '1.7', volume: '98M' },
      { ticker: 'NVDA', price: '875.00', open: '860.00', high: '890.00', low: '855.00', change: '1.8', volume: '45M' },
      { ticker: 'MSFT', price: '415.00', open: '410.00', high: '418.00', low: '408.00', change: '1.2', volume: '22M' },
      { ticker: 'META', price: '505.00', open: '498.00', high: '510.00', low: '495.00', change: '1.4', volume: '18M' },
    ])
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <List className="w-5 h-5" />
          Watchlist Analysis
        </CardTitle>
        <CardDescription>
          Add tickers to your watchlist. The AI will analyze all and return the top 3-10 trading signals.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Quick Add Popular Tickers */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Quick add popular tickers:</p>
            <div className="flex flex-wrap gap-2">
              {POPULAR_TICKERS.map((ticker) => {
                const isAdded = watchlist.some((item) => item.ticker === ticker)
                return (
                  <Button
                    key={ticker}
                    type="button"
                    variant={isAdded ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => !isAdded && addTicker(ticker)}
                    disabled={isAdded}
                  >
                    {ticker}
                    {isAdded && <span className="ml-1 text-xs opacity-60">added</span>}
                  </Button>
                )
              })}
            </div>
          </div>

          {/* Add Custom Ticker */}
          <div className="flex gap-2">
            <Input
              placeholder="Enter ticker symbol..."
              value={newTicker}
              onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addTicker(newTicker)
                }
              }}
              className="uppercase"
            />
            <Button type="button" variant="outline" onClick={() => addTicker(newTicker)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Watchlist Items */}
          {watchlist.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  Your Watchlist ({watchlist.length} ticker{watchlist.length !== 1 ? 's' : ''})
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setWatchlist([])}
                  className="text-muted-foreground hover:text-destructive"
                >
                  Clear all
                </Button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {watchlist.map((item, index) => (
                  <div
                    key={item.ticker}
                    className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg"
                  >
                    <Badge variant="outline" className="font-mono">
                      {item.ticker}
                    </Badge>

                    {editingIndex === index ? (
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <Input
                          placeholder="Price"
                          value={editData.price || ''}
                          onChange={(e) => setEditData((prev) => ({ ...prev, price: e.target.value }))}
                          className="h-7 text-xs"
                        />
                        <Input
                          placeholder="Change %"
                          value={editData.change || ''}
                          onChange={(e) => setEditData((prev) => ({ ...prev, change: e.target.value }))}
                          className="h-7 text-xs"
                        />
                        <Input
                          placeholder="Volume"
                          value={editData.volume || ''}
                          onChange={(e) => setEditData((prev) => ({ ...prev, volume: e.target.value }))}
                          className="h-7 text-xs"
                        />
                      </div>
                    ) : (
                      <div className="flex-1 flex gap-2 text-xs text-muted-foreground">
                        {item.price && <span>${item.price}</span>}
                        {item.change && (
                          <span className={Number(item.change) >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                            {Number(item.change) >= 0 ? '+' : ''}{item.change}%
                          </span>
                        )}
                        {item.volume && <span>Vol: {item.volume}</span>}
                        {!item.price && !item.change && !item.volume && (
                          <span className="italic">No data (click edit to add)</span>
                        )}
                      </div>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleEdit(index)}
                      className="h-7 px-2 text-xs"
                    >
                      {editingIndex === index ? 'Save' : 'Edit'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTicker(index)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sample Data Button */}
          {watchlist.length === 0 && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={loadSampleWatchlist}
            >
              <Zap className="w-4 h-4 mr-2" />
              Load Sample Watchlist
            </Button>
          )}

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isLoading || watchlist.length === 0}
          >
            {isLoading ? (
              <>
                <Spinner className="mr-2" />
                Analyzing {watchlist.length} ticker{watchlist.length !== 1 ? 's' : ''}...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Generate Ranked Signals
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
