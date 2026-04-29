'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Zap,
  User,
  Bot,
  Sparkles,
  Brain,
  Signal,
  Briefcase,
  Newspaper,
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
  LayoutGrid,
  DollarSign,
  LineChart,
  Globe,
  BookOpen,
  ArrowLeftRight,
  LogOut,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TickerAutocomplete } from '@/components/ui/ticker-autocomplete'
import { useTradingContext } from '@/contexts/TradingContext'

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
      { label: 'Multi Leg', href: '/tradedesk/multileg', icon: Layers, accent: 'cyan' },
      { label: 'Hedges', href: '/tradedesk/hedges', icon: Shield, accent: 'red' },
    ],
  },
  {
    label: 'Analyst & AI Trade Ideas',
    icon: Sparkles,
    children: [
      { label: 'Claude Ideas', href: '/trade-ideas/claude', icon: Brain, accent: 'gold' },
      { label: 'OpenAI Ideas', href: '/trade-ideas/openai', icon: Sparkles, accent: 'green' },
      { label: 'Analyst Research', href: '/trade-ideas/analyst', icon: BookOpen, accent: 'cyan' },
    ],
  },
  {
    label: 'Trading Bot',
    href: '/bot',
    icon: Bot,
    accent: 'green',
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
    label: 'Widgets',
    icon: LayoutGrid,
    children: [
      { label: 'Quote',   href: '/widgets/quote',   icon: DollarSign,    accent: 'green' },
      { label: 'Trade',   href: '/widgets/trade',   icon: ArrowLeftRight, accent: 'gold' },
      { label: 'Stocks',  href: '/widgets/stocks',  icon: LineChart,      accent: 'cyan' },
      { label: 'General', href: '/widgets/general', icon: BookOpen },
      { label: 'Market',  href: '/widgets/market',  icon: Globe },
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
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const router = useRouter()
  const { setActiveTicker } = useTradingContext()

  const handleTickerSelect = (ticker: { symbol: string }) => {
    setActiveTicker(ticker.symbol)
    setSearchValue('')
  }

  useEffect(() => {
    const supabase = createClient()
    
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setUserEmail(user.email)
        // Check if admin
        supabase
          .from('allowed_users')
          .select('is_admin')
          .eq('email', user.email)
          .single()
          .then(({ data }) => {
            setIsAdmin(data?.is_admin || false)
          })
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUserEmail(session?.user?.email || null)
      if (!session?.user) {
        setIsAdmin(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

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

                    {isOpen && item.children && (
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

          {/* Right side: Search + Beta + User Menu */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Search Bar */}
            <TickerAutocomplete
              value={searchValue}
              onChange={setSearchValue}
              onSelect={handleTickerSelect}
              placeholder="Search ticker..."
              className="w-48"
            />
            
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-7 text-[10px] font-mono uppercase tracking-wider border-primary/30 text-primary hover:bg-primary/10 bg-transparent"
            >
              <Zap className="w-3 h-3" />
              Beta
            </Button>

            {/* Login Button when not logged in */}
            {!userEmail && (
              <Link href="/auth/login">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-7 text-[10px] font-mono uppercase tracking-wider"
                >
                  <User className="w-3 h-3" />
                  Login
                </Button>
              </Link>
            )}

            {/* User Menu when logged in */}
            {userEmail && (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  onBlur={() => setTimeout(() => setShowUserMenu(false), 150)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white uppercase">
                      {userEmail.charAt(0)}
                    </span>
                  </div>
                  <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>

                {showUserMenu && (
                  <div className="absolute top-full right-0 mt-1 w-56 bg-card border border-border rounded-lg shadow-2xl z-50 py-1">
                    <div className="px-3 py-2 border-b border-border">
                      <p className="text-xs font-medium truncate">{userEmail}</p>
                      {isAdmin && (
                        <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[10px] font-medium">
                          <Shield className="w-2.5 h-2.5" />
                          Admin
                        </span>
                      )}
                    </div>
                    
                    {isAdmin && (
                      <Link
                        href="/admin/users"
                        className="flex items-center gap-2 px-3 py-2 text-[11px] font-mono hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                      >
                        <Users className="w-3.5 h-3.5" />
                        Manage Users
                      </Link>
                    )}
                    
                    <Link
                      href="/integrations"
                      className="flex items-center gap-2 px-3 py-2 text-[11px] font-mono hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      Integrations
                    </Link>
                    
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-mono hover:bg-red-500/10 transition-colors text-red-500"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
