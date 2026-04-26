import Link from 'next/link'
import { DollarSign, ArrowLeftRight, LineChart, BookOpen, Globe } from 'lucide-react'

const WIDGET_CATEGORIES = [
  {
    label: 'Quote',
    href: '/widgets/quote',
    icon: DollarSign,
    color: 'text-green-400',
    bg: 'bg-green-400/10 border-green-400/20',
    description: 'Real-time bid/ask, last price, volume, market cap, 52-week range, and live ticker data.',
  },
  {
    label: 'Trade',
    href: '/widgets/trade',
    icon: ArrowLeftRight,
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10 border-yellow-400/20',
    description: 'Order entry panel, open positions, P&L tracker, buying power, and quick-trade actions.',
  },
  {
    label: 'Stocks',
    href: '/widgets/stocks',
    icon: LineChart,
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10 border-cyan-400/20',
    description: 'Interactive chart with indicators, order book (L2), time & sales, and short interest.',
  },
  {
    label: 'General',
    href: '/widgets/general',
    icon: BookOpen,
    color: 'text-muted-foreground',
    bg: 'bg-muted/20 border-border/40',
    description: 'News feed, earnings calendar, analyst ratings, company profile, and SEC filings.',
  },
  {
    label: 'Market',
    href: '/widgets/market',
    icon: Globe,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10 border-blue-400/20',
    description: 'Top movers, sector heatmap, futures & indices, economic calendar, and screener.',
  },
]

export default function WidgetsPage() {
  return (
    <main className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-mono font-bold text-foreground text-balance">Widgets</h1>
        <p className="text-sm font-mono text-muted-foreground mt-1">
          Select a category to browse and add widgets to your dashboard.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {WIDGET_CATEGORIES.map(cat => {
          const Icon = cat.icon
          return (
            <Link
              key={cat.label}
              href={cat.href}
              className={`flex flex-col gap-3 p-5 rounded-xl border transition-all hover:scale-[1.02] hover:shadow-lg ${cat.bg}`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-black/30`}>
                  <Icon className={`w-5 h-5 ${cat.color}`} />
                </div>
                <span className={`text-base font-mono font-bold ${cat.color}`}>{cat.label}</span>
              </div>
              <p className="text-[12px] font-mono text-muted-foreground leading-relaxed">
                {cat.description}
              </p>
            </Link>
          )
        })}
      </div>
    </main>
  )
}
