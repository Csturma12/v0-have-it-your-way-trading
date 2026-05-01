'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, AlertCircle, TrendingUp } from 'lucide-react'

interface Catalyst {
  date: string
  type: string
  description: string
  impact?: 'high' | 'medium' | 'low'
}

interface RiskData {
  sentiment: 'bullish' | 'neutral' | 'bearish'
  sentimentScore: number
  riskLevel: 'low' | 'medium' | 'high'
  shortInterest: number
  insiderBuying: number
  insiderSelling: number
  institutionalOwnership: number
  warnings: string[]
}

export function CatalystsRisk({ ticker }: { ticker?: string }) {
  const [catalysts, setCatalysts] = useState<Catalyst[]>([])
  const [risk, setRisk] = useState<RiskData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!ticker) return
    fetchData()
  }, [ticker])

  const fetchData = async () => {
    if (!ticker) return
    setLoading(true)
    try {
      // Fetch from multiple APIs in parallel: Finnhub catalysts, /risk
      // (Finnhub-backed sentiment + ownership + short-interest), UW
      // insider trades. Intrinio insider feed was removed.
      const [catRes, riskRes, uwRes] = await Promise.all([
        fetch(`/api/catalysts?symbol=${ticker}`),
        fetch(`/api/risk?symbol=${ticker}`),
        fetch(`/api/unusual-whales?type=insider&ticker=${ticker}`),
      ])

      if (catRes.ok) {
        const catData = await catRes.json()
        setCatalysts(catData.catalysts || [])
      }

      // Combine risk data from multiple sources
      let riskData: RiskData | null = null
      if (riskRes.ok) {
        riskData = await riskRes.json()
      }

      // Enrich with UW insider trades
      if (uwRes.ok) {
        const uwData = await uwRes.json()
        const insiderTrades = uwData.data || []
        const buying = insiderTrades.filter((t: any) => t.transaction_type === 'Purchase').length
        const selling = insiderTrades.filter((t: any) => t.transaction_type === 'Sale').length
        if (riskData) {
          riskData.insiderBuying = buying || riskData.insiderBuying
          riskData.insiderSelling = selling || riskData.insiderSelling
        }
      }

      setRisk(riskData)
    } catch (err) {
      console.error('[CatalystsRisk] Error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!ticker) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        Select a ticker to view catalysts & risk
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-border flex-shrink-0 bg-card/50">
        <span className="text-xs font-mono font-bold text-muted-foreground uppercase">Catalysts & Risk</span>
        <button
          onClick={fetchData}
          className="p-1 hover:bg-muted/50 rounded transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-3 h-3 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Two-column layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left: Catalysts */}
        <div className="flex-1 border-r border-border overflow-y-auto p-1.5">
          <div className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Catalysts</div>
          {catalysts.length > 0 ? (
            <div className="space-y-1">
              {catalysts.slice(0, 8).map((cat, i) => (
                <div key={i} className="text-[8px] p-1 rounded bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-1">
                    <span className={`font-bold uppercase tracking-wide px-1 py-0 rounded text-[7px] ${
                      cat.impact === 'high' ? 'bg-red-500/30 text-red-400' :
                      cat.impact === 'medium' ? 'bg-yellow-500/30 text-yellow-400' :
                      'bg-blue-500/30 text-blue-400'
                    }`}>
                      {cat.impact?.toUpperCase() || 'EVENT'}
                    </span>
                  </div>
                  <div className="font-mono text-muted-foreground text-[7px] mt-0.5">{cat.date}</div>
                  <div className="text-foreground mt-0.5 line-clamp-2">{cat.description}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[8px] text-muted-foreground text-center py-4">No upcoming catalysts</div>
          )}
        </div>

        {/* Right: Risk */}
        <div className="flex-1 overflow-y-auto p-1.5">
          <div className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Risk & Sentiment</div>
          {risk ? (
            <div className="space-y-1.5">
              
              {/* Sentiment */}
              <div className="text-[8px] p-1 rounded bg-muted/30 border border-border/50">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Sentiment</span>
                  <span className={`font-bold uppercase ${
                    risk.sentiment === 'bullish' ? 'text-green-400' :
                    risk.sentiment === 'bearish' ? 'text-red-400' :
                    'text-yellow-400'
                  }`}>
                    {risk.sentiment}
                  </span>
                </div>
                <div className="w-full h-1 bg-border rounded mt-1">
                  <div
                    className={`h-full rounded ${
                      risk.sentiment === 'bullish' ? 'bg-green-400' :
                      risk.sentiment === 'bearish' ? 'bg-red-400' :
                      'bg-yellow-400'
                    }`}
                    style={{ width: `${(risk.sentimentScore + 1) * 50}%` }}
                  />
                </div>
              </div>

              {/* Risk Level */}
              <div className="text-[8px] p-1 rounded bg-muted/30 border border-border/50">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Risk Level</span>
                  <span className={`font-bold uppercase ${
                    risk.riskLevel === 'low' ? 'text-green-400' :
                    risk.riskLevel === 'medium' ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {risk.riskLevel}
                  </span>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="space-y-0.5 text-[8px]">
                {risk.shortInterest > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Short Interest</span>
                    <span className="font-mono">{risk.shortInterest.toFixed(1)}%</span>
                  </div>
                )}
                {risk.institutionalOwnership > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Inst. Own</span>
                    <span className="font-mono">{risk.institutionalOwnership.toFixed(1)}%</span>
                  </div>
                )}
                {risk.insiderBuying > 0 && (
                  <div className="flex justify-between text-green-400">
                    <span className="text-muted-foreground">Insider Buy</span>
                    <span className="font-mono">{risk.insiderBuying}</span>
                  </div>
                )}
                {risk.insiderSelling > 0 && (
                  <div className="flex justify-between text-red-400">
                    <span className="text-muted-foreground">Insider Sell</span>
                    <span className="font-mono">{risk.insiderSelling}</span>
                  </div>
                )}
              </div>

              {/* Warnings */}
              {risk.warnings && risk.warnings.length > 0 && (
                <div className="text-[8px] p-1 rounded bg-red-500/10 border border-red-500/30">
                  <div className="flex items-center gap-1 mb-0.5">
                    <AlertCircle className="w-2.5 h-2.5 text-red-400" />
                    <span className="font-bold text-red-400">Warnings</span>
                  </div>
                  <ul className="space-y-0.5">
                    {risk.warnings.slice(0, 3).map((warn, i) => (
                      <li key={i} className="text-red-400/80">• {warn}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-[8px] text-muted-foreground text-center py-4">No risk data available</div>
          )}
        </div>
      </div>
    </div>
  )
}
