import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import type { BankType } from '@/lib/csv/parser'
import type { SkippedTransaction } from '@/lib/csv/types'

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
  skippedTransactions: SkippedTransaction[]
  onConfirm: (transactions: PreviewTransaction[]) => void
  onCancel: () => void
  onRuleCreated?: (keyword: string, categoryId: string) => void
}

type Filter = 'all' | 'uncategorised' | 'ai-suggested' | 'categorised' | 'income-skipped' | 'internal-skipped'

export function ImportPreview({
  transactions: initialTransactions,
  categories,
  bankType,
  incomeSkipped,
  internalSkipped,
  skippedTransactions,
  onConfirm,
  onCancel,
  onRuleCreated,
}: ImportPreviewProps) {
  const [transactions, setTransactions] =
    useState<PreviewTransaction[]>(initialTransactions)
  const [filter, setFilter] = useState<Filter>('uncategorised')
  const [sortBy, setSortBy] = useState<'date' | 'merchant' | 'amount' | 'category'>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [bulkPrompt, setBulkPrompt] = useState<{
    description: string
    categoryId: string
    categoryName: string
    matchCount: number
  } | null>(null)

  const uncategorised = transactions.filter((t) => !t.category_id).length
  const aiSuggested = transactions.filter((t) => t.aiSuggested).length
  const categorised = transactions.length - uncategorised

  function getCategoryName(categoryId: string | null): string {
    if (!categoryId) return 'zzz_uncategorised'
    return categories.find((c) => c.id === categoryId)?.name ?? 'zzz_uncategorised'
  }

  function toggleSort(field: typeof sortBy) {
    if (sortBy === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(field)
      setSortDir('asc')
    }
  }

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
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      switch (sortBy) {
        case 'date': return dir * a.txn.date.localeCompare(b.txn.date)
        case 'merchant': return dir * a.txn.description.localeCompare(b.txn.description)
        case 'amount': return dir * (a.txn.amount - b.txn.amount)
        case 'category': return dir * getCategoryName(a.txn.category_id).localeCompare(getCategoryName(b.txn.category_id))
        default: return 0
      }
    })

  function updateTransaction(
    index: number,
    field: 'category_id' | 'who',
    value: string,
  ) {
    const txn = transactions[index]

    // Update the single transaction
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

    // If changing category, check for other transactions with same description
    if (field === 'category_id' && value && txn) {
      const others = transactions.filter(
        (t, i) => i !== index && t.description === txn.description && t.category_id !== value,
      )
      if (others.length > 0) {
        const cat = categories.find((c) => c.id === value)
        setBulkPrompt({
          description: txn.description,
          categoryId: value,
          categoryName: cat?.name ?? 'this category',
          matchCount: others.length,
        })
      } else {
        // No other matches — still create a rule for future imports
        if (onRuleCreated) {
          onRuleCreated(txn.description.toLowerCase().trim(), value)
        }
      }
    }
  }

  function applyBulkUpdate() {
    if (!bulkPrompt) return
    setTransactions((prev) =>
      prev.map((t) =>
        t.description === bulkPrompt.description
          ? { ...t, category_id: bulkPrompt.categoryId, aiSuggested: false }
          : t,
      ),
    )
    // Create a rule so this is remembered for future imports
    if (onRuleCreated) {
      onRuleCreated(bulkPrompt.description.toLowerCase().trim(), bulkPrompt.categoryId)
    }
    setBulkPrompt(null)
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
          {incomeSkipped > 0 && (
            <button
              type="button"
              onClick={() => setFilter('income-skipped')}
              className={cn(
                'rounded-full px-3 py-1 transition-colors',
                filter === 'income-skipped'
                  ? 'bg-muted text-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted/70',
              )}
            >
              {incomeSkipped} income skipped
            </button>
          )}
          {internalSkipped > 0 && (
            <button
              type="button"
              onClick={() => setFilter('internal-skipped')}
              className={cn(
                'rounded-full px-3 py-1 transition-colors',
                filter === 'internal-skipped'
                  ? 'bg-muted text-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted/70',
              )}
            >
              {internalSkipped} internal skipped
            </button>
          )}
        </div>
      </div>

      {/* Sort controls */}
      <div className="flex items-center gap-1 text-xs">
        <span className="text-muted-foreground mr-1">Sort:</span>
        {(['date', 'merchant', 'amount', 'category'] as const).map((field) => (
          <button
            key={field}
            type="button"
            onClick={() => toggleSort(field)}
            className={cn(
              'rounded px-2 py-1 transition-colors capitalize',
              sortBy === field
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            {field} {sortBy === field ? (sortDir === 'asc' ? '\u2191' : '\u2193') : ''}
          </button>
        ))}
      </div>

      {/* Bulk update prompt */}
      {bulkPrompt && (
        <div className="rounded-lg border border-primary/50 bg-primary/10 p-4 space-y-2">
          <p className="text-sm">
            <strong>{bulkPrompt.matchCount}</strong> other transaction{bulkPrompt.matchCount > 1 ? 's' : ''} from{' '}
            <strong>"{bulkPrompt.description}"</strong> found. Update them all to{' '}
            <strong>{bulkPrompt.categoryName}</strong>?
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

      <div className="flex-1 overflow-y-auto space-y-2" style={{ maxHeight: 'calc(100vh - 320px)' }}>
        {(filter === 'income-skipped' || filter === 'internal-skipped') ? (
          (() => {
            const reason = filter === 'income-skipped' ? 'income' : 'internal'
            const items = skippedTransactions.filter((s) => s.reason === reason)
            return items.length === 0 ? (
              <div className="rounded-lg bg-card border border-border p-8 text-center text-muted-foreground">
                No transactions match this filter.
              </div>
            ) : (
              items.map((s, i) => (
                <div key={`skipped-${i}`} className="rounded-lg bg-card p-3 border border-border opacity-60">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.description}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(s.date)}</p>
                    </div>
                    <div className="text-right ml-2">
                      <p className="font-semibold text-sm">{formatCurrency(s.amount)}</p>
                      <p className="text-xs text-muted-foreground">{s.reason}</p>
                    </div>
                  </div>
                </div>
              ))
            )
          })()
        ) : filteredWithIndex.length === 0 ? (
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
