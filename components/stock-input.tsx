'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { Search } from 'lucide-react'

interface StockData {
  ticker: string
  price: string
  open: string
  high: string
  low: string
  change: string
  volume: string
}

interface StockInputProps {
  onAnalyze: (data: StockData) => void
  isLoading: boolean
}

export function StockInput({ onAnalyze, isLoading }: StockInputProps) {
  const [formData, setFormData] = useState<StockData>({
    ticker: '',
    price: '',
    open: '',
    high: '',
    low: '',
    change: '',
    volume: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.ticker) return
    onAnalyze(formData)
  }

  const handleChange = (field: keyof StockData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const popularTickers = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL']

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5" />
          Stock Analysis
        </CardTitle>
        <CardDescription>
          Enter stock data to generate a trading signal. All fields except ticker are optional.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Quick Select */}
          <div className="flex flex-wrap gap-2">
            {popularTickers.map((ticker) => (
              <Button
                key={ticker}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFormData((prev) => ({ ...prev, ticker }))}
                className={formData.ticker === ticker ? 'border-primary bg-primary/5' : ''}
              >
                {ticker}
              </Button>
            ))}
          </div>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="ticker">Ticker Symbol *</FieldLabel>
              <Input
                id="ticker"
                placeholder="e.g., AAPL"
                value={formData.ticker}
                onChange={handleChange('ticker')}
                className="uppercase"
                required
              />
            </Field>
          </FieldGroup>

          <div className="grid grid-cols-2 gap-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="price">Current Price ($)</FieldLabel>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  placeholder="150.00"
                  value={formData.price}
                  onChange={handleChange('price')}
                />
              </Field>
            </FieldGroup>

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="open">Open ($)</FieldLabel>
                <Input
                  id="open"
                  type="number"
                  step="0.01"
                  placeholder="148.50"
                  value={formData.open}
                  onChange={handleChange('open')}
                />
              </Field>
            </FieldGroup>

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="high">High ($)</FieldLabel>
                <Input
                  id="high"
                  type="number"
                  step="0.01"
                  placeholder="152.00"
                  value={formData.high}
                  onChange={handleChange('high')}
                />
              </Field>
            </FieldGroup>

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="low">Low ($)</FieldLabel>
                <Input
                  id="low"
                  type="number"
                  step="0.01"
                  placeholder="147.00"
                  value={formData.low}
                  onChange={handleChange('low')}
                />
              </Field>
            </FieldGroup>

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="change">Change (%)</FieldLabel>
                <Input
                  id="change"
                  type="number"
                  step="0.01"
                  placeholder="2.5"
                  value={formData.change}
                  onChange={handleChange('change')}
                />
              </Field>
            </FieldGroup>

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="volume">Volume</FieldLabel>
                <Input
                  id="volume"
                  placeholder="10M"
                  value={formData.volume}
                  onChange={handleChange('volume')}
                />
              </Field>
            </FieldGroup>
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={isLoading || !formData.ticker}>
            {isLoading ? (
              <>
                <Spinner className="mr-2" />
                Analyzing...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Generate Trading Signal
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
