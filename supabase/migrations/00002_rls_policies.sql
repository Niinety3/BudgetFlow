-- ============================================================
-- 00002_rls_policies.sql
-- BudgetFlow: Row Level Security policies
-- All data is scoped to household membership.
-- ============================================================

-- Enable RLS on every table
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- households
-- ============================================================
CREATE POLICY "Users can view own households" ON households
  FOR SELECT USING (
    id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert households" ON households
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own households" ON households
  FOR UPDATE USING (
    id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );

-- ============================================================
-- household_members
-- ============================================================
CREATE POLICY "Members can view household members" ON household_members
  FOR SELECT USING (
    household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can insert household members" ON household_members
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Members can delete household members" ON household_members
  FOR DELETE USING (
    household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );

-- ============================================================
-- settings
-- ============================================================
CREATE POLICY "Members can view settings" ON settings
  FOR SELECT USING (
    household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can insert settings" ON settings
  FOR INSERT WITH CHECK (
    household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can update settings" ON settings
  FOR UPDATE USING (
    household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can delete settings" ON settings
  FOR DELETE USING (
    household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );

-- ============================================================
-- categories
-- ============================================================
CREATE POLICY "Members can view categories" ON categories
  FOR SELECT USING (
    household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can insert categories" ON categories
  FOR INSERT WITH CHECK (
    household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can update categories" ON categories
  FOR UPDATE USING (
    household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can delete categories" ON categories
  FOR DELETE USING (
    household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );

-- ============================================================
-- category_rules
-- ============================================================
CREATE POLICY "Members can view category rules" ON category_rules
  FOR SELECT USING (
    household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can insert category rules" ON category_rules
  FOR INSERT WITH CHECK (
    household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can update category rules" ON category_rules
  FOR UPDATE USING (
    household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can delete category rules" ON category_rules
  FOR DELETE USING (
    household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );

-- ============================================================
-- transactions
-- ============================================================
CREATE POLICY "Members can view transactions" ON transactions
  FOR SELECT USING (
    household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can insert transactions" ON transactions
  FOR INSERT WITH CHECK (
    household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can update transactions" ON transactions
  FOR UPDATE USING (
    household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can delete transactions" ON transactions
  FOR DELETE USING (
    household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );

-- ============================================================
-- budget_limits
-- ============================================================
CREATE POLICY "Members can view budget limits" ON budget_limits
  FOR SELECT USING (
    household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can insert budget limits" ON budget_limits
  FOR INSERT WITH CHECK (
    household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can update budget limits" ON budget_limits
  FOR UPDATE USING (
    household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can delete budget limits" ON budget_limits
  FOR DELETE USING (
    household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );

-- ============================================================
-- savings_goals
-- ============================================================
CREATE POLICY "Members can view savings goals" ON savings_goals
  FOR SELECT USING (
    household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can insert savings goals" ON savings_goals
  FOR INSERT WITH CHECK (
    household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can update savings goals" ON savings_goals
  FOR UPDATE USING (
    household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can delete savings goals" ON savings_goals
  FOR DELETE USING (
    household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );

-- ============================================================
-- import_batches
-- ============================================================
CREATE POLICY "Members can view import batches" ON import_batches
  FOR SELECT USING (
    household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can insert import batches" ON import_batches
  FOR INSERT WITH CHECK (
    household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can update import batches" ON import_batches
  FOR UPDATE USING (
    household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can delete import batches" ON import_batches
  FOR DELETE USING (
    household_id IN (SELECT household_id FROM household_members WHERE user_id = auth.uid())
  );
