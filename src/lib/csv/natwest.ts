import Papa from 'papaparse'
import type { ParseResult, SkippedTransaction, PotentialRefund } from './types'

export function parseNatWestCSV(csvText: string): ParseResult {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  })

  const transactions: ParseResult['transactions'] = []
  const skippedTransactions: SkippedTransaction[] = []
  const potentialRefunds: PotentialRefund[] = []
  let incomeSkipped = 0
  let internalSkipped = 0

  for (const row of parsed.data) {
    const value = parseFloat(row['Value'] ?? '0')
    if (isNaN(value)) continue

    const rawDate = (row['Date'] ?? '').trim()
    const date = parseNatWestDate(rawDate)
    const description = (row['Description'] ?? '').trim()

    if (value >= 0) {
      // Check if this looks like a refund
      const descLowerCheck = description.toLowerCase()
      const isLikelyRefund = description &&
        !descLowerCheck.includes('salary') && !descLowerCheck.includes('wages') &&
        !descLowerCheck.includes('transfer') && !descLowerCheck.includes('interest') &&
        value < 500
      if (isLikelyRefund) {
        potentialRefunds.push({ date, description, amount: value, source: 'natwest' })
      }
      incomeSkipped++
      skippedTransactions.push({ date, description, amount: value, reason: 'income' })
      continue
    }

    // Skip PayPal payments (imported separately via PayPal CSV with actual merchant names)
    const descLower = description.toLowerCase()
    if (descLower.includes('paypal payment') || descLower.includes('paypal *')) {
      internalSkipped++
      skippedTransactions.push({ date, description, amount: Math.abs(value), reason: 'internal' })
      continue
    }

    transactions.push({
      date,
      description,
      amount: Math.abs(value),
      source: 'natwest',
    })
  }

  return { transactions, incomeSkipped, internalSkipped, skippedTransactions, potentialRefunds }
}

function parseNatWestDate(raw: string): string {
  const match = raw.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (match) return `${match[3]}-${match[2]}-${match[1]}`
  return raw
}
