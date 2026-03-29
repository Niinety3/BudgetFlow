import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { DEFAULT_CATEGORIES, DEFAULT_RULES } from '@/lib/constants'

export function useHousehold() {
  const { user } = useAuth()
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setHouseholdId(null)
      setLoading(false)
      return
    }

    async function fetchOrCreate() {
      // Check if the user already belongs to a household
      const { data: membership, error: memberError } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user!.id)
        .maybeSingle()

      if (memberError) {
        console.error('Error fetching household membership:', memberError)
        setLoading(false)
        return
      }

      if (membership) {
        setHouseholdId(membership.household_id)
        setLoading(false)
        return
      }

      // No household exists, create one
      const { data: household, error: createError } = await supabase
        .from('households')
        .insert({ name: 'My Household' })
        .select('id')
        .single()

      if (createError || !household) {
        console.error('Error creating household:', createError)
        setLoading(false)
        return
      }

      // Link the user to the household
      const { error: linkError } = await supabase
        .from('household_members')
        .insert({
          household_id: household.id,
          user_id: user!.id,
          display_name: user!.email ?? 'User',
        })

      if (linkError) {
        console.error('Error linking user to household:', linkError)
        setLoading(false)
        return
      }

      // Create default settings row
      await supabase.from('settings').insert({
        household_id: household.id,
        annual_profit: 60000,
        monthly_takehome: 4532.50,
        current_rent: 975,
        future_rent: 1600,
        savings_pct: 10,
        tax_personal_allowance: 29500,
        tax_standard_band: 13000,
        tax_standard_rate: 0.1,
        tax_higher_rate: 0.21,
        fixed_bills: [
          { name: 'Electric', amount: 209 },
          { name: 'Broadband (Manx Telecom)', amount: 51.65 },
        ],
      })

      // Seed default categories
      const categoryInserts = DEFAULT_CATEGORIES.map((c) => ({
        household_id: household.id,
        name: c.name,
        is_budget_category: c.isBudgetCategory,
        sort_order: c.sortOrder,
      }))
      const { data: insertedCategories } = await supabase
        .from('categories')
        .insert(categoryInserts)
        .select('id, name')

      // Seed default categorisation rules
      if (insertedCategories) {
        const categoryMap = new Map(insertedCategories.map((c) => [c.name, c.id]))
        const ruleInserts = DEFAULT_RULES
          .filter((r) => categoryMap.has(r.categoryName))
          .map((r) => ({
            household_id: household.id,
            keyword: r.keyword,
            category_id: categoryMap.get(r.categoryName)!,
            priority: r.priority,
          }))
        await supabase.from('category_rules').insert(ruleInserts)
      }

      setHouseholdId(household.id)
      setLoading(false)
    }

    fetchOrCreate()
  }, [user])

  return { householdId, loading }
}
