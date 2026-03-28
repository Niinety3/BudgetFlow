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
}

export function TransactionList({
  transactions,
  categories,
  onUpdate,
  onDelete,
}: TransactionListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (transactions.length === 0) {
    return (
      <div className="rounded-lg bg-card border border-border p-8 text-center text-muted-foreground">
        No transactions found for this period.
      </div>
    )
  }

  return (
    <div className="space-y-2">
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
                  {txn.categories && (
                    <span className="text-xs rounded-full bg-muted px-2 py-0.5">
                      {txn.categories.name}
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
                  onChange={(e) =>
                    onUpdate(txn.id, { category_id: e.target.value || undefined })
                  }
                  className="rounded border border-border bg-background px-2 py-1 text-sm flex-1"
                >
                  <option value="">Uncategorised</option>
                  {categories.map((c) => (
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
