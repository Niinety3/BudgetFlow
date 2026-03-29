import { parseRevolutCSV } from './revolut'
import { parseNatWestCSV } from './natwest'
import { parsePayPalCSV } from './paypal'
import type { ParseResult } from './types'

export type BankType = 'revolut' | 'natwest' | 'paypal'

export function detectBank(csvText: string): BankType | null {
  const firstLine = csvText.split('\n')[0] ?? ''
  const lower = firstLine.toLowerCase()

  if (lower.includes('product') && lower.includes('started date')) {
    return 'revolut'
  }
  if (lower.includes('account name') && lower.includes('account number')) {
    return 'natwest'
  }
  if ((lower.includes('gross') || lower.includes('net')) && (lower.includes('name') || lower.includes('description'))) {
    return 'paypal'
  }
  return null
}

export function parseCSV(
  csvText: string,
): { bankType: BankType; result: ParseResult } | null {
  const bankType = detectBank(csvText)
  if (!bankType) return null

  let result: ParseResult
  switch (bankType) {
    case 'revolut':
      result = parseRevolutCSV(csvText)
      break
    case 'natwest':
      result = parseNatWestCSV(csvText)
      break
    case 'paypal':
      result = parsePayPalCSV(csvText)
      break
  }

  return { bankType, result }
}
