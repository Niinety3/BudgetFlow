import { useState } from 'react'
import { Pencil, Trash2, X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Database } from '@/lib/database.types'

type CategoryRow = Database['public']['Tables']['categories']['Row']

const PROTECTED_NAMES = ['Special', 'Bank Transfers', 'Uncategorised']

interface CategoryListProps {
  categories: CategoryRow[]
  onEdit: (id: string, updates: { name: string; is_budget_category: boolean; sort_order: number }) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onAdd: (data: { name: string; is_budget_category: boolean; sort_order: number }) => Promise<void>
}

interface EditState {
  name: string
  is_budget_category: boolean
  sort_order: number
}

export default function CategoryList({ categories, onEdit, onDelete, onAdd }: CategoryListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState>({ name: '', is_budget_category: true, sort_order: 0 })
  const [showAddForm, setShowAddForm] = useState(false)
  const [addState, setAddState] = useState<EditState>({ name: '', is_budget_category: true, sort_order: categories.length + 1 })
  const [deleteWarning, setDeleteWarning] = useState<string | null>(null)

  function startEdit(cat: CategoryRow) {
    setEditingId(cat.id)
    setEditState({ name: cat.name, is_budget_category: cat.is_budget_category, sort_order: cat.sort_order })
  }

  async function saveEdit(id: string) {
    await onEdit(id, editState)
    setEditingId(null)
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function handleDelete(cat: CategoryRow) {
    if (PROTECTED_NAMES.includes(cat.name)) {
      setDeleteWarning(cat.id)
      return
    }
    await onDelete(cat.id)
  }

  async function handleAdd() {
    if (!addState.name.trim()) return
    await onAdd(addState)
    setAddState({ name: '', is_budget_category: true, sort_order: categories.length + 2 })
    setShowAddForm(false)
  }

  return (
    <div className="space-y-3">
      {categories.map((cat) => (
        <div
          key={cat.id}
          className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          {editingId === cat.id ? (
            /* ── Inline Edit ─────────────────────────────────── */
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="text"
                value={editState.name}
                onChange={(e) => setEditState((s) => ({ ...s, name: e.target.value }))}
                className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={editState.is_budget_category}
                  onChange={(e) => setEditState((s) => ({ ...s, is_budget_category: e.target.checked }))}
                  className="h-4 w-4 rounded border-input"
                />
                Budget
              </label>
              <input
                type="number"
                value={editState.sort_order}
                onChange={(e) => setEditState((s) => ({ ...s, sort_order: Number(e.target.value) }))}
                className="w-20 rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Order"
              />
              <div className="flex gap-1">
                <button
                  onClick={() => saveEdit(cat.id)}
                  className="rounded-md bg-primary p-1.5 text-primary-foreground hover:opacity-90"
                  aria-label="Save"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={cancelEdit}
                  className="rounded-md bg-muted p-1.5 text-muted-foreground hover:opacity-90"
                  aria-label="Cancel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            /* ── Display ─────────────────────────────────────── */
            <>
              <div className="flex flex-1 items-center gap-3">
                <span className="text-sm font-medium text-card-foreground">{cat.name}</span>
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                    cat.is_budget_category
                      ? 'bg-success/10 text-success'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {cat.is_budget_category ? 'Budget' : 'Non-budget'}
                </span>
                <span className="text-xs text-muted-foreground">#{cat.sort_order}</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => startEdit(cat)}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Edit category"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(cat)}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Delete category"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {deleteWarning === cat.id && (
                <div className="w-full rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  Cannot delete "{cat.name}" -- it is a protected system category.
                  <button
                    onClick={() => setDeleteWarning(null)}
                    className="ml-2 underline"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ))}

      {/* ── Add Category Form ──────────────────────────────────────── */}
      {showAddForm ? (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center">
          <input
            type="text"
            value={addState.name}
            onChange={(e) => setAddState((s) => ({ ...s, name: e.target.value }))}
            placeholder="Category name"
            className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={addState.is_budget_category}
              onChange={(e) => setAddState((s) => ({ ...s, is_budget_category: e.target.checked }))}
              className="h-4 w-4 rounded border-input"
            />
            Budget
          </label>
          <input
            type="number"
            value={addState.sort_order}
            onChange={(e) => setAddState((s) => ({ ...s, sort_order: Number(e.target.value) }))}
            className="w-20 rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Order"
          />
          <div className="flex gap-1">
            <button
              onClick={handleAdd}
              className="rounded-md bg-primary p-1.5 text-primary-foreground hover:opacity-90"
              aria-label="Add"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="rounded-md bg-muted p-1.5 text-muted-foreground hover:opacity-90"
              aria-label="Cancel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => {
            setAddState({ name: '', is_budget_category: true, sort_order: categories.length + 1 })
            setShowAddForm(true)
          }}
          className="w-full rounded-lg border border-dashed border-border bg-card py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          + Add Category
        </button>
      )}
    </div>
  )
}
