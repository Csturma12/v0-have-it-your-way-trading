'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  FileText,
  Search,
  User,
  Calendar,
  TrendingUp,
  TrendingDown,
  Star,
  ExternalLink,
  Building2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

interface AnalystReport {
  id: string
  title: string
  analyst: string
  firm: string
  date: string
  ticker?: string
  rating: 'BUY' | 'SELL' | 'HOLD' | 'UPGRADE' | 'DOWNGRADE'
  priceTarget?: number
  previousTarget?: number
  summary: string
  keyPoints: string[]
  fullReportUrl?: string
}

const MOCK_REPORTS: AnalystReport[] = [
  {
    id: '1',
    title: 'NVIDIA: AI Leadership Continues, Raising Price Target',
    analyst: 'Mark Lipacis',
    firm: 'Jefferies',
    date: '2026-04-25',
    ticker: 'NVDA',
    rating: 'BUY',
    priceTarget: 1100,
    previousTarget: 950,
    summary: 'NVIDIA maintains dominant position in AI infrastructure. Blackwell architecture expected to drive 40% revenue growth in 2027.',
    keyPoints: [
      'Data center revenue to exceed $150B by 2027',
      'Gross margins stable at 75%+',
      'Competition from AMD remains limited',
      'Enterprise AI adoption accelerating',
    ],
  },
  {
    id: '2',
    title: 'Tesla: Concerns Over EV Demand, Downgrading to Hold',
    analyst: 'Adam Jonas',
    firm: 'Morgan Stanley',
    date: '2026-04-24',
    ticker: 'TSLA',
    rating: 'DOWNGRADE',
    priceTarget: 160,
    previousTarget: 220,
    summary: 'Lowering estimates on weaker-than-expected demand. Robotaxi timeline remains uncertain despite recent progress.',
    keyPoints: [
      'EV demand softening in key markets',
      'Price cuts impacting margins',
      'FSD revenue delayed',
      'Competition intensifying from BYD',
    ],
  },
  {
    id: '3',
    title: 'Apple: Services Growth Offsets Hardware Weakness',
    analyst: 'Samik Chatterjee',
    firm: 'JP Morgan',
    date: '2026-04-24',
    ticker: 'AAPL',
    rating: 'BUY',
    priceTarget: 210,
    summary: 'Services revenue hit all-time high. iPhone 17 cycle expected to drive hardware refresh in H2.',
    keyPoints: [
      'Services margin expansion continues',
      'Apple Intelligence driving upgrades',
      'Wearables segment stabilizing',
      'Share buyback program ongoing',
    ],
  },
  {
    id: '4',
    title: 'Weekly Macro Outlook: Fed Pivot in Focus',
    analyst: 'Jan Hatzius',
    firm: 'Goldman Sachs',
    date: '2026-04-23',
    rating: 'HOLD',
    summary: 'Expecting Fed to signal rate cuts at June meeting. Equity markets well-positioned for soft landing scenario.',
    keyPoints: [
      'Inflation trending toward 2% target',
      'Labor market resilient but cooling',
      'Consumer spending moderating',
      'Corporate earnings beating estimates',
    ],
  },
  {
    id: '5',
    title: 'Meta Platforms: AI Investments Paying Off',
    analyst: 'Eric Sheridan',
    firm: 'Goldman Sachs',
    date: '2026-04-23',
    ticker: 'META',
    rating: 'UPGRADE',
    priceTarget: 600,
    previousTarget: 520,
    summary: 'Upgrading to Buy on strong ad revenue momentum. Llama AI models driving engagement and advertiser ROI.',
    keyPoints: [
      'Ad revenue growth reaccelerating',
      'Reality Labs losses narrowing',
      'AI recommendations boosting engagement 15%',
      'Threads monetization beginning',
    ],
  },
  {
    id: '6',
    title: 'Eli Lilly: GLP-1 Dominance Extends',
    analyst: 'Terence Flynn',
    firm: 'Morgan Stanley',
    date: '2026-04-22',
    ticker: 'LLY',
    rating: 'BUY',
    priceTarget: 950,
    summary: 'Mounjaro and Zepbound sales exceeding expectations. Supply constraints easing, demand remains robust.',
    keyPoints: [
      'GLP-1 market expanding faster than expected',
      'FDA breakthrough for Alzheimer\'s drug',
      'Manufacturing capacity doubling',
      'Pipeline optionality undervalued',
    ],
  },
]

export default function AnalystPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [ratingFilter, setRatingFilter] = useState<string>('all')
  const [selectedReport, setSelectedReport] = useState<AnalystReport | null>(null)

  const filtered = MOCK_REPORTS.filter((report) => {
    const matchesSearch =
      searchQuery === '' ||
      report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.ticker?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.analyst.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.firm.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesRating =
      ratingFilter === 'all' ||
      report.rating === ratingFilter

    return matchesSearch && matchesRating
  })

  const getRatingStyle = (rating: string) => {
    switch (rating) {
      case 'BUY':
      case 'UPGRADE':
        return 'bg-green-500/10 text-green-400 border-green-500/30'
      case 'SELL':
      case 'DOWNGRADE':
        return 'bg-red-500/10 text-red-400 border-red-500/30'
      default:
        return 'bg-theme-gold/10 text-theme-gold border-theme-gold/30'
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
              </Link>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <h1 className="text-xl font-bold font-mono">ANALYST REVIEW</h1>
              </div>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                {filtered.length} Reports
              </Badge>
            </div>

            {/* Search */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search ticker, analyst, firm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-muted/30 border-border/50"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="border-b border-border bg-card/30 px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground">Rating:</span>
          {(['all', 'BUY', 'SELL', 'HOLD', 'UPGRADE', 'DOWNGRADE'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRatingFilter(r)}
              className={`px-3 py-1 rounded text-xs font-mono font-semibold transition-colors ${
                ratingFilter === r
                  ? r === 'BUY' || r === 'UPGRADE'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : r === 'SELL' || r === 'DOWNGRADE'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : r === 'HOLD'
                        ? 'bg-theme-gold/20 text-theme-gold border border-theme-gold/30'
                        : 'bg-primary/20 text-primary border border-primary/30'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {r === 'all' ? 'All' : r}
            </button>
          ))}
        </div>
      </div>

      {/* Reports List */}
      <main className="p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {filtered.map((report) => (
            <div
              key={report.id}
              className="rounded-lg border border-border/50 bg-card p-5 transition-all hover:shadow-lg hover:border-border"
            >
              {/* Header Row */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {report.ticker && (
                    <Badge variant="outline" className="text-sm font-mono bg-primary/5 border-primary/30 text-primary">
                      {report.ticker}
                    </Badge>
                  )}
                  <Badge variant="outline" className={`text-[10px] ${getRatingStyle(report.rating)}`}>
                    {report.rating === 'BUY' || report.rating === 'UPGRADE' ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : report.rating === 'SELL' || report.rating === 'DOWNGRADE' ? (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    ) : (
                      <Star className="w-3 h-3 mr-1" />
                    )}
                    {report.rating}
                  </Badge>
                </div>

                {/* Price Target */}
                {report.priceTarget && (
                  <div className="text-right">
                    <div className="text-[10px] font-mono text-muted-foreground">PRICE TARGET</div>
                    <div className="flex items-center gap-2">
                      {report.previousTarget && (
                        <span className="text-xs font-mono text-muted-foreground line-through">
                          ${report.previousTarget}
                        </span>
                      )}
                      <span className="text-lg font-mono font-bold text-primary">
                        ${report.priceTarget}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Title */}
              <h2 className="text-lg font-bold text-foreground mb-2 leading-tight">
                {report.title}
              </h2>

              {/* Meta */}
              <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {report.analyst}
                </div>
                <div className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {report.firm}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {report.date}
                </div>
              </div>

              {/* Summary */}
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                {report.summary}
              </p>

              {/* Key Points */}
              <div className="p-3 bg-muted/30 rounded border border-border/50 mb-4">
                <div className="text-[10px] font-mono text-muted-foreground mb-2 uppercase">Key Points</div>
                <ul className="space-y-1">
                  {report.keyPoints.map((point, idx) => (
                    <li key={idx} className="text-xs text-foreground flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Read Full Report */}
              <div className="flex justify-end">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-1 text-xs hover:text-amber-400"
                  onClick={() => setSelectedReport(report)}
                >
                  Read Full Report
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">No Reports Found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Try adjusting your search or filters
            </p>
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-12 p-4 rounded-lg bg-muted/30 border border-border/50 text-xs text-muted-foreground">
          <p className="mb-2">
            <strong>Disclaimer:</strong> Analyst ratings and price targets are provided for informational purposes only.
            These opinions are subject to change and may not represent our own views. Always conduct your own research
            before making investment decisions.
          </p>
          <p>Data sourced from public analyst reports. Past performance does not guarantee future results.</p>
        </div>
      </main>

      {/* Full Report Modal */}
      {selectedReport && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedReport(null)}
        >
          <div 
            className="bg-card rounded-lg border border-border max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 flex items-center justify-between p-6 border-b border-border bg-card">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {selectedReport.ticker && (
                    <Badge variant="outline" className="text-sm font-mono">
                      {selectedReport.ticker}
                    </Badge>
                  )}
                  <Badge variant="outline" className={`text-xs ${
                    selectedReport.rating === 'BUY' || selectedReport.rating === 'UPGRADE' 
                      ? 'bg-green-500/10 text-green-400' 
                      : selectedReport.rating === 'SELL' || selectedReport.rating === 'DOWNGRADE'
                      ? 'bg-red-500/10 text-red-400'
                      : 'bg-yellow-500/10 text-yellow-400'
                  }`}>
                    {selectedReport.rating}
                  </Badge>
                </div>
                <h2 className="text-xl font-bold text-foreground">{selectedReport.title}</h2>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="ml-4 text-muted-foreground hover:text-foreground transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Meta Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground font-mono text-xs mb-1">ANALYST</div>
                  <div className="font-medium">{selectedReport.analyst}</div>
                </div>
                <div>
                  <div className="text-muted-foreground font-mono text-xs mb-1">FIRM</div>
                  <div className="font-medium">{selectedReport.firm}</div>
                </div>
                <div>
                  <div className="text-muted-foreground font-mono text-xs mb-1">DATE</div>
                  <div className="font-medium">{new Date(selectedReport.date).toLocaleDateString()}</div>
                </div>
                {selectedReport.priceTarget && (
                  <div>
                    <div className="text-muted-foreground font-mono text-xs mb-1">PRICE TARGET</div>
                    <div className="font-medium">
                      ${selectedReport.priceTarget}
                      {selectedReport.previousTarget && (
                        <span className="text-muted-foreground line-through ml-2">
                          ${selectedReport.previousTarget}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Summary */}
              <div>
                <h3 className="font-semibold text-foreground mb-3">Summary</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{selectedReport.summary}</p>
              </div>

              {/* Key Points */}
              <div>
                <h3 className="font-semibold text-foreground mb-3">Key Points</h3>
                <ul className="space-y-2">
                  {selectedReport.keyPoints.map((point, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Close Button */}
              <div className="flex justify-end pt-4 border-t border-border">
                <Button 
                  variant="ghost" 
                  onClick={() => setSelectedReport(null)}
                  className="text-foreground hover:bg-primary/10"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}
