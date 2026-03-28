import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { getMonthDateRange, getTaxYearDateRange } from '@/lib/tax-year'

export function useTransactions(
  month: number,
  year: number,
  householdId: string | null,
) {
  const queryClient = useQueryClient()
  const { start, end } = getMonthDateRange(month, year)

  const {
    data: transactions,
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: ['transactions', householdId, month, year],
    queryFn: async () => {
      if (!householdId) return []
      const { data, error } = await supabase
        .from('transactions')
        .select('*, categories(name, is_budget_category)')
        .eq('household_id', householdId)
        .gte('date', start.toISOString().slice(0, 10))
        .lte('date', end.toISOString().slice(0, 10))
        .order('date', { ascending: false })

      if (error) throw error
      return data ?? []
    },
    enabled: !!householdId,
  })

  const { mutateAsync: addTransaction } = useMutation({
    mutationFn: async (txn: {
      date: string
      description: string
      amount: number
      category_id: string | null
      who: 'michael' | 'wife' | 'shared'
      source: 'revolut' | 'natwest' | 'manual'
    }) => {
      if (!householdId) throw new Error('No household')
      const { error } = await supabase
        .from('transactions')
        .insert({ ...txn, household_id: householdId })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', householdId] })
    },
  })

  const { mutateAsync: updateTransaction } = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string
      category_id?: string | null
      who?: 'michael' | 'wife' | 'shared'
      description?: string
      amount?: number
    }) => {
      const { error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', householdId] })
    },
  })

  const { mutateAsync: deleteTransaction } = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', householdId] })
    },
  })

  return {
    transactions: transactions ?? [],
    loading,
    refetch,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  }
}

export function useNeedsReviewTransactions(householdId: string | null) {
  const queryClient = useQueryClient()

  const { data, isLoading: loading } = useQuery({
    queryKey: ['needs-review', householdId],
    queryFn: async () => {
      if (!householdId) return []
      const { data, error } = await supabase
        .from('transactions')
        .select('*, categories(name)')
        .eq('household_id', householdId)
        .eq('needs_review', true)
        .order('date', { ascending: false })

      if (error) throw error
      return data ?? []
    },
    enabled: !!householdId,
    refetchInterval: 30000, // poll every 30s for new review items
  })

  const { mutateAsync: resolveReview } = useMutation({
    mutationFn: async ({
      id,
      categoryId,
    }: {
      id: string
      categoryId: string
    }) => {
      const { error } = await supabase
        .from('transactions')
        .update({ category_id: categoryId, needs_review: false })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['needs-review', householdId] })
      queryClient.invalidateQueries({ queryKey: ['transactions', householdId] })
    },
  })

  return { reviewTransactions: data ?? [], loading, resolveReview }
}

export function useAllTransactionsForTaxYear(
  taxYear: number,
  householdId: string | null,
) {
  const { start, end } = getTaxYearDateRange(taxYear)

  const { data, isLoading: loading } = useQuery({
    queryKey: ['transactions-tax-year', householdId, taxYear],
    queryFn: async () => {
      if (!householdId) return []
      const { data, error } = await supabase
        .from('transactions')
        .select('*, categories(name, is_budget_category)')
        .eq('household_id', householdId)
        .gte('date', start.toISOString().slice(0, 10))
        .lte('date', end.toISOString().slice(0, 10))
        .order('date', { ascending: false })

      if (error) throw error
      return data ?? []
    },
    enabled: !!householdId,
  })

  return { transactions: data ?? [], loading }
}
