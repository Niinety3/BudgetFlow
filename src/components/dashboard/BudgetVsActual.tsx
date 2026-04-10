import { useQueryClient } from '@tanstack/react-query'
import { useTransactions } from '@/hooks/useTransactions'
import { useAllTransactionsForTaxYear } from '@/hooks/useTransactions'
import { useBudgetLimits } from '@/hooks/useBudgetLimits'
import { useCategories } from '@/hooks/useCategories'
import { supabase } from '@/lib/supabase'
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
  const queryClient = useQueryClient()
  const { transactions } = useTransactions(month, year, householdId)
  const { transactions: allTaxYearTxns } = useAllTransactionsForTaxYear(taxYear, householdId)
  const { transactions: prevTaxYearTxns } = useAllTransactionsForTaxYear(taxYear - 1, householdId)
  const { limits } = useBudgetLimits(taxYear, householdId)
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

  // Calculate average spending per category
  // Use current tax year if it has enough data (3+ months), otherwise fall back to previous year
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

  if (currentYearMonths >= 3) {
    calcAverages(allTaxYearTxns)
  } else if (prevTaxYearTxns.length > 0) {
    calcAverages(prevTaxYearTxns)
  } else {
    calcAverages(allTaxYearTxns)
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
    if (!householdId) return
    setCalculating(true)
    try {
      const totalAvg = budgetCategories.reduce(
        (sum, cat) => sum + (avgByCategory[cat.id] ?? 0),
        0,
      )

      // Delete existing limits for this month, then insert fresh
      const { error: deleteError } = await supabase
        .from('budget_limits')
        .delete()
        .eq('household_id', householdId)
        .eq('tax_year', taxYear)
        .eq('month', month)

      if (deleteError) console.error('Delete error:', deleteError)

      let inserts: { household_id: string; category_id: string; tax_year: number; month: number; amount: number }[]

      if (totalAvg > 0) {
        // Scale averages to fit leftToLiveOn
        const scaleFactor = leftToLiveOn / totalAvg
        inserts = budgetCategories
          .filter((cat) => (avgByCategory[cat.id] ?? 0) > 0)
          .map((cat) => ({
            household_id: householdId,
            category_id: cat.id,
            tax_year: taxYear,
            month,
            amount: Math.round((avgByCategory[cat.id] ?? 0) * scaleFactor),
          }))
      } else {
        // No transaction data — distribute evenly
        const perCategory = Math.round(leftToLiveOn / budgetCategories.length)
        inserts = budgetCategories.map((cat) => ({
          household_id: householdId,
          category_id: cat.id,
          tax_year: taxYear,
          month,
          amount: perCategory,
        }))
      }

      if (inserts.length > 0) {
        const { error: insertError } = await supabase
          .from('budget_limits')
          .insert(inserts)

        if (insertError) console.error('Insert error:', insertError)
      }

      // Refresh the query
      queryClient.invalidateQueries({ queryKey: ['budget-limits', householdId, taxYear] })
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
        {(allTaxYearTxns.length > 0 || !hasAnyBudgets) && (
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
