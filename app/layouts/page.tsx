'use client'

import { useState } from 'react'
import { 
  Layout, 
  Plus, 
  Trash2, 
  Edit2, 
  Check,
  Grid,
  Columns,
  Rows,
  Maximize2,
  Clock
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TopNavBar } from '@/components/dashboard/top-nav-bar'
import Link from 'next/link'

interface SavedLayout {
  id: string
  name: string
  description: string
  gridType: 'grid' | 'columns' | 'rows' | 'single'
  widgets: string[]
  createdAt: string
  isDefault: boolean
}

const MOCK_LAYOUTS: SavedLayout[] = [
  {
    id: '1',
    name: 'Day Trading',
    description: 'Chart + Watchlist + News for active trading',
    gridType: 'columns',
    widgets: ['chart', 'watchlist', 'news'],
    createdAt: '2024-02-01',
    isDefault: true,
  },
  {
    id: '2',
    name: 'Research',
    description: 'Large chart with sector analysis',
    gridType: 'rows',
    widgets: ['chart', 'sectors', 'themes'],
    createdAt: '2024-01-28',
    isDefault: false,
  },
  {
    id: '3',
    name: 'Options Flow',
    description: 'Options and dark pool monitoring',
    gridType: 'grid',
    widgets: ['chart', 'options-flow', 'dark-pool', 'news'],
    createdAt: '2024-01-25',
    isDefault: false,
  },
  {
    id: '4',
    name: 'Full Screen Chart',
    description: 'Maximized chart view',
    gridType: 'single',
    widgets: ['chart'],
    createdAt: '2024-01-20',
    isDefault: false,
  },
]

const gridIcons: Record<string, React.ElementType> = {
  grid: Grid,
  columns: Columns,
  rows: Rows,
  single: Maximize2,
}

export default function LayoutsPage() {
  const [layouts, setLayouts] = useState(MOCK_LAYOUTS)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const handleSetDefault = (id: string) => {
    setLayouts(layouts.map(l => ({
      ...l,
      isDefault: l.id === id,
    })))
  }

  const handleDelete = (id: string) => {
    setLayouts(layouts.filter(l => l.id !== id))
  }

  const handleStartEdit = (layout: SavedLayout) => {
    setEditingId(layout.id)
    setEditName(layout.name)
  }

  const handleSaveEdit = () => {
    if (!editingId || !editName.trim()) return
    setLayouts(layouts.map(l => 
      l.id === editingId ? { ...l, name: editName } : l
    ))
    setEditingId(null)
    setEditName('')
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNavBar />
      
      <header className="border-b border-border bg-card/30 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Layout className="w-6 h-6 text-cyan-400" />
            <h1 className="text-xl font-bold font-mono">SAVED LAYOUTS</h1>
            <Badge variant="outline" className="text-[10px]">
              {layouts.length} layouts
            </Badge>
          </div>
          <Button size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Save Current
          </Button>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {layouts.map((layout) => {
            const GridIcon = gridIcons[layout.gridType] || Grid
            
            return (
              <div
                key={layout.id}
                className={`p-4 rounded-lg border transition-colors ${
                  layout.isDefault 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border bg-card/50 hover:border-border/80'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <GridIcon className="w-5 h-5 text-cyan-400" />
                    {editingId === layout.id ? (
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-7 text-sm font-mono font-bold"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                        onBlur={handleSaveEdit}
                      />
                    ) : (
                      <h3 className="text-sm font-mono font-bold">{layout.name}</h3>
                    )}
                  </div>
                  {layout.isDefault && (
                    <Badge className="bg-primary/20 text-primary border-primary/30 text-[8px]">
                      DEFAULT
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-muted-foreground mb-3">
                  {layout.description}
                </p>

                <div className="flex flex-wrap gap-1 mb-3">
                  {layout.widgets.map((widget) => (
                    <Badge key={widget} variant="outline" className="text-[9px] capitalize">
                      {widget.replace('-', ' ')}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/50">
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                    <Clock className="w-3 h-3" />
                    {layout.createdAt}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {!layout.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[10px] font-mono"
                        onClick={() => handleSetDefault(layout.id)}
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Set Default
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleStartEdit(layout)}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                      onClick={() => handleDelete(layout.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <Link href="/">
                  <Button variant="outline" size="sm" className="w-full mt-3 text-[10px] font-mono">
                    Load Layout
                  </Button>
                </Link>
              </div>
            )
          })}

          {/* Create New Card */}
          <div className="p-4 rounded-lg border border-dashed border-border bg-card/20 flex flex-col items-center justify-center min-h-[200px] hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer">
            <Plus className="w-8 h-8 text-muted-foreground mb-2" />
            <span className="text-sm font-mono text-muted-foreground">Create New Layout</span>
          </div>
        </div>
      </main>
    </div>
  )
}
