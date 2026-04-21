import { useQuery } from '@tanstack/react-query'
import { useBudgetLimits } from '@/hooks/useBudgetLimits'
import { useCategories } from '@/hooks/useCategories'
import { supabase } from '@/lib/supabase'
import { getTaxYearDateRange } from '@/lib/tax-year'
import { formatCurrency, cn } from '@/lib/utils'

interface YearToDateProps {
  taxYear: number
  householdId: string | null
  leftToLiveOn: number
}

export function YearToDate({ taxYear, householdId, leftToLiveOn }: YearToDateProps) {
  const { limits } = useBudgetLimits(taxYear, householdId)
  const { categories } = useCategories()
  const { start, end } = getTaxYearDateRange(taxYear)

  // Exclude pay-day deductions AND recurring costs (same as monthly budget view)
  const excludedCategories = ['Rent / Mortgage', 'Utilities', 'Annual Costs', 'Tax', 'Subscriptions', 'Services', 'Finance', 'Insurance']
  const budgetCategories = categories.filter(
    (c) => c.is_budget_category && !excludedCategories.includes(c.name),
  )
  const budgetCatIds = new Set(budgetCategories.map((c) => c.id))

  // Query aggregated data directly from DB — no row limit issues
  const { data: summaryData } = useQuery({
    queryKey: ['ytd-summary', householdId, taxYear],
    queryFn: async () => {
      if (!householdId) return null

      // Get distinct month count via a small query per month
      const startStr = start.toISOString().slice(0, 10)
      const endStr = end.toISOString().slice(0, 10)

      // Count months by querying one row per month
      let monthCount = 0
      const taxYearMonths: { m: number; y: number }[] = []
      for (let i = 0; i < 12; i++) {
        const m = ((3 + i) % 12) + 1 // April=4, May=5, ..., March=3
        const y = i < 9 ? taxYear : taxYear + 1
        taxYearMonths.push({ m, y })
      }

      for (const { m, y } of taxYearMonths) {
        const monthStart = `${y}-${String(m).padStart(2, '0')}-01`
        const monthEnd = new Date(y, m, 0) // last day of month
        const monthEndStr = monthEnd.toISOString().slice(0, 10)

        const { count } = await supabase
          .from('transactions')
          .select('*', { count: 'exact', head: true })
          .eq('household_id', householdId)
          .gte('date', monthStart)
          .lte('date', monthEndStr)

        if (count && count > 0) monthCount++
      }

      // Get spending per category — paginate to avoid row limit
      const byCat: Record<string, number> = {}
      let offset = 0
      const pageSize = 1000
      while (true) {
        const { data: page } = await supabase
          .from('transactions')
          .select('category_id, amount')
          .eq('household_id', householdId)
          .gte('date', startStr)
          .lte('date', endStr)
          .range(offset, offset + pageSize - 1)

        if (!page || page.length === 0) break

        for (const row of page) {
          if (row.category_id) {
            byCat[row.category_id] = (byCat[row.category_id] ?? 0) + Number(row.amount)
          }
        }

        if (page.length < pageSize) break
        offset += pageSize
      }

      return { byCat, monthCount }
    },
    enabled: !!householdId,
  })

  const monthsWithData = summaryData?.monthCount ?? 0
  const ytdActual = summaryData?.byCat ?? {}

  if (monthsWithData === 0) return null

  // Sum budget limits for budget categories only
  const ytdBudget: Record<string, number> = {}
  for (const limit of limits) {
    if (budgetCatIds.has(limit.category_id)) {
      ytdBudget[limit.category_id] =
        (ytdBudget[limit.category_id] ?? 0) + Number(limit.amount)
    }
  }

  const hasBudgets = Object.values(ytdBudget).some((v) => v > 0)
  const totalYtdBudget = hasBudgets
    ? Object.values(ytdBudget).reduce((a, b) => a + b, 0)
    : leftToLiveOn * monthsWithData

  // Only sum budget categories (excluding rent, utilities, etc.)
  const totalYtdActual = budgetCategories.reduce(
    (sum, cat) => sum + (ytdActual[cat.id] ?? 0), 0,
  )
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
