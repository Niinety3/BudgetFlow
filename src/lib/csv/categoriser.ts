export interface CategoryRule {
  keyword: string
  category_id: string
  priority: number
}

export function categoriseTransaction(
  description: string,
  rules: CategoryRule[],
): string | null {
  const lower = description.toLowerCase()
  for (const rule of rules) {
    if (lower.includes(rule.keyword.toLowerCase())) {
      return rule.category_id
    }
  }
  return null
}
