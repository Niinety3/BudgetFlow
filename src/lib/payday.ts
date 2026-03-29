export interface PayDayInput {
  monthlyTakeHome: number     // 4532.50
  monthlyTaxSetAside: number  // from tax calculator
  savingsPct: number          // 10 (percentage, not decimal)
  currentRent: number         // 975
  futureRent: number          // 1600
  fixedBills: number          // sum of fixed monthly bills (electric, broadband, etc.)
}

export interface PayDayResult {
  grossPay: number
  taxSetAside: number
  afterTax: number
  savingsAmount: number       // savingsPct% of afterTax
  rentGap: number             // max(futureRent - currentRent, 0)
  currentRent: number         // fixed monthly rent
  fixedBills: number          // total fixed bills
  totalDeductions: number     // tax + savings + rentGap + currentRent + fixedBills
  leftToLiveOn: number        // grossPay - totalDeductions
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export function calculatePayDay(input: PayDayInput): PayDayResult {
  const { monthlyTakeHome, monthlyTaxSetAside, savingsPct, currentRent, futureRent, fixedBills } = input

  const grossPay = round2(monthlyTakeHome)
  const taxSetAside = round2(monthlyTaxSetAside)
  const afterTax = round2(grossPay - taxSetAside)
  const savingsAmount = round2(afterTax * (savingsPct / 100))
  const rentGap = round2(Math.max(futureRent - currentRent, 0))
  const totalDeductions = round2(taxSetAside + savingsAmount + rentGap + currentRent + fixedBills)
  const leftToLiveOn = round2(grossPay - totalDeductions)

  return {
    grossPay,
    taxSetAside,
    afterTax,
    savingsAmount,
    rentGap,
    currentRent: round2(currentRent),
    fixedBills: round2(fixedBills),
    totalDeductions,
    leftToLiveOn,
  }
}
