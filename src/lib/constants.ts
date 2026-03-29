// ── Default Categories ──────────────────────────────────────────────

export interface DefaultCategory {
  name: string
  isBudgetCategory: boolean
  sortOrder: number
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: 'Rent / Mortgage', isBudgetCategory: true, sortOrder: 1 },
  { name: 'Utilities', isBudgetCategory: true, sortOrder: 2 },
  { name: 'Groceries / Food', isBudgetCategory: true, sortOrder: 3 },
  { name: 'Shopping', isBudgetCategory: true, sortOrder: 4 },
  { name: 'Transport / Fuel', isBudgetCategory: true, sortOrder: 5 },
  { name: 'Takeaway', isBudgetCategory: true, sortOrder: 6 },
  { name: 'Health', isBudgetCategory: true, sortOrder: 7 },
  { name: 'Entertainment', isBudgetCategory: true, sortOrder: 8 },
  { name: 'Subscriptions', isBudgetCategory: true, sortOrder: 9 },
  { name: 'Finance', isBudgetCategory: true, sortOrder: 10 },
  { name: 'Services', isBudgetCategory: true, sortOrder: 11 },
  { name: 'Insurance', isBudgetCategory: true, sortOrder: 12 },
  { name: 'Annual Costs', isBudgetCategory: false, sortOrder: 13 },
  { name: 'Special', isBudgetCategory: false, sortOrder: 14 },
  { name: 'Bank Transfers', isBudgetCategory: false, sortOrder: 15 },
  { name: 'Uncategorised', isBudgetCategory: false, sortOrder: 16 },
]

// ── Default Categorisation Rules ────────────────────────────────────
// keyword → category name, ordered by priority (lower = checked first).
// More specific rules have lower priority numbers so they match first.

export interface DefaultRule {
  keyword: string
  categoryName: string
  priority: number
}

export const DEFAULT_RULES: DefaultRule[] = [
  // Rent / Mortgage
  { keyword: 'harmony homes', categoryName: 'Rent / Mortgage', priority: 100 },
  { keyword: 'rent', categoryName: 'Rent / Mortgage', priority: 101 },
  { keyword: 'landlord', categoryName: 'Rent / Mortgage', priority: 102 },

  // Utilities
  { keyword: 'manx utilities', categoryName: 'Utilities', priority: 200 },
  { keyword: 'manx telecom', categoryName: 'Utilities', priority: 201 },
  { keyword: 'electricity', categoryName: 'Utilities', priority: 202 },
  { keyword: 'electric', categoryName: 'Utilities', priority: 203 },
  { keyword: 'water', categoryName: 'Utilities', priority: 204 },
  { keyword: 'broadband', categoryName: 'Utilities', priority: 205 },
  { keyword: 'tv licence', categoryName: 'Utilities', priority: 206 },

  // Groceries / Food — "m&s food" must be checked before generic "m&s"
  { keyword: 'm&s food', categoryName: 'Groceries / Food', priority: 290 },
  { keyword: 'tesco', categoryName: 'Groceries / Food', priority: 300 },
  { keyword: 'shoprite', categoryName: 'Groceries / Food', priority: 301 },
  { keyword: 'co-op', categoryName: 'Groceries / Food', priority: 302 },
  { keyword: 'spar', categoryName: 'Groceries / Food', priority: 303 },
  { keyword: 'aldi', categoryName: 'Groceries / Food', priority: 304 },
  { keyword: 'lidl', categoryName: 'Groceries / Food', priority: 305 },
  { keyword: 'iceland', categoryName: 'Groceries / Food', priority: 306 },

  // Shopping — generic "m&s" after "m&s food"
  { keyword: 'amazon', categoryName: 'Shopping', priority: 400 },
  { keyword: 'm&s', categoryName: 'Shopping', priority: 401 },
  { keyword: 'marks and spencer', categoryName: 'Shopping', priority: 402 },
  { keyword: 'primark', categoryName: 'Shopping', priority: 403 },
  { keyword: 'tk maxx', categoryName: 'Shopping', priority: 404 },
  { keyword: 'argos', categoryName: 'Shopping', priority: 405 },
  { keyword: 'ebay', categoryName: 'Shopping', priority: 406 },
  { keyword: 'boots', categoryName: 'Shopping', priority: 407 },
  { keyword: 'wh smith', categoryName: 'Shopping', priority: 408 },
  { keyword: 'the works', categoryName: 'Shopping', priority: 409 },
  { keyword: 'waterstones', categoryName: 'Shopping', priority: 410 },
  { keyword: 'ikea', categoryName: 'Shopping', priority: 411 },
  { keyword: 'currys', categoryName: 'Shopping', priority: 412 },
  { keyword: 'john lewis', categoryName: 'Shopping', priority: 413 },
  { keyword: 'next', categoryName: 'Shopping', priority: 414 },
  { keyword: 'regatta', categoryName: 'Shopping', priority: 415 },
  { keyword: 'vertbaudet', categoryName: 'Shopping', priority: 416 },
  { keyword: 'post office', categoryName: 'Shopping', priority: 417 },

  // Transport / Fuel
  { keyword: 'shell', categoryName: 'Transport / Fuel', priority: 500 },
  { keyword: 'bp', categoryName: 'Transport / Fuel', priority: 501 },
  { keyword: 'esso', categoryName: 'Transport / Fuel', priority: 502 },
  { keyword: 'petrol', categoryName: 'Transport / Fuel', priority: 503 },
  { keyword: 'diesel', categoryName: 'Transport / Fuel', priority: 504 },
  { keyword: 'fuel', categoryName: 'Transport / Fuel', priority: 505 },
  { keyword: 'parking', categoryName: 'Transport / Fuel', priority: 506 },
  { keyword: 'motorbike', categoryName: 'Transport / Fuel', priority: 507 },
  { keyword: 'steam packet', categoryName: 'Transport / Fuel', priority: 508 },
  { keyword: 'blackhorse', categoryName: 'Transport / Fuel', priority: 509 },

  // Takeaway
  { keyword: 'dominos', categoryName: 'Takeaway', priority: 600 },
  { keyword: 'pizza hut', categoryName: 'Takeaway', priority: 601 },
  { keyword: 'just eat', categoryName: 'Takeaway', priority: 602 },
  { keyword: 'deliveroo', categoryName: 'Takeaway', priority: 603 },
  { keyword: 'uber eats', categoryName: 'Takeaway', priority: 604 },
  { keyword: 'mcdonald', categoryName: 'Takeaway', priority: 605 },
  { keyword: 'indian', categoryName: 'Takeaway', priority: 606 },
  { keyword: 'takeaway', categoryName: 'Takeaway', priority: 607 },
  { keyword: 'terrys tatos', categoryName: 'Takeaway', priority: 608 },
  { keyword: '1886 bar', categoryName: 'Takeaway', priority: 609 },

  // Health
  { keyword: 'dental', categoryName: 'Health', priority: 700 },
  { keyword: 'doctor', categoryName: 'Health', priority: 701 },
  { keyword: 'pharmacy', categoryName: 'Health', priority: 702 },
  { keyword: 'beauty pie', categoryName: 'Health', priority: 703 },
  { keyword: 'vitamins', categoryName: 'Health', priority: 704 },
  { keyword: 'medicine', categoryName: 'Health', priority: 705 },

  // Entertainment
  { keyword: 'palace cinema', categoryName: 'Entertainment', priority: 800 },
  { keyword: 'villa marina', categoryName: 'Entertainment', priority: 801 },
  { keyword: 'netflix', categoryName: 'Entertainment', priority: 802 },
  { keyword: 'ifly', categoryName: 'Entertainment', priority: 803 },
  { keyword: 'flight sim', categoryName: 'Entertainment', priority: 804 },
  { keyword: 'hogwarts', categoryName: 'Entertainment', priority: 805 },
  { keyword: 'inibuilds', categoryName: 'Entertainment', priority: 806 },
  { keyword: 'spad.next', categoryName: 'Entertainment', priority: 807 },
  { keyword: 'now tv', categoryName: 'Entertainment', priority: 808 },

  // Subscriptions
  { keyword: 'navigraph', categoryName: 'Subscriptions', priority: 900 },
  { keyword: 'nordvpn', categoryName: 'Subscriptions', priority: 901 },
  { keyword: 'adobe', categoryName: 'Subscriptions', priority: 902 },
  { keyword: 'spotify', categoryName: 'Subscriptions', priority: 903 },
  { keyword: 'disney+', categoryName: 'Subscriptions', priority: 904 },
  { keyword: 'amazon prime', categoryName: 'Subscriptions', priority: 905 },
  { keyword: 'lavazza', categoryName: 'Subscriptions', priority: 906 },

  // Finance
  { keyword: 'creation', categoryName: 'Finance', priority: 1000 },
  { keyword: 'paypal - liverpool', categoryName: 'Finance', priority: 1001 },

  // Services
  { keyword: 'voxi', categoryName: 'Services', priority: 1100 },
  { keyword: 'lyca', categoryName: 'Services', priority: 1101 },
  { keyword: 'sure - klaudia', categoryName: 'Services', priority: 1102 },
  { keyword: 'revolut metal', categoryName: 'Services', priority: 1103 },
  { keyword: 'natwest account', categoryName: 'Services', priority: 1104 },

  // Insurance
  { keyword: 'aviva', categoryName: 'Insurance', priority: 1200 },
  { keyword: 'car insurance', categoryName: 'Insurance', priority: 1201 },

  // Special
  { keyword: 'specsavers', categoryName: 'Special', priority: 1300 },
  { keyword: 'glasses', categoryName: 'Special', priority: 1301 },
  { keyword: 'castletown golf', categoryName: 'Special', priority: 1302 },

  // Bank Transfers
  { keyword: 'revolut', categoryName: 'Bank Transfers', priority: 1400 },
]

// ── Default Settings ────────────────────────────────────────────────

export const DEFAULT_SETTINGS = {
  annual_profit: 60000,
  monthly_takehome: 4532.50,
  current_rent: 975,
  future_rent: 1600,
  savings_pct: 10,
  tax_personal_allowance: 29500,
  tax_standard_band: 13000,
  tax_standard_rate: 0.10,
  tax_higher_rate: 0.21,
} as const

// ── Default Budget Limits (6-month averages from PRD) ───────────────

export interface DefaultBudgetLimit {
  categoryName: string
  amount: number
}

export const DEFAULT_BUDGET_LIMITS: DefaultBudgetLimit[] = [
  { categoryName: 'Rent / Mortgage', amount: 975 },
  { categoryName: 'Utilities', amount: 267 },
  { categoryName: 'Groceries / Food', amount: 659 },
  { categoryName: 'Shopping', amount: 933 },
  { categoryName: 'Transport / Fuel', amount: 55 },
  { categoryName: 'Takeaway', amount: 89 },
  { categoryName: 'Health', amount: 216 },
  { categoryName: 'Entertainment', amount: 72 },
  { categoryName: 'Subscriptions', amount: 24 },
  { categoryName: 'Finance', amount: 51 },
  { categoryName: 'Services', amount: 29 },
  { categoryName: 'Insurance', amount: 47 },
]
