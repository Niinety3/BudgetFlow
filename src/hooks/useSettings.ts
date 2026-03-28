import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useHousehold } from './useHousehold'
import type { Database } from '@/lib/database.types'

type SettingsRow = Database['public']['Tables']['settings']['Row']
type SettingsUpdate = Database['public']['Tables']['settings']['Update']

export function useSettings() {
  const { householdId } = useHousehold()
  const queryClient = useQueryClient()

  const { data: settings, isLoading: loading } = useQuery<SettingsRow | null>({
    queryKey: ['settings', householdId],
    queryFn: async () => {
      if (!householdId) return null
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('household_id', householdId)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!householdId,
  })

  const { mutateAsync: updateSettings, isPending: saving } = useMutation({
    mutationFn: async (updates: SettingsUpdate) => {
      if (!householdId) throw new Error('No household')
      const { data, error } = await supabase
        .from('settings')
        .update(updates)
        .eq('household_id', householdId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', householdId] })
    },
  })

  return { settings: settings ?? null, updateSettings, loading, saving }
}
