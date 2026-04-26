'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowUp, ArrowDown } from 'lucide-react'

interface QuickTradeBoxProps {
  selectedTicker: string | null
  price: number | null
}

export function QuickTradeBox({ selectedTicker, price }: QuickTradeBoxProps) {
  const [quantity, setQuantity] = useState('')
  const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy')

  if (!selectedTicker) {
    return (
      <div className="p-2 border-t border-border text-center">
        <p className="text-[10px] text-muted-foreground font-mono">Select a ticker to trade</p>
      </div>
    )
  }

  const estimatedValue = price && quantity ? (parseFloat(quantity) * price).toFixed(2) : '0.00'

  return (
    <div className="p-2 border-t border-border">
      <div className="text-[9px] font-mono font-bold text-foreground/70 uppercase tracking-wide mb-2">
        Quick Trade • {selectedTicker}
      </div>

      {/* Trade Type Toggle */}
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

      {/* Quantity Input */}
      <div className="mb-2">
        <label className="text-[8px] font-mono text-muted-foreground uppercase tracking-wide block mb-0.5">
          Quantity
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
          <span className="text-[9px] font-mono text-muted-foreground">Est. Value:</span>
          <span className="text-[11px] font-mono font-bold text-foreground">${estimatedValue}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-1">
        <Button
          onClick={() => {
            // Placeholder for order submission
            console.log(`${orderType.toUpperCase()} ${quantity} shares of ${selectedTicker} @ $${price}`)
            setQuantity('')
          }}
          className={`flex-1 h-6 text-[11px] font-mono font-bold rounded ${
            orderType === 'buy'
              ? 'bg-green-500/30 hover:bg-green-500/40 border border-green-500/50 text-green-400'
              : 'bg-red-500/30 hover:bg-red-500/40 border border-red-500/50 text-red-400'
          }`}
        >
          SUBMIT
        </Button>
        <Button
          onClick={() => setQuantity('')}
          variant="outline"
          className="flex-1 h-6 text-[11px] font-mono font-bold"
        >
          CLEAR
        </Button>
      </div>
    </div>
  )
}
