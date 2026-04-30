'use client'

import { useState, useEffect } from 'react'
import { 
  ArrowLeft, 
  Link2, 
  Link2Off, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Trash2,
  Shield
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BrokerSync } from '@/components/dashboard/broker-sync'

interface BrokerConfig {
  id: string
  name: string
  description: string
  logo: string
  color: string
  connected: boolean
  lastSync: string | null
  symbolCount: number
  configured: boolean
  docsUrl: string
  envVars: string[]
}

export default function BrokerSettingsPage() {
  const [brokers, setBrokers] = useState<BrokerConfig[]>([
    {
      id: 'tradingview',
      name: 'TradingView',
      description: 'Import watchlists from TradingView via CSV export',
      logo: '📊',
      color: 'blue',
      connected: false,
      lastSync: null,
      symbolCount: 0,
      configured: true, // Always available (no API keys needed)
      docsUrl: 'https://www.tradingview.com/support/',
      envVars: [],
    },
    {
      id: 'webull',
      name: 'Webull',
      description: 'Connect your Webull account for automatic watchlist and position sync',
      logo: '🐂',
      color: 'orange',
      connected: false,
      lastSync: null,
      symbolCount: 0,
      configured: false,
      docsUrl: 'https://developer.webull.com',
      envVars: ['WEBULL_APP_KEY', 'WEBULL_APP_SECRET', 'WEBULL_CLIENT_ID', 'WEBULL_CLIENT_SECRET'],
    },
    {
      id: 'alpaca',
      name: 'Alpaca',
      description: 'Connect Alpaca for paper or live trading with automatic position sync',
      logo: '🦙',
      color: 'yellow',
      connected: false,
      lastSync: null,
      symbolCount: 0,
      configured: false,
      docsUrl: 'https://alpaca.markets/docs/',
      envVars: ['ALPACA_API_KEY', 'ALPACA_API_SECRET'],
    },
  ])
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Check URL params for OAuth callback messages
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const success = params.get('success')
    const error = params.get('error')
    
    if (success) {
      setMessage({ type: 'success', text: `Successfully connected ${success.replace('_connected', '').replace('_', ' ')}` })
    } else if (error) {
      setMessage({ type: 'error', text: decodeURIComponent(error) })
    }

    // Clear params from URL
    if (success || error) {
      window.history.replaceState({}, '', '/settings/brokers')
    }
  }, [])

  // Check broker connection status
  useEffect(() => {
    const checkBrokers = async () => {
      setIsLoading(true)
      try {
        // Check Webull
        const webullRes = await fetch('/api/brokers/webull/auth', { method: 'POST' })
        if (webullRes.ok) {
          const data = await webullRes.json()
          setBrokers(prev => prev.map(b => 
            b.id === 'webull' 
              ? { ...b, configured: data.configured, connected: data.connected, lastSync: data.lastSync }
              : b
          ))
        }
      } catch {
        // Silent fail
      }
      setIsLoading(false)
    }

    checkBrokers()
  }, [])

  const handleConnect = (brokerId: string) => {
    if (brokerId === 'webull') {
      window.location.href = '/api/brokers/webull/auth'
    }
  }

  const handleDisconnect = async (brokerId: string) => {
    if (!confirm(`Disconnect from ${brokerId}?`)) return
    
    // TODO: Implement disconnect API
    setBrokers(prev => prev.map(b => 
      b.id === brokerId
        ? { ...b, connected: false, lastSync: null, symbolCount: 0 }
        : b
    ))
    setMessage({ type: 'success', text: `Disconnected from ${brokerId}` })
  }

  const colorClasses: Record<string, { bg: string; border: string; text: string }> = {
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
    orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400' },
    yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400' },
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-foreground">Broker Connections</h1>
              <p className="text-sm text-muted-foreground">Connect your trading accounts to sync watchlists and positions</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Status message */}
        {message && (
          <div className={`mb-6 flex items-center gap-2 px-4 py-3 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-500/10 border border-green-500/20 text-green-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span className="text-sm">{message.text}</span>
            <button onClick={() => setMessage(null)} className="ml-auto text-muted-foreground hover:text-foreground">×</button>
          </div>
        )}

        {/* Quick Sync Widget */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-foreground mb-3">Quick Sync</h2>
          <BrokerSync />
        </div>

        {/* Broker Cards */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Available Integrations</h2>
          
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-muted/20 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            brokers.map(broker => {
              const colors = colorClasses[broker.color]
              
              return (
                <div 
                  key={broker.id}
                  className={`p-5 rounded-lg border ${colors.border} ${colors.bg} transition-all`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{broker.logo}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">{broker.name}</h3>
                          {broker.connected && (
                            <span className="flex items-center gap-1 text-[10px] font-mono text-green-400 bg-green-500/20 px-1.5 py-0.5 rounded">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                              Connected
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{broker.description}</p>
                      </div>
                    </div>
                    
                    <a
                      href={broker.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>

                  {/* Connection status / actions */}
                  <div className="mt-4 flex items-center gap-3">
                    {broker.connected ? (
                      <>
                        <div className="flex-1 text-xs text-muted-foreground">
                          {broker.symbolCount > 0 && <span>{broker.symbolCount} symbols synced · </span>}
                          {broker.lastSync && <span>Last sync: {new Date(broker.lastSync).toLocaleString()}</span>}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          onClick={() => handleConnect(broker.id)}
                        >
                          <RefreshCw className="w-3 h-3 mr-1.5" />
                          Sync Now
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => handleDisconnect(broker.id)}
                        >
                          <Link2Off className="w-3 h-3 mr-1.5" />
                          Disconnect
                        </Button>
                      </>
                    ) : broker.configured || broker.id === 'tradingview' ? (
                      <Button
                        size="sm"
                        className={`h-8 text-xs ${colors.bg} ${colors.text} border ${colors.border} hover:brightness-110`}
                        onClick={() => handleConnect(broker.id)}
                        disabled={broker.id === 'tradingview'}
                      >
                        <Link2 className="w-3 h-3 mr-1.5" />
                        {broker.id === 'tradingview' ? 'Use Quick Sync Above' : 'Connect Account'}
                      </Button>
                    ) : (
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                          <Shield className="w-3 h-3" />
                          Required environment variables:
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {broker.envVars.map(v => (
                            <code key={v} className="text-[10px] font-mono bg-muted/50 px-1.5 py-0.5 rounded text-muted-foreground">
                              {v}
                            </code>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Security Note */}
        <div className="mt-8 p-4 rounded-lg border border-border/50 bg-muted/20">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <h3 className="font-medium text-foreground text-sm">Security Note</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Your broker credentials are stored securely and encrypted. We use OAuth 2.0 for authentication 
                and never store your broker passwords. You can disconnect at any time.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
