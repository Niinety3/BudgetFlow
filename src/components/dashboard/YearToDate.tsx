import { useAllTransactionsForTaxYear } from '@/hooks/useTransactions'
import { useBudgetLimits } from '@/hooks/useBudgetLimits'
import { useCategories } from '@/hooks/useCategories'
import { formatCurrency, cn } from '@/lib/utils'

interface YearToDateProps {
  taxYear: number
  householdId: string | null
  leftToLiveOn: number
}

export function YearToDate({ taxYear, householdId, leftToLiveOn }: YearToDateProps) {
  const { transactions } = useAllTransactionsForTaxYear(taxYear, householdId)
  const { limits } = useBudgetLimits(taxYear, householdId)
  const { categories } = useCategories()

  const excludedCategories = ['Rent / Mortgage', 'Utilities', 'Annual Costs']
  const budgetCategories = categories.filter(
    (c) => c.is_budget_category && !excludedCategories.includes(c.name),
  )
  const budgetCatIds = new Set(budgetCategories.map((c) => c.id))

  // Figure out how many months have ANY transaction data
  const monthsWithData = new Set(
    transactions.map((t) => (t as Record<string, unknown>).date?.toString().slice(0, 7)),
  ).size

  if (monthsWithData === 0) return null

  // YTD actual per category
  const ytdActual: Record<string, number> = {}
  for (const txn of transactions) {
    const t = txn as Record<string, unknown>
    const cat = t.categories as { name: string; is_budget_category: boolean } | null
    if (cat?.is_budget_category && !excludedCategories.includes(cat?.name ?? '') && t.category_id) {
      ytdActual[t.category_id as string] =
        (ytdActual[t.category_id as string] ?? 0) + Number(t.amount)
    }
  }

  // Only count budget limits for months that have transaction data
  const monthNumbers = new Set(
    transactions.map((t) => {
      const dateStr = (t as Record<string, unknown>).date?.toString() ?? ''
      return parseInt(dateStr.slice(5, 7), 10)
    }),
  )

  const ytdBudget: Record<string, number> = {}
  for (const limit of limits) {
    if (monthNumbers.has(limit.month) && budgetCatIds.has(limit.category_id)) {
      ytdBudget[limit.category_id] =
        (ytdBudget[limit.category_id] ?? 0) + Number(limit.amount)
    }
  }

  // If no budgets set, use leftToLiveOn * monthsWithData as total budget
  const hasBudgets = Object.values(ytdBudget).some((v) => v > 0)
  const totalYtdBudget = hasBudgets
    ? Object.values(ytdBudget).reduce((a, b) => a + b, 0)
    : leftToLiveOn * monthsWithData

  const totalYtdActual = Object.values(ytdActual).reduce((a, b) => a + b, 0)
  const totalRemaining = totalYtdBudget - totalYtdActual
  const monthlyAvgSpend = totalYtdActual / monthsWithData
  const percentUsed = totalYtdBudget > 0 ? Math.round((totalYtdActual / totalYtdBudget) * 100) : 0

  const rows = budgetCategories
    .map((cat) => ({
      name: cat.name,
      actual: ytdActual[cat.id] ?? 0,
      budget: ytdBudget[cat.id] ?? 0,
      monthlyAvg: (ytdActual[cat.id] ?? 0) / monthsWithData,
    }))
    .filter((r) => r.actual > 0)
    .sort((a, b) => b.actual - a.actual)

  return (
    <div className="rounded-lg bg-card border border-border overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold">Year to Date</h3>
        <p className="text-xs text-muted-foreground">
          {monthsWithData} month{monthsWithData > 1 ? 's' : ''} of data
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 p-4 border-b border-border">
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">Total spent</p>
          <p className="text-lg font-bold">{formatCurrency(totalYtdActual)}</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">Monthly average</p>
          <p className="text-lg font-bold">{formatCurrency(monthlyAvgSpend)}</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">
            {hasBudgets ? 'YTD budget' : `Budget (${monthsWithData} × ${formatCurrency(leftToLiveOn)})`}
          </p>
          <p className="text-lg font-bold">{formatCurrency(totalYtdBudget)}</p>
        </div>
        <div className={cn(
          'rounded-lg p-3',
          totalRemaining >= 0 ? 'bg-success/10' : 'bg-destructive/10',
        )}>
          <p className="text-xs text-muted-foreground">
            {totalRemaining >= 0 ? 'Under budget' : 'Over budget'}
          </p>
          <p className={cn(
            'text-lg font-bold',
            totalRemaining >= 0 ? 'text-success' : 'text-destructive',
          )}>
            {formatCurrency(Math.abs(totalRemaining))}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>{percentUsed}% of YTD budget used</span>
          <span>{formatCurrency(totalRemaining)} remaining</span>
        </div>
        <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              percentUsed > 100 ? 'bg-destructive' : percentUsed > 85 ? 'bg-warning' : 'bg-success',
            )}
            style={{ width: `${Math.min(percentUsed, 100)}%` }}
          />
        </div>
      </div>

      {/* Category breakdown */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-3 py-2 text-left font-medium">Category</th>
              <th className="px-3 py-2 text-right font-medium">YTD Spent</th>
              <th className="px-3 py-2 text-right font-medium">Mo. Avg</th>
              {hasBudgets && <th className="px-3 py-2 text-right font-medium">YTD Budget</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name} className="border-b border-border last:border-0">
                <td className="px-3 py-2">{row.name}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(row.actual)}</td>
                <td className="px-3 py-2 text-right text-muted-foreground">
                  {formatCurrency(row.monthlyAvg)}
                </td>
                {hasBudgets && (
                  <td className={cn(
                    'px-3 py-2 text-right font-medium',
                    row.budget > 0 && row.actual > row.budget ? 'text-destructive' : 'text-muted-foreground',
                  )}>
                    {row.budget > 0 ? formatCurrency(row.budget) : '—'}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
