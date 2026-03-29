import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
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

  const uncategorised = transactions.filter((t) => !t.category_id).length
  const aiSuggested = transactions.filter((t) => t.aiSuggested).length

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
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span>{incomeSkipped} income skipped</span>
          {internalSkipped > 0 && (
            <span>{internalSkipped} internal skipped</span>
          )}
          {aiSuggested > 0 && (
            <span className="text-purple-400 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              {aiSuggested} AI-suggested
            </span>
          )}
          {uncategorised > 0 && (
            <span className="text-warning">{uncategorised} uncategorised</span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2" style={{ maxHeight: 'calc(100vh - 280px)' }}>
        {transactions.map((txn, i) => (
          <div
            key={`${txn.date}-${txn.description}-${i}`}
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
                  updateTransaction(i, 'category_id', e.target.value)
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
                onChange={(e) => updateTransaction(i, 'who', e.target.value)}
                className="rounded border border-border bg-background px-2 py-1 text-sm"
              >
                <option value="shared">Shared</option>
                <option value="michael">Michael</option>
                <option value="wife">Wife</option>
              </select>
            </div>
          </div>
        ))}
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
