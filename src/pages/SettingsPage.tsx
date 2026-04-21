import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { useSettings } from '@/hooks/useSettings'
import { useHousehold } from '@/hooks/useHousehold'
import { useCategories } from '@/hooks/useCategories'
import { getCurrentTaxYear, getTaxYearDateRange } from '@/lib/tax-year'
import { calculateIoMTax } from '@/lib/tax'
import { calculatePayDay } from '@/lib/payday'
import { formatCurrency, cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'

interface SettingsFormValues {
  annual_profit: number
  monthly_takehome: number
  current_rent: number
  future_rent: number
  savings_pct: number
  tax_personal_allowance: number
  tax_standard_band: number
  tax_standard_rate: number
  tax_higher_rate: number
}

const defaultValues: SettingsFormValues = {
  annual_profit: 0,
  monthly_takehome: 0,
  current_rent: 0,
  future_rent: 0,
  savings_pct: 10,
  tax_personal_allowance: 29500,
  tax_standard_band: 13000,
  tax_standard_rate: 0.1,
  tax_higher_rate: 0.21,
}

function CurrencyInput({
  label,
  name,
  register,
  prefix = '£',
}: {
  label: string
  name: keyof SettingsFormValues
  register: ReturnType<typeof useForm<SettingsFormValues>>['register']
  prefix?: string
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          {prefix}
        </span>
        <input
          id={name}
          type="number"
          step="any"
          {...register(name, { valueAsNumber: true })}
          className="w-full rounded-lg border border-input bg-background py-2 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
    </div>
  )
}

function PercentInput({
  label,
  name,
  register,
}: {
  label: string
  name: keyof SettingsFormValues
  register: ReturnType<typeof useForm<SettingsFormValues>>['register']
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          id={name}
          type="number"
          step="any"
          {...register(name, { valueAsNumber: true })}
          className="w-full rounded-lg border border-input bg-background py-2 pl-3 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          %
        </span>
      </div>
    </div>
  )
}

function PayDaySummary({ values, fixedBills }: { values: SettingsFormValues; fixedBills: { name: string; amount: number }[] }) {
  const taxResult = calculateIoMTax({
    annualProfit: values.annual_profit,
    personalAllowance: values.tax_personal_allowance,
    standardBand: values.tax_standard_band,
    standardRate: values.tax_standard_rate,
    higherRate: values.tax_higher_rate,
  })

  const fixedBillsTotal = fixedBills.reduce(
    (sum, b) => sum + b.amount, 0,
  )

  const payResult = calculatePayDay({
    monthlyTakeHome: values.monthly_takehome,
    monthlyTaxSetAside: taxResult.monthlySetAside,
    savingsPct: values.savings_pct,
    currentRent: values.current_rent,
    futureRent: values.future_rent,
    fixedBills: fixedBillsTotal,
  })

  const items = [
    { label: 'Tax set-aside', value: payResult.taxSetAside },
    { label: 'Savings', value: payResult.savingsAmount },
    { label: 'Rent gap', value: payResult.rentGap },
    { label: 'Current rent', value: payResult.currentRent },
    { label: 'Fixed bills', value: payResult.fixedBills },
    { label: 'Total deductions', value: payResult.totalDeductions },
  ]

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-card-foreground">Pay Day Summary</h3>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{item.label}</span>
            <span className="text-sm font-medium text-card-foreground">
              {formatCurrency(item.value)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-lg bg-success/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-success">Left to live on</span>
          <span className="text-lg font-bold text-success">
            {formatCurrency(payResult.leftToLiveOn)}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const { settings, updateSettings, loading, saving } = useSettings()
  const { householdId } = useHousehold()
  const { categories } = useCategories()
  const queryClient = useQueryClient()
  const taxYear = getCurrentTaxYear()

  const { register, handleSubmit, reset, control } = useForm<SettingsFormValues>({
    defaultValues,
  })

  const [bills, setBills] = useState<{ name: string; amount: number }[]>([])
  const [newBillName, setNewBillName] = useState('')
  const [newBillAmount, setNewBillAmount] = useState('')
  const [showRecalcPrompt, setShowRecalcPrompt] = useState(false)
  const [recalculating, setRecalculating] = useState(false)

  // Populate form when settings load
  useEffect(() => {
    if (settings) {
      setBills(settings.fixed_bills ?? [])
      reset({
        annual_profit: settings.annual_profit,
        monthly_takehome: settings.monthly_takehome,
        current_rent: settings.current_rent,
        future_rent: settings.future_rent,
        savings_pct: settings.savings_pct,
        tax_personal_allowance: settings.tax_personal_allowance,
        tax_standard_band: settings.tax_standard_band,
        tax_standard_rate: settings.tax_standard_rate,
        tax_higher_rate: settings.tax_higher_rate,
      })
    }
  }, [settings, reset])

  const watchedValues = useWatch({ control, defaultValue: defaultValues })

  const onSubmit = async (data: SettingsFormValues) => {
    await updateSettings({ ...data, fixed_bills: bills } as Record<string, unknown>)
    setShowRecalcPrompt(true)
  }

  async function recalculateAllMonths() {
    if (!householdId || !settings) return
    setRecalculating(true)

    try {
      const PAYDAY_EXCLUDED = ['Rent / Mortgage', 'Utilities', 'Annual Costs', 'Tax']
      const FIXED_DISCRETIONARY = ['Subscriptions', 'Services', 'Finance', 'Insurance']

      const flexCats = categories.filter(
        (c) => c.is_budget_category && !PAYDAY_EXCLUDED.includes(c.name) && !FIXED_DISCRETIONARY.includes(c.name),
      )

      // Get current form values for pay-day calc
      const vals = watchedValues as SettingsFormValues
      const taxResult = calculateIoMTax({
        annualProfit: vals.annual_profit,
        personalAllowance: vals.tax_personal_allowance,
        standardBand: vals.tax_standard_band,
        standardRate: vals.tax_standard_rate,
        higherRate: vals.tax_higher_rate,
      })
      const billsTotal = bills.reduce((s, b) => s + b.amount, 0)
      const payDay = calculatePayDay({
        monthlyTakeHome: vals.monthly_takehome,
        monthlyTaxSetAside: taxResult.monthlySetAside,
        savingsPct: vals.savings_pct,
        currentRent: vals.current_rent,
        futureRent: vals.future_rent,
        fixedBills: billsTotal,
      })

      // Get averages from all transactions (paginated)
      const { start, end } = getTaxYearDateRange(taxYear)
      const allTxns: { category_id: string; amount: number; date: string }[] = []
      let offset = 0
      while (true) {
        const { data: page } = await supabase
          .from('transactions')
          .select('category_id, amount, date')
          .eq('household_id', householdId)
          .gte('date', start.toISOString().slice(0, 10))
          .lte('date', end.toISOString().slice(0, 10))
          .range(offset, offset + 999)
        if (!page || page.length === 0) break
        allTxns.push(...page)
        if (page.length < 1000) break
        offset += 1000
      }

      const months = new Set(allTxns.map((t) => t.date?.slice(0, 7)))
      const monthCount = months.size || 1

      // Avg per flex category
      const totalByCat: Record<string, number> = {}
      for (const t of allTxns) {
        if (t.category_id) totalByCat[t.category_id] = (totalByCat[t.category_id] ?? 0) + Number(t.amount)
      }

      // Fixed discretionary expected
      const fixedCats = categories.filter((c) => FIXED_DISCRETIONARY.includes(c.name))
      const fixedExpected = fixedCats.reduce((s, c) => s + ((totalByCat[c.id] ?? 0) / monthCount), 0)
      const flexBudget = Math.max(payDay.leftToLiveOn - fixedExpected, 0)

      const flexAvgTotal = flexCats.reduce((s, c) => s + ((totalByCat[c.id] ?? 0) / monthCount), 0)
      const scale = flexAvgTotal > 0 ? flexBudget / flexAvgTotal : 0

      // Delete all budget limits for current tax year
      await supabase
        .from('budget_limits')
        .delete()
        .eq('household_id', householdId)
        .eq('tax_year', taxYear)

      // Insert for each month that has data
      const inserts: { household_id: string; category_id: string; tax_year: number; month: number; amount: number }[] = []
      for (const monthStr of months) {
        const m = parseInt(monthStr.slice(5, 7), 10)
        for (const cat of flexCats) {
          const avg = (totalByCat[cat.id] ?? 0) / monthCount
          if (avg > 0 && scale > 0) {
            inserts.push({
              household_id: householdId,
              category_id: cat.id,
              tax_year: taxYear,
              month: m,
              amount: Math.round(avg * scale),
            })
          }
        }
      }

      if (inserts.length > 0) {
        // Insert in batches of 500
        for (let i = 0; i < inserts.length; i += 500) {
          await supabase.from('budget_limits').insert(inserts.slice(i, i + 500))
        }
      }

      queryClient.invalidateQueries({ queryKey: ['budget-limits'] })
      queryClient.invalidateQueries({ queryKey: ['ytd-summary'] })
    } catch (err) {
      console.error('Recalculate error:', err)
    } finally {
      setRecalculating(false)
      setShowRecalcPrompt(false)
    }
  }

  function addBill() {
    if (!newBillName || !newBillAmount) return
    setBills([...bills, { name: newBillName, amount: parseFloat(newBillAmount) }])
    setNewBillName('')
    setNewBillAmount('')
  }

  function removeBill(index: number) {
    setBills(bills.filter((_, i) => i !== index))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-sm text-muted-foreground">Loading settings...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Settings</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Income & Tax */}
          <section className="space-y-4 rounded-xl border border-border bg-card p-5">
            <h2 className="text-base font-semibold text-card-foreground">Income &amp; Tax</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <CurrencyInput label="Gross Income" name="annual_profit" register={register} />
              <CurrencyInput label="Monthly Take-Home" name="monthly_takehome" register={register} />
            </div>
          </section>

          {/* Rent */}
          <section className="space-y-4 rounded-xl border border-border bg-card p-5">
            <h2 className="text-base font-semibold text-card-foreground">Rent</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <CurrencyInput label="Current Rent" name="current_rent" register={register} />
              <CurrencyInput label="Future Rent" name="future_rent" register={register} />
            </div>
          </section>

          {/* Savings */}
          <section className="space-y-4 rounded-xl border border-border bg-card p-5">
            <h2 className="text-base font-semibold text-card-foreground">Savings</h2>
            <div className="max-w-xs">
              <PercentInput label="Savings %" name="savings_pct" register={register} />
            </div>
          </section>

          {/* Fixed Bills */}
          <section className="space-y-4 rounded-xl border border-border bg-card p-5">
            <h2 className="text-base font-semibold text-card-foreground">Fixed Bills</h2>
            <p className="text-xs text-muted-foreground">
              Consistent monthly costs deducted before your discretionary budget.
            </p>
            {bills.map((bill, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="flex-1 text-sm">{bill.name}</span>
                <span className="text-sm font-medium">{formatCurrency(bill.amount)}</span>
                <button
                  type="button"
                  onClick={() => removeBill(i)}
                  className="rounded p-1 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Bill name"
                value={newBillName}
                onChange={(e) => setNewBillName(e.target.value)}
                className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
              <div className="relative w-28">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">£</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  value={newBillAmount}
                  onChange={(e) => setNewBillAmount(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background py-2 pl-8 pr-3 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={addBill}
                className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <span className="text-sm font-medium">Total</span>
              <span className="text-sm font-semibold">
                {formatCurrency(bills.reduce((sum, b) => sum + b.amount, 0))}
              </span>
            </div>
          </section>

          {/* Tax Rates */}
          <section className="space-y-4 rounded-xl border border-border bg-card p-5">
            <h2 className="text-base font-semibold text-card-foreground">Tax Rates</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <CurrencyInput
                label="Personal Allowance"
                name="tax_personal_allowance"
                register={register}
              />
              <CurrencyInput
                label="Standard Band"
                name="tax_standard_band"
                register={register}
              />
              <PercentInput label="Standard Rate" name="tax_standard_rate" register={register} />
              <PercentInput label="Higher Rate" name="tax_higher_rate" register={register} />
            </div>
          </section>

          <button
            type="submit"
            disabled={saving}
            className={cn(
              'rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-opacity',
              saving ? 'cursor-not-allowed opacity-60' : 'hover:opacity-90'
            )}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>

          {/* Recalculate prompt */}
          {showRecalcPrompt && (
            <div className="rounded-lg border border-primary/50 bg-primary/10 p-4 space-y-2">
              <p className="text-sm font-medium">Settings saved. Recalculate all budgets for {taxYear}/{String(taxYear + 1).slice(2)}?</p>
              <p className="text-xs text-muted-foreground">This will update all monthly budgets based on your new settings.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={recalculateAllMonths}
                  disabled={recalculating}
                  className={cn(
                    'rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground',
                    recalculating ? 'opacity-50' : 'hover:bg-primary/90',
                  )}
                >
                  {recalculating ? 'Recalculating...' : 'Yes, recalculate all'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRecalcPrompt(false)}
                  className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
                >
                  No, keep current budgets
                </button>
              </div>
            </div>
          )}
        </form>

        {/* Live summary */}
        <div className="lg:sticky lg:top-6 lg:self-start space-y-6">
          <PayDaySummary values={watchedValues as SettingsFormValues} fixedBills={settings?.fixed_bills ?? []} />

          {/* Auto-Import Settings */}
          {settings?.webhook_api_key && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-card-foreground">Auto-Import (Android App)</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground">Webhook API Key</label>
                  <div className="flex gap-2 mt-1">
                    <input
                      readOnly
                      value={settings.webhook_api_key}
                      className="flex-1 rounded-lg border border-input bg-muted px-3 py-2 text-xs font-mono text-foreground"
                    />
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(settings.webhook_api_key!)}
                      className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter this key in the BudgetFlow Notifier Android app to enable automatic transaction capture from Revolut notifications.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
