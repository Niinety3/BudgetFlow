export interface Database {
  public: {
    Tables: {
      households: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
      }
      household_members: {
        Row: {
          household_id: string
          user_id: string
          display_name: string
        }
        Insert: {
          household_id: string
          user_id: string
          display_name: string
        }
        Update: {
          household_id?: string
          user_id?: string
          display_name?: string
        }
      }
      settings: {
        Row: {
          household_id: string
          annual_profit: number
          monthly_takehome: number
          current_rent: number
          future_rent: number
          savings_pct: number
          tax_personal_allowance: number
          tax_standard_band: number
          tax_standard_rate: number
          tax_higher_rate: number
          updated_at: string
          webhook_api_key: string | null
          michael_card_digits: string | null
          klaudia_card_digits: string | null
          fixed_bills: { name: string; amount: number }[]
        }
        Insert: {
          household_id: string
          annual_profit: number
          monthly_takehome: number
          current_rent: number
          future_rent: number
          savings_pct: number
          tax_personal_allowance: number
          tax_standard_band: number
          tax_standard_rate: number
          tax_higher_rate: number
          updated_at?: string
        }
        Update: {
          household_id?: string
          annual_profit?: number
          monthly_takehome?: number
          current_rent?: number
          future_rent?: number
          savings_pct?: number
          tax_personal_allowance?: number
          tax_standard_band?: number
          tax_standard_rate?: number
          tax_higher_rate?: number
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          household_id: string
          name: string
          is_budget_category: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          name: string
          is_budget_category: boolean
          sort_order: number
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          name?: string
          is_budget_category?: boolean
          sort_order?: number
          created_at?: string
        }
      }
      category_rules: {
        Row: {
          id: string
          household_id: string
          keyword: string
          category_id: string
          priority: number
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          keyword: string
          category_id: string
          priority: number
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          keyword?: string
          category_id?: string
          priority?: number
          created_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          household_id: string
          date: string
          description: string
          amount: number
          category_id: string | null
          who: 'michael' | 'wife' | 'shared'
          source: 'revolut' | 'natwest' | 'manual' | 'notification' | 'paypal'
          needs_review: boolean
          import_batch_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          date: string
          description: string
          amount: number
          category_id?: string | null
          who?: 'michael' | 'wife' | 'shared'
          source: 'revolut' | 'natwest' | 'manual'
          import_batch_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          date?: string
          description?: string
          amount?: number
          category_id?: string | null
          who?: 'michael' | 'wife' | 'shared'
          source?: 'revolut' | 'natwest' | 'manual'
          import_batch_id?: string | null
          created_at?: string
        }
      }
      budget_limits: {
        Row: {
          household_id: string
          category_id: string
          tax_year: number
          month: number
          amount: number
        }
        Insert: {
          household_id: string
          category_id: string
          tax_year: number
          month: number
          amount: number
        }
        Update: {
          household_id?: string
          category_id?: string
          tax_year?: number
          month?: number
          amount?: number
        }
      }
      savings_goals: {
        Row: {
          id: string
          household_id: string
          name: string
          target_amount: number
          saved_amount: number
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          name: string
          target_amount: number
          saved_amount?: number
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          name?: string
          target_amount?: number
          saved_amount?: number
          created_at?: string
        }
      }
      import_batches: {
        Row: {
          id: string
          household_id: string
          bank_type: 'revolut' | 'natwest'
          imported_at: string
          transactions_imported: number
          duplicates_skipped: number
        }
        Insert: {
          id?: string
          household_id: string
          bank_type: 'revolut' | 'natwest'
          imported_at?: string
          transactions_imported: number
          duplicates_skipped: number
        }
        Update: {
          id?: string
          household_id?: string
          bank_type?: 'revolut' | 'natwest'
          imported_at?: string
          transactions_imported?: number
          duplicates_skipped?: number
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
