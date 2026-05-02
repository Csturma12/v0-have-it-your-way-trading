'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { WidgetEmptyState } from './widget-empty-state'

interface CompanyProfileProps {
  ticker: string
}

interface ProfileData {
  name: string
  exchange: string
  description: string
  sector: string
  industry: string
  ceo: string
  employees: number
  marketCap: number
  website: string
  headquarters?: string
  founded?: string
  executives?: { name: string; title: string }[]
}

interface CompanyData {
  profile: ProfileData | null
  aiSummary: string | null
  source: string
}

export function CompanyProfile({ ticker }: CompanyProfileProps) {
  const [data, setData] = useState<CompanyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'profile' | 'executives'>('profile')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)

      const res = await fetch(`/api/polygon/profile?ticker=${ticker}`, {
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (res.ok) {
        const json = await res.json()
        if (json.profile) {
          setData({
            profile: json.profile,
            aiSummary: json.aiSummary ?? null,
            source: json.source ?? 'polygon',
          })
        } else {
          setError('No profile data available')
        }
      } else {
        throw new Error(`HTTP ${res.status}`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load profile'
      setError(msg === 'The user aborted a request.' ? 'Request timeout' : msg)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [ticker])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const { profile, source } = data ?? {}

  return (
    <div className="h-full overflow-hidden flex flex-col">
      {/* Tabs */}
      {profile && (
        <div className="flex border-b border-border bg-muted/20 relative">
          {source && (
            <Badge
              variant="outline"
              className={`absolute right-7 top-1/2 -translate-y-1/2 text-[8px] px-1 py-0 ${source === 'polygon' ? 'border-green-500/50 text-green-400' : 'border-yellow-500/50 text-yellow-500'}`}
            >
              {source === 'polygon' ? 'LIVE' : 'DEFAULT'}
            </Badge>
          )}
          <button onClick={fetchData} className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted/50 rounded">
            <RefreshCw className={`w-3 h-3 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 px-2 py-1 text-[10px] font-mono uppercase tracking-wide transition-colors ${
              activeTab === 'profile' ? 'text-primary border-b-2 border-primary bg-muted/30' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('executives')}
            className={`flex-1 px-2 py-1 text-[10px] font-mono uppercase tracking-wide transition-colors ${
              activeTab === 'executives' ? 'text-primary border-b-2 border-primary bg-muted/30' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Key Executives
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 p-2 overflow-y-auto">
        {loading && !data ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <WidgetEmptyState type="error" message={error} onRetry={fetchData} />
        ) : !profile ? (
          <WidgetEmptyState type="no-ticker" />
        ) : activeTab === 'profile' ? (
          /* Profile = description text only (per user spec) */
          profile.description ? (
            <div className="text-[10px] text-muted-foreground leading-relaxed">
              {profile.description}
            </div>
          ) : (
            <div className="text-[10px] text-muted-foreground text-center py-4">No description available</div>
          )
        ) : (
          /* Executives Tab */
          <div className="space-y-1">
            {profile.executives && profile.executives.length > 0 ? (
              profile.executives.map((exec, i) => (
                <div key={i} className="bg-muted/30 rounded p-1.5 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground">
                    {exec.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-semibold text-foreground truncate">{exec.name}</div>
                    <div className="text-[9px] text-muted-foreground truncate">{exec.title}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-[10px] text-muted-foreground text-center py-4">No executive data available</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
