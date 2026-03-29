export interface ParsedTransaction {
  date: string
  description: string
  amount: number
  source: 'revolut' | 'natwest'
}

export interface SkippedTransaction {
  date: string
  description: string
  amount: number
  reason: 'income' | 'internal'
}

export interface ParseResult {
  transactions: ParsedTransaction[]
  incomeSkipped: number
  internalSkipped: number
  skippedTransactions: SkippedTransaction[]
}
