import { useState } from 'react'
import { useSettings } from '@/hooks/useSettings'
import { useHousehold } from '@/hooks/useHousehold'
import { useBudgetLimits } from '@/hooks/useBudgetLimits'
import { useCategories } from '@/hooks/useCategories'
import { getCurrentTaxYear, getTaxYearDateRange } from '@/lib/tax-year'
import { calculateIoMTax } from '@/lib/tax'
import { calculatePayDay } from '@/lib/payday'
import { formatCurrency, cn } from '@/lib/utils'
import { TrendingDown, TrendingUp, Calculator, PiggyBank, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'

export default function PlannerPage() {
  const [activeTab, setActiveTab] = useState<'savings' | 'afford'>('savings')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Planner</h1>

      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('savings')}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'savings'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80',
          )}
        >
          <PiggyBank className="h-4 w-4" />
          Savings Guidance
        </button>
        <button
          onClick={() => setActiveTab('afford')}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'afford'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80',
          )}
        >
          <Calculator className="h-4 w-4" />
          Can I Afford It?
        </button>
      </div>

      {activeTab === 'savings' && <SavingsGuidance />}
      {activeTab === 'afford' && <AffordabilityCalculator />}
    </div>
  )
}

function SavingsGuidance() {
  const { householdId } = useHousehold()
  const { settings } = useSettings()
  const { categories } = useCategories()
  const taxYear = getCurrentTaxYear()
  const { start, end } = getTaxYearDateRange(taxYear)
  const { limits } = useBudgetLimits(taxYear, householdId)

  const excludedCategories = ['Rent / Mortgage', 'Utilities', 'Annual Costs', 'Tax', 'Special', 'Bank Transfers', 'Uncategorised']
  const budgetCategories = categories.filter(
    (c) => c.is_budget_category && !excludedCategories.includes(c.name),
  )

  // Fetch spending data with pagination
  const { data: spendingData } = useQuery({
    queryKey: ['planner-spending', householdId, taxYear],
    queryFn: async () => {
      if (!householdId) return null

      const startStr = start.toISOString().slice(0, 10)
      const endStr = end.toISOString().slice(0, 10)

      // Paginate to get all transactions
      const allTxns: { category_id: string; amount: number; date: string }[] = []
      let offset = 0
      while (true) {
        const { data: page } = await supabase
          .from('transactions')
          .select('category_id, amount, date')
          .eq('household_id', householdId)
          .gte('date', startStr)
          .lte('date', endStr)
          .range(offset, offset + 999)

        if (!page || page.length === 0) break
        allTxns.push(...(page as typeof allTxns))
        if (page.length < 1000) break
        offset += 1000
      }

      // Also get previous year
      const prevStart = new Date(taxYear - 1, 3, 6).toISOString().slice(0, 10)
      const prevEnd = new Date(taxYear, 3, 5).toISOString().slice(0, 10)
      const prevTxns: typeof allTxns = []
      offset = 0
      while (true) {
        const { data: page } = await supabase
          .from('transactions')
          .select('category_id, amount, date')
          .eq('household_id', householdId)
          .gte('date', prevStart)
          .lte('date', prevEnd)
          .range(offset, offset + 999)

        if (!page || page.length === 0) break
        prevTxns.push(...(page as typeof allTxns))
        if (page.length < 1000) break
        offset += 1000
      }

      return { current: allTxns, previous: prevTxns }
    },
    enabled: !!householdId,
  })

  if (!spendingData || !settings) {
    return <div className="text-sm text-muted-foreground">Loading spending data...</div>
  }

  const taxResult = calculateIoMTax({
    annualProfit: settings.annual_profit,
    personalAllowance: settings.tax_personal_allowance,
    standardBand: settings.tax_standard_band,
    standardRate: settings.tax_standard_rate,
    higherRate: settings.tax_higher_rate,
  })
  const fixedBillsTotal = (settings.fixed_bills ?? []).reduce(
    (sum: number, b: { amount: number }) => sum + b.amount, 0,
  )
  const payDay = calculatePayDay({
    monthlyTakeHome: settings.monthly_takehome,
    monthlyTaxSetAside: taxResult.monthlySetAside,
    savingsPct: settings.savings_pct,
    currentRent: settings.current_rent,
    futureRent: settings.future_rent,
    fixedBills: fixedBillsTotal,
  })

  // Current year spending by category
  const currentMonths = new Set(spendingData.current.map((t) => t.date?.slice(0, 7))).size || 1
  const currentByCategory: Record<string, number> = {}
  for (const t of spendingData.current) {
    if (t.category_id) {
      currentByCategory[t.category_id] = (currentByCategory[t.category_id] ?? 0) + Number(t.amount)
    }
  }

  // Previous year spending by category
  const prevMonths = new Set(spendingData.previous.map((t) => t.date?.slice(0, 7))).size || 1
  const prevByCategory: Record<string, number> = {}
  for (const t of spendingData.previous) {
    if (t.category_id) {
      prevByCategory[t.category_id] = (prevByCategory[t.category_id] ?? 0) + Number(t.amount)
    }
  }

  // Build insights
  const insights = budgetCategories
    .map((cat) => {
      const currentTotal = currentByCategory[cat.id] ?? 0
      const currentAvg = currentTotal / currentMonths
      const prevTotal = prevByCategory[cat.id] ?? 0
      const prevAvg = prevMonths > 0 ? prevTotal / prevMonths : 0
      const budget = limits.find((l) => l.category_id === cat.id)
      const monthlyBudget = budget ? Number(budget.amount) : 0
      const overBudget = monthlyBudget > 0 ? currentAvg - monthlyBudget : 0
      const trend = prevAvg > 0 ? ((currentAvg - prevAvg) / prevAvg) * 100 : 0

      return {
        name: cat.name,
        currentAvg,
        prevAvg,
        monthlyBudget,
        overBudget,
        trend,
        savingsPotential: overBudget > 0 ? overBudget : currentAvg * 0.1,
      }
    })
    .filter((i) => i.currentAvg > 0)
    .sort((a, b) => b.currentAvg - a.currentAvg)

  const totalMonthlySpend = insights.reduce((sum, i) => sum + i.currentAvg, 0)
  const totalOverBudget = insights.reduce((sum, i) => sum + Math.max(i.overBudget, 0), 0)
  const sparePerMonth = payDay.leftToLiveOn - totalMonthlySpend

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-card border border-border p-4">
          <p className="text-xs text-muted-foreground">Monthly discretionary spend</p>
          <p className="text-lg font-bold">{formatCurrency(totalMonthlySpend)}</p>
        </div>
        <div className={cn('rounded-lg border p-4', sparePerMonth >= 0 ? 'bg-success/10 border-success/30' : 'bg-destructive/10 border-destructive/30')}>
          <p className="text-xs text-muted-foreground">{sparePerMonth >= 0 ? 'Spare per month' : 'Over budget by'}</p>
          <p className={cn('text-lg font-bold', sparePerMonth >= 0 ? 'text-success' : 'text-destructive')}>
            {formatCurrency(Math.abs(sparePerMonth))}
          </p>
        </div>
      </div>

      {totalOverBudget > 0 && (
        <div className="rounded-lg bg-warning/10 border border-warning/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <p className="text-sm font-semibold">You're over budget by {formatCurrency(totalOverBudget)}/month</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Bringing these categories in line would save {formatCurrency(totalOverBudget * 12)}/year.
          </p>
        </div>
      )}

      {/* Category breakdown */}
      <div className="rounded-lg bg-card border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">Spending by Category</h3>
          <p className="text-xs text-muted-foreground">Monthly averages based on {currentMonths} month{currentMonths > 1 ? 's' : ''}</p>
        </div>
        <div className="divide-y divide-border">
          {insights.map((i) => (
            <div key={i.name} className="p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{i.name}</span>
                <span className="text-sm font-semibold">{formatCurrency(i.currentAvg)}/mo</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {i.monthlyBudget > 0 && (
                  <span className={i.overBudget > 0 ? 'text-destructive' : 'text-success'}>
                    {i.overBudget > 0 ? `${formatCurrency(i.overBudget)} over budget` : 'Within budget'}
                  </span>
                )}
                {i.prevAvg > 0 && (
                  <span className={cn('flex items-center gap-0.5', i.trend > 5 ? 'text-destructive' : i.trend < -5 ? 'text-success' : '')}>
                    {i.trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {Math.abs(Math.round(i.trend))}% vs last year
                  </span>
                )}
              </div>
              {i.overBudget > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Reducing to budget would save {formatCurrency(i.overBudget * 12)}/year
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Quick wins */}
      <div className="rounded-lg bg-card border border-border p-4">
        <h3 className="font-semibold mb-3">Quick Win Scenarios</h3>
        <div className="space-y-2 text-sm">
          {insights.slice(0, 3).map((i) => (
            <div key={i.name} className="flex justify-between">
              <span className="text-muted-foreground">Cut {i.name} by 10%</span>
              <span className="font-medium text-success">Save {formatCurrency(i.currentAvg * 0.1)}/mo ({formatCurrency(i.currentAvg * 0.1 * 12)}/yr)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function AffordabilityCalculator() {
  const { settings } = useSettings()
  const { householdId } = useHousehold()
  const taxYear = getCurrentTaxYear()
  const { start, end } = getTaxYearDateRange(taxYear)
  const { categories } = useCategories()

  const excludedCategories = ['Rent / Mortgage', 'Utilities', 'Annual Costs', 'Tax', 'Special', 'Bank Transfers', 'Uncategorised']

  const [itemName, setItemName] = useState('')
  const [price, setPrice] = useState('')
  const [financeMonthly, setFinanceMonthly] = useState('')
  const [financeTerm, setFinanceTerm] = useState('')
  const [result, setResult] = useState<{
    sparePerMonth: number
    canAffordOutright: boolean
    monthsToSave: number
    canAffordFinance: boolean
    financeTotal: number
    financeCostExtra: number
    remainingAfterFinance: number
  } | null>(null)

  // Get current spending
  const { data: totalSpend } = useQuery({
    queryKey: ['planner-total-spend', householdId, taxYear],
    queryFn: async () => {
      if (!householdId) return 0

      const startStr = start.toISOString().slice(0, 10)
      const endStr = end.toISOString().slice(0, 10)
      const budgetCatIds = categories
        .filter((c) => c.is_budget_category && !excludedCategories.includes(c.name))
        .map((c) => c.id)

      let total = 0
      let months = new Set<string>()
      let offset = 0
      while (true) {
        const { data: page } = await supabase
          .from('transactions')
          .select('category_id, amount, date')
          .eq('household_id', householdId)
          .gte('date', startStr)
          .lte('date', endStr)
          .range(offset, offset + 999)

        if (!page || page.length === 0) break
        for (const t of page) {
          months.add(t.date?.slice(0, 7) ?? '')
          if (t.category_id && budgetCatIds.includes(t.category_id)) {
            total += Number(t.amount)
          }
        }
        if (page.length < 1000) break
        offset += 1000
      }

      const monthCount = months.size || 1
      return total / monthCount
    },
    enabled: !!householdId && categories.length > 0,
  })

  function calculate() {
    if (!settings || totalSpend === undefined) return

    const taxResult = calculateIoMTax({
      annualProfit: settings.annual_profit,
      personalAllowance: settings.tax_personal_allowance,
      standardBand: settings.tax_standard_band,
      standardRate: settings.tax_standard_rate,
      higherRate: settings.tax_higher_rate,
    })
    const fixedBillsTotal = (settings.fixed_bills ?? []).reduce(
      (sum: number, b: { amount: number }) => sum + b.amount, 0,
    )
    const payDay = calculatePayDay({
      monthlyTakeHome: settings.monthly_takehome,
      monthlyTaxSetAside: taxResult.monthlySetAside,
      savingsPct: settings.savings_pct,
      currentRent: settings.current_rent,
      futureRent: settings.future_rent,
      fixedBills: fixedBillsTotal,
    })

    const sparePerMonth = payDay.leftToLiveOn - totalSpend
    const priceNum = parseFloat(price) || 0
    const monthlyNum = parseFloat(financeMonthly) || 0
    const termNum = parseInt(financeTerm) || 0

    const financeTotal = monthlyNum * termNum
    const financeCostExtra = financeTotal - priceNum
    const remainingAfterFinance = sparePerMonth - monthlyNum
    const monthsToSave = sparePerMonth > 0 ? Math.ceil(priceNum / sparePerMonth) : -1

    setResult({
      sparePerMonth,
      canAffordOutright: sparePerMonth > 0,
      monthsToSave,
      canAffordFinance: remainingAfterFinance > 0,
      financeTotal,
      financeCostExtra,
      remainingAfterFinance,
    })
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-card border border-border p-4 space-y-3">
        <h3 className="font-semibold">What do you want to buy?</h3>

        <input
          type="text"
          placeholder="Item name (e.g. Dishwasher)"
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
        />

        <div>
          <label className="text-xs text-muted-foreground">Price (outright)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">£</span>
            <input
              type="number"
              step="0.01"
              placeholder="400"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded border border-border bg-background py-2 pl-8 pr-3 text-sm"
            />
          </div>
        </div>

        <div className="border-t border-border pt-3">
          <p className="text-xs text-muted-foreground mb-2">Finance option (optional)</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Monthly payment</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">£</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="18"
                  value={financeMonthly}
                  onChange={(e) => setFinanceMonthly(e.target.value)}
                  className="w-full rounded border border-border bg-background py-2 pl-8 pr-3 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Term (months)</label>
              <input
                type="number"
                placeholder="24"
                value={financeTerm}
                onChange={(e) => setFinanceTerm(e.target.value)}
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        <button
          onClick={calculate}
          className="w-full rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90"
        >
          Can I afford it?
        </button>
      </div>

      {result && (
        <div className="space-y-3">
          {/* Spare money */}
          <div className={cn(
            'rounded-lg border p-4',
            result.sparePerMonth >= 0 ? 'bg-card border-border' : 'bg-destructive/10 border-destructive/30',
          )}>
            <p className="text-xs text-muted-foreground">Your monthly spare cash</p>
            <p className={cn('text-xl font-bold', result.sparePerMonth >= 0 ? 'text-foreground' : 'text-destructive')}>
              {formatCurrency(result.sparePerMonth)}
            </p>
            {result.sparePerMonth < 0 && (
              <p className="text-xs text-destructive mt-1">You're already over budget — no room for new purchases.</p>
            )}
          </div>

          {/* Outright */}
          <div className="rounded-lg bg-card border border-border p-4">
            <h4 className="font-semibold text-sm mb-2">Buy outright — {formatCurrency(parseFloat(price) || 0)}</h4>
            {result.canAffordOutright ? (
              <>
                <p className="text-sm text-success font-medium">
                  Save for {result.monthsToSave} month{result.monthsToSave > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  At {formatCurrency(result.sparePerMonth)}/month spare, you'd have enough by month {result.monthsToSave}.
                </p>
              </>
            ) : (
              <p className="text-sm text-destructive">Not affordable — no spare cash to save.</p>
            )}
          </div>

          {/* Finance */}
          {(parseFloat(financeMonthly) > 0) && (
            <div className={cn(
              'rounded-lg border p-4',
              result.canAffordFinance ? 'bg-card border-border' : 'bg-destructive/10 border-destructive/30',
            )}>
              <h4 className="font-semibold text-sm mb-2">
                Finance — {formatCurrency(parseFloat(financeMonthly))}/mo for {financeTerm} months
              </h4>
              {result.canAffordFinance ? (
                <>
                  <p className="text-sm text-success font-medium">Affordable</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    You'd have {formatCurrency(result.remainingAfterFinance)}/month spare after the payment.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-destructive font-medium">Not affordable</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    This would put you {formatCurrency(Math.abs(result.remainingAfterFinance))}/month over budget.
                  </p>
                </>
              )}
              <div className="mt-2 pt-2 border-t border-border space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Total finance cost</span>
                  <span>{formatCurrency(result.financeTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Extra paid vs outright</span>
                  <span className={result.financeCostExtra > 0 ? 'text-destructive' : ''}>
                    {result.financeCostExtra > 0 ? '+' : ''}{formatCurrency(result.financeCostExtra)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Verdict */}
          <div className={cn(
            'rounded-lg p-4 text-center',
            result.canAffordFinance || result.canAffordOutright ? 'bg-success/10' : 'bg-destructive/10',
          )}>
            <p className="font-semibold">
              {result.canAffordFinance && parseFloat(financeMonthly) > 0
                ? `Yes — you can afford ${itemName || 'this'} on finance with ${formatCurrency(result.remainingAfterFinance)} to spare`
                : result.canAffordOutright
                  ? `Yes — save for ${result.monthsToSave} month${result.monthsToSave > 1 ? 's' : ''} and buy ${itemName || 'it'} outright`
                  : `No — ${itemName || 'this'} isn't affordable right now`}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
