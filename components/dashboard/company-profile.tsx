'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Building2, Users, Globe, Briefcase } from 'lucide-react'
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

function formatNumber(num: number): string {
  if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`
  if (num >= 1e3) return `${(num / 1e3).toFixed(0)}K`
  return num.toLocaleString()
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
    <div className="h-full bg-card border border-border rounded-lg overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-border bg-muted/30">
        <div className="flex items-center gap-1.5">
          <Building2 className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] font-mono font-bold uppercase text-muted-foreground">Company Profile</span>
          {source && (
            <Badge
              variant="outline"
              className={`text-[8px] px-1 py-0 ${source === 'polygon' ? 'border-green-500/50 text-green-400' : 'border-yellow-500/50 text-yellow-500'}`}
            >
              {source === 'polygon' ? 'LIVE' : 'DEFAULT'}
            </Badge>
          )}
        </div>
        <button onClick={fetchData} className="p-0.5 hover:bg-muted/50 rounded">
          <RefreshCw className={`w-3 h-3 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      {profile && (
        <div className="flex border-b border-border bg-muted/20">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 px-2 py-1 text-[9px] font-mono uppercase tracking-wide transition-colors ${
              activeTab === 'profile' ? 'text-primary border-b-2 border-primary bg-muted/30' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('executives')}
            className={`flex-1 px-2 py-1 text-[9px] font-mono uppercase tracking-wide transition-colors ${
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
          <div className="space-y-2">
            {/* Company Name */}
            <div className="text-sm font-semibold text-foreground">{profile.name}</div>

            {/* Key Info Grid */}
            <div className="grid grid-cols-2 gap-1 text-[8px]">
              {profile.sector && (
                <div className="bg-muted/30 rounded p-1">
                  <div className="text-muted-foreground flex items-center gap-0.5">
                    <Briefcase className="w-2 h-2" /> Sector
                  </div>
                  <div className="font-mono font-semibold text-foreground truncate">{profile.sector}</div>
                </div>
              )}
              {profile.industry && (
                <div className="bg-muted/30 rounded p-1">
                  <div className="text-muted-foreground">Industry</div>
                  <div className="font-mono font-semibold text-foreground truncate">{profile.industry}</div>
                </div>
              )}
              {profile.exchange && (
                <div className="bg-muted/30 rounded p-1">
                  <div className="text-muted-foreground">Exchange</div>
                  <div className="font-mono font-semibold text-foreground">{profile.exchange}</div>
                </div>
              )}
              {profile.marketCap > 0 && (
                <div className="bg-muted/30 rounded p-1">
                  <div className="text-muted-foreground">Market Cap</div>
                  <div className="font-mono font-semibold text-foreground">${formatNumber(profile.marketCap)}</div>
                </div>
              )}
              {profile.employees > 0 && (
                <div className="bg-muted/30 rounded p-1">
                  <div className="text-muted-foreground flex items-center gap-0.5">
                    <Users className="w-2 h-2" /> Employees
                  </div>
                  <div className="font-mono font-semibold text-foreground">{formatNumber(profile.employees)}</div>
                </div>
              )}
              {profile.ceo && (
                <div className="bg-muted/30 rounded p-1">
                  <div className="text-muted-foreground">CEO</div>
                  <div className="font-mono font-semibold text-foreground truncate">{profile.ceo}</div>
                </div>
              )}
            </div>

            {/* Description */}
            {profile.description && (
              <div className="text-[9px] text-muted-foreground leading-relaxed line-clamp-4">
                {profile.description}
              </div>
            )}

            {/* Website */}
            {profile.website && (
              <a
                href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[8px] text-primary hover:underline"
              >
                <Globe className="w-2.5 h-2.5" />
                {profile.website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>
        ) : (
          /* Executives Tab */
          <div className="space-y-1">
            {profile.executives && profile.executives.length > 0 ? (
              profile.executives.map((exec, i) => (
                <div key={i} className="bg-muted/30 rounded p-1.5 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[8px] font-bold text-muted-foreground">
                    {exec.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[9px] font-semibold text-foreground truncate">{exec.name}</div>
                    <div className="text-[8px] text-muted-foreground truncate">{exec.title}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-[9px] text-muted-foreground text-center py-4">No executive data available</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
