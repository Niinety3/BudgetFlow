import { useTransactions } from '@/hooks/useTransactions'
import { useBudgetLimits } from '@/hooks/useBudgetLimits'
import { useCategories } from '@/hooks/useCategories'
import { formatCurrency, cn } from '@/lib/utils'

interface BudgetVsActualProps {
  month: number
  year: number
  taxYear: number
  householdId: string | null
}

export function BudgetVsActual({
  month,
  year,
  taxYear,
  householdId,
}: BudgetVsActualProps) {
  const { transactions } = useTransactions(month, year, householdId)
  const { limits } = useBudgetLimits(taxYear, householdId)
  const { categories } = useCategories()

  const budgetCategories = categories.filter((c) => c.is_budget_category)

  // Sum actual spending per category
  const actualByCategory: Record<string, number> = {}
  for (const txn of transactions) {
    if (txn.category_id) {
      actualByCategory[txn.category_id] =
        (actualByCategory[txn.category_id] ?? 0) + Number(txn.amount)
    }
  }

  // Get budget limit for a category
  function getLimit(categoryId: string): number {
    const limit = limits.find(
      (l) => l.category_id === categoryId && l.month === month,
    )
    return limit ? Number(limit.amount) : 0
  }

  let totalBudget = 0
  let totalActual = 0

  const rows = budgetCategories.map((cat) => {
    const budget = getLimit(cat.id)
    const actual = actualByCategory[cat.id] ?? 0
    const remaining = budget - actual
    totalBudget += budget
    totalActual += actual
    return { category: cat.name, budget, actual, remaining }
  })

  return (
    <div className="rounded-lg bg-card border border-border overflow-hidden">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold">Budget vs Actual</h3>
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
                  {formatCurrency(row.budget)}
                </td>
                <td className="px-3 py-2 text-right">
                  {formatCurrency(row.actual)}
                </td>
                <td
                  className={cn(
                    'px-3 py-2 text-right font-medium',
                    row.remaining >= 0 ? 'text-success' : 'text-destructive',
                  )}
                >
                  {formatCurrency(row.remaining)}
                </td>
              </tr>
            ))}
            <tr className="bg-muted/50 font-semibold">
              <td className="px-3 py-2">Total</td>
              <td className="px-3 py-2 text-right">
                {formatCurrency(totalBudget)}
              </td>
              <td className="px-3 py-2 text-right">
                {formatCurrency(totalActual)}
              </td>
              <td
                className={cn(
                  'px-3 py-2 text-right',
                  totalBudget - totalActual >= 0
                    ? 'text-success'
                    : 'text-destructive',
                )}
              >
                {formatCurrency(totalBudget - totalActual)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
