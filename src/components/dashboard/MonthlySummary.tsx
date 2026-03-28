import { formatCurrency, cn } from '@/lib/utils'

interface MonthlySummaryProps {
  leftToLiveOn: number
  totalSpent: number
}

export function MonthlySummary({ leftToLiveOn, totalSpent }: MonthlySummaryProps) {
  const remaining = leftToLiveOn - totalSpent
  const percentSpent =
    leftToLiveOn > 0 ? Math.round((totalSpent / leftToLiveOn) * 100) : 0

  const color =
    percentSpent > 100
      ? 'text-destructive'
      : percentSpent > 80
        ? 'text-warning'
        : 'text-success'

  return (
    <div className="rounded-lg bg-card border border-border p-4">
      <h3 className="font-semibold mb-3">Monthly Summary</h3>

      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Budget (left to live on)</span>
          <span>{formatCurrency(leftToLiveOn)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total spent</span>
          <span>{formatCurrency(totalSpent)}</span>
        </div>

        <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              percentSpent > 100
                ? 'bg-destructive'
                : percentSpent > 80
                  ? 'bg-warning'
                  : 'bg-success',
            )}
            style={{ width: `${Math.min(percentSpent, 100)}%` }}
          />
        </div>

        <div className="flex justify-between items-baseline">
          <span className={cn('text-2xl font-bold', color)}>
            {percentSpent}% spent
          </span>
          <span
            className={cn(
              'text-sm font-medium',
              remaining >= 0 ? 'text-success' : 'text-destructive',
            )}
          >
            {formatCurrency(remaining)} remaining
          </span>
        </div>
      </div>
    </div>
  )
}
