interface Category {
  id: string
  name: string
}

export interface Filters {
  month: number
  year: number
  categoryId: string | null
  who: string | null
  source: string | null
  search: string
}

interface TransactionFiltersProps {
  filters: Filters
  setFilters: (filters: Filters) => void
  categories: Category[]
}

export function TransactionFilters({
  filters,
  setFilters,
  categories,
}: TransactionFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <input
        type="text"
        placeholder="Search transactions..."
        value={filters.search}
        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        className="rounded border border-border bg-background px-3 py-2 text-sm flex-1 min-w-[150px]"
      />
      <select
        value={`${filters.year}-${filters.month}`}
        onChange={(e) => {
          const [y, m] = e.target.value.split('-').map(Number)
          setFilters({ ...filters, year: y, month: m })
        }}
        className="rounded border border-border bg-background px-3 py-2 text-sm"
      >
        {generateMonthOptions().map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <select
        value={filters.categoryId ?? ''}
        onChange={(e) =>
          setFilters({ ...filters, categoryId: e.target.value || null })
        }
        className="rounded border border-border bg-background px-3 py-2 text-sm"
      >
        <option value="">All Categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <select
        value={filters.who ?? ''}
        onChange={(e) =>
          setFilters({ ...filters, who: e.target.value || null })
        }
        className="rounded border border-border bg-background px-3 py-2 text-sm"
      >
        <option value="">All People</option>
        <option value="michael">Michael</option>
        <option value="wife">Wife</option>
        <option value="shared">Shared</option>
      </select>

      <select
        value={filters.source ?? ''}
        onChange={(e) =>
          setFilters({ ...filters, source: e.target.value || null })
        }
        className="rounded border border-border bg-background px-3 py-2 text-sm"
      >
        <option value="">All Sources</option>
        <option value="revolut">Revolut</option>
        <option value="natwest">NatWest</option>
        <option value="manual">Manual</option>
      </select>
    </div>
  )
}

function generateMonthOptions() {
  const options: { value: string; label: string }[] = []
  const now = new Date()
  for (let i = 12; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const month = d.getMonth() + 1
    const year = d.getFullYear()
    const label = d.toLocaleDateString('en-GB', {
      month: 'short',
      year: 'numeric',
    })
    options.push({ value: `${year}-${month}`, label })
  }
  return options.reverse()
}
