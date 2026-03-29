import Papa from 'papaparse'
import type { ParseResult, SkippedTransaction, PotentialRefund } from './types'

export function parsePayPalCSV(csvText: string): ParseResult {
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
    const gross = parseFloat((row['Gross'] ?? row['Amount'] ?? '0').replace(/,/g, ''))
    if (isNaN(gross)) continue

    const rawDate = (row['Date'] ?? '').trim()
    const date = parsePayPalDate(rawDate)
    const name = (row['Name'] ?? '').trim()
    const description = name || (row['Description'] ?? row['Subject'] ?? '').trim()
    const type = (row['Type'] ?? '').trim().toLowerCase()
    const currency = (row['Currency'] ?? '').trim().toUpperCase()

    // Skip non-GBP transactions
    if (currency && currency !== 'GBP') {
      internalSkipped++
      skippedTransactions.push({ date, description, amount: Math.abs(gross), reason: 'internal' })
      continue
    }

    // Skip internal PayPal operations
    if (
      type.includes('transfer') ||
      type.includes('withdraw') ||
      type.includes('bank deposit') ||
      type.includes('currency conversion') ||
      type.includes('general credit card deposit')
    ) {
      internalSkipped++
      skippedTransactions.push({ date, description, amount: Math.abs(gross), reason: 'internal' })
      continue
    }

    // Positive = incoming money
    if (gross >= 0) {
      const isLikelyRefund = type.includes('refund') || type.includes('reversal') ||
        (description && !type.includes('transfer') && !type.includes('withdraw') && gross < 500)
      if (isLikelyRefund && description) {
        potentialRefunds.push({ date, description, amount: gross, source: 'paypal' })
      }
      incomeSkipped++
      skippedTransactions.push({ date, description, amount: gross, reason: 'income' })
      continue
    }

    // Skip if no description
    if (!description) continue

    transactions.push({
      date,
      description,
      amount: Math.abs(gross),
      source: 'paypal',
    })
  }

  return { transactions, incomeSkipped, internalSkipped, skippedTransactions, potentialRefunds }
}

function parsePayPalDate(raw: string): string {
  // DD/MM/YYYY format
  const match1 = raw.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (match1) return `${match1[3]}-${match1[2]}-${match1[1]}`

  // MM/DD/YYYY format (US PayPal)
  const match2 = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (match2) {
    const m = match2[1].padStart(2, '0')
    const d = match2[2].padStart(2, '0')
    return `${match2[3]}-${m}-${d}`
  }

  // YYYY-MM-DD already
  const match3 = raw.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (match3) return `${match3[1]}-${match3[2]}-${match3[3]}`

  return raw.slice(0, 10)
}
