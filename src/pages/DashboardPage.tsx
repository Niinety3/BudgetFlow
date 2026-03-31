import { useState } from 'react'
import { getCurrentTaxYear, getTaxYearMonths, formatTaxYear } from '@/lib/tax-year'
import { calculateIoMTax } from '@/lib/tax'
import { calculatePayDay } from '@/lib/payday'
import { useSettings } from '@/hooks/useSettings'
import { useHousehold } from '@/hooks/useHousehold'
import { useTransactions } from '@/hooks/useTransactions'
import { cn } from '@/lib/utils'
import PayDayBreakdown from '@/components/dashboard/PayDayBreakdown'
import { BudgetVsActual } from '@/components/dashboard/BudgetVsActual'
import { SpecialsSection } from '@/components/dashboard/SpecialsSection'
import { MonthlySummary } from '@/components/dashboard/MonthlySummary'
import { NeedsReview } from '@/components/dashboard/NeedsReview'
import { YearToDate } from '@/components/dashboard/YearToDate'

export default function DashboardPage() {
  const currentTaxYr = getCurrentTaxYear()
  const [taxYear, setTaxYear] = useState(currentTaxYr)
  const months = getTaxYearMonths(taxYear)
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const idx = months.findIndex((m) => m.month === currentMonth && m.year === currentYear)
    return idx >= 0 ? idx : 0
  })

  const { settings, loading } = useSettings()
  const { householdId } = useHousehold()

  const selectedM = months[selectedMonth]
  const { transactions } = useTransactions(
    selectedM.month,
    selectedM.year,
    householdId,
  )

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

  const fixedBillsTotal = s
    ? (s.fixed_bills ?? []).reduce((sum: number, b: { amount: number }) => sum + b.amount, 0)
    : 0

  const payDayResult =
    s && taxResult
      ? calculatePayDay({
          monthlyTakeHome: s.monthly_takehome,
          monthlyTaxSetAside: taxResult.monthlySetAside,
          savingsPct: s.savings_pct,
          currentRent: s.current_rent,
          futureRent: s.future_rent,
          fixedBills: fixedBillsTotal,
        })
      : null

  // Calculate total budget-category spending for the month (excluding rent + utilities)
  const excludedCategories = ['Rent / Mortgage', 'Utilities', 'Annual Costs']
  const totalSpent = transactions
    .filter((t: Record<string, unknown>) => {
      const cat = t.categories as { name: string; is_budget_category: boolean } | null
      return cat?.is_budget_category && !excludedCategories.includes(cat?.name ?? '')
    })
    .reduce((sum: number, t: Record<string, unknown>) => sum + Number(t.amount), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Tax Year {formatTaxYear(taxYear)}</p>
        </div>
        <div className="flex gap-1">
          {[currentTaxYr, currentTaxYr + 1].map((yr) => (
            <button
              key={yr}
              onClick={() => {
                setTaxYear(yr)
                setSelectedMonth(0)
              }}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                yr === taxYear
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
            >
              {formatTaxYear(yr)}
            </button>
          ))}
        </div>
      </div>

      {/* Needs Review */}
      <NeedsReview />

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

      {/* Monthly Summary */}
      {payDayResult && (
        <MonthlySummary
          leftToLiveOn={payDayResult.leftToLiveOn}
          totalSpent={totalSpent}
        />
      )}

      {/* Budget vs Actual */}
      <BudgetVsActual
        month={selectedM.month}
        year={selectedM.year}
        taxYear={taxYear}
        householdId={householdId}
        leftToLiveOn={payDayResult?.leftToLiveOn ?? 0}
      />

      {/* Year to Date */}
      <YearToDate
        taxYear={taxYear}
        householdId={householdId}
        leftToLiveOn={payDayResult?.leftToLiveOn ?? 0}
      />

      {/* Specials */}
      <SpecialsSection
        month={selectedM.month}
        year={selectedM.year}
        taxYear={taxYear}
        householdId={householdId}
      />
    </div>
  )
}
