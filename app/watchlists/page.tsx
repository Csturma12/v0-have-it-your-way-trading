'use client'

import { useState } from 'react'
import { 
  Star, 
  Plus, 
  Trash2, 
  Edit2, 
  TrendingUp, 
  TrendingDown,
  MoreVertical,
  Eye,
  ChevronRight
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TopNavBar } from '@/components/dashboard/top-nav-bar'

interface Watchlist {
  id: string
  name: string
  color: string
  tickers: {
    symbol: string
    price: number
    change: number
    changePercent: number
  }[]
}

const MOCK_WATCHLISTS: Watchlist[] = [
  {
    id: '1',
    name: 'Tech Giants',
    color: 'cyan',
    tickers: [
      { symbol: 'NVDA', price: 924.50, change: 12.34, changePercent: 1.35 },
      { symbol: 'AAPL', price: 182.30, change: -1.20, changePercent: -0.65 },
      { symbol: 'MSFT', price: 415.20, change: 5.80, changePercent: 1.42 },
      { symbol: 'GOOGL', price: 175.40, change: 2.15, changePercent: 1.24 },
      { symbol: 'META', price: 514.60, change: 8.90, changePercent: 1.76 },
    ],
  },
  {
    id: '2',
    name: 'AI & Semiconductors',
    color: 'green',
    tickers: [
      { symbol: 'AMD', price: 162.80, change: 4.20, changePercent: 2.65 },
      { symbol: 'AVGO', price: 1280.50, change: 15.30, changePercent: 1.21 },
      { symbol: 'PLTR', price: 24.80, change: 0.85, changePercent: 3.55 },
      { symbol: 'SMCI', price: 892.40, change: -18.60, changePercent: -2.04 },
    ],
  },
  {
    id: '3',
    name: 'Healthcare',
    color: 'gold',
    tickers: [
      { symbol: 'LLY', price: 804.20, change: 12.60, changePercent: 1.59 },
      { symbol: 'UNH', price: 528.90, change: -3.40, changePercent: -0.64 },
      { symbol: 'JNJ', price: 158.40, change: 0.80, changePercent: 0.51 },
    ],
  },
  {
    id: '4',
    name: 'ETFs',
    color: 'red',
    tickers: [
      { symbol: 'SPY', price: 542.80, change: 4.20, changePercent: 0.78 },
      { symbol: 'QQQ', price: 482.10, change: 6.80, changePercent: 1.43 },
      { symbol: 'IWM', price: 198.30, change: -1.20, changePercent: -0.60 },
    ],
  },
]

const colorStyles: Record<string, { bg: string; text: string; border: string }> = {
  cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  green: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' },
  gold: { bg: 'bg-theme-gold/10', text: 'text-theme-gold', border: 'border-theme-gold/30' },
  red: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
}

export default function WatchlistsPage() {
  const [watchlists, setWatchlists] = useState(MOCK_WATCHLISTS)
  const [selectedList, setSelectedList] = useState<string | null>('1')
  const [newListName, setNewListName] = useState('')
  const [showNewForm, setShowNewForm] = useState(false)

  const selected = watchlists.find(w => w.id === selectedList)

  const handleCreateList = () => {
    if (!newListName.trim()) return
    const newList: Watchlist = {
      id: Date.now().toString(),
      name: newListName,
      color: ['cyan', 'green', 'gold', 'red'][Math.floor(Math.random() * 4)],
      tickers: [],
    }
    setWatchlists([...watchlists, newList])
    setSelectedList(newList.id)
    setNewListName('')
    setShowNewForm(false)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNavBar />
      
      <header className="border-b border-border bg-card/30 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Star className="w-6 h-6 text-theme-gold" />
            <h1 className="text-xl font-bold font-mono">WATCHLISTS</h1>
            <Badge variant="outline" className="text-[10px]">
              {watchlists.length} lists
            </Badge>
          </div>
          <Button
            onClick={() => setShowNewForm(true)}
            size="sm"
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            New List
          </Button>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Sidebar */}
        <div className="w-64 border-r border-border bg-card/20 p-4">
          <div className="space-y-2">
            {watchlists.map((list) => {
              const style = colorStyles[list.color] || colorStyles.cyan
              return (
                <button
                  key={list.id}
                  onClick={() => setSelectedList(list.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                    selectedList === list.id 
                      ? `${style.bg} ${style.border} border` 
                      : 'hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Star className={`w-4 h-4 ${style.text}`} />
                    <span className="text-sm font-mono font-semibold">{list.name}</span>
                  </div>
                  <Badge variant="outline" className="text-[9px]">
                    {list.tickers.length}
                  </Badge>
                </button>
              )
            })}
            
            {showNewForm && (
              <div className="p-3 border border-border rounded-lg bg-card/50">
                <Input
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="List name..."
                  className="mb-2 text-sm"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleCreateList} className="flex-1">
                    Create
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowNewForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {selected ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Star className={`w-5 h-5 ${colorStyles[selected.color]?.text || 'text-theme-gold'}`} />
                  <h2 className="text-lg font-bold font-mono">{selected.name}</h2>
                  <Badge variant="outline" className={`${colorStyles[selected.color]?.bg} ${colorStyles[selected.color]?.text} ${colorStyles[selected.color]?.border} text-[9px]`}>
                    {selected.tickers.length} tickers
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Tickers Table */}
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-card/50">
                    <tr className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                      <th className="text-left py-3 px-4">Symbol</th>
                      <th className="text-right py-3 px-4">Price</th>
                      <th className="text-right py-3 px-4">Change</th>
                      <th className="text-right py-3 px-4">%</th>
                      <th className="text-center py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {selected.tickers.map((ticker) => (
                      <tr key={ticker.symbol} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4">
                          <span className="text-sm font-mono font-bold text-foreground">{ticker.symbol}</span>
                        </td>
                        <td className="py-3 px-4 text-right text-sm font-mono">
                          ${ticker.price.toFixed(2)}
                        </td>
                        <td className={`py-3 px-4 text-right text-sm font-mono ${
                          ticker.change >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {ticker.change >= 0 ? '+' : ''}{ticker.change.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Badge className={`text-[9px] ${
                            ticker.changePercent >= 0 
                              ? 'bg-green-500/10 text-green-400 border-green-500/30' 
                              : 'bg-red-500/10 text-red-400 border-red-500/30'
                          }`}>
                            {ticker.changePercent >= 0 && <TrendingUp className="w-2.5 h-2.5 mr-0.5" />}
                            {ticker.changePercent < 0 && <TrendingDown className="w-2.5 h-2.5 mr-0.5" />}
                            {ticker.changePercent >= 0 ? '+' : ''}{ticker.changePercent.toFixed(2)}%
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-300">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add Ticker */}
              <div className="mt-4 flex gap-2">
                <Input placeholder="Add ticker (e.g. TSLA)" className="max-w-xs font-mono uppercase" />
                <Button variant="outline" size="sm" className="gap-1">
                  <Plus className="w-4 h-4" />
                  Add
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <ChevronRight className="w-4 h-4 mr-2" />
              Select a watchlist to view
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
