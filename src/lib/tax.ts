export interface TaxInput {
  annualProfit: number
  personalAllowance: number  // 29500
  standardBand: number       // 13000
  standardRate: number       // 0.10
  higherRate: number         // 0.21
}

export interface TaxResult {
  taxableIncome: number
  standardRateTax: number
  higherRateTax: number
  totalAnnualTax: number
  monthlySetAside: number
}

export function calculateIoMTax(input: TaxInput): TaxResult {
  const { annualProfit, personalAllowance, standardBand, standardRate, higherRate } = input

  const taxableIncome = Math.max(annualProfit - personalAllowance, 0)
  const standardRateTax = Math.min(taxableIncome, standardBand) * standardRate
  const higherRateTax = Math.max(taxableIncome - standardBand, 0) * higherRate
  const totalAnnualTax = standardRateTax + higherRateTax
  const monthlySetAside = Math.round((totalAnnualTax / 12) * 100) / 100

  return {
    taxableIncome,
    standardRateTax,
    higherRateTax,
    totalAnnualTax,
    monthlySetAside,
  }
}
