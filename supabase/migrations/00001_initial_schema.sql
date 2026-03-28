-- ============================================================
-- 00001_initial_schema.sql
-- BudgetFlow: Initial database schema
-- ============================================================

-- households
CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- household_members
CREATE TABLE household_members (
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  PRIMARY KEY (household_id, user_id)
);

-- settings (one row per household)
CREATE TABLE settings (
  household_id UUID PRIMARY KEY REFERENCES households(id) ON DELETE CASCADE,
  annual_profit NUMERIC(12,2) NOT NULL DEFAULT 60000,
  monthly_takehome NUMERIC(12,2) NOT NULL DEFAULT 4532.50,
  current_rent NUMERIC(12,2) NOT NULL DEFAULT 975,
  future_rent NUMERIC(12,2) NOT NULL DEFAULT 1600,
  savings_pct NUMERIC(5,2) NOT NULL DEFAULT 10,
  tax_personal_allowance NUMERIC(12,2) NOT NULL DEFAULT 29500,
  tax_standard_band NUMERIC(12,2) NOT NULL DEFAULT 13000,
  tax_standard_rate NUMERIC(5,4) NOT NULL DEFAULT 0.10,
  tax_higher_rate NUMERIC(5,4) NOT NULL DEFAULT 0.21,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_budget_category BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- category_rules
CREATE TABLE category_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_rules_household_priority ON category_rules(household_id, priority DESC);

-- import_batches (must come before transactions due to FK)
CREATE TABLE import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  bank_type TEXT NOT NULL CHECK (bank_type IN ('revolut', 'natwest')),
  imported_at TIMESTAMPTZ DEFAULT now(),
  transactions_imported INTEGER NOT NULL DEFAULT 0,
  duplicates_skipped INTEGER NOT NULL DEFAULT 0
);

-- transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  who TEXT NOT NULL DEFAULT 'shared' CHECK (who IN ('michael', 'wife', 'shared')),
  source TEXT NOT NULL CHECK (source IN ('revolut', 'natwest', 'manual')),
  import_batch_id UUID REFERENCES import_batches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_txn_household_date ON transactions(household_id, date);
CREATE UNIQUE INDEX idx_txn_dedup ON transactions(household_id, date, description, amount);

-- budget_limits
CREATE TABLE budget_limits (
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  tax_year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  amount NUMERIC(12,2) NOT NULL,
  PRIMARY KEY (household_id, category_id, tax_year, month)
);

-- savings_goals
CREATE TABLE savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount NUMERIC(12,2) NOT NULL,
  saved_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
