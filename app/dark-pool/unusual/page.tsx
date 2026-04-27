'use client'

import { useState, useEffect } from 'react'
import { 
  Signal, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Clock,
  Filter,
  Zap,
  Users,
  Building2,
  FileText,
  BarChart3
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { TopNavBar } from '@/components/dashboard/top-nav-bar'

interface InsiderTrade {
  id: string
  ticker: string
  name: string
  title: string
  transactionType: 'buy' | 'sell' | 'grant'
  shares: number
  price: number
  value: number
  timestamp: number
  filingDate: string
}

interface CongressTrade {
  id: string
  ticker: string
  representative: string
  party: 'D' | 'R' | 'I'
  transactionType: 'buy' | 'sell'
  amount: string // e.g., "$15,001 - $50,000"
  timestamp: number
  disclosureDate: string
}

interface MarketTide {
  callPremium: number
  putPremium: number
  callVolume: number
  putVolume: number
  sentiment: 'bullish' | 'bearish' | 'neutral'
  timestamp: number
}

function formatValue(val: number): string {
  if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(2)}B`
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`
  return `$${val.toFixed(0)}`
}

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return `${Math.floor(days / 7)}w ago`
}

export default function UnusualWhalesPage() {
  const [activeTab, setActiveTab] = useState<'insider' | 'congress' | 'tide'>('insider')
  const [insiderTrades, setInsiderTrades] = useState<InsiderTrade[]>([])
  const [congressTrades, setCongressTrades] = useState<CongressTrade[]>([])
  const [marketTide, setMarketTide] = useState<MarketTide | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasApiKey, setHasApiKey] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch insider trades
      const insiderRes = await fetch('/api/unusual-whales?type=insider')
      if (insiderRes.ok) {
        const data = await insiderRes.json()
        setHasApiKey(data.hasApiKey)
        // Transform UW data to our interface or use mock
        const trades: InsiderTrade[] = (data.data || []).slice(0, 15).map((t: any, i: number) => ({
          id: t.id || `insider-${i}`,
          ticker: t.ticker || t.symbol || 'UNKNOWN',
          name: t.insider_name || t.name || 'Executive',
          title: t.insider_title || t.title || 'Officer',
          transactionType: t.transaction_type?.toLowerCase().includes('buy') ? 'buy' : 
                          t.transaction_type?.toLowerCase().includes('sell') ? 'sell' : 'grant',
          shares: t.shares || t.quantity || 0,
          price: t.price || t.avg_price || 0,
          value: t.value || (t.shares * t.price) || 0,
          timestamp: t.timestamp ? new Date(t.timestamp).getTime() : Date.now() - (i * 86400000),
          filingDate: t.filing_date || new Date().toISOString().split('T')[0],
        }))
        setInsiderTrades(trades.length > 0 ? trades : getMockInsiderTrades())
      }

      // Fetch congress trades
      const congressRes = await fetch('/api/unusual-whales?type=congress')
      if (congressRes.ok) {
        const data = await congressRes.json()
        const trades: CongressTrade[] = (data.data || []).slice(0, 15).map((t: any, i: number) => ({
          id: t.id || `congress-${i}`,
          ticker: t.ticker || t.symbol || 'UNKNOWN',
          representative: t.representative || t.politician || 'Unknown',
          party: t.party === 'Republican' ? 'R' : t.party === 'Democrat' ? 'D' : 'I',
          transactionType: t.type?.toLowerCase().includes('purchase') ? 'buy' : 'sell',
          amount: t.amount || '$1,001 - $15,000',
          timestamp: t.timestamp ? new Date(t.timestamp).getTime() : Date.now() - (i * 86400000),
          disclosureDate: t.disclosure_date || new Date().toISOString().split('T')[0],
        }))
        setCongressTrades(trades.length > 0 ? trades : getMockCongressTrades())
      }

      // Fetch market tide
      const tideRes = await fetch('/api/unusual-whales?type=tide')
      if (tideRes.ok) {
        const data = await tideRes.json()
        if (data.data) {
          setMarketTide({
            callPremium: data.data.call_premium || 0,
            putPremium: data.data.put_premium || 0,
            callVolume: data.data.call_volume || 0,
            putVolume: data.data.put_volume || 0,
            sentiment: data.data.call_premium > data.data.put_premium ? 'bullish' : 'bearish',
            timestamp: Date.now(),
          })
        } else {
          setMarketTide(getMockMarketTide())
        }
      }
    } catch (err) {
      console.error('[UnusualWhales] Error:', err)
      // Fallback to mock data
      setInsiderTrades(getMockInsiderTrades())
      setCongressTrades(getMockCongressTrades())
      setMarketTide(getMockMarketTide())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNavBar />
      
      <header className="border-b border-border bg-card/30 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Signal className="w-6 h-6 text-green-400" />
            <h1 className="text-xl font-bold font-mono">UNUSUAL WHALES</h1>
            <Badge variant="outline" className={`text-[10px] ${
              hasApiKey ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
            }`}>
              {hasApiKey ? 'Live Data' : 'Demo Data'}
            </Badge>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Tab Selector */}
            <div className="flex items-center bg-muted/30 rounded-lg border border-border/50 p-0.5">
              <button
                onClick={() => setActiveTab('insider')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold rounded transition-colors ${
                  activeTab === 'insider' ? 'bg-purple-500/20 text-purple-400' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Building2 className="w-3 h-3" />
                Insider
              </button>
              <button
                onClick={() => setActiveTab('congress')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold rounded transition-colors ${
                  activeTab === 'congress' ? 'bg-blue-500/20 text-blue-400' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Users className="w-3 h-3" />
                Congress
              </button>
              <button
                onClick={() => setActiveTab('tide')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold rounded transition-colors ${
                  activeTab === 'tide' ? 'bg-green-500/20 text-green-400' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <BarChart3 className="w-3 h-3" />
                Market Tide
              </button>
            </div>
            
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 text-muted-foreground hover:text-foreground rounded transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* INSIDER TRADES TAB */}
      {activeTab === 'insider' && (
        <>
          <div className="grid grid-cols-4 gap-4 px-6 py-4 border-b border-border bg-card/20">
            <div className="p-4 rounded-lg border border-border bg-card/50">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-mono text-muted-foreground">Total Trades</span>
              </div>
              <span className="text-xl font-bold font-mono text-foreground">{insiderTrades.length}</span>
            </div>
            <div className="p-4 rounded-lg border border-border bg-card/50">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-xs font-mono text-muted-foreground">Buys</span>
              </div>
              <span className="text-xl font-bold font-mono text-green-400">
                {insiderTrades.filter(t => t.transactionType === 'buy').length}
              </span>
            </div>
            <div className="p-4 rounded-lg border border-border bg-card/50">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-red-400" />
                <span className="text-xs font-mono text-muted-foreground">Sells</span>
              </div>
              <span className="text-xl font-bold font-mono text-red-400">
                {insiderTrades.filter(t => t.transactionType === 'sell').length}
              </span>
            </div>
            <div className="p-4 rounded-lg border border-border bg-card/50">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-theme-gold" />
                <span className="text-xs font-mono text-muted-foreground">Total Value</span>
              </div>
              <span className="text-xl font-bold font-mono text-theme-gold">
                {formatValue(insiderTrades.reduce((sum, t) => sum + t.value, 0))}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-auto px-6 py-4">
            <table className="w-full">
              <thead className="sticky top-0 bg-background">
                <tr className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider border-b border-border">
                  <th className="text-left py-2 px-3">Date</th>
                  <th className="text-left py-2 px-3">Ticker</th>
                  <th className="text-left py-2 px-3">Insider</th>
                  <th className="text-center py-2 px-3">Type</th>
                  <th className="text-right py-2 px-3">Shares</th>
                  <th className="text-right py-2 px-3">Price</th>
                  <th className="text-right py-2 px-3">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {insiderTrades.map((trade) => (
                  <tr key={trade.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-2 px-3 text-[11px] font-mono text-muted-foreground">
                      {timeAgo(trade.timestamp)}
                    </td>
                    <td className="py-2 px-3">
                      <span className="text-sm font-mono font-bold text-foreground">{trade.ticker}</span>
                    </td>
                    <td className="py-2 px-3">
                      <div>
                        <div className="text-sm font-mono text-foreground">{trade.name}</div>
                        <div className="text-[10px] text-muted-foreground">{trade.title}</div>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <Badge className={`text-[9px] ${
                        trade.transactionType === 'buy' ? 'bg-green-500/10 text-green-400 border-green-500/30' :
                        trade.transactionType === 'sell' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                        'bg-purple-500/10 text-purple-400 border-purple-500/30'
                      }`}>
                        {trade.transactionType.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-right text-sm font-mono text-muted-foreground">
                      {trade.shares.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right text-sm font-mono text-foreground">
                      ${trade.price.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span className={`text-sm font-mono font-bold ${
                        trade.value >= 1000000 ? 'text-theme-gold' : 'text-foreground'
                      }`}>
                        {formatValue(trade.value)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* CONGRESS TRADES TAB */}
      {activeTab === 'congress' && (
        <>
          <div className="grid grid-cols-4 gap-4 px-6 py-4 border-b border-border bg-card/20">
            <div className="p-4 rounded-lg border border-border bg-card/50">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-mono text-muted-foreground">Total Filings</span>
              </div>
              <span className="text-xl font-bold font-mono text-foreground">{congressTrades.length}</span>
            </div>
            <div className="p-4 rounded-lg border border-border bg-card/50">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-[8px] font-bold text-white">D</div>
                <span className="text-xs font-mono text-muted-foreground">Democrat</span>
              </div>
              <span className="text-xl font-bold font-mono text-blue-400">
                {congressTrades.filter(t => t.party === 'D').length}
              </span>
            </div>
            <div className="p-4 rounded-lg border border-border bg-card/50">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-[8px] font-bold text-white">R</div>
                <span className="text-xs font-mono text-muted-foreground">Republican</span>
              </div>
              <span className="text-xl font-bold font-mono text-red-400">
                {congressTrades.filter(t => t.party === 'R').length}
              </span>
            </div>
            <div className="p-4 rounded-lg border border-border bg-card/50">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-xs font-mono text-muted-foreground">Purchases</span>
              </div>
              <span className="text-xl font-bold font-mono text-green-400">
                {congressTrades.filter(t => t.transactionType === 'buy').length}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-auto px-6 py-4">
            <table className="w-full">
              <thead className="sticky top-0 bg-background">
                <tr className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider border-b border-border">
                  <th className="text-left py-2 px-3">Disclosed</th>
                  <th className="text-left py-2 px-3">Ticker</th>
                  <th className="text-left py-2 px-3">Representative</th>
                  <th className="text-center py-2 px-3">Party</th>
                  <th className="text-center py-2 px-3">Type</th>
                  <th className="text-right py-2 px-3">Amount Range</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {congressTrades.map((trade) => (
                  <tr key={trade.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-2 px-3 text-[11px] font-mono text-muted-foreground">
                      {timeAgo(trade.timestamp)}
                    </td>
                    <td className="py-2 px-3">
                      <span className="text-sm font-mono font-bold text-foreground">{trade.ticker}</span>
                    </td>
                    <td className="py-2 px-3 text-sm font-mono text-foreground">
                      {trade.representative}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <Badge className={`text-[9px] ${
                        trade.party === 'D' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                        trade.party === 'R' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                        'bg-gray-500/20 text-gray-400 border-gray-500/30'
                      }`}>
                        {trade.party}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <Badge className={`text-[9px] ${
                        trade.transactionType === 'buy' ? 'bg-green-500/10 text-green-400 border-green-500/30' :
                        'bg-red-500/10 text-red-400 border-red-500/30'
                      }`}>
                        {trade.transactionType === 'buy' ? 'PURCHASE' : 'SALE'}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-right text-sm font-mono text-theme-gold">
                      {trade.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* MARKET TIDE TAB */}
      {activeTab === 'tide' && marketTide && (
        <div className="flex-1 p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Overall Sentiment */}
            <div className="p-8 rounded-xl border border-border bg-card/50 text-center">
              <div className="text-sm font-mono text-muted-foreground mb-2">Market Flow Sentiment</div>
              <div className={`text-4xl font-bold font-mono ${
                marketTide.sentiment === 'bullish' ? 'text-green-400' : 
                marketTide.sentiment === 'bearish' ? 'text-red-400' : 'text-yellow-400'
              }`}>
                {marketTide.sentiment.toUpperCase()}
              </div>
            </div>

            {/* Premium Comparison */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 rounded-lg border border-green-500/30 bg-green-500/5">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  <span className="text-sm font-mono text-muted-foreground">Call Premium</span>
                </div>
                <div className="text-3xl font-bold font-mono text-green-400">{formatValue(marketTide.callPremium)}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Volume: {marketTide.callVolume.toLocaleString()} contracts
                </div>
              </div>
              
              <div className="p-6 rounded-lg border border-red-500/30 bg-red-500/5">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-5 h-5 text-red-400" />
                  <span className="text-sm font-mono text-muted-foreground">Put Premium</span>
                </div>
                <div className="text-3xl font-bold font-mono text-red-400">{formatValue(marketTide.putPremium)}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Volume: {marketTide.putVolume.toLocaleString()} contracts
                </div>
              </div>
            </div>

            {/* Ratio Bar */}
            <div className="p-4 rounded-lg border border-border bg-card/50">
              <div className="text-xs font-mono text-muted-foreground mb-2">Call/Put Premium Ratio</div>
              <div className="h-6 rounded-full overflow-hidden bg-muted/30 flex">
                <div 
                  className="bg-green-500 transition-all duration-500"
                  style={{ width: `${(marketTide.callPremium / (marketTide.callPremium + marketTide.putPremium)) * 100}%` }}
                />
                <div 
                  className="bg-red-500 transition-all duration-500"
                  style={{ width: `${(marketTide.putPremium / (marketTide.callPremium + marketTide.putPremium)) * 100}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs font-mono">
                <span className="text-green-400">
                  {((marketTide.callPremium / (marketTide.callPremium + marketTide.putPremium)) * 100).toFixed(1)}% Calls
                </span>
                <span className="text-red-400">
                  {((marketTide.putPremium / (marketTide.callPremium + marketTide.putPremium)) * 100).toFixed(1)}% Puts
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Mock data functions
function getMockInsiderTrades(): InsiderTrade[] {
  return [
    { id: '1', ticker: 'NVDA', name: 'Jensen Huang', title: 'CEO', transactionType: 'sell', shares: 120000, price: 924.50, value: 110940000, timestamp: Date.now() - 86400000, filingDate: '2024-02-01' },
    { id: '2', ticker: 'AAPL', name: 'Tim Cook', title: 'CEO', transactionType: 'sell', shares: 50000, price: 182.30, value: 9115000, timestamp: Date.now() - 172800000, filingDate: '2024-01-30' },
    { id: '3', ticker: 'META', name: 'Mark Zuckerberg', title: 'CEO', transactionType: 'sell', shares: 28000, price: 514.60, value: 14408800, timestamp: Date.now() - 259200000, filingDate: '2024-01-28' },
    { id: '4', ticker: 'TSLA', name: 'Robyn Denholm', title: 'Chair', transactionType: 'buy', shares: 10000, price: 178.40, value: 1784000, timestamp: Date.now() - 345600000, filingDate: '2024-01-25' },
    { id: '5', ticker: 'AMD', name: 'Lisa Su', title: 'CEO', transactionType: 'sell', shares: 35000, price: 162.80, value: 5698000, timestamp: Date.now() - 432000000, filingDate: '2024-01-22' },
    { id: '6', ticker: 'GOOGL', name: 'Sundar Pichai', title: 'CEO', transactionType: 'sell', shares: 22000, price: 175.40, value: 3858800, timestamp: Date.now() - 518400000, filingDate: '2024-01-20' },
    { id: '7', ticker: 'AMZN', name: 'Andrew Jassy', title: 'CEO', transactionType: 'grant', shares: 45000, price: 189.20, value: 8514000, timestamp: Date.now() - 604800000, filingDate: '2024-01-18' },
    { id: '8', ticker: 'MSFT', name: 'Satya Nadella', title: 'CEO', transactionType: 'sell', shares: 30000, price: 415.20, value: 12456000, timestamp: Date.now() - 691200000, filingDate: '2024-01-15' },
  ]
}

function getMockCongressTrades(): CongressTrade[] {
  return [
    { id: '1', ticker: 'NVDA', representative: 'Nancy Pelosi', party: 'D', transactionType: 'buy', amount: '$1,000,001 - $5,000,000', timestamp: Date.now() - 86400000, disclosureDate: '2024-02-01' },
    { id: '2', ticker: 'MSFT', representative: 'Tommy Tuberville', party: 'R', transactionType: 'buy', amount: '$250,001 - $500,000', timestamp: Date.now() - 172800000, disclosureDate: '2024-01-30' },
    { id: '3', ticker: 'AAPL', representative: 'Dan Crenshaw', party: 'R', transactionType: 'sell', amount: '$15,001 - $50,000', timestamp: Date.now() - 259200000, disclosureDate: '2024-01-28' },
    { id: '4', ticker: 'GOOGL', representative: 'Ro Khanna', party: 'D', transactionType: 'buy', amount: '$50,001 - $100,000', timestamp: Date.now() - 345600000, disclosureDate: '2024-01-25' },
    { id: '5', ticker: 'TSLA', representative: 'Josh Gottheimer', party: 'D', transactionType: 'buy', amount: '$100,001 - $250,000', timestamp: Date.now() - 432000000, disclosureDate: '2024-01-22' },
    { id: '6', ticker: 'META', representative: 'Kevin Hern', party: 'R', transactionType: 'sell', amount: '$15,001 - $50,000', timestamp: Date.now() - 518400000, disclosureDate: '2024-01-20' },
  ]
}

function getMockMarketTide(): MarketTide {
  return {
    callPremium: 2_450_000_000,
    putPremium: 1_820_000_000,
    callVolume: 12_500_000,
    putVolume: 9_200_000,
    sentiment: 'bullish',
    timestamp: Date.now(),
  }
}
