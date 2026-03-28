export interface PayDayInput {
  monthlyTakeHome: number     // 4532.50
  monthlyTaxSetAside: number  // from tax calculator
  savingsPct: number          // 10 (percentage, not decimal)
  currentRent: number         // 975
  futureRent: number          // 1600
}

export interface PayDayResult {
  grossPay: number
  taxSetAside: number
  afterTax: number
  savingsAmount: number       // savingsPct% of afterTax
  rentGap: number             // max(futureRent - currentRent, 0)
  totalToSavings: number      // tax + savings + rentGap
  leftToLiveOn: number        // grossPay - totalToSavings
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export function calculatePayDay(input: PayDayInput): PayDayResult {
  const { monthlyTakeHome, monthlyTaxSetAside, savingsPct, currentRent, futureRent } = input

  const grossPay = round2(monthlyTakeHome)
  const taxSetAside = round2(monthlyTaxSetAside)
  const afterTax = round2(grossPay - taxSetAside)
  const savingsAmount = round2(afterTax * (savingsPct / 100))
  const rentGap = round2(Math.max(futureRent - currentRent, 0))
  const totalToSavings = round2(taxSetAside + savingsAmount + rentGap)
  const leftToLiveOn = round2(grossPay - totalToSavings)

  return {
    grossPay,
    taxSetAside,
    afterTax,
    savingsAmount,
    rentGap,
    totalToSavings,
    leftToLiveOn,
  }
}
