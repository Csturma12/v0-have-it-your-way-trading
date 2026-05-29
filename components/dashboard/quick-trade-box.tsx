'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowUp, ArrowDown, Loader, CheckCircle, AlertTriangle, Bot, Hand } from 'lucide-react'
import { useBrokerTrade } from '@/hooks/useBrokerTrade'

interface QuickTradeBoxProps {
  selectedTicker: string | null
  price: number | null
  mode?: 'autonomous' | 'manual'
  onModeChange?: (mode: 'autonomous' | 'manual') => void
}

type AssetClass = 'stock' | 'option'
type OptType = 'call' | 'put'

// Default expiration = next Friday (a common, liquid weekly expiry)
function nextFridayISO(): string {
  const d = new Date()
  const day = d.getUTCDay()
  // 5 = Friday. If today is Fri, push to next Fri.
  const offset = day === 5 ? 7 : (5 - day + 7) % 7
  d.setUTCDate(d.getUTCDate() + offset)
  return d.toISOString().split('T')[0]
}

export function QuickTradeBox({ selectedTicker, price, mode = 'manual', onModeChange }: QuickTradeBoxProps) {
  const [assetClass, setAssetClass] = useState<AssetClass>('stock')
  const [quantity, setQuantity] = useState('')
  const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy')

  // Option-specific fields
  const [optType, setOptType] = useState<OptType>('call')
  const [expiration, setExpiration] = useState<string>(nextFridayISO())
  const [strike, setStrike] = useState<string>('')
  const [limitPx, setLimitPx] = useState<string>('') // optional limit for option orders

  const { executeTrade, loading, result } = useBrokerTrade('alpaca')

  if (!selectedTicker) {
    return (
      <div className="p-2 border-t border-border text-center">
        <p className="text-[10px] text-muted-foreground font-mono">Select a ticker to trade</p>
      </div>
    )
  }

  const isOption = assetClass === 'option'

  // Estimated value:
  //   stock = qty * price
  //   option = qty * limit (or "—" if no limit set; market option price not known here)
  let estimatedValue = '0.00'
  if (isOption) {
    const lp = parseFloat(limitPx)
    const qty = parseFloat(quantity)
    if (lp > 0 && qty > 0) {
      // Each option contract represents 100 shares.
      estimatedValue = (qty * lp * 100).toFixed(2)
    } else {
      estimatedValue = '—'
    }
  } else {
    estimatedValue = price && quantity ? (parseFloat(quantity) * price).toFixed(2) : '0.00'
  }

  const submitDisabled =
    loading ||
    !quantity ||
    (isOption && (!strike || !expiration))

  const handleSubmit = async () => {
    if (!selectedTicker || !quantity) return

    if (isOption) {
      await executeTrade({
        ticker: selectedTicker,
        side: orderType,
        quantity: parseInt(quantity),
        orderType: limitPx ? 'limit' : 'market',
        limitPrice: limitPx ? parseFloat(limitPx) : undefined,
        assetClass: 'option',
        expiration,
        strike: parseFloat(strike),
        optionType: optType,
      })
    } else {
      await executeTrade({
        ticker: selectedTicker,
        side: orderType,
        quantity: parseInt(quantity),
        orderType: 'market',
        assetClass: 'stock',
      })
    }
    setQuantity('')
  }

  return (
    <div className="p-2 border-t border-border">
      <div className="text-[9px] font-mono font-bold text-foreground/70 uppercase tracking-wide mb-2">
        Quick Trade • {selectedTicker}
      </div>

      {/* Asset class toggle: STOCK / OPTION */}
      <div className="flex gap-1 mb-2">
        <button
          onClick={() => setAssetClass('stock')}
          className={`flex-1 h-5 text-[9px] font-mono font-bold rounded transition-colors ${
            assetClass === 'stock'
              ? 'bg-primary/30 border border-primary/50 text-foreground'
              : 'bg-muted/20 border border-border/50 text-muted-foreground hover:bg-muted/30'
          }`}
        >
          STOCK
        </button>
        <button
          onClick={() => setAssetClass('option')}
          className={`flex-1 h-5 text-[9px] font-mono font-bold rounded transition-colors ${
            assetClass === 'option'
              ? 'bg-primary/30 border border-primary/50 text-foreground'
              : 'bg-muted/20 border border-border/50 text-muted-foreground hover:bg-muted/30'
          }`}
        >
          OPTION
        </button>
      </div>

      {/* Side toggle: BUY / SELL */}
      <div className="flex gap-1 mb-2">
        <button
          onClick={() => setOrderType('buy')}
          className={`flex-1 flex items-center justify-center gap-1 h-6 text-[11px] font-mono font-bold rounded transition-colors ${
            orderType === 'buy'
              ? 'bg-green-500/20 border border-green-500/50 text-green-400'
              : 'bg-muted/20 border border-border/50 text-muted-foreground hover:bg-muted/30'
          }`}
        >
          <ArrowUp className="w-3 h-3" />
          BUY
        </button>
        <button
          onClick={() => setOrderType('sell')}
          className={`flex-1 flex items-center justify-center gap-1 h-6 text-[11px] font-mono font-bold rounded transition-colors ${
            orderType === 'sell'
              ? 'bg-red-500/20 border border-red-500/50 text-red-400'
              : 'bg-muted/20 border border-border/50 text-muted-foreground hover:bg-muted/30'
          }`}
        >
          <ArrowDown className="w-3 h-3" />
          SELL
        </button>
      </div>

      {/* Option-only fields */}
      {isOption && (
        <>
          {/* Call / Put */}
          <div className="flex gap-1 mb-2">
            <button
              onClick={() => setOptType('call')}
              className={`flex-1 h-5 text-[9px] font-mono font-bold rounded transition-colors ${
                optType === 'call'
                  ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-400'
                  : 'bg-muted/20 border border-border/50 text-muted-foreground hover:bg-muted/30'
              }`}
            >
              CALL
            </button>
            <button
              onClick={() => setOptType('put')}
              className={`flex-1 h-5 text-[9px] font-mono font-bold rounded transition-colors ${
                optType === 'put'
                  ? 'bg-fuchsia-500/20 border border-fuchsia-500/50 text-fuchsia-400'
                  : 'bg-muted/20 border border-border/50 text-muted-foreground hover:bg-muted/30'
              }`}
            >
              PUT
            </button>
          </div>

          {/* Expiration + Strike */}
          <div className="grid grid-cols-2 gap-1 mb-2">
            <div>
              <label className="text-[8px] font-mono text-muted-foreground uppercase tracking-wide block mb-0.5">
                Expiration
              </label>
              <Input
                type="date"
                value={expiration}
                onChange={(e) => setExpiration(e.target.value)}
                className="h-6 text-[10px] font-mono bg-muted/30 border-border/50"
              />
            </div>
            <div>
              <label className="text-[8px] font-mono text-muted-foreground uppercase tracking-wide block mb-0.5">
                Strike
              </label>
              <Input
                type="number"
                step="0.5"
                placeholder={price ? price.toFixed(0) : '0'}
                value={strike}
                onChange={(e) => setStrike(e.target.value)}
                className="h-6 text-[11px] font-mono bg-muted/30 border-border/50"
              />
            </div>
          </div>

          {/* Optional limit price */}
          <div className="mb-2">
            <label className="text-[8px] font-mono text-muted-foreground uppercase tracking-wide block mb-0.5">
              Limit (per contract, blank = market)
            </label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={limitPx}
              onChange={(e) => setLimitPx(e.target.value)}
              className="h-6 text-[11px] font-mono bg-muted/30 border-border/50"
            />
          </div>
        </>
      )}

      {/* Quantity (shares for stock, contracts for option) */}
      <div className="mb-2">
        <label className="text-[8px] font-mono text-muted-foreground uppercase tracking-wide block mb-0.5">
          {isOption ? 'Contracts' : 'Quantity'}
        </label>
        <Input
          type="number"
          placeholder="0"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="h-6 text-[11px] font-mono bg-muted/30 border-border/50"
        />
      </div>

      {/* Estimated Value */}
      <div className="mb-2 p-1.5 rounded bg-muted/10 border border-border/30">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-mono text-muted-foreground">
            {isOption ? 'Est. Cost (limit × 100):' : 'Est. Value:'}
          </span>
          <span className="text-[11px] font-mono font-bold text-foreground">
            {estimatedValue === '—' ? '—' : `$${estimatedValue}`}
          </span>
        </div>
      </div>

      {/* Mode Toggle */}
      {onModeChange && (
        <div className="flex gap-1 mb-2">
          <button
            onClick={() => onModeChange('autonomous')}
            className={`flex-1 flex items-center justify-center gap-1 h-5 text-[9px] font-mono font-bold rounded transition-colors ${
              mode === 'autonomous'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/20 border border-border/50 text-muted-foreground hover:bg-muted/30'
            }`}
          >
            <Bot className="w-2.5 h-2.5" />
            AUTO
          </button>
          <button
            onClick={() => onModeChange('manual')}
            className={`flex-1 flex items-center justify-center gap-1 h-5 text-[9px] font-mono font-bold rounded transition-colors ${
              mode === 'manual'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/20 border border-border/50 text-muted-foreground hover:bg-muted/30'
            }`}
          >
            <Hand className="w-2.5 h-2.5" />
            MANUAL
          </button>
        </div>
      )}

      {/* Trade Result */}
      {result && (
        <div
          className={`mb-2 p-1.5 rounded text-[9px] font-mono flex items-center gap-1 ${
            result.success
              ? 'bg-green-500/10 border border-green-500/30 text-green-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}
        >
          {result.success ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
          {result.success ? result.message || 'Order placed!' : result.error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-1">
        <Button
          onClick={handleSubmit}
          disabled={submitDisabled}
          className={`flex-1 h-6 text-[11px] font-mono font-bold rounded ${
            orderType === 'buy'
              ? 'bg-green-500/30 hover:bg-green-500/40 border border-green-500/50 text-green-400'
              : 'bg-red-500/30 hover:bg-red-500/40 border border-red-500/50 text-red-400'
          }`}
        >
          {loading ? <Loader className="w-3 h-3 animate-spin" /> : mode === 'autonomous' ? 'EXECUTE' : 'SUBMIT'}
        </Button>
        <Button
          onClick={() => {
            setQuantity('')
            setStrike('')
            setLimitPx('')
          }}
          variant="outline"
          className="flex-1 h-6 text-[11px] font-mono font-bold"
        >
          CLEAR
        </Button>
      </div>
    </div>
  )
}
