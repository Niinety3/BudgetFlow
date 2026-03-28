/**
 * Merchants that could belong to multiple categories.
 * When matched during import or notification ingestion, the transaction
 * is flagged as needs_review so the user can pick the right category.
 */
export const AMBIGUOUS_MERCHANTS: Record<string, string[]> = {
  'm&s': ['Groceries / Food', 'Shopping'],
  'marks and spencer': ['Groceries / Food', 'Shopping'],
  'boots': ['Health', 'Shopping'],
  'post office': ['Shopping', 'Services'],
  'amazon': ['Shopping', 'Entertainment', 'Subscriptions'],
  'wilko': ['Groceries / Food', 'Shopping'],
  'home bargains': ['Groceries / Food', 'Shopping'],
  'b&m': ['Groceries / Food', 'Shopping'],
  'the range': ['Groceries / Food', 'Shopping'],
  'asda': ['Groceries / Food', 'Shopping'],
}

/**
 * Check if a merchant description matches an ambiguous merchant.
 * Returns the list of possible category names, or null if not ambiguous.
 */
export function getAmbiguousCategories(description: string): string[] | null {
  const lower = description.toLowerCase()
  for (const [keyword, categories] of Object.entries(AMBIGUOUS_MERCHANTS)) {
    if (lower.includes(keyword)) {
      return categories
    }
  }
  return null
}
