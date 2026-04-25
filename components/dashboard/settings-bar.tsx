'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ChevronUp,
  ChevronDown,
  User,
  Bot,
  Zap,
  Sparkles,
  Brain,
  Signal,
  Briefcase,
  Newspaper,
  FileText,
  Settings,
} from 'lucide-react'

interface SettingsSection {
  id: string
  title: string
  icon: React.ElementType
  items: {
    label: string
    href?: string
    action?: () => void
    icon?: React.ElementType
    accent?: 'green' | 'gold' | 'red' | 'cyan'
  }[]
}

const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: 'account',
    title: 'Account Options',
    icon: User,
    items: [
      { label: 'Account', href: '/account', icon: User },
      { label: 'AI Assistant Trading', href: '/ai-assistant', icon: Bot, accent: 'cyan' },
      { label: 'Autonomous Trading', href: '/autonomous', icon: Zap, accent: 'green' },
    ],
  },
  {
    id: 'trade-ideas',
    title: 'Trade Ideas',
    icon: Sparkles,
    items: [
      { label: 'Claude Ideas', href: '/trade-ideas/claude', icon: Brain, accent: 'gold' },
      { label: 'OpenAI Ideas', href: '/trade-ideas/openai', icon: Sparkles, accent: 'green' },
    ],
  },
  {
    id: 'signals',
    title: 'Signals',
    icon: Signal,
    items: [
      { label: "Today's Signals", href: '/signals', icon: Signal, accent: 'green' },
    ],
  },
  {
    id: 'tradedesk',
    title: 'TradeDesk',
    icon: Briefcase,
    items: [
      { label: 'Trading Floor', href: '/tradedesk', icon: Briefcase },
      { label: 'Options', href: '/tradedesk/options', accent: 'gold' },
      { label: 'Stocks', href: '/tradedesk/stocks', accent: 'green' },
      { label: 'Hedges', href: '/tradedesk/hedges', accent: 'red' },
    ],
  },
  {
    id: 'news',
    title: 'News',
    icon: Newspaper,
    items: [
      { label: 'Market News', href: '/news', icon: Newspaper },
    ],
  },
  {
    id: 'analyst',
    title: 'Analyst Review',
    icon: FileText,
    items: [
      { label: 'Analyst Blogs', href: '/analyst', icon: FileText },
    ],
  },
]

const accentColors = {
  green: 'text-theme-green',
  gold: 'text-theme-gold',
  red: 'text-theme-red',
  cyan: 'text-theme-cyan',
}

export function SettingsBar() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['account', 'trade-ideas']))

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="border-t border-border bg-card">
      {/* Toggle Bar */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-center gap-2 py-2 hover:bg-muted/30 transition-colors"
      >
        <Settings className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
          Settings & Navigation
        </span>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-border px-4 py-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {SETTINGS_SECTIONS.map((section) => {
              const SectionIcon = section.icon
              const isOpen = expandedSections.has(section.id)

              return (
                <div key={section.id} className="space-y-2">
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-2">
                      <SectionIcon className="w-4 h-4 text-primary" />
                      <span className="text-xs font-mono font-bold text-foreground uppercase tracking-wide">
                        {section.title}
                      </span>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="w-3 h-3 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-3 h-3 text-muted-foreground" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="space-y-1 pl-6">
                      {section.items.map((item, idx) => {
                        const ItemIcon = item.icon
                        const content = (
                          <div
                            className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs font-mono transition-colors hover:bg-muted/30 cursor-pointer ${
                              item.accent ? accentColors[item.accent] : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {ItemIcon && <ItemIcon className="w-3 h-3" />}
                            <span>{item.label}</span>
                          </div>
                        )

                        if (item.href) {
                          return (
                            <Link key={idx} href={item.href}>
                              {content}
                            </Link>
                          )
                        }

                        return (
                          <button key={idx} onClick={item.action} className="w-full text-left">
                            {content}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
