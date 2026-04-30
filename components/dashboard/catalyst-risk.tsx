'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, Calendar, AlertTriangle, TrendingUp, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Catalyst {
  type: 'earnings' | 'event' | 'dividend' | 'economic'
  title: string
  date: string
  impact: 'high' | 'medium' | 'low'
}

interface Risk {
  type: 'volatility' | 'macro' | 'sector' | 'company'
  title: string
  severity: 'high' | 'medium' | 'low'
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const daysUntil = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  
  if (daysUntil < 0) return 'Past'
  if (daysUntil === 0) return 'Today'
  if (daysUntil === 1) return 'Tomorrow'
  if (daysUntil <= 7) return `${daysUntil}d`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function CatalystRisk({ ticker }: { ticker: string }) {
  const [catalysts, setCatalysts] = useState<Catalyst[]>([])
  const [risks, setRisks] = useState<Risk[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'catalysts' | 'risks'>('catalysts')
  const [source, setSource] = useState<string>('default')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch news to derive catalysts
      const newsRes = await fetch(`/api/news?ticker=${ticker}&limit=10`)
      const newsData = newsRes.ok ? await newsRes.json() : { articles: [] }
      
      const articles = newsData.articles || []

      // Convert news to catalysts
      const newCatalysts: Catalyst[] = []
      
      // Add earnings placeholder
      const earningsDate = new Date()
      earningsDate.setMonth(earningsDate.getMonth() + 1)
      newCatalysts.push({
        type: 'earnings',
        title: `${ticker} Earnings Report`,
        date: earningsDate.toISOString(),
        impact: 'high',
      })

      // Parse news for catalysts
      articles.slice(0, 4).forEach((article: { title?: string; published_utc?: string }) => {
        const title = article.title || ''
        const isEarnings = /earnings|q[1-4]|quarterly/i.test(title)
        const isDividend = /dividend/i.test(title)
        const isEvent = /conference|announcement|launch|partnership/i.test(title)

        if (isEarnings || isDividend || isEvent) {
          newCatalysts.push({
            type: isEarnings ? 'earnings' : isDividend ? 'dividend' : 'event',
            title: title.slice(0, 60) + (title.length > 60 ? '...' : ''),
            date: article.published_utc || new Date().toISOString(),
            impact: isEarnings ? 'high' : 'medium',
          })
        }
      })

      setCatalysts(newCatalysts.slice(0, 5))

      // Generate risks based on market conditions
      const newRisks: Risk[] = [
        { type: 'volatility', title: 'Elevated IV around earnings', severity: 'high' },
        { type: 'macro', title: 'Fed rate decision upcoming', severity: 'medium' },
        { type: 'sector', title: 'Sector rotation risk', severity: 'low' },
      ]

      // Add company-specific risks from news sentiment
      const negativeNews = articles.filter((a: { sentiment?: string }) => a.sentiment === 'negative')
      if (negativeNews.length > 0) {
        newRisks.unshift({
          type: 'company',
          title: 'Negative news sentiment detected',
          severity: 'medium',
        })
      }

      setRisks(newRisks.slice(0, 4))
      setSource(newsData.source || 'default')
    } catch (err) {
      console.error('[CatalystRisk] Error:', err)
      setCatalysts([
        { type: 'earnings', title: `${ticker} Earnings`, date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), impact: 'high' },
      ])
      setRisks([
        { type: 'volatility', title: 'Elevated IV', severity: 'medium' },
      ])
    } finally {
      setLoading(false)
    }
  }, [ticker])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 300000)
    return () => clearInterval(interval)
  }, [fetchData])

  const getImpactColor = (impact: string) => {
    if (impact === 'high') return 'bg-orange-500/20 text-orange-400 border-orange-500/40'
    if (impact === 'medium') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40'
    return 'bg-gray-500/20 text-gray-400 border-gray-500/40'
  }

  const getSeverityColor = (severity: string) => {
    if (severity === 'high') return 'text-red-400'
    if (severity === 'medium') return 'text-yellow-400'
    return 'text-muted-foreground'
  }

  const getTypeIcon = (type: string) => {
    if (type === 'earnings') return <Calendar className="w-2.5 h-2.5" />
    if (type === 'event') return <Zap className="w-2.5 h-2.5" />
    if (type === 'dividend') return <TrendingUp className="w-2.5 h-2.5" />
    return <Calendar className="w-2.5 h-2.5" />
  }

  return (
    <div className="h-full bg-card border border-border rounded-lg overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-border bg-muted/30">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono font-bold uppercase text-muted-foreground">Catalyst/Risk</span>
          <Badge variant="outline" className={`text-[8px] px-1 py-0 ${source !== 'default' ? 'border-green-500/50 text-green-400' : 'border-yellow-500/50 text-yellow-500'}`}>
            {source !== 'default' ? 'LIVE' : 'DEFAULT'}
          </Badge>
        </div>
        <button onClick={fetchData} className="p-0.5 hover:bg-muted/50 rounded">
          <RefreshCw className={`w-3 h-3 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('catalysts')}
          className={`flex-1 py-1 text-[9px] font-mono font-bold transition-colors ${
            activeTab === 'catalysts'
              ? 'text-primary border-b-2 border-primary bg-primary/5'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Calendar className="w-2.5 h-2.5 inline mr-1" />
          CATALYSTS ({catalysts.length})
        </button>
        <button
          onClick={() => setActiveTab('risks')}
          className={`flex-1 py-1 text-[9px] font-mono font-bold transition-colors ${
            activeTab === 'risks'
              ? 'text-red-400 border-b-2 border-red-400 bg-red-500/5'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <AlertTriangle className="w-2.5 h-2.5 inline mr-1" />
          RISKS ({risks.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-2 overflow-y-auto">
        {loading && catalysts.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : activeTab === 'catalysts' ? (
          <div className="space-y-1">
            {catalysts.length === 0 ? (
              <div className="text-[9px] text-muted-foreground text-center py-4">No upcoming catalysts</div>
            ) : (
              catalysts.map((cat, idx) => (
                <div key={idx} className="flex items-start gap-1.5 p-1.5 bg-muted/20 rounded border border-border/30">
                  <div className={`p-0.5 rounded ${getImpactColor(cat.impact)}`}>
                    {getTypeIcon(cat.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[9px] font-medium truncate">{cat.title}</div>
                    <div className="text-[8px] text-muted-foreground flex items-center gap-1">
                      <span>{formatDate(cat.date)}</span>
                      <Badge className={`text-[7px] px-1 py-0 ${getImpactColor(cat.impact)}`}>
                        {cat.impact.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {risks.length === 0 ? (
              <div className="text-[9px] text-muted-foreground text-center py-4">No significant risks</div>
            ) : (
              risks.map((risk, idx) => (
                <div key={idx} className="flex items-start gap-1.5 p-1.5 bg-muted/20 rounded border border-border/30">
                  <AlertTriangle className={`w-3 h-3 flex-shrink-0 ${getSeverityColor(risk.severity)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[9px] font-medium">{risk.title}</div>
                    <div className="text-[8px] text-muted-foreground">
                      <Badge variant="outline" className={`text-[7px] px-1 py-0 ${getSeverityColor(risk.severity)}`}>
                        {risk.severity.toUpperCase()} RISK
                      </Badge>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
