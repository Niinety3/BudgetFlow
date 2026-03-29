import Papa from 'papaparse'
import type { ParseResult, SkippedTransaction } from './types'

export function parseRevolutCSV(csvText: string): ParseResult {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  })

  const transactions: ParseResult['transactions'] = []
  const skippedTransactions: SkippedTransaction[] = []
  let incomeSkipped = 0
  let internalSkipped = 0

  for (const row of parsed.data) {
    const state = (row['State'] ?? '').trim().toLowerCase()
    if (state !== 'completed') continue

    const rawDate = (row['Started Date'] ?? row['Completed Date'] ?? '').trim()
    const date = parseRevolutDate(rawDate)
    const description = (row['Description'] ?? '').trim()
    const amount = parseFloat(row['Amount'] ?? '0')
    if (isNaN(amount)) continue

    const type = (row['Type'] ?? '').trim().toLowerCase()
    const descLower = description.toLowerCase()

    if (type === 'topup' || type === 'exchange') {
      internalSkipped++
      skippedTransactions.push({ date, description, amount: Math.abs(amount), reason: 'internal' })
      continue
    }

    // Skip Revolut internal operations
    if (
      descLower.startsWith('pocket') ||
      descLower.startsWith('to pocket') ||
      descLower.startsWith('from pocket') ||
      descLower.includes('savings vault') ||
      descLower.includes('round up') ||
      descLower.includes('to gbp') ||
      descLower.includes('from gbp') ||
      (type === 'transfer' && (descLower.includes('to ') && descLower.includes('account')))
    ) {
      internalSkipped++
      skippedTransactions.push({ date, description, amount: Math.abs(amount), reason: 'internal' })
      continue
    }

    if (amount >= 0) {
      incomeSkipped++
      skippedTransactions.push({ date, description, amount, reason: 'income' })
      continue
    }

    transactions.push({
      date,
      description,
      amount: Math.abs(amount),
      source: 'revolut',
    })
  }

  return { transactions, incomeSkipped, internalSkipped, skippedTransactions }
}

function parseRevolutDate(raw: string): string {
  const match = raw.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (match) return `${match[1]}-${match[2]}-${match[3]}`

  const match2 = raw.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (match2) return `${match2[3]}-${match2[2]}-${match2[1]}`

  const d = new Date(raw)
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10)
  }

  return raw.slice(0, 10)
}
