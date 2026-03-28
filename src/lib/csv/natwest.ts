import Papa from 'papaparse'
import type { ParseResult } from './types'

export function parseNatWestCSV(csvText: string): ParseResult {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  })

  const transactions: ParseResult['transactions'] = []
  let incomeSkipped = 0

  for (const row of parsed.data) {
    const value = parseFloat(row['Value'] ?? '0')
    if (isNaN(value)) continue

    if (value >= 0) {
      incomeSkipped++
      continue
    }

    const rawDate = (row['Date'] ?? '').trim()
    const date = parseNatWestDate(rawDate)

    transactions.push({
      date,
      description: (row['Description'] ?? '').trim(),
      amount: Math.abs(value),
      source: 'natwest',
    })
  }

  return { transactions, incomeSkipped, internalSkipped: 0 }
}

function parseNatWestDate(raw: string): string {
  // DD/MM/YYYY → YYYY-MM-DD
  const match = raw.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (match) return `${match[3]}-${match[2]}-${match[1]}`
  return raw
}
