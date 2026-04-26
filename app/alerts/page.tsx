'use client'

import { useState } from 'react'
import { 
  Bell, 
  Plus, 
  Trash2, 
  Edit2, 
  TrendingUp, 
  TrendingDown,
  Clock,
  Check,
  X,
  Volume2,
  Mail,
  Smartphone
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TopNavBar } from '@/components/dashboard/top-nav-bar'

interface Alert {
  id: string
  ticker: string
  type: 'price_above' | 'price_below' | 'percent_change' | 'volume_spike'
  value: number
  active: boolean
  triggered: boolean
  createdAt: string
  lastTriggered?: string
  notifications: ('app' | 'email' | 'sms')[]
}

const MOCK_ALERTS: Alert[] = [
  {
    id: '1',
    ticker: 'NVDA',
    type: 'price_above',
    value: 950,
    active: true,
    triggered: false,
    createdAt: '2024-02-01',
    notifications: ['app', 'email'],
  },
  {
    id: '2',
    ticker: 'AAPL',
    type: 'price_below',
    value: 175,
    active: true,
    triggered: false,
    createdAt: '2024-01-30',
    notifications: ['app'],
  },
  {
    id: '3',
    ticker: 'TSLA',
    type: 'percent_change',
    value: 5,
    active: true,
    triggered: true,
    createdAt: '2024-01-28',
    lastTriggered: '2024-02-02',
    notifications: ['app', 'email', 'sms'],
  },
  {
    id: '4',
    ticker: 'SPY',
    type: 'price_below',
    value: 530,
    active: false,
    triggered: true,
    createdAt: '2024-01-25',
    lastTriggered: '2024-01-29',
    notifications: ['app'],
  },
]

const alertTypeLabels: Record<string, string> = {
  price_above: 'Price Above',
  price_below: 'Price Below',
  percent_change: '% Change',
  volume_spike: 'Volume Spike',
}

const alertTypeIcons: Record<string, React.ElementType> = {
  price_above: TrendingUp,
  price_below: TrendingDown,
  percent_change: TrendingUp,
  volume_spike: Volume2,
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState(MOCK_ALERTS)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newAlert, setNewAlert] = useState({
    ticker: '',
    type: 'price_above' as Alert['type'],
    value: '',
  })

  const handleToggle = (id: string) => {
    setAlerts(alerts.map(a => 
      a.id === id ? { ...a, active: !a.active } : a
    ))
  }

  const handleDelete = (id: string) => {
    setAlerts(alerts.filter(a => a.id !== id))
  }

  const handleCreate = () => {
    if (!newAlert.ticker || !newAlert.value) return
    const alert: Alert = {
      id: Date.now().toString(),
      ticker: newAlert.ticker.toUpperCase(),
      type: newAlert.type,
      value: Number(newAlert.value),
      active: true,
      triggered: false,
      createdAt: new Date().toISOString().split('T')[0],
      notifications: ['app'],
    }
    setAlerts([alert, ...alerts])
    setNewAlert({ ticker: '', type: 'price_above', value: '' })
    setShowNewForm(false)
  }

  const activeCount = alerts.filter(a => a.active).length
  const triggeredCount = alerts.filter(a => a.triggered).length

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNavBar />
      
      <header className="border-b border-border bg-card/30 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-red-400" />
            <h1 className="text-xl font-bold font-mono">PRICE ALERTS</h1>
            <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30 text-[10px]">
              {activeCount} active
            </Badge>
            <Badge variant="outline" className="bg-theme-gold/10 text-theme-gold border-theme-gold/30 text-[10px]">
              {triggeredCount} triggered
            </Badge>
          </div>
          <Button onClick={() => setShowNewForm(true)} size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            New Alert
          </Button>
        </div>
      </header>

      <main className="flex-1 p-6">
        {/* New Alert Form */}
        {showNewForm && (
          <div className="mb-6 p-4 rounded-lg border border-primary/30 bg-primary/5">
            <h3 className="text-sm font-mono font-bold mb-4">Create New Alert</h3>
            <div className="flex gap-3 items-end">
              <div>
                <label className="text-[10px] font-mono text-muted-foreground uppercase mb-1 block">Ticker</label>
                <Input
                  value={newAlert.ticker}
                  onChange={(e) => setNewAlert({ ...newAlert, ticker: e.target.value.toUpperCase() })}
                  placeholder="NVDA"
                  className="w-24 font-mono uppercase"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-muted-foreground uppercase mb-1 block">Condition</label>
                <select
                  value={newAlert.type}
                  onChange={(e) => setNewAlert({ ...newAlert, type: e.target.value as Alert['type'] })}
                  className="h-9 px-3 rounded border border-border bg-background text-sm font-mono"
                >
                  <option value="price_above">Price Above</option>
                  <option value="price_below">Price Below</option>
                  <option value="percent_change">% Change</option>
                  <option value="volume_spike">Volume Spike</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-mono text-muted-foreground uppercase mb-1 block">Value</label>
                <Input
                  type="number"
                  value={newAlert.value}
                  onChange={(e) => setNewAlert({ ...newAlert, value: e.target.value })}
                  placeholder={newAlert.type === 'percent_change' ? '5' : '950'}
                  className="w-28 font-mono"
                />
              </div>
              <Button onClick={handleCreate} className="gap-1">
                <Check className="w-4 h-4" />
                Create
              </Button>
              <Button variant="outline" onClick={() => setShowNewForm(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Alerts Table */}
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-card/50">
              <tr className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Ticker</th>
                <th className="text-left py-3 px-4">Condition</th>
                <th className="text-right py-3 px-4">Target</th>
                <th className="text-center py-3 px-4">Notifications</th>
                <th className="text-center py-3 px-4">Created</th>
                <th className="text-center py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {alerts.map((alert) => {
                const TypeIcon = alertTypeIcons[alert.type] || Bell
                
                return (
                  <tr key={alert.id} className={`hover:bg-muted/20 transition-colors ${!alert.active ? 'opacity-50' : ''}`}>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggle(alert.id)}
                        className={`w-10 h-5 rounded-full relative transition-colors ${
                          alert.active ? 'bg-green-500' : 'bg-muted'
                        }`}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                          alert.active ? 'left-5' : 'left-0.5'
                        }`} />
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm font-mono font-bold">{alert.ticker}</span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="gap-1 text-[9px]">
                        <TypeIcon className="w-3 h-3" />
                        {alertTypeLabels[alert.type]}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-sm">
                      {alert.type === 'percent_change' ? `${alert.value}%` : `$${alert.value}`}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        {alert.notifications.includes('app') && (
                          <Bell className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                        {alert.notifications.includes('email') && (
                          <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                        {alert.notifications.includes('sms') && (
                          <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1 text-[10px] font-mono text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {alert.createdAt}
                      </div>
                      {alert.triggered && alert.lastTriggered && (
                        <Badge className="mt-1 bg-theme-gold/10 text-theme-gold border-theme-gold/30 text-[8px]">
                          Triggered {alert.lastTriggered}
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                          onClick={() => handleDelete(alert.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {alerts.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Bell className="w-8 h-8 mb-2 opacity-50" />
            <span className="text-sm font-mono">No alerts configured</span>
            <Button onClick={() => setShowNewForm(true)} variant="outline" size="sm" className="mt-4 gap-1">
              <Plus className="w-4 h-4" />
              Create your first alert
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
