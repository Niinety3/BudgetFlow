import Papa from 'papaparse'
import type { ParseResult } from './types'

export function parseRevolutCSV(csvText: string): ParseResult {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  })

  const transactions: ParseResult['transactions'] = []
  let incomeSkipped = 0
  let internalSkipped = 0

  for (const row of parsed.data) {
    const state = (row['State'] ?? '').trim().toLowerCase()
    if (state !== 'completed') continue

    const type = (row['Type'] ?? '').trim().toLowerCase()
    if (type === 'topup' || type === 'exchange') {
      internalSkipped++
      continue
    }

    const description = (row['Description'] ?? '').trim()
    const descLower = description.toLowerCase()

    // Skip Revolut internal operations
    if (
      descLower.startsWith('pocket') ||
      descLower.includes('savings vault') ||
      descLower.includes('round up') ||
      (type === 'transfer' && (descLower.includes('to ') && descLower.includes('account')))
    ) {
      internalSkipped++
      continue
    }

    const amount = parseFloat(row['Amount'] ?? '0')
    if (isNaN(amount)) continue

    if (amount >= 0) {
      incomeSkipped++
      continue
    }

    const rawDate = (row['Started Date'] ?? row['Completed Date'] ?? '').trim()
    const date = parseRevolutDate(rawDate)

    transactions.push({
      date,
      description: (row['Description'] ?? '').trim(),
      amount: Math.abs(amount),
      source: 'revolut',
    })
  }

  return { transactions, incomeSkipped, internalSkipped }
}

function parseRevolutDate(raw: string): string {
  // Revolut dates can be "YYYY-MM-DD HH:MM:SS" or similar
  const match = raw.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (match) return `${match[1]}-${match[2]}-${match[3]}`

  // Try DD/MM/YYYY format
  const match2 = raw.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (match2) return `${match2[3]}-${match2[2]}-${match2[1]}`

  // Fallback: try Date constructor
  const d = new Date(raw)
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10)
  }

  return raw.slice(0, 10)
}
