export interface ParsedTransaction {
  date: string
  description: string
  amount: number
  source: 'revolut' | 'natwest'
}

export interface ParseResult {
  transactions: ParsedTransaction[]
  incomeSkipped: number
  internalSkipped: number
}
