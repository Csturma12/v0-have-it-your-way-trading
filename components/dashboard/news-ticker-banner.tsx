"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"
import { ExternalLink } from "lucide-react"

interface NewsItem {
  id: string
  headline: string
  source: string
  url: string
  timestamp: number
  tickers: string[]
  sentiment: "bullish" | "bearish" | "neutral"
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

/**
 * Horizontal scrolling news ticker banner — sits inline with the toolbar.
 * Pulls headlines from /api/news (Finnhub + Polygon merged) and animates
 * them right-to-left CSS-only so it has no JS overhead. Pauses on hover.
 */
export function NewsTickerBanner() {
  const { data } = useSWR<{ news: NewsItem[] }>("/api/news", fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
  })

  const [items, setItems] = useState<NewsItem[]>([])

  useEffect(() => {
    if (data?.news?.length) setItems(data.news.slice(0, 25))
  }, [data])

  if (!items.length) {
    return (
      <div className="flex-1 min-w-0 h-7 px-3 flex items-center text-[9px] font-mono text-muted-foreground/60 border border-border/40 rounded bg-card/30">
        Loading market news...
      </div>
    )
  }

  // Duplicate the items so the loop is seamless
  const loop = [...items, ...items]

  return (
    <div className="flex-1 min-w-0 h-7 flex items-center overflow-hidden border border-border/40 rounded bg-card/30 group">
      <div className="flex-shrink-0 px-2 h-full flex items-center bg-primary/15 border-r border-border/40">
        <span className="text-[9px] font-mono font-bold tracking-widest text-primary">
          LIVE
        </span>
      </div>
      <div className="flex-1 min-w-0 overflow-hidden relative">
        <div className="news-ticker-track flex gap-0 whitespace-nowrap will-change-transform group-hover:[animation-play-state:paused]">
          {loop.map((n, idx) => {
            const dotClass =
              n.sentiment === "bullish"
                ? "bg-green-400"
                : n.sentiment === "bearish"
                ? "bg-red-400"
                : "bg-muted-foreground/60"
            return (
              <a
                key={`${n.id}-${idx}`}
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 h-7 text-[10px] font-mono hover:bg-primary/10 transition-colors flex-shrink-0"
                title={n.headline}
              >
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${dotClass}`} />
                {n.tickers[0] && (
                  <span className="text-primary font-bold">${n.tickers[0]}</span>
                )}
                <span className="text-foreground/90 truncate max-w-[480px]">
                  {n.headline}
                </span>
                <span className="text-muted-foreground/50 text-[8px] uppercase tracking-wider">
                  {n.source}
                </span>
                <ExternalLink className="w-2.5 h-2.5 text-muted-foreground/40" />
              </a>
            )
          })}
        </div>
      </div>
      <style jsx>{`
        .news-ticker-track {
          animation: news-ticker-scroll 240s linear infinite;
        }
        @keyframes news-ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  )
}
