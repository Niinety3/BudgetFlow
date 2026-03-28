import { parseRevolutCSV } from './revolut'
import { parseNatWestCSV } from './natwest'
import type { ParseResult } from './types'

export type BankType = 'revolut' | 'natwest'

export function detectBank(csvText: string): BankType | null {
  const firstLine = csvText.split('\n')[0] ?? ''
  const lower = firstLine.toLowerCase()

  if (lower.includes('product') && lower.includes('started date')) {
    return 'revolut'
  }
  if (lower.includes('account name') && lower.includes('account number')) {
    return 'natwest'
  }
  return null
}

export function parseCSV(
  csvText: string,
): { bankType: BankType; result: ParseResult } | null {
  const bankType = detectBank(csvText)
  if (!bankType) return null

  const result =
    bankType === 'revolut'
      ? parseRevolutCSV(csvText)
      : parseNatWestCSV(csvText)

  return { bankType, result }
}
