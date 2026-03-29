import { useState } from 'react'
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { formatCurrency, formatDate, cn } from '@/lib/utils'

interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  category_id: string | null
  who: string
  source: string
  categories?: { name: string; is_budget_category: boolean } | null
}

interface Category {
  id: string
  name: string
}

interface TransactionListProps {
  transactions: Transaction[]
  categories: Category[]
  onUpdate: (id: string, updates: { category_id?: string; who?: string }) => void
  onDelete: (id: string) => void
  onCategoryAssigned?: (description: string, categoryId: string) => void
}

export function TransactionList({
  transactions,
  categories,
  onUpdate,
  onDelete,
  onCategoryAssigned,
}: TransactionListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [bulkPrompt, setBulkPrompt] = useState<{
    txnId: string
    description: string
    categoryId: string
    categoryName: string
    matchingIds: string[]
  } | null>(null)

  function handleCategoryChange(txn: Transaction, newCategoryId: string) {
    // Update the single transaction
    onUpdate(txn.id, { category_id: newCategoryId || undefined })

    if (!newCategoryId) return

    // Check for other transactions with same description but different category
    const others = transactions.filter(
      (t) => t.id !== txn.id && t.description === txn.description && t.category_id !== newCategoryId,
    )

    const cat = categories.find((c) => c.id === newCategoryId)
    if (!cat) return

    if (others.length > 0) {
      setBulkPrompt({
        txnId: txn.id,
        description: txn.description,
        categoryId: newCategoryId,
        categoryName: cat.name,
        matchingIds: others.map((t) => t.id),
      })
    } else {
      // No other matches — still create a rule for future
      if (onCategoryAssigned) {
        onCategoryAssigned(txn.description, newCategoryId)
      }
    }
  }

  function applyBulkUpdate() {
    if (!bulkPrompt) return
    // Update all matching transactions
    for (const id of bulkPrompt.matchingIds) {
      onUpdate(id, { category_id: bulkPrompt.categoryId })
    }
    // Create rule for future
    if (onCategoryAssigned) {
      onCategoryAssigned(bulkPrompt.description, bulkPrompt.categoryId)
    }
    setBulkPrompt(null)
  }

  if (transactions.length === 0) {
    return (
      <div className="rounded-lg bg-card border border-border p-8 text-center text-muted-foreground">
        No transactions found for this period.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Bulk update prompt */}
      {bulkPrompt && (
        <div className="rounded-lg border border-primary/50 bg-primary/10 p-3 space-y-2">
          <p className="text-sm">
            <strong>{bulkPrompt.matchingIds.length}</strong> other transaction{bulkPrompt.matchingIds.length > 1 ? 's' : ''} from{' '}
            <strong>"{bulkPrompt.description}"</strong> found. Update them all to{' '}
            <strong>{bulkPrompt.categoryName}</strong>?
          </p>
          <p className="text-xs text-muted-foreground">
            This will also create a rule for future imports.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={applyBulkUpdate}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Yes, update all
            </button>
            <button
              type="button"
              onClick={() => setBulkPrompt(null)}
              className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
            >
              No, just this one
            </button>
          </div>
        </div>
      )}

      {transactions.map((txn) => {
        const isExpanded = expandedId === txn.id
        return (
          <div
            key={txn.id}
            className="rounded-lg bg-card border border-border overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setExpandedId(isExpanded ? null : txn.id)}
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {txn.description}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(txn.date)}
                  </span>
                  {txn.categories ? (
                    <span className="text-xs rounded-full bg-muted px-2 py-0.5">
                      {txn.categories.name}
                    </span>
                  ) : (
                    <span className="text-xs rounded-full bg-warning/20 text-warning px-2 py-0.5">
                      Uncategorised
                    </span>
                  )}
                  <span
                    className={cn(
                      'text-xs rounded-full px-2 py-0.5',
                      txn.who === 'michael'
                        ? 'bg-blue-100 text-blue-700'
                        : txn.who === 'wife'
                          ? 'bg-pink-100 text-pink-700'
                          : 'bg-gray-100 text-gray-700',
                    )}
                  >
                    {txn.who}
                  </span>
                </div>
              </div>
              <span className="font-semibold text-sm whitespace-nowrap">
                {formatCurrency(txn.amount)}
              </span>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {isExpanded && (
              <div className="border-t border-border p-3 bg-muted/30 flex flex-wrap gap-2 items-center">
                <select
                  value={txn.category_id ?? ''}
                  onChange={(e) => handleCategoryChange(txn, e.target.value)}
                  className="rounded border border-border bg-background px-2 py-1 text-sm flex-1"
                >
                  <option value="">Uncategorised</option>
                  {categories.filter((c) => c.name !== 'Uncategorised').map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select
                  value={txn.who}
                  onChange={(e) => onUpdate(txn.id, { who: e.target.value })}
                  className="rounded border border-border bg-background px-2 py-1 text-sm"
                >
                  <option value="shared">Shared</option>
                  <option value="michael">Michael</option>
                  <option value="wife">Wife</option>
                </select>
                <button
                  type="button"
                  onClick={() => onDelete(txn.id)}
                  className="rounded p-1 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
