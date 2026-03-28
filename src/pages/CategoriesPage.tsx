import { useCategories } from '@/hooks/useCategories'
import CategoryList from '@/components/categories/CategoryList'
import RuleEditor from '@/components/categories/RuleEditor'

export default function CategoriesPage() {
  const {
    categories,
    loading,
    addCategory,
    updateCategory,
    deleteCategory,
    rules,
    addRule,
    updateRule,
    deleteRule,
  } = useCategories()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-sm text-muted-foreground">Loading categories...</span>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-foreground">Categories</h1>

      {/* ── Categories Section ──────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">Categories</h2>
        <CategoryList
          categories={categories}
          onEdit={async (id, updates) => {
            await updateCategory({ id, ...updates })
          }}
          onDelete={async (id) => {
            await deleteCategory(id)
          }}
          onAdd={async (data) => {
            await addCategory(data)
          }}
        />
      </section>

      {/* ── Rules Section ──────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">Categorisation Rules</h2>
        <RuleEditor
          rules={rules}
          categories={categories}
          onEdit={async (id, updates) => {
            await updateRule({ id, ...updates })
          }}
          onDelete={async (id) => {
            await deleteRule(id)
          }}
          onAdd={async (data) => {
            await addRule(data)
          }}
        />
      </section>
    </div>
  )
}
