import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { TransactionFilters, type Filters } from '@/components/transactions/TransactionFilters'
import { TransactionList } from '@/components/transactions/TransactionList'
import { useTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { useHousehold } from '@/hooks/useHousehold'
import { supabase } from '@/lib/supabase'

export default function TransactionsPage() {
  const { householdId } = useHousehold()
  const { categories, addRule } = useCategories()
  const now = new Date()

  const [filters, setFilters] = useState<Filters>({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    categoryId: null,
    who: null,
    source: null,
  })

  const { transactions, updateTransaction, deleteTransaction, addTransaction, refetch } =
    useTransactions(filters.month, filters.year, householdId)

  const [showAddForm, setShowAddForm] = useState(false)
  const [newTxn, setNewTxn] = useState<{
    date: string
    description: string
    amount: string
    category_id: string
    who: 'michael' | 'wife' | 'shared'
  }>({
    date: new Date().toISOString().slice(0, 10),
    description: '',
    amount: '',
    category_id: '',
    who: 'shared',
  })

  const [ruleStatus, setRuleStatus] = useState<string | null>(null)

  // Apply client-side filters
  const filtered = transactions.filter((t: Record<string, unknown>) => {
    if (filters.categoryId && t.category_id !== filters.categoryId) return false
    if (filters.who && t.who !== filters.who) return false
    if (filters.source && t.source !== filters.source) return false
    return true
  })

  async function handleAdd() {
    if (!newTxn.description || !newTxn.amount) return
    await addTransaction({
      date: newTxn.date,
      description: newTxn.description,
      amount: parseFloat(newTxn.amount),
      category_id: newTxn.category_id || null,
      who: newTxn.who,
      source: 'manual',
    })
    setNewTxn({
      date: new Date().toISOString().slice(0, 10),
      description: '',
      amount: '',
      category_id: '',
      who: 'shared',
    })
    setShowAddForm(false)
  }

  async function handleCategoryAssigned(description: string, categoryId: string) {
    if (!householdId) return

    // 1. Create a keyword rule from the description
    const keyword = description.toLowerCase().trim()
    try {
      await addRule({
        keyword,
        category_id: categoryId,
        priority: 50,
      })
    } catch {
      // Rule may already exist, that's fine
    }

    // 2. Update all other transactions with the same description to this category
    const { data: updated } = await supabase
      .from('transactions')
      .update({ category_id: categoryId })
      .eq('household_id', householdId)
      .eq('description', description)
      .is('category_id', null)
      .select('id')

    const count = updated?.length ?? 0
    setRuleStatus(
      `Rule created for "${keyword}". ${count > 0 ? `${count} other transaction${count > 1 ? 's' : ''} also updated.` : 'No other matches found.'}`,
    )
    setTimeout(() => setRuleStatus(null), 5000)

    // Refresh the list
    refetch()
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showAddForm ? 'Cancel' : 'Add'}
        </button>
      </div>

      {ruleStatus && (
        <div className="mb-4 rounded-lg bg-success/10 border border-success/50 p-3 text-sm text-success">
          {ruleStatus}
        </div>
      )}

      {showAddForm && (
        <div className="mb-4 rounded-lg bg-card border border-border p-4 space-y-3">
          <input
            type="date"
            value={newTxn.date}
            onChange={(e) => setNewTxn({ ...newTxn, date: e.target.value })}
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Description"
            value={newTxn.description}
            onChange={(e) =>
              setNewTxn({ ...newTxn, description: e.target.value })
            }
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            type="number"
            placeholder="Amount (£)"
            step="0.01"
            value={newTxn.amount}
            onChange={(e) => setNewTxn({ ...newTxn, amount: e.target.value })}
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <select
              value={newTxn.category_id}
              onChange={(e) =>
                setNewTxn({ ...newTxn, category_id: e.target.value })
              }
              className="flex-1 rounded border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Uncategorised</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={newTxn.who}
              onChange={(e) =>
                setNewTxn({
                  ...newTxn,
                  who: e.target.value as 'michael' | 'wife' | 'shared',
                })
              }
              className="rounded border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="shared">Shared</option>
              <option value="michael">Michael</option>
              <option value="wife">Wife</option>
            </select>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            className="w-full rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90"
          >
            Add Transaction
          </button>
        </div>
      )}

      <TransactionFilters
        filters={filters}
        setFilters={setFilters}
        categories={categories}
      />

      <TransactionList
        transactions={filtered}
        categories={categories}
        onUpdate={(id, updates) =>
          updateTransaction({
            id,
            category_id: updates.category_id,
            who: updates.who as 'michael' | 'wife' | 'shared' | undefined,
          })
        }
        onDelete={(id) => deleteTransaction(id)}
        onCategoryAssigned={handleCategoryAssigned}
      />
    </div>
  )
}
