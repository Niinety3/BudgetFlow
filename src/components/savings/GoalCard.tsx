import { Pencil, Trash2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Goal {
  id: string
  name: string
  target_amount: number
  saved_amount: number
}

interface GoalCardProps {
  goal: Goal
  onEdit: (goal: Goal) => void
  onDelete: (id: string) => void
}

export function GoalCard({ goal, onEdit, onDelete }: GoalCardProps) {
  const remaining = goal.target_amount - goal.saved_amount
  const percentage = goal.target_amount > 0
    ? Math.min(Math.round((goal.saved_amount / goal.target_amount) * 100), 100)
    : 0

  return (
    <div className="rounded-lg bg-card border border-border p-4">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold">{goal.name}</h3>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onEdit(goal)}
            className="rounded p-1 hover:bg-muted"
          >
            <Pencil className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(goal.id)}
            className="rounded p-1 hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </button>
        </div>
      </div>

      <div className="mb-2 h-3 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-success transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex justify-between text-sm">
        <span>
          {formatCurrency(goal.saved_amount)} / {formatCurrency(goal.target_amount)}
        </span>
        <span className="font-medium">{percentage}%</span>
      </div>

      <p className="mt-1 text-sm text-muted-foreground">
        {remaining > 0
          ? `${formatCurrency(remaining)} remaining`
          : 'Goal reached!'}
      </p>
    </div>
  )
}
