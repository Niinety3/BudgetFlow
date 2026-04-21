import { useQueryClient } from '@tanstack/react-query'
import { useTransactions } from '@/hooks/useTransactions'
import { useAllTransactionsForTaxYear } from '@/hooks/useTransactions'
import { useBudgetLimits } from '@/hooks/useBudgetLimits'
import { useCategories } from '@/hooks/useCategories'
import { supabase } from '@/lib/supabase'
import { useState } from 'react'
import { formatCurrency, cn } from '@/lib/utils'

// Categories excluded entirely (handled in pay-day flow)
const PAYDAY_EXCLUDED = ['Rent / Mortgage', 'Utilities', 'Annual Costs', 'Tax']

// Fixed discretionary: known monthly costs, not day-to-day controllable
const FIXED_DISCRETIONARY = ['Subscriptions', 'Services', 'Finance', 'Insurance']

// Everything else that's is_budget_category and not above = flexible
// Flexible: Groceries, Shopping, Takeaway, Health, Entertainment, Transport, Golf, etc.

interface BudgetVsActualProps {
  month: number
  year: number
  taxYear: number
  householdId: string | null
  leftToLiveOn: number
}

export function BudgetVsActual({
  month,
  year,
  taxYear,
  householdId,
  leftToLiveOn,
}: BudgetVsActualProps) {
  const queryClient = useQueryClient()
  const { transactions } = useTransactions(month, year, householdId)
  const { transactions: allTaxYearTxns } = useAllTransactionsForTaxYear(taxYear, householdId)
  const { transactions: prevTaxYearTxns } = useAllTransactionsForTaxYear(taxYear - 1, householdId)
  const { limits } = useBudgetLimits(taxYear, householdId)
  const { categories } = useCategories()

  const fixedCategories = categories.filter(
    (c) => c.is_budget_category && FIXED_DISCRETIONARY.includes(c.name),
  )
  const flexibleCategories = categories.filter(
    (c) => c.is_budget_category && !PAYDAY_EXCLUDED.includes(c.name) && !FIXED_DISCRETIONARY.includes(c.name),
  )

  // Actual spending per category this month
  const actualByCategory: Record<string, number> = {}
  for (const txn of transactions) {
    if (txn.category_id) {
      actualByCategory[txn.category_id] =
        (actualByCategory[txn.category_id] ?? 0) + Number(txn.amount)
    }
  }

  // Averages from historical data (for auto-budget)
  const avgByCategory: Record<string, number> = {}
  function calcAverages(txns: typeof allTaxYearTxns) {
    const monthsWithData = new Set(
      txns.map((t) => `${(t as Record<string, unknown>).date}`.slice(0, 7)),
    ).size
    if (monthsWithData === 0) return
    const totalByCategory: Record<string, number> = {}
    for (const txn of txns) {
      const catId = (txn as Record<string, unknown>).category_id as string | null
      if (catId) {
        totalByCategory[catId] = (totalByCategory[catId] ?? 0) + Number((txn as Record<string, unknown>).amount)
      }
    }
    for (const [catId, total] of Object.entries(totalByCategory)) {
      avgByCategory[catId] = total / monthsWithData
    }
  }

  const currentYearMonths = new Set(
    allTaxYearTxns.map((t) => `${(t as Record<string, unknown>).date}`.slice(0, 7)),
  ).size
  if (currentYearMonths >= 3) calcAverages(allTaxYearTxns)
  else if (prevTaxYearTxns.length > 0) calcAverages(prevTaxYearTxns)
  else calcAverages(allTaxYearTxns)

  // Fixed discretionary totals
  const fixedExpected = fixedCategories.reduce((sum, c) => sum + (avgByCategory[c.id] ?? 0), 0)

  // Flexible budget = left to live on minus fixed discretionary
  const flexibleBudgetTotal = Math.max(leftToLiveOn - fixedExpected, 0)

  // Budget limits for flexible categories
  function getLimit(categoryId: string): number {
    const limit = limits.find((l) => l.category_id === categoryId && l.month === month)
    return limit ? Number(limit.amount) : 0
  }

  const hasAnyBudgets = limits.some((l) => l.month === month && Number(l.amount) > 0)

  // Days in month for pace calculation
  const daysInMonth = new Date(year, month, 0).getDate()
  const today = new Date()
  const currentDay = (today.getFullYear() === year && today.getMonth() + 1 === month)
    ? today.getDate()
    : (month < today.getMonth() + 1 || (month === today.getMonth() + 1 && year <= today.getFullYear())) ? daysInMonth : 0

  const [calculating, setCalculating] = useState(false)

  async function autoGenerateBudgets() {
    if (!householdId) return
    setCalculating(true)
    try {
      // Delete existing limits for this month
      await supabase
        .from('budget_limits')
        .delete()
        .eq('household_id', householdId)
        .eq('tax_year', taxYear)
        .eq('month', month)

      // Only budget flexible categories that have recent spending (last 3 months)
      // Only budget flexible categories with 2+ transactions in last 3 months
      const recentCatCount: Record<string, number> = {}
      const threeMonthsAgo = new Date(year, month - 4, 1).toISOString().slice(0, 10)
      const monthEnd = new Date(year, month, 0).toISOString().slice(0, 10)
      const { data: recentTxns } = await supabase
        .from('transactions')
        .select('category_id')
        .eq('household_id', householdId)
        .gte('date', threeMonthsAgo)
        .lte('date', monthEnd)
        .limit(5000)

      if (recentTxns) {
        for (const t of recentTxns) {
          if (t.category_id) recentCatCount[t.category_id] = (recentCatCount[t.category_id] ?? 0) + 1
        }
      }

      const activeFlexible = flexibleCategories.filter(
        (c) => (recentCatCount[c.id] ?? 0) >= 2 && (avgByCategory[c.id] ?? 0) > 0,
      )

      const totalFlexAvg = activeFlexible.reduce(
        (sum, cat) => sum + (avgByCategory[cat.id] ?? 0), 0,
      )

      let inserts: { household_id: string; category_id: string; tax_year: number; month: number; amount: number }[]

      if (totalFlexAvg > 0) {
        const scaleFactor = flexibleBudgetTotal / totalFlexAvg
        inserts = activeFlexible.map((cat) => ({
          household_id: householdId,
          category_id: cat.id,
          tax_year: taxYear,
          month,
          amount: Math.round((avgByCategory[cat.id] ?? 0) * scaleFactor),
        }))
      } else {
        const perCat = Math.round(flexibleBudgetTotal / Math.max(activeFlexible.length, 1))
        inserts = activeFlexible.map((cat) => ({
          household_id: householdId,
          category_id: cat.id,
          tax_year: taxYear,
          month,
          amount: perCat,
        }))
      }

      if (inserts.length > 0) {
        await supabase.from('budget_limits').insert(inserts)
      }

      queryClient.invalidateQueries({ queryKey: ['budget-limits', householdId, taxYear] })
    } catch (err) {
      console.error('Auto-budget error:', err)
    } finally {
      setCalculating(false)
    }
  }

  // Flexible rows
  let totalFlexBudget = 0
  let totalFlexActual = 0
  const flexRows = flexibleCategories
    .map((cat) => {
      const budget = getLimit(cat.id)
      const actual = actualByCategory[cat.id] ?? 0
      const remaining = budget - actual
      totalFlexBudget += budget
      totalFlexActual += actual
      return { id: cat.id, category: cat.name, budget, actual, remaining }
    })
    .filter((r) => r.budget > 0 || r.actual > 0)

  // Overall flexible remaining
  const flexibleRemaining = (totalFlexBudget > 0 ? totalFlexBudget : flexibleBudgetTotal) - totalFlexActual
  const percentThrough = currentDay > 0 ? Math.round((currentDay / daysInMonth) * 100) : 100
  const percentSpent = flexibleBudgetTotal > 0 ? Math.round((totalFlexActual / flexibleBudgetTotal) * 100) : 0
  const dailyRemaining = currentDay < daysInMonth && flexibleRemaining > 0
    ? flexibleRemaining / (daysInMonth - currentDay)
    : 0

  return (
    <div className="space-y-4">
      {/* Money Flow */}
      <div className="rounded-lg bg-card border border-border p-4">
        <h3 className="font-semibold mb-3">Monthly Budget</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Left to live on</span>
            <span className="font-medium">{formatCurrency(leftToLiveOn)}</span>
          </div>

          {/* Recurring costs breakdown inline */}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Recurring costs</span>
            <span className="font-medium">- {formatCurrency(fixedExpected)}</span>
          </div>
          <div className="pl-4 space-y-1">
            {fixedCategories.map((cat) => {
              const actual = actualByCategory[cat.id] ?? 0
              const expected = avgByCategory[cat.id] ?? 0
              if (actual === 0 && expected === 0) return null
              return (
                <div key={cat.id} className="flex justify-between text-xs text-muted-foreground">
                  <span>{cat.name}</span>
                  <span>
                    {formatCurrency(actual)} / {formatCurrency(expected)}
                    {Math.abs(actual - expected) > 1 && (
                      <span className={cn('ml-1', actual > expected ? 'text-destructive' : 'text-success')}>
                        ({actual > expected ? '+' : ''}{formatCurrency(actual - expected)})
                      </span>
                    )}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="flex justify-between border-t border-border pt-2">
            <span className="font-semibold">Flexible budget</span>
            <span className="font-bold text-primary">{formatCurrency(flexibleBudgetTotal)}</span>
          </div>
        </div>
      </div>

      {/* Pace indicator */}
      {currentDay > 0 && currentDay < daysInMonth && totalFlexBudget > 0 && (
        <div className={cn(
          'rounded-lg border p-4',
          percentSpent <= percentThrough ? 'bg-success/10 border-success/30' : 'bg-warning/10 border-warning/30',
        )}>
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-sm font-medium">
              {percentSpent <= percentThrough ? 'On track' : 'Spending fast'}
            </span>
            <span className="text-xs text-muted-foreground">
              Day {currentDay} of {daysInMonth} ({percentThrough}% through month)
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden mb-2">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                percentSpent > 100 ? 'bg-destructive' : percentSpent > percentThrough ? 'bg-warning' : 'bg-success',
              )}
              style={{ width: `${Math.min(percentSpent, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{percentSpent}% of flexible budget spent</span>
            {dailyRemaining > 0 && (
              <span className="font-medium text-foreground">{formatCurrency(dailyRemaining)}/day remaining</span>
            )}
          </div>
        </div>
      )}

      {/* Flexible Budget */}
      <div className="rounded-lg bg-card border border-border overflow-hidden">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <h4 className="text-sm font-medium">Flexible Spending</h4>
          <button
            type="button"
            onClick={autoGenerateBudgets}
            disabled={calculating}
            className={cn(
              'rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground',
              calculating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/90',
            )}
          >
            {calculating ? 'Setting...' : hasAnyBudgets ? 'Recalculate' : 'Auto-set'}
          </button>
        </div>

        <div className="divide-y divide-border">
          {flexRows.map((row) => {
            const pct = row.budget > 0 ? Math.min(Math.round((row.actual / row.budget) * 100), 100) : 0
            return (
              <div key={row.category} className="px-3 py-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm">{row.category}</span>
                  <div className="flex items-center gap-2 text-sm">
                    <span>{formatCurrency(row.actual)}</span>
                    {row.budget > 0 && (
                      <span className="text-xs text-muted-foreground">/ {formatCurrency(row.budget)}</span>
                    )}
                  </div>
                </div>
                {row.budget > 0 && (
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        row.remaining < 0 ? 'bg-destructive' : pct > 80 ? 'bg-warning' : 'bg-success',
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
                {row.budget > 0 && (
                  <div className="flex justify-end mt-0.5">
                    <span className={cn(
                      'text-xs font-medium',
                      row.remaining >= 0 ? 'text-success' : 'text-destructive',
                    )}>
                      {row.remaining >= 0 ? `${formatCurrency(row.remaining)} left` : `${formatCurrency(Math.abs(row.remaining))} over`}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Flexible total */}
        <div className="p-3 border-t border-border bg-muted/30">
          <div className="flex justify-between items-center text-sm font-semibold">
            <span>Flexible total</span>
            <div className="flex items-center gap-2">
              <span>{formatCurrency(totalFlexActual)}</span>
              <span className="text-xs text-muted-foreground">/ {formatCurrency(totalFlexBudget > 0 ? totalFlexBudget : flexibleBudgetTotal)}</span>
            </div>
          </div>
          <div className="flex justify-end mt-1">
            <span className={cn(
              'text-xs font-medium',
              flexibleRemaining >= 0 ? 'text-success' : 'text-destructive',
            )}>
              {flexibleRemaining >= 0 ? `${formatCurrency(flexibleRemaining)} remaining` : `${formatCurrency(Math.abs(flexibleRemaining))} over budget`}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
