import { formatCurrency } from '@/lib/utils'
import type { PayDayResult } from '@/lib/payday'

interface PayDayBreakdownProps {
  result: PayDayResult
}

export default function PayDayBreakdown({ result }: PayDayBreakdownProps) {
  const savingsTransfer = result.taxSetAside + result.savingsAmount + result.rentGap

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

      {/* Move to savings */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">1. Tax set-aside</span>
          <span className="text-sm text-card-foreground">- {formatCurrency(result.taxSetAside)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">2. Savings ({result.savingsAmount > 0 ? '% of after-tax' : '0%'})</span>
          <span className="text-sm text-card-foreground">- {formatCurrency(result.savingsAmount)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">3. Rent gap</span>
          <span className="text-sm text-card-foreground">- {formatCurrency(result.rentGap)}</span>
        </div>
      </div>

      {/* Transfer to savings callout */}
      <div className="mt-3 rounded-lg bg-primary/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-primary">Transfer to savings</span>
          <span className="text-lg font-bold text-primary">
            {formatCurrency(savingsTransfer)}
          </span>
        </div>
      </div>

      {/* Stays in current account */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">4. Current rent</span>
          <span className="text-sm text-card-foreground">- {formatCurrency(result.currentRent)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">5. Fixed bills</span>
          <span className="text-sm text-card-foreground">- {formatCurrency(result.fixedBills)}</span>
        </div>
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
