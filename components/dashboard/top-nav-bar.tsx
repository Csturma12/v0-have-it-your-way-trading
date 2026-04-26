'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Zap,
  User,
  Bot,
  Sparkles,
  Brain,
  Signal,
  Briefcase,
  Newspaper,
  FileText,
  Link2,
  ChevronDown,
  LayoutDashboard,
  Settings,
  TrendingUp,
  Shield,
  BarChart3,
  Eye,
  Activity,
  Layers,
  Crosshair,
  Star,
  Layout,
  Bell,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface NavItem {
  label: string
  href?: string
  icon?: React.ElementType
  accent?: 'green' | 'gold' | 'red' | 'cyan'
  children?: { label: string; href: string; icon?: React.ElementType; accent?: string }[]
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    children: [
      { label: 'Main Dashboard', href: '/', icon: LayoutDashboard },
      { label: 'Quick Trade', href: '/quicktrade', icon: Crosshair, accent: 'green' },
      { label: 'Watchlists', href: '/watchlists', icon: Star, accent: 'gold' },
      { label: 'Saved Layouts', href: '/layouts', icon: Layout, accent: 'cyan' },
      { label: 'Alerts', href: '/alerts', icon: Bell, accent: 'red' },
    ],
  },
  {
    label: 'TradeDesk',
    icon: Briefcase,
    children: [
      { label: 'Trading Floor', href: '/tradedesk', icon: Briefcase },
      { label: 'Stocks', href: '/tradedesk/stocks', icon: TrendingUp, accent: 'green' },
      { label: 'Options', href: '/tradedesk/options', icon: BarChart3, accent: 'gold' },
      { label: 'Hedges', href: '/tradedesk/hedges', icon: Shield, accent: 'red' },
    ],
  },
  {
    label: 'Trade Ideas',
    icon: Sparkles,
    children: [
      { label: 'Claude Ideas', href: '/trade-ideas/claude', icon: Brain, accent: 'gold' },
      { label: 'OpenAI Ideas', href: '/trade-ideas/openai', icon: Sparkles, accent: 'green' },
    ],
  },
  {
    label: 'Dark Pool',
    icon: Eye,
    accent: 'cyan',
    children: [
      { label: 'Dark Pool Flow',   href: '/dark-pool',           icon: Eye,      accent: 'cyan' },
      { label: 'Block Trades',     href: '/dark-pool/blocks',    icon: Layers,   accent: 'cyan' },
      { label: 'Options Flow',     href: '/dark-pool/options',   icon: Activity, accent: 'gold' },
      { label: 'Unusual Whales',   href: '/dark-pool/unusual',   icon: Signal,   accent: 'green' },
    ],
  },
  {
    label: 'Signals',
    href: '/signals',
    icon: Signal,
    accent: 'green',
  },
  {
    label: 'News',
    href: '/news',
    icon: Newspaper,
  },
  {
    label: 'Analyst',
    href: '/analyst',
    icon: FileText,
  },
  {
    label: 'Account',
    icon: User,
    children: [
      { label: 'Profile', href: '/account', icon: User },
      { label: 'Integrations', href: '/integrations', icon: Link2, accent: 'cyan' },
      { label: 'AI Assistant', href: '/ai-assistant', icon: Bot, accent: 'cyan' },
      { label: 'Autonomous Trading', href: '/autonomous', icon: Zap, accent: 'green' },
      { label: 'Settings', href: '/settings', icon: Settings },
    ],
  },
]

const accentColors: Record<string, string> = {
  green: 'text-green-400',
  gold: 'text-theme-gold',
  red: 'text-red-400',
  cyan: 'text-cyan-400',
}

export function TopNavBar() {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  return (
    <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="px-4 py-2">
        <div className="flex items-center justify-between gap-4">
          {/* Logo + Brand */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="p-1.5 bg-primary/20 rounded">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-bold font-mono tracking-wide hidden sm:inline">
              HAVE IT YOUR WAY
            </span>
          </Link>

          {/* Main Nav Items */}
          <div className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const hasChildren = item.children && item.children.length > 0
              const isOpen = openDropdown === item.label

              if (hasChildren) {
                return (
                  <div key={item.label} className="relative">
                    <button
                      onClick={() => setOpenDropdown(isOpen ? null : item.label)}
                      onBlur={() => setTimeout(() => setOpenDropdown(null), 150)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-mono font-semibold uppercase tracking-wide transition-colors hover:bg-muted/50 ${
                        item.accent ? accentColors[item.accent] : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {Icon && <Icon className="w-3.5 h-3.5" />}
                      {item.label}
                      <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isOpen && (
                      <div className="absolute top-full left-0 mt-1 w-48 bg-card border border-border rounded-lg shadow-2xl z-50 py-1">
                        {item.children.map((child) => {
                          const ChildIcon = child.icon
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              className={`flex items-center gap-2 px-3 py-2 text-[11px] font-mono hover:bg-muted/50 transition-colors ${
                                child.accent ? accentColors[child.accent] : 'text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              {ChildIcon && <ChildIcon className="w-3.5 h-3.5" />}
                              {child.label}
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              }

              return (
                <Link
                  key={item.label}
                  href={item.href || '/'}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-mono font-semibold uppercase tracking-wide transition-colors hover:bg-muted/50 ${
                    item.accent ? accentColors[item.accent] : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  {item.label}
                </Link>
              )
            })}
          </div>

          {/* Right side: Beta + Quick Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-7 text-[10px] font-mono uppercase tracking-wider border-primary/30 text-primary hover:bg-primary/10 bg-transparent"
            >
              <Zap className="w-3 h-3" />
              Beta
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
