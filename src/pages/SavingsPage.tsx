import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { GoalCard } from '@/components/savings/GoalCard'
import { useSavingsGoals } from '@/hooks/useSavingsGoals'
import { useHousehold } from '@/hooks/useHousehold'

export default function SavingsPage() {
  const { householdId } = useHousehold()
  const { goals, addGoal, updateGoal, deleteGoal } =
    useSavingsGoals(householdId)

  const [showForm, setShowForm] = useState(false)
  const [editingGoal, setEditingGoal] = useState<{
    id?: string
    name: string
    target_amount: string
    saved_amount: string
  } | null>(null)

  function openAdd() {
    setEditingGoal({ name: '', target_amount: '', saved_amount: '0' })
    setShowForm(true)
  }

  function openEdit(goal: {
    id: string
    name: string
    target_amount: number
    saved_amount: number
  }) {
    setEditingGoal({
      id: goal.id,
      name: goal.name,
      target_amount: goal.target_amount.toString(),
      saved_amount: goal.saved_amount.toString(),
    })
    setShowForm(true)
  }

  async function handleSave() {
    if (!editingGoal || !editingGoal.name || !editingGoal.target_amount) return

    if (editingGoal.id) {
      await updateGoal({
        id: editingGoal.id,
        name: editingGoal.name,
        target_amount: parseFloat(editingGoal.target_amount),
        saved_amount: parseFloat(editingGoal.saved_amount || '0'),
      })
    } else {
      await addGoal({
        name: editingGoal.name,
        target_amount: parseFloat(editingGoal.target_amount),
        saved_amount: parseFloat(editingGoal.saved_amount || '0'),
      })
    }

    setEditingGoal(null)
    setShowForm(false)
  }

  async function handleDelete(id: string) {
    if (confirm('Delete this savings goal?')) {
      await deleteGoal(id)
    }
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Savings Goals</h1>
        <button
          type="button"
          onClick={() => (showForm ? setShowForm(false) : openAdd())}
          className="flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? 'Cancel' : 'Add Goal'}
        </button>
      </div>

      {showForm && editingGoal && (
        <div className="mb-6 rounded-lg bg-card border border-border p-4 space-y-3">
          <input
            type="text"
            placeholder="Goal name"
            value={editingGoal.name}
            onChange={(e) =>
              setEditingGoal({ ...editingGoal, name: e.target.value })
            }
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Target</label>
              <input
                type="number"
                step="0.01"
                placeholder="Target amount"
                value={editingGoal.target_amount}
                onChange={(e) =>
                  setEditingGoal({
                    ...editingGoal,
                    target_amount: e.target.value,
                  })
                }
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Saved so far</label>
              <input
                type="number"
                step="0.01"
                placeholder="Saved amount"
                value={editingGoal.saved_amount}
                onChange={(e) =>
                  setEditingGoal({
                    ...editingGoal,
                    saved_amount: e.target.value,
                  })
                }
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleSave}
            className="w-full rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90"
          >
            {editingGoal.id ? 'Update Goal' : 'Add Goal'}
          </button>
        </div>
      )}

      {goals.length === 0 && !showForm ? (
        <div className="rounded-lg bg-card border border-border p-8 text-center text-muted-foreground">
          <p className="mb-2">No savings goals yet.</p>
          <p className="text-sm">
            Add a goal to start tracking your savings progress.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
