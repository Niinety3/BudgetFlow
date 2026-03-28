import { useTransactions } from '@/hooks/useTransactions'
import { useAllTransactionsForTaxYear } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { formatCurrency } from '@/lib/utils'

interface SpecialsSectionProps {
  month: number
  year: number
  taxYear: number
  householdId: string | null
}

export function SpecialsSection({
  month,
  year,
  taxYear,
  householdId,
}: SpecialsSectionProps) {
  const { categories } = useCategories()
  const { transactions: monthTxns } = useTransactions(month, year, householdId)
  const { transactions: yearTxns } = useAllTransactionsForTaxYear(
    taxYear,
    householdId,
  )

  const specialCategory = categories.find(
    (c) => c.name === 'Special' && !c.is_budget_category,
  )

  if (!specialCategory) return null

  const monthSpecials = monthTxns.filter(
    (t) => t.category_id === specialCategory.id,
  )
  const yearSpecials = yearTxns.filter(
    (t) => t.category_id === specialCategory.id,
  )

  const monthTotal = monthSpecials.reduce(
    (sum, t) => sum + Number(t.amount),
    0,
  )
  const yearTotal = yearSpecials.reduce(
    (sum, t) => sum + Number(t.amount),
    0,
  )

  return (
    <div className="rounded-lg bg-card border border-border p-4">
      <h3 className="font-semibold mb-3">Specials (from savings)</h3>

      {monthSpecials.length === 0 && yearSpecials.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No special expenses this tax year.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">This month</span>
            <span className="font-medium">{formatCurrency(monthTotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Year to date</span>
            <span className="font-medium">{formatCurrency(yearTotal)}</span>
          </div>

          {monthSpecials.length > 0 && (
            <div className="border-t border-border pt-2 space-y-1">
              {monthSpecials.map((txn) => (
                <div
                  key={txn.id}
                  className="flex justify-between text-xs text-muted-foreground"
                >
                  <span>{txn.description}</span>
                  <span>{formatCurrency(Number(txn.amount))}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
