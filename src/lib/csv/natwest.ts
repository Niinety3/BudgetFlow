import Papa from 'papaparse'
import type { ParseResult, SkippedTransaction } from './types'

export function parseNatWestCSV(csvText: string): ParseResult {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  })

  const transactions: ParseResult['transactions'] = []
  const skippedTransactions: SkippedTransaction[] = []
  let incomeSkipped = 0

  for (const row of parsed.data) {
    const value = parseFloat(row['Value'] ?? '0')
    if (isNaN(value)) continue

    const rawDate = (row['Date'] ?? '').trim()
    const date = parseNatWestDate(rawDate)
    const description = (row['Description'] ?? '').trim()

    if (value >= 0) {
      incomeSkipped++
      skippedTransactions.push({ date, description, amount: value, reason: 'income' })
      continue
    }

    transactions.push({
      date,
      description,
      amount: Math.abs(value),
      source: 'natwest',
    })
  }

  return { transactions, incomeSkipped, internalSkipped: 0, skippedTransactions }
}

function parseNatWestDate(raw: string): string {
  const match = raw.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (match) return `${match[3]}-${match[2]}-${match[1]}`
  return raw
}
