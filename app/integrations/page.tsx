'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Link2, 
  Unlink, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink,
  Shield,
  Zap,
  DollarSign,
  TrendingUp,
  Settings,
  RefreshCw,
  Key,
  Eye,
  EyeOff,
  X
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MarketDataSelector } from '@/components/dashboard/market-data-selector'

interface BrokerageConfig {
  id: string
  name: string
  logo: string
  description: string
  capabilities: string[]
  status: 'available' | 'coming_soon' | 'unofficial'
  connected: boolean
  oauthSupported: boolean
  tradingEnabled: boolean
  paperTradingAvailable: boolean
  docsUrl: string
  signupUrl: string
}

const BROKERAGES: BrokerageConfig[] = [
  {
    id: 'alpaca',
    name: 'Alpaca Markets',
    logo: 'ALPACA',
    description: 'Commission-free stock and options trading API with paper trading support.',
    capabilities: ['Stocks', 'Options', 'Crypto', 'Paper Trading', 'Real-time Data'],
    status: 'available',
    connected: true, // Already connected via env vars
    oauthSupported: true,
    tradingEnabled: true,
    paperTradingAvailable: true,
    docsUrl: 'https://docs.alpaca.markets',
    signupUrl: 'https://app.alpaca.markets/signup',
  },
  {
    id: 'schwab',
    name: 'Charles Schwab',
    logo: 'SCHW',
    description: 'Full-service brokerage with OAuth API (formerly TD Ameritrade thinkorswim).',
    capabilities: ['Stocks', 'Options', 'Futures', 'Forex', 'Streaming Data', 'Level 2'],
    status: 'available',
    connected: false,
    oauthSupported: true,
    tradingEnabled: true,
    paperTradingAvailable: true,
    docsUrl: 'https://developer.schwab.com',
    signupUrl: 'https://www.schwab.com/open-an-account',
  },
  {
    id: 'ibkr',
    name: 'Interactive Brokers',
    logo: 'IBKR',
    description: 'Professional-grade trading platform with global market access.',
    capabilities: ['Stocks', 'Options', 'Futures', 'Forex', 'Bonds', 'Crypto', 'Global Markets'],
    status: 'available',
    connected: false,
    oauthSupported: true,
    tradingEnabled: true,
    paperTradingAvailable: true,
    docsUrl: 'https://interactivebrokers.github.io/cpwebapi/',
    signupUrl: 'https://www.interactivebrokers.com/en/index.php?f=ibgStr498',
  },
  {
    id: 'tastytrade',
    name: 'Tastytrade',
    logo: 'TASTY',
    description: 'Options-focused trading platform with competitive commissions.',
    capabilities: ['Stocks', 'Options', 'Futures', 'Crypto', 'Options Analytics'],
    status: 'available',
    connected: false,
    oauthSupported: true,
    tradingEnabled: true,
    paperTradingAvailable: true,
    docsUrl: 'https://developer.tastytrade.com',
    signupUrl: 'https://tastytrade.com/open-account/',
  },
  {
    id: 'webull',
    name: 'Webull',
    logo: 'WEBULL',
    description: 'Commission-free trading with advanced charting. Unofficial API only.',
    capabilities: ['Stocks', 'Options', 'Crypto', 'Paper Trading'],
    status: 'unofficial',
    connected: false,
    oauthSupported: false,
    tradingEnabled: true,
    paperTradingAvailable: true,
    docsUrl: 'https://github.com/tedchou12/webull',
    signupUrl: 'https://www.webull.com/introduce',
  },
  {
    id: 'robinhood',
    name: 'Robinhood',
    logo: 'HOOD',
    description: 'Popular retail trading app. No official API available.',
    capabilities: ['Stocks', 'Options', 'Crypto'],
    status: 'unofficial',
    connected: false,
    oauthSupported: false,
    tradingEnabled: false,
    paperTradingAvailable: false,
    docsUrl: 'https://github.com/robinhood-unofficial/pyrh',
    signupUrl: 'https://robinhood.com/signup',
  },
]

const DATA_PROVIDERS = [
  {
    id: 'polygon',
    name: 'Polygon.io',
    description: 'Real-time and historical market data',
    connected: true,
    icon: TrendingUp,
  },
  {
    id: 'unusual_whales',
    name: 'Unusual Whales',
    description: 'Options flow and dark pool data',
    connected: true,
    icon: Zap,
  },
  {
    id: 'finnhub',
    name: 'Finnhub',
    description: 'Fundamentals and company data',
    connected: true,
    icon: DollarSign,
  },
]

export default function IntegrationsPage() {
  const [brokerages, setBrokerages] = useState(BROKERAGES)
  const [connectingId, setConnectingId] = useState<string | null>(null)
  const [showApiModal, setShowApiModal] = useState<string | null>(null)
  const [apiKeyId, setApiKeyId] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [connectionError, setConnectionError] = useState('')

  const openApiKeyModal = (brokerId: string) => {
    setShowApiModal(brokerId)
    setApiKeyId('')
    setApiSecret('')
    setConnectionStatus('idle')
    setConnectionError('')
  }

  const testAndSaveApiKeys = async () => {
    if (!showApiModal || !apiKeyId || !apiSecret) return
    
    setConnectionStatus('testing')
    setConnectionError('')

    try {
      // Test the API keys by making a request to the account endpoint
      const response = await fetch('/api/alpaca/accounts', {
        method: 'GET',
        headers: {
          'X-Test-Key-Id': apiKeyId,
          'X-Test-Secret': apiSecret,
        },
      })

      if (response.ok) {
        setConnectionStatus('success')
        setBrokerages(prev => 
          prev.map(b => b.id === showApiModal ? { ...b, connected: true } : b)
        )
        // In production, you'd save these to a secure backend or user session
        localStorage.setItem(`${showApiModal}_connected`, 'true')
        setTimeout(() => {
          setShowApiModal(null)
        }, 1500)
      } else {
        const error = await response.json()
        setConnectionStatus('error')
        setConnectionError(error.error || 'Failed to verify API credentials')
      }
    } catch (error) {
      setConnectionStatus('error')
      setConnectionError('Failed to connect. Please check your credentials.')
    }
  }

  const handleConnect = async (brokerId: string) => {
    const broker = brokerages.find(b => b.id === brokerId)
    if (!broker) return

    // For Alpaca and other API-key based brokers, open the modal
    if (brokerId === 'alpaca' || brokerId === 'tastytrade' || brokerId === 'ibkr') {
      openApiKeyModal(brokerId)
      return
    }

    setConnectingId(brokerId)

    // Simulate OAuth flow - in production this would redirect to broker's OAuth page
    if (broker.oauthSupported) {
      // For demo, simulate connection after 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setBrokerages(prev => 
        prev.map(b => b.id === brokerId ? { ...b, connected: true } : b)
      )
    } else {
      // For unofficial APIs, show warning
      alert(`${broker.name} does not have an official API. Using unofficial wrappers may violate their Terms of Service.`)
    }

    setConnectingId(null)
  }

  const handleDisconnect = (brokerId: string) => {
    setBrokerages(prev => 
      prev.map(b => b.id === brokerId ? { ...b, connected: false } : b)
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Dashboard
                </Button>
              </Link>
              <div className="h-6 w-px bg-border" />
              <h1 className="text-lg font-bold font-mono tracking-tight">
                Brokerage Integrations
              </h1>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              <Shield className="w-3 h-3 mr-1" />
              OAuth 2.0 Secured
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Banner */}
        <div className="mb-8 p-4 rounded-lg border border-theme-green/30 bg-theme-green/5">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-theme-green flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-foreground mb-1">Secure Account Linking</h3>
              <p className="text-sm text-muted-foreground">
                Link your brokerage accounts using secure OAuth 2.0 authentication. Your credentials are never stored on our servers - 
                we only receive authorized access tokens from your broker.
              </p>
            </div>
          </div>
        </div>

        {/* Connected Data Providers */}
        <section className="mb-10">
          <h2 className="text-sm font-bold font-mono tracking-widest text-muted-foreground uppercase mb-4">
            Connected Data Providers
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {DATA_PROVIDERS.map((provider) => (
              <div
                key={provider.id}
                className="flex items-center gap-3 p-4 rounded-lg border border-theme-green/30 bg-theme-green/5"
              >
                <div className="w-10 h-10 rounded-lg bg-theme-green/20 flex items-center justify-center">
                  <provider.icon className="w-5 h-5 text-theme-green" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{provider.name}</span>
                    <CheckCircle2 className="w-4 h-4 text-theme-green" />
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{provider.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Brokerage Integrations */}
        <section>
          <h2 className="text-sm font-bold font-mono tracking-widest text-muted-foreground uppercase mb-4">
            Trading Platforms
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {brokerages.map((broker) => (
              <div
                key={broker.id}
                className={`rounded-lg border p-5 transition-all ${
                  broker.connected 
                    ? 'border-theme-green/40 bg-theme-green/5' 
                    : broker.status === 'unofficial'
                    ? 'border-theme-gold/30 bg-theme-gold/5'
                    : 'border-border bg-card/50 hover:border-border/80'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                      broker.connected 
                        ? 'bg-theme-green/20 text-theme-green' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {broker.logo}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold">{broker.name}</h3>
                        {broker.connected && (
                          <CheckCircle2 className="w-4 h-4 text-theme-green" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {broker.status === 'available' && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-theme-green/10 text-theme-green border-theme-green/30">
                            Official API
                          </Badge>
                        )}
                        {broker.status === 'unofficial' && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-theme-gold/10 text-theme-gold border-theme-gold/30">
                            <AlertTriangle className="w-3 h-3 mr-0.5" />
                            Unofficial
                          </Badge>
                        )}
                        {broker.status === 'coming_soon' && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            Coming Soon
                          </Badge>
                        )}
                        {broker.paperTradingAvailable && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                            Paper Trading
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground mb-3">
                  {broker.description}
                </p>

                {/* Capabilities */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {broker.capabilities.map((cap) => (
                    <span 
                      key={cap}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-muted text-muted-foreground"
                    >
                      {cap}
                    </span>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-border/50">
                  {broker.connected ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-2 text-theme-green border-theme-green/30 hover:bg-theme-green/10"
                        disabled
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Connected
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => handleDisconnect(broker.id)}
                      >
                        <Unlink className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        className={`flex-1 gap-2 ${
                          broker.status === 'unofficial'
                            ? 'bg-theme-gold hover:bg-theme-gold/90'
                            : 'bg-theme-green hover:bg-theme-green/90'
                        }`}
                        onClick={() => handleConnect(broker.id)}
                        disabled={connectingId === broker.id || broker.status === 'coming_soon'}
                      >
                        {connectingId === broker.id ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <Link2 className="w-4 h-4" />
                            {broker.oauthSupported ? 'Connect Account' : 'Setup Integration'}
                          </>
                        )}
                      </Button>
                      <a
                        href={broker.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex"
                      >
                        <Button variant="outline" size="sm" className="gap-2">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </a>
                    </>
                  )}
                </div>

                {/* Warning for unofficial APIs */}
                {broker.status === 'unofficial' && !broker.connected && (
                  <div className="mt-3 p-2 rounded bg-theme-gold/10 border border-theme-gold/20">
                    <p className="text-[11px] text-theme-gold flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span>
                        No official API available. Using unofficial integrations may violate the platform&apos;s Terms of Service and could result in account restrictions.
                      </span>
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* OAuth Flow Explanation */}
        <section className="mt-10 p-6 rounded-lg border border-border bg-card/30">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-theme-green" />
            How Account Linking Works
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="font-mono font-bold text-theme-green mb-1">1. Authorize</div>
              <p className="text-muted-foreground text-xs">
                Click &quot;Connect Account&quot; to be redirected to your broker&apos;s secure login page.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="font-mono font-bold text-theme-green mb-1">2. Authenticate</div>
              <p className="text-muted-foreground text-xs">
                Log in directly with your broker. We never see your password.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="font-mono font-bold text-theme-green mb-1">3. Grant Access</div>
              <p className="text-muted-foreground text-xs">
                Review and approve the permissions we request (trading, account data).
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="font-mono font-bold text-theme-green mb-1">4. Trade</div>
              <p className="text-muted-foreground text-xs">
                Execute trades directly from our platform using secure API tokens.
              </p>
            </div>
          </div>
        </section>

        {/* Market Data Sources */}
        <section className="mt-10 p-6 rounded-lg border border-border bg-card/30">
          <MarketDataSelector />
        </section>
      </main>

      {/* API Key Modal */}
      {showApiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4 p-6 rounded-xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-theme-green/20 flex items-center justify-center">
                  <Key className="w-5 h-5 text-theme-green" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Connect {brokerages.find(b => b.id === showApiModal)?.name}</h3>
                  <p className="text-xs text-muted-foreground">Enter your API credentials</p>
                </div>
              </div>
              <button
                onClick={() => setShowApiModal(null)}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wide mb-1.5">
                  API Key ID
                </label>
                <Input
                  type="text"
                  value={apiKeyId}
                  onChange={(e) => setApiKeyId(e.target.value)}
                  placeholder="PKXXXXXXXXXXXXXXXXXX"
                  className="font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-muted-foreground uppercase tracking-wide mb-1.5">
                  API Secret Key
                </label>
                <div className="relative">
                  <Input
                    type={showSecret ? 'text' : 'password'}
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    placeholder="Your secret key"
                    className="font-mono text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {connectionStatus === 'error' && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {connectionError}
                </div>
              )}

              {connectionStatus === 'success' && (
                <div className="p-3 rounded-lg bg-theme-green/10 border border-theme-green/30 text-theme-green text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Connected successfully!
                </div>
              )}

              <div className="pt-2">
                <Button
                  onClick={testAndSaveApiKeys}
                  disabled={!apiKeyId || !apiSecret || connectionStatus === 'testing' || connectionStatus === 'success'}
                  className="w-full bg-theme-green hover:bg-theme-green/90 text-black font-mono font-bold"
                >
                  {connectionStatus === 'testing' ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Testing Connection...
                    </>
                  ) : connectionStatus === 'success' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Connected!
                    </>
                  ) : (
                    <>
                      <Link2 className="w-4 h-4 mr-2" />
                      Connect Account
                    </>
                  )}
                </Button>
              </div>

              <p className="text-[11px] text-muted-foreground text-center">
                Your API keys are stored securely and only used to execute trades on your behalf.
                <a
                  href={brokerages.find(b => b.id === showApiModal)?.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-theme-green hover:underline ml-1"
                >
                  Get API keys
                </a>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
