'use client'

import { useState } from 'react'
import { 
  Crosshair, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Percent,
  Clock,
  AlertTriangle,
  Check,
  X,
  Loader
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TopNavBar } from '@/components/dashboard/top-nav-bar'
import { QuickTradeIdeas } from '@/components/dashboard/quick-trade-ideas'
import { useBrokerTrade } from '@/hooks/useBrokerTrade'

export default function QuickTradePage() {
  const [ticker, setTicker] = useState('NVDA')
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [orderType, setOrderType] = useState<'market' | 'limit' | 'stop'>('market')
  const [quantity, setQuantity] = useState('10')
  const [limitPrice, setLimitPrice] = useState('')
  const [stopPrice, setStopPrice] = useState('')
  const [broker, setBroker] = useState<'alpaca' | 'tastytrade'>('alpaca')
  
  const { executeTrade, isLoading, result, error } = useBrokerTrade(broker)
  
  const handleTradeIdeaSelect = (ideaTicker: string, action: 'buy' | 'sell') => {
    setTicker(ideaTicker)
    setSide(action)
    setQuantity('10')
    setOrderType('market')
    setLimitPrice('')
    setStopPrice('')
  }

  const handleExecuteTrade = async () => {
    await executeTrade({
      ticker,
      side,
      quantity: parseInt(quantity),
      orderType,
      limitPrice: limitPrice ? parseFloat(limitPrice) : undefined,
      stopPrice: stopPrice ? parseFloat(stopPrice) : undefined,
    })
  }
  
  // Mock quote data
  const quote = {
    price: 924.50,
    change: 12.34,
    changePercent: 1.35,
    bid: 924.40,
    ask: 924.60,
    volume: '42.5M',
  }
  
  const totalValue = Number(quantity) * quote.price

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNavBar />
      
      <header className="border-b border-border bg-card/30 px-6 py-4">
        <div className="flex items-center gap-3">
          <Crosshair className="w-6 h-6 text-green-400" />
          <h1 className="text-xl font-bold font-mono">QUICK TRADE</h1>
          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px]">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Paper Trading
          </Badge>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="max-w-2xl mx-auto">
          {/* Ticker Input + Quote */}
          <div className="p-6 rounded-lg border border-border bg-card/50 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <Input
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="TICKER"
                className="w-32 text-xl font-mono font-bold text-center uppercase"
              />
              <div className="flex-1">
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold font-mono">${quote.price.toFixed(2)}</span>
                  <span className={`text-lg font-mono font-semibold flex items-center ${
                    quote.change >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {quote.change >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                    {quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)} ({quote.changePercent.toFixed(2)}%)
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm font-mono text-muted-foreground">
                  <span>Bid: ${quote.bid.toFixed(2)}</span>
                  <span>Ask: ${quote.ask.toFixed(2)}</span>
                  <span>Vol: {quote.volume}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Order Form */}
          <div className="p-6 rounded-lg border border-border bg-card/50">
            {/* Side Toggle */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setSide('buy')}
                className={`flex-1 py-3 rounded-lg text-lg font-mono font-bold transition-colors ${
                  side === 'buy'
                    ? 'bg-green-500/20 text-green-400 border-2 border-green-500/50'
                    : 'bg-muted/30 text-muted-foreground border-2 border-transparent hover:border-border'
                }`}
              >
                <TrendingUp className="w-5 h-5 inline mr-2" />
                BUY
              </button>
              <button
                onClick={() => setSide('sell')}
                className={`flex-1 py-3 rounded-lg text-lg font-mono font-bold transition-colors ${
                  side === 'sell'
                    ? 'bg-red-500/20 text-red-400 border-2 border-red-500/50'
                    : 'bg-muted/30 text-muted-foreground border-2 border-transparent hover:border-border'
                }`}
              >
                <TrendingDown className="w-5 h-5 inline mr-2" />
                SELL
              </button>
            </div>

            {/* Order Type */}
            <div className="mb-6">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2 block">
                Order Type
              </label>
              <div className="flex gap-2">
                {(['market', 'limit', 'stop'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setOrderType(type)}
                    className={`px-4 py-2 rounded text-sm font-mono font-semibold uppercase transition-colors ${
                      orderType === type
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/30 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div className="mb-6">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2 block">
                Quantity
              </label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="text-xl font-mono font-bold"
                min="1"
              />
              <div className="flex gap-2 mt-2">
                {[1, 5, 10, 25, 50, 100].map((q) => (
                  <button
                    key={q}
                    onClick={() => setQuantity(q.toString())}
                    className="px-3 py-1 text-xs font-mono bg-muted/30 rounded hover:bg-muted/50 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Limit/Stop Price */}
            {orderType === 'limit' && (
              <div className="mb-6">
                <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2 block">
                  Limit Price
                </label>
                <Input
                  type="number"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  placeholder={quote.price.toFixed(2)}
                  className="text-xl font-mono font-bold"
                  step="0.01"
                />
              </div>
            )}

            {orderType === 'stop' && (
              <div className="mb-6">
                <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2 block">
                  Stop Price
                </label>
                <Input
                  type="number"
                  value={stopPrice}
                  onChange={(e) => setStopPrice(e.target.value)}
                  placeholder={quote.price.toFixed(2)}
                  className="text-xl font-mono font-bold"
                  step="0.01"
                />
              </div>
            )}

            {/* Broker Selector */}
            <div className="mb-6">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2 block">
                Paper Trading Broker
              </label>
              <div className="flex gap-2">
                {(['alpaca', 'tastytrade'] as const).map((b) => (
                  <button
                    key={b}
                    onClick={() => setBroker(b)}
                    className={`flex-1 px-4 py-2 rounded text-sm font-mono font-semibold uppercase transition-colors ${
                      broker === b
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/30 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {b === 'alpaca' ? '🦙 Alpaca' : '🥜 Tastytrade'}
                  </button>
                ))}
              </div>
            </div>

            {/* Broker Selection */}
            <div className="mb-6">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2 block">
                Paper Trading Broker
              </label>
              <div className="flex gap-2">
                {(['alpaca', 'tastytrade'] as const).map((b) => (
                  <button
                    key={b}
                    onClick={() => setBroker(b)}
                    className={`flex-1 px-4 py-2 rounded text-sm font-mono font-semibold uppercase transition-colors ${
                      broker === b
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/30 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {b === 'alpaca' ? '🦙 Alpaca' : '🥒 Tastytrade'}
                  </button>
                ))}
              </div>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 mb-6">
                <p className="text-sm font-mono text-red-400">{error}</p>
              </div>
            )}
            {result && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 mb-6">
                <p className="text-sm font-mono text-green-400">Order executed! ID: {result.orderId}</p>
              </div>
            )}
            <div className="p-4 rounded-lg bg-muted/20 border border-border mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-mono text-muted-foreground">Estimated Value</span>
                <span className="text-xl font-mono font-bold">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                <span>{quantity} shares @ ${quote.price.toFixed(2)}</span>
                <span>{orderType.toUpperCase()} ORDER</span>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => {
                  setTicker('NVDA')
                  setSide('buy')
                  setQuantity('10')
                  setOrderType('market')
                  setLimitPrice('')
                  setStopPrice('')
                }}
              >
                <X className="w-4 h-4" />
                Clear
              </Button>
              <Button
                onClick={handleExecuteTrade}
                disabled={isLoading}
                className={`flex-1 gap-2 ${
                  side === 'buy' 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    {side === 'buy' ? 'Buy' : 'Sell'} {ticker}
                  </>
                )}
              </Button>
            </div>

            {/* Trade Result Alert */}
            {result && (
              <div className="mt-4 p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                <div className="flex items-center gap-2 text-green-400">
                  <Check className="w-4 h-4" />
                  <span className="font-mono text-sm">{side === 'buy' ? 'Buy' : 'Sell'} order executed: {result.orderId}</span>
                </div>
              </div>
            )}

            {/* Error Alert */}
            {error && (
              <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-mono text-sm">{error}</span>
                </div>
              </div>
            )}
          </div>

          {/* Trade Ideas Section */}
          <div className="mt-6 p-6 rounded-lg border border-border bg-card/50">
            <h2 className="text-sm font-mono font-bold text-foreground mb-4 uppercase tracking-wide">Ideas for You</h2>
            <QuickTradeIdeas onSelectIdea={handleTradeIdeaSelect} />
          </div>
        </div>
      </main>
    </div>
  )
}
