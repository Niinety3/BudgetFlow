import { formatCurrency } from '@/lib/utils'
import type { PayDayResult } from '@/lib/payday'

interface PayDayBreakdownProps {
  result: PayDayResult
}

export default function PayDayBreakdown({ result }: PayDayBreakdownProps) {
  const lines = [
    { label: '1. Tax set-aside', value: result.taxSetAside },
    { label: '2. Savings (% of after-tax)', value: result.savingsAmount },
    { label: '3. Rent gap', value: result.rentGap },
    { label: '4. Current rent', value: result.currentRent },
  ]

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-card-foreground">Pay Day Breakdown</h3>

      {/* Gross pay */}
      <div className="mb-3 flex items-center justify-between border-b border-border pb-3">
        <span className="text-sm text-muted-foreground">Monthly take-home (after NI)</span>
        <span className="text-base font-semibold text-card-foreground">
          {formatCurrency(result.grossPay)}
        </span>
      </div>

      {/* Deductions */}
      <div className="space-y-2">
        {lines.map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="text-sm text-card-foreground">
              - {formatCurrency(value)}
            </span>
          </div>
        ))}
      </div>

      {/* Total deductions */}
      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <span className="text-sm font-medium text-muted-foreground">Total deductions</span>
        <span className="text-sm font-semibold text-card-foreground">
          {formatCurrency(result.totalDeductions)}
        </span>
      </div>

      {/* Left to live on */}
      <div className="mt-4 rounded-lg bg-success/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-success">What's left to live on</span>
          <span className="text-xl font-bold text-success">
            {formatCurrency(result.leftToLiveOn)}
          </span>
        </div>
      </div>
    </div>
  )
}
