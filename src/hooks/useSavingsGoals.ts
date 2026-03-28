import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useSavingsGoals(householdId: string | null) {
  const queryClient = useQueryClient()

  const { data: goals, isLoading: loading } = useQuery({
    queryKey: ['savings-goals', householdId],
    queryFn: async () => {
      if (!householdId) return []
      const { data, error } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('household_id', householdId)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data ?? []
    },
    enabled: !!householdId,
  })

  const { mutateAsync: addGoal } = useMutation({
    mutationFn: async (goal: {
      name: string
      target_amount: number
      saved_amount?: number
    }) => {
      if (!householdId) throw new Error('No household')
      const { error } = await supabase
        .from('savings_goals')
        .insert({ ...goal, household_id: householdId })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['savings-goals', householdId],
      })
    },
  })

  const { mutateAsync: updateGoal } = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string
      name?: string
      target_amount?: number
      saved_amount?: number
    }) => {
      const { error } = await supabase
        .from('savings_goals')
        .update(updates)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['savings-goals', householdId],
      })
    },
  })

  const { mutateAsync: deleteGoal } = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('savings_goals')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['savings-goals', householdId],
      })
    },
  })

  return { goals: goals ?? [], loading, addGoal, updateGoal, deleteGoal }
}
