import { useState } from 'react'
import { Pencil, Trash2, X, Check, ArrowRight } from 'lucide-react'
import type { Database } from '@/lib/database.types'

type CategoryRow = Database['public']['Tables']['categories']['Row']
type RuleRow = Database['public']['Tables']['category_rules']['Row']

interface RuleEditorProps {
  rules: RuleRow[]
  categories: CategoryRow[]
  onEdit: (id: string, updates: { keyword: string; category_id: string; priority: number }) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onAdd: (data: { keyword: string; category_id: string; priority: number }) => Promise<void>
}

interface EditState {
  keyword: string
  category_id: string
  priority: number
}

function categoryName(categories: CategoryRow[], id: string): string {
  return categories.find((c) => c.id === id)?.name ?? 'Unknown'
}

export default function RuleEditor({ rules, categories, onEdit, onDelete, onAdd }: RuleEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState>({ keyword: '', category_id: '', priority: 0 })
  const [showAddForm, setShowAddForm] = useState(false)
  const [addState, setAddState] = useState<EditState>({ keyword: '', category_id: categories[0]?.id ?? '', priority: 100 })

  function startEdit(rule: RuleRow) {
    setEditingId(rule.id)
    setEditState({ keyword: rule.keyword, category_id: rule.category_id, priority: rule.priority })
  }

  async function saveEdit(id: string) {
    await onEdit(id, editState)
    setEditingId(null)
  }

  async function handleAdd() {
    if (!addState.keyword.trim() || !addState.category_id) return
    await onAdd(addState)
    setAddState({ keyword: '', category_id: categories[0]?.id ?? '', priority: 100 })
    setShowAddForm(false)
  }

  return (
    <div className="space-y-3">
      <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
        Rules are checked in priority order (lowest number first). Use this to ensure
        more specific keywords like "m&amp;s food" (priority 290) match before generic
        "m&amp;s" (priority 401).
      </p>

      {rules.map((rule) => (
        <div
          key={rule.id}
          className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          {editingId === rule.id ? (
            /* ── Inline Edit ─────────────────────────────────── */
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="text"
                value={editState.keyword}
                onChange={(e) => setEditState((s) => ({ ...s, keyword: e.target.value }))}
                placeholder="Keyword"
                className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <select
                value={editState.category_id}
                onChange={(e) => setEditState((s) => ({ ...s, category_id: e.target.value }))}
                className="rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={editState.priority}
                onChange={(e) => setEditState((s) => ({ ...s, priority: Number(e.target.value) }))}
                className="w-24 rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Priority"
              />
              <div className="flex gap-1">
                <button
                  onClick={() => saveEdit(rule.id)}
                  className="rounded-md bg-primary p-1.5 text-primary-foreground hover:opacity-90"
                  aria-label="Save"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setEditingId(null)}
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
              <div className="flex flex-1 items-center gap-2 text-sm">
                <span className="rounded bg-muted px-2 py-0.5 font-mono text-card-foreground">
                  {rule.keyword}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium text-card-foreground">
                  {categoryName(categories, rule.category_id)}
                </span>
                <span className="text-xs text-muted-foreground">(priority {rule.priority})</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => startEdit(rule)}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Edit rule"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDelete(rule.id)}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Delete rule"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </div>
      ))}

      {/* ── Add Rule Form ──────────────────────────────────────────── */}
      {showAddForm ? (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center">
          <input
            type="text"
            value={addState.keyword}
            onChange={(e) => setAddState((s) => ({ ...s, keyword: e.target.value }))}
            placeholder="Keyword"
            className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <select
            value={addState.category_id}
            onChange={(e) => setAddState((s) => ({ ...s, category_id: e.target.value }))}
            className="rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={addState.priority}
            onChange={(e) => setAddState((s) => ({ ...s, priority: Number(e.target.value) }))}
            className="w-24 rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Priority"
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
            setAddState({ keyword: '', category_id: categories[0]?.id ?? '', priority: 100 })
            setShowAddForm(true)
          }}
          className="w-full rounded-lg border border-dashed border-border bg-card py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          + Add Rule
        </button>
      )}
    </div>
  )
}
