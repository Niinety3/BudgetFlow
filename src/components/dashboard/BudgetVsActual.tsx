import { useTransactions } from '@/hooks/useTransactions'
import { useAllTransactionsForTaxYear } from '@/hooks/useTransactions'
import { useBudgetLimits } from '@/hooks/useBudgetLimits'
import { useCategories } from '@/hooks/useCategories'
import { useState } from 'react'
import { formatCurrency, cn } from '@/lib/utils'

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
  const { transactions } = useTransactions(month, year, householdId)
  const { transactions: allTaxYearTxns } = useAllTransactionsForTaxYear(taxYear, householdId)
  const { limits, updateLimit } = useBudgetLimits(taxYear, householdId)
  const { categories } = useCategories()

  const excludedCategories = ['Rent / Mortgage', 'Utilities', 'Annual Costs']
  const budgetCategories = categories.filter(
    (c) => c.is_budget_category && !excludedCategories.includes(c.name),
  )

  // Sum actual spending per category for this month
  const actualByCategory: Record<string, number> = {}
  for (const txn of transactions) {
    if (txn.category_id) {
      actualByCategory[txn.category_id] =
        (actualByCategory[txn.category_id] ?? 0) + Number(txn.amount)
    }
  }

  // Calculate average spending per category across all months with data
  const avgByCategory: Record<string, number> = {}
  if (allTaxYearTxns.length > 0) {
    const monthsWithData = new Set(
      allTaxYearTxns.map((t) => `${(t as Record<string, unknown>).date}`.slice(0, 7)),
    ).size

    if (monthsWithData > 0) {
      const totalByCategory: Record<string, number> = {}
      for (const txn of allTaxYearTxns) {
        const catId = (txn as Record<string, unknown>).category_id as string | null
        if (catId) {
          totalByCategory[catId] = (totalByCategory[catId] ?? 0) + Number((txn as Record<string, unknown>).amount)
        }
      }
      for (const [catId, total] of Object.entries(totalByCategory)) {
        avgByCategory[catId] = total / monthsWithData
      }
    }
  }

  // Get budget limit for a category
  function getLimit(categoryId: string): number {
    const limit = limits.find(
      (l) => l.category_id === categoryId && l.month === month,
    )
    return limit ? Number(limit.amount) : 0
  }

  // Check if any budgets are set for this month
  const hasAnyBudgets = limits.some((l) => l.month === month && Number(l.amount) > 0)

  const [calculating, setCalculating] = useState(false)

  // Auto-generate budgets: average spending scaled to fit leftToLiveOn
  async function autoGenerateBudgets() {
    setCalculating(true)
    try {
      const totalAvg = budgetCategories.reduce(
        (sum, cat) => sum + (avgByCategory[cat.id] ?? 0),
        0,
      )

      console.log('Auto-budget: totalAvg', totalAvg, 'leftToLiveOn', leftToLiveOn, 'categories', budgetCategories.length, 'txns', allTaxYearTxns.length)

      if (totalAvg === 0) {
        console.warn('Auto-budget: no spending data found')
        setCalculating(false)
        return
      }

      const scaleFactor = leftToLiveOn / totalAvg

      for (const cat of budgetCategories) {
        const avg = avgByCategory[cat.id] ?? 0
        if (avg > 0) {
          const scaledBudget = Math.round(avg * scaleFactor)
          console.log(`Auto-budget: ${cat.name} avg=${avg} scaled=${scaledBudget}`)
          await updateLimit({ categoryId: cat.id, month, amount: scaledBudget })
        }
      }
    } catch (err) {
      console.error('Auto-budget error:', err)
    } finally {
      setCalculating(false)
    }
  }

  let totalBudget = 0
  let totalActual = 0

  const rows = budgetCategories.map((cat) => {
    const budget = getLimit(cat.id)
    const actual = actualByCategory[cat.id] ?? 0
    const remaining = budget - actual
    totalBudget += budget
    totalActual += actual
    return { id: cat.id, category: cat.name, budget, actual, remaining }
  })

  return (
    <div className="rounded-lg bg-card border border-border overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold">Budget vs Actual</h3>
        {allTaxYearTxns.length > 0 && (
          <button
            type="button"
            onClick={autoGenerateBudgets}
            disabled={calculating}
            className={cn(
              'rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground',
              calculating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/90',
            )}
          >
            {calculating ? 'Calculating...' : hasAnyBudgets ? 'Recalculate' : 'Auto-set budgets'}
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-3 py-2 text-left font-medium">Category</th>
              <th className="px-3 py-2 text-right font-medium">Budget</th>
              <th className="px-3 py-2 text-right font-medium">Actual</th>
              <th className="px-3 py-2 text-right font-medium">Remaining</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.category} className="border-b border-border last:border-0">
                <td className="px-3 py-2">{row.category}</td>
                <td className="px-3 py-2 text-right text-muted-foreground">
                  {row.budget > 0 ? formatCurrency(row.budget) : (
                    <span className="text-xs text-muted-foreground/50">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {formatCurrency(row.actual)}
                </td>
                <td
                  className={cn(
                    'px-3 py-2 text-right font-medium',
                    row.budget === 0
                      ? 'text-muted-foreground'
                      : row.remaining >= 0 ? 'text-success' : 'text-destructive',
                  )}
                >
                  {row.budget > 0 ? formatCurrency(row.remaining) : '—'}
                </td>
              </tr>
            ))}
            <tr className="bg-muted/50 font-semibold">
              <td className="px-3 py-2">Total</td>
              <td className="px-3 py-2 text-right">
                {totalBudget > 0 ? formatCurrency(totalBudget) : '—'}
              </td>
              <td className="px-3 py-2 text-right">
                {formatCurrency(totalActual)}
              </td>
              <td
                className={cn(
                  'px-3 py-2 text-right',
                  totalBudget === 0
                    ? 'text-muted-foreground'
                    : totalBudget - totalActual >= 0
                      ? 'text-success'
                      : 'text-destructive',
                )}
              >
                {totalBudget > 0 ? formatCurrency(totalBudget - totalActual) : '—'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
