export interface ParsedTransaction {
  date: string
  description: string
  amount: number
  source: 'revolut' | 'natwest' | 'paypal'
}

export interface SkippedTransaction {
  date: string
  description: string
  amount: number
  reason: 'income' | 'internal'
}

export interface PotentialRefund {
  date: string
  description: string
  amount: number
  source: 'revolut' | 'natwest' | 'paypal'
}

export interface ParseResult {
  transactions: ParsedTransaction[]
  incomeSkipped: number
  internalSkipped: number
  skippedTransactions: SkippedTransaction[]
  potentialRefunds: PotentialRefund[]
}
