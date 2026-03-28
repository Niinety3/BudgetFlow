import { useState } from 'react'
import { getCurrentTaxYear, getTaxYearMonths, formatTaxYear } from '@/lib/tax-year'
import { calculateIoMTax } from '@/lib/tax'
import { calculatePayDay } from '@/lib/payday'
import { useSettings } from '@/hooks/useSettings'
import { cn } from '@/lib/utils'
import PayDayBreakdown from '@/components/dashboard/PayDayBreakdown'

export default function DashboardPage() {
  const taxYear = getCurrentTaxYear()
  const months = getTaxYearMonths(taxYear)
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const idx = months.findIndex((m) => m.month === currentMonth && m.year === currentYear)
    return idx >= 0 ? idx : 0
  })

  const { settings, loading } = useSettings()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    )
  }

  const s = settings
  const taxResult = s
    ? calculateIoMTax({
        annualProfit: s.annual_profit,
        personalAllowance: s.tax_personal_allowance,
        standardBand: s.tax_standard_band,
        standardRate: s.tax_standard_rate,
        higherRate: s.tax_higher_rate,
      })
    : null

  const payDayResult =
    s && taxResult
      ? calculatePayDay({
          monthlyTakeHome: s.monthly_takehome,
          monthlyTaxSetAside: taxResult.monthlySetAside,
          savingsPct: s.savings_pct,
          currentRent: s.current_rent,
          futureRent: s.future_rent,
        })
      : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Tax Year {formatTaxYear(taxYear)}</p>
      </div>

      {/* Month selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {months.map((m, idx) => {
          const isCurrent = m.month === currentMonth && m.year === currentYear
          const isSelected = idx === selectedMonth
          return (
            <button
              key={`${m.year}-${m.month}`}
              onClick={() => setSelectedMonth(idx)}
              className={cn(
                'flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                isSelected
                  ? 'bg-primary text-primary-foreground'
                  : isCurrent
                    ? 'border border-primary bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {m.label}
            </button>
          )
        })}
      </div>

      {/* Pay day breakdown */}
      {payDayResult ? (
        <PayDayBreakdown result={payDayResult} />
      ) : (
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Configure your settings to see the pay day breakdown.
          </p>
        </div>
      )}
    </div>
  )
}
