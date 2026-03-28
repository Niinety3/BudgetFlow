import { AlertCircle } from 'lucide-react'
import { useNeedsReviewTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { useHousehold } from '@/hooks/useHousehold'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getAmbiguousCategories } from '@/lib/ambiguous-merchants'
import { supabase } from '@/lib/supabase'

export function NeedsReview() {
  const { householdId } = useHousehold()
  const { reviewTransactions, resolveReview } = useNeedsReviewTransactions(householdId)
  const { categories, addRule } = useCategories()

  if (reviewTransactions.length === 0) return null

  async function handleCategorise(txnId: string, description: string, categoryName: string) {
    const cat = categories.find((c) => c.name === categoryName)
    if (!cat) return

    // Categorise this transaction
    await resolveReview({ id: txnId, categoryId: cat.id })

    // Create a rule for future auto-categorisation
    try {
      await addRule({
        keyword: description.toLowerCase().trim(),
        category_id: cat.id,
        priority: 50,
      })
    } catch {
      // Rule may already exist
    }

    // Bulk-update other transactions with same description
    if (householdId) {
      await supabase
        .from('transactions')
        .update({ category_id: cat.id, needs_review: false })
        .eq('household_id', householdId)
        .eq('description', description)
        .is('category_id', null)
    }
  }

  return (
    <div className="rounded-lg border border-warning/50 bg-warning/10 p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle className="h-5 w-5 text-warning" />
        <h3 className="font-semibold">
          {reviewTransactions.length} transaction{reviewTransactions.length > 1 ? 's' : ''} need{reviewTransactions.length === 1 ? 's' : ''} your input
        </h3>
      </div>

      <div className="space-y-3">
        {reviewTransactions.map((txn) => {
          const ambiguousOptions = getAmbiguousCategories(txn.description)
          const options = ambiguousOptions ?? categories.filter((c) => c.is_budget_category).map((c) => c.name)

          return (
            <div key={txn.id} className="rounded-lg bg-card border border-border p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium text-sm">{txn.description}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(txn.date)}</p>
                </div>
                <p className="font-semibold">{formatCurrency(Number(txn.amount))}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(Array.isArray(options) ? options : []).map((catName) => (
                  <button
                    key={catName}
                    type="button"
                    onClick={() => handleCategorise(txn.id, txn.description, catName)}
                    className="rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                  >
                    {catName}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
