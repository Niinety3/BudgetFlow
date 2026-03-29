import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import type { BankType } from '@/lib/csv/parser'

interface PreviewTransaction {
  date: string
  description: string
  amount: number
  source: 'revolut' | 'natwest'
  category_id: string | null
  who: 'michael' | 'wife' | 'shared'
  aiSuggested?: boolean
}

interface Category {
  id: string
  name: string
}

interface ImportPreviewProps {
  transactions: PreviewTransaction[]
  categories: Category[]
  bankType: BankType
  incomeSkipped: number
  internalSkipped: number
  onConfirm: (transactions: PreviewTransaction[]) => void
  onCancel: () => void
}

type Filter = 'all' | 'uncategorised' | 'ai-suggested' | 'categorised'

export function ImportPreview({
  transactions: initialTransactions,
  categories,
  bankType,
  incomeSkipped,
  internalSkipped,
  onConfirm,
  onCancel,
}: ImportPreviewProps) {
  const [transactions, setTransactions] =
    useState<PreviewTransaction[]>(initialTransactions)
  const [filter, setFilter] = useState<Filter>('uncategorised')

  const uncategorised = transactions.filter((t) => !t.category_id).length
  const aiSuggested = transactions.filter((t) => t.aiSuggested).length
  const categorised = transactions.length - uncategorised

  const filteredWithIndex = transactions
    .map((t, i) => ({ txn: t, originalIndex: i }))
    .filter(({ txn }) => {
      switch (filter) {
        case 'uncategorised': return !txn.category_id
        case 'ai-suggested': return txn.aiSuggested
        case 'categorised': return !!txn.category_id
        default: return true
      }
    })

  function updateTransaction(
    index: number,
    field: 'category_id' | 'who',
    value: string,
  ) {
    setTransactions((prev) =>
      prev.map((t, i) =>
        i === index
          ? {
              ...t,
              [field]:
                field === 'category_id'
                  ? value || null
                  : (value as 'michael' | 'wife' | 'shared'),
              ...(field === 'category_id' ? { aiSuggested: false } : {}),
            }
          : t,
      ),
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-card p-4 border border-border">
        <h3 className="font-semibold text-lg mb-2">
          {transactions.length} transactions from{' '}
          {bankType === 'revolut' ? 'Revolut' : 'NatWest'}
        </h3>
        <div className="flex flex-wrap gap-2 text-sm">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={cn(
              'rounded-full px-3 py-1 transition-colors',
              filter === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            All ({transactions.length})
          </button>
          {uncategorised > 0 && (
            <button
              type="button"
              onClick={() => setFilter('uncategorised')}
              className={cn(
                'rounded-full px-3 py-1 transition-colors',
                filter === 'uncategorised'
                  ? 'bg-warning text-warning-foreground'
                  : 'bg-warning/20 text-warning hover:bg-warning/30',
              )}
            >
              {uncategorised} uncategorised
            </button>
          )}
          {aiSuggested > 0 && (
            <button
              type="button"
              onClick={() => setFilter('ai-suggested')}
              className={cn(
                'rounded-full px-3 py-1 transition-colors flex items-center gap-1',
                filter === 'ai-suggested'
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30',
              )}
            >
              <Sparkles className="h-3 w-3" />
              {aiSuggested} AI-suggested
            </button>
          )}
          <button
            type="button"
            onClick={() => setFilter('categorised')}
            className={cn(
              'rounded-full px-3 py-1 transition-colors',
              filter === 'categorised'
                ? 'bg-success text-success-foreground'
                : 'bg-success/20 text-success hover:bg-success/30',
            )}
          >
            {categorised} categorised
          </button>
          <span className="rounded-full px-3 py-1 bg-muted/50 text-muted-foreground">
            {incomeSkipped} income skipped
          </span>
          {internalSkipped > 0 && (
            <span className="rounded-full px-3 py-1 bg-muted/50 text-muted-foreground">
              {internalSkipped} internal skipped
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2" style={{ maxHeight: 'calc(100vh - 320px)' }}>
        {filteredWithIndex.length === 0 ? (
          <div className="rounded-lg bg-card border border-border p-8 text-center text-muted-foreground">
            No transactions match this filter.
          </div>
        ) : (
          filteredWithIndex.map(({ txn, originalIndex }) => (
            <div
              key={`${txn.date}-${txn.description}-${originalIndex}`}
              className="rounded-lg bg-card p-3 border border-border"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium truncate">
                      {txn.description}
                    </p>
                    {txn.aiSuggested && (
                      <Sparkles className="h-3.5 w-3.5 text-purple-400 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(txn.date)}
                  </p>
                </div>
                <p className="font-semibold ml-2">{formatCurrency(txn.amount)}</p>
              </div>
              <div className="flex gap-2">
                <select
                  value={txn.category_id ?? ''}
                  onChange={(e) =>
                    updateTransaction(originalIndex, 'category_id', e.target.value)
                  }
                  className="flex-1 rounded border border-border bg-background px-2 py-1 text-sm"
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
                  onChange={(e) => updateTransaction(originalIndex, 'who', e.target.value)}
                  className="rounded border border-border bg-background px-2 py-1 text-sm"
                >
                  <option value="shared">Shared</option>
                  <option value="michael">Michael</option>
                  <option value="wife">Wife</option>
                </select>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onConfirm(transactions)}
          className="flex-1 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90"
        >
          Confirm Import ({transactions.length})
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-border px-4 py-2 font-medium hover:bg-muted"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
