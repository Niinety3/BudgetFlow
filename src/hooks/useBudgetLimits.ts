import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useBudgetLimits(
  taxYear: number,
  householdId: string | null,
) {
  const queryClient = useQueryClient()

  const { data: limits, isLoading: loading } = useQuery({
    queryKey: ['budget-limits', householdId, taxYear],
    queryFn: async () => {
      if (!householdId) return []
      const { data, error } = await supabase
        .from('budget_limits')
        .select('*')
        .eq('household_id', householdId)
        .eq('tax_year', taxYear)

      if (error) throw error
      return data ?? []
    },
    enabled: !!householdId,
  })

  const { mutateAsync: updateLimit } = useMutation({
    mutationFn: async ({
      categoryId,
      month,
      amount,
    }: {
      categoryId: string
      month: number
      amount: number
    }) => {
      if (!householdId) throw new Error('No household')
      const { error } = await supabase.from('budget_limits').upsert(
        {
          household_id: householdId,
          category_id: categoryId,
          tax_year: taxYear,
          month,
          amount,
        },
        { onConflict: 'household_id,category_id,tax_year,month' },
      )
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['budget-limits', householdId, taxYear],
      })
    },
  })

  return { limits: limits ?? [], loading, updateLimit }
}
