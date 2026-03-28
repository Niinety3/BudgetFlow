import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useHousehold } from './useHousehold'
import type { Database } from '@/lib/database.types'

type CategoryRow = Database['public']['Tables']['categories']['Row']
type CategoryInsert = Database['public']['Tables']['categories']['Insert']
type CategoryUpdate = Database['public']['Tables']['categories']['Update']
type RuleRow = Database['public']['Tables']['category_rules']['Row']
type RuleInsert = Database['public']['Tables']['category_rules']['Insert']
type RuleUpdate = Database['public']['Tables']['category_rules']['Update']

export function useCategories() {
  const { householdId } = useHousehold()
  const queryClient = useQueryClient()

  // ── Categories ──────────────────────────────────────────────────────

  const { data: categories = [], isLoading: loadingCategories } = useQuery<CategoryRow[]>({
    queryKey: ['categories', householdId],
    queryFn: async () => {
      if (!householdId) return []
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('household_id', householdId)
        .order('sort_order', { ascending: true })

      if (error) throw error
      return data ?? []
    },
    enabled: !!householdId,
  })

  const { mutateAsync: addCategory } = useMutation({
    mutationFn: async (insert: Omit<CategoryInsert, 'household_id'>) => {
      if (!householdId) throw new Error('No household')
      const { data, error } = await supabase
        .from('categories')
        .insert({ ...insert, household_id: householdId })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', householdId] })
    },
  })

  const { mutateAsync: updateCategory } = useMutation({
    mutationFn: async ({ id, ...updates }: CategoryUpdate & { id: string }) => {
      if (!householdId) throw new Error('No household')
      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .eq('household_id', householdId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', householdId] })
    },
  })

  const { mutateAsync: deleteCategory } = useMutation({
    mutationFn: async (id: string) => {
      if (!householdId) throw new Error('No household')
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
        .eq('household_id', householdId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', householdId] })
    },
  })

  // ── Category Rules ──────────────────────────────────────────────────

  const { data: rules = [], isLoading: loadingRules } = useQuery<RuleRow[]>({
    queryKey: ['category_rules', householdId],
    queryFn: async () => {
      if (!householdId) return []
      const { data, error } = await supabase
        .from('category_rules')
        .select('*')
        .eq('household_id', householdId)
        .order('priority', { ascending: true })

      if (error) throw error
      return data ?? []
    },
    enabled: !!householdId,
  })

  const { mutateAsync: addRule } = useMutation({
    mutationFn: async (insert: Omit<RuleInsert, 'household_id'>) => {
      if (!householdId) throw new Error('No household')
      const { data, error } = await supabase
        .from('category_rules')
        .insert({ ...insert, household_id: householdId })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category_rules', householdId] })
    },
  })

  const { mutateAsync: updateRule } = useMutation({
    mutationFn: async ({ id, ...updates }: RuleUpdate & { id: string }) => {
      if (!householdId) throw new Error('No household')
      const { data, error } = await supabase
        .from('category_rules')
        .update(updates)
        .eq('id', id)
        .eq('household_id', householdId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category_rules', householdId] })
    },
  })

  const { mutateAsync: deleteRule } = useMutation({
    mutationFn: async (id: string) => {
      if (!householdId) throw new Error('No household')
      const { error } = await supabase
        .from('category_rules')
        .delete()
        .eq('id', id)
        .eq('household_id', householdId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category_rules', householdId] })
    },
  })

  return {
    categories,
    loading: loadingCategories || loadingRules,
    addCategory,
    updateCategory,
    deleteCategory,
    rules,
    addRule,
    updateRule,
    deleteRule,
  }
}
