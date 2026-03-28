-- ============================================================
-- 00003_seed_defaults.sql
-- BudgetFlow: Seed default categories and categorisation rules
-- for a newly created household.
-- ============================================================

CREATE OR REPLACE FUNCTION seed_household_defaults(p_household_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_rent UUID;
  v_utilities UUID;
  v_groceries UUID;
  v_shopping UUID;
  v_transport UUID;
  v_takeaway UUID;
  v_health UUID;
  v_entertainment UUID;
  v_subscriptions UUID;
  v_finance UUID;
  v_services UUID;
  v_insurance UUID;
  v_special UUID;
  v_bank_transfers UUID;
  v_uncategorised UUID;
BEGIN
  -- ==========================================================
  -- Insert 15 default categories
  -- Budget categories (is_budget_category = true): sort_order 1-12
  -- Non-budget categories: sort_order 13-15
  -- ==========================================================

  INSERT INTO categories (id, household_id, name, is_budget_category, sort_order)
  VALUES (gen_random_uuid(), p_household_id, 'Rent / Mortgage', true, 1)
  RETURNING id INTO v_rent;

  INSERT INTO categories (id, household_id, name, is_budget_category, sort_order)
  VALUES (gen_random_uuid(), p_household_id, 'Utilities', true, 2)
  RETURNING id INTO v_utilities;

  INSERT INTO categories (id, household_id, name, is_budget_category, sort_order)
  VALUES (gen_random_uuid(), p_household_id, 'Groceries / Food', true, 3)
  RETURNING id INTO v_groceries;

  INSERT INTO categories (id, household_id, name, is_budget_category, sort_order)
  VALUES (gen_random_uuid(), p_household_id, 'Shopping', true, 4)
  RETURNING id INTO v_shopping;

  INSERT INTO categories (id, household_id, name, is_budget_category, sort_order)
  VALUES (gen_random_uuid(), p_household_id, 'Transport / Fuel', true, 5)
  RETURNING id INTO v_transport;

  INSERT INTO categories (id, household_id, name, is_budget_category, sort_order)
  VALUES (gen_random_uuid(), p_household_id, 'Takeaway', true, 6)
  RETURNING id INTO v_takeaway;

  INSERT INTO categories (id, household_id, name, is_budget_category, sort_order)
  VALUES (gen_random_uuid(), p_household_id, 'Health', true, 7)
  RETURNING id INTO v_health;

  INSERT INTO categories (id, household_id, name, is_budget_category, sort_order)
  VALUES (gen_random_uuid(), p_household_id, 'Entertainment', true, 8)
  RETURNING id INTO v_entertainment;

  INSERT INTO categories (id, household_id, name, is_budget_category, sort_order)
  VALUES (gen_random_uuid(), p_household_id, 'Subscriptions', true, 9)
  RETURNING id INTO v_subscriptions;

  INSERT INTO categories (id, household_id, name, is_budget_category, sort_order)
  VALUES (gen_random_uuid(), p_household_id, 'Finance', true, 10)
  RETURNING id INTO v_finance;

  INSERT INTO categories (id, household_id, name, is_budget_category, sort_order)
  VALUES (gen_random_uuid(), p_household_id, 'Services', true, 11)
  RETURNING id INTO v_services;

  INSERT INTO categories (id, household_id, name, is_budget_category, sort_order)
  VALUES (gen_random_uuid(), p_household_id, 'Insurance', true, 12)
  RETURNING id INTO v_insurance;

  INSERT INTO categories (id, household_id, name, is_budget_category, sort_order)
  VALUES (gen_random_uuid(), p_household_id, 'Special', false, 13)
  RETURNING id INTO v_special;

  INSERT INTO categories (id, household_id, name, is_budget_category, sort_order)
  VALUES (gen_random_uuid(), p_household_id, 'Bank Transfers', false, 14)
  RETURNING id INTO v_bank_transfers;

  INSERT INTO categories (id, household_id, name, is_budget_category, sort_order)
  VALUES (gen_random_uuid(), p_household_id, 'Uncategorised', false, 15)
  RETURNING id INTO v_uncategorised;

  -- ==========================================================
  -- Insert default categorisation rules
  -- Higher priority = checked first (more specific rules win)
  -- Specific multi-word keywords: priority 100
  -- Generic single-word keywords:  priority 10
  -- ==========================================================

  -- Rent / Mortgage
  INSERT INTO category_rules (household_id, keyword, category_id, priority) VALUES
    (p_household_id, 'harmony homes', v_rent, 100),
    (p_household_id, 'rent', v_rent, 10),
    (p_household_id, 'landlord', v_rent, 10);

  -- Utilities
  INSERT INTO category_rules (household_id, keyword, category_id, priority) VALUES
    (p_household_id, 'manx utilities', v_utilities, 100),
    (p_household_id, 'manx telecom', v_utilities, 100),
    (p_household_id, 'tv licence', v_utilities, 100),
    (p_household_id, 'electricity', v_utilities, 10),
    (p_household_id, 'electric', v_utilities, 10),
    (p_household_id, 'water', v_utilities, 10),
    (p_household_id, 'broadband', v_utilities, 10);

  -- Groceries / Food  (specific multi-word variants get higher priority)
  INSERT INTO category_rules (household_id, keyword, category_id, priority) VALUES
    (p_household_id, 'm&s food', v_groceries, 100),
    (p_household_id, 'tesco', v_groceries, 10),
    (p_household_id, 'shoprite', v_groceries, 10),
    (p_household_id, 'co-op', v_groceries, 10),
    (p_household_id, 'spar', v_groceries, 10),
    (p_household_id, 'aldi', v_groceries, 10),
    (p_household_id, 'lidl', v_groceries, 10),
    (p_household_id, 'iceland', v_groceries, 10);

  -- Shopping  (generic 'm&s' at lower priority so 'm&s food' wins)
  INSERT INTO category_rules (household_id, keyword, category_id, priority) VALUES
    (p_household_id, 'marks and spencer', v_shopping, 50),
    (p_household_id, 'wh smith', v_shopping, 100),
    (p_household_id, 'tk maxx', v_shopping, 100),
    (p_household_id, 'the works', v_shopping, 100),
    (p_household_id, 'john lewis', v_shopping, 100),
    (p_household_id, 'post office', v_shopping, 100),
    (p_household_id, 'amazon', v_shopping, 10),
    (p_household_id, 'm&s', v_shopping, 10),
    (p_household_id, 'primark', v_shopping, 10),
    (p_household_id, 'argos', v_shopping, 10),
    (p_household_id, 'ebay', v_shopping, 10),
    (p_household_id, 'boots', v_shopping, 10),
    (p_household_id, 'waterstones', v_shopping, 10),
    (p_household_id, 'ikea', v_shopping, 10),
    (p_household_id, 'currys', v_shopping, 10),
    (p_household_id, 'next', v_shopping, 10),
    (p_household_id, 'regatta', v_shopping, 10),
    (p_household_id, 'vertbaudet', v_shopping, 10);

  -- Transport / Fuel
  INSERT INTO category_rules (household_id, keyword, category_id, priority) VALUES
    (p_household_id, 'steam packet', v_transport, 100),
    (p_household_id, 'shell', v_transport, 10),
    (p_household_id, 'bp', v_transport, 10),
    (p_household_id, 'esso', v_transport, 10),
    (p_household_id, 'petrol', v_transport, 10),
    (p_household_id, 'diesel', v_transport, 10),
    (p_household_id, 'fuel', v_transport, 10),
    (p_household_id, 'parking', v_transport, 10),
    (p_household_id, 'motorbike', v_transport, 10),
    (p_household_id, 'blackhorse', v_transport, 10);

  -- Takeaway
  INSERT INTO category_rules (household_id, keyword, category_id, priority) VALUES
    (p_household_id, 'pizza hut', v_takeaway, 100),
    (p_household_id, 'just eat', v_takeaway, 100),
    (p_household_id, 'uber eats', v_takeaway, 100),
    (p_household_id, 'terrys tatos', v_takeaway, 100),
    (p_household_id, '1886 bar', v_takeaway, 100),
    (p_household_id, 'dominos', v_takeaway, 10),
    (p_household_id, 'deliveroo', v_takeaway, 10),
    (p_household_id, 'mcdonald', v_takeaway, 10),
    (p_household_id, 'indian', v_takeaway, 10),
    (p_household_id, 'takeaway', v_takeaway, 10);

  -- Health
  INSERT INTO category_rules (household_id, keyword, category_id, priority) VALUES
    (p_household_id, 'beauty pie', v_health, 100),
    (p_household_id, 'dental', v_health, 10),
    (p_household_id, 'doctor', v_health, 10),
    (p_household_id, 'pharmacy', v_health, 10),
    (p_household_id, 'vitamins', v_health, 10),
    (p_household_id, 'medicine', v_health, 10);

  -- Entertainment
  INSERT INTO category_rules (household_id, keyword, category_id, priority) VALUES
    (p_household_id, 'palace cinema', v_entertainment, 100),
    (p_household_id, 'villa marina', v_entertainment, 100),
    (p_household_id, 'flight sim', v_entertainment, 100),
    (p_household_id, 'spad.next', v_entertainment, 100),
    (p_household_id, 'now tv', v_entertainment, 100),
    (p_household_id, 'netflix', v_entertainment, 10),
    (p_household_id, 'ifly', v_entertainment, 10),
    (p_household_id, 'hogwarts', v_entertainment, 10),
    (p_household_id, 'inibuilds', v_entertainment, 10);

  -- Subscriptions
  INSERT INTO category_rules (household_id, keyword, category_id, priority) VALUES
    (p_household_id, 'amazon prime', v_subscriptions, 100),
    (p_household_id, 'navigraph', v_subscriptions, 10),
    (p_household_id, 'nordvpn', v_subscriptions, 10),
    (p_household_id, 'adobe', v_subscriptions, 10),
    (p_household_id, 'spotify', v_subscriptions, 10),
    (p_household_id, 'disney+', v_subscriptions, 10),
    (p_household_id, 'lavazza', v_subscriptions, 10);

  -- Finance
  INSERT INTO category_rules (household_id, keyword, category_id, priority) VALUES
    (p_household_id, 'paypal - liverpool', v_finance, 100),
    (p_household_id, 'creation', v_finance, 10);

  -- Services
  INSERT INTO category_rules (household_id, keyword, category_id, priority) VALUES
    (p_household_id, 'sure - klaudia', v_services, 100),
    (p_household_id, 'revolut metal', v_services, 100),
    (p_household_id, 'natwest account', v_services, 100),
    (p_household_id, 'voxi', v_services, 10),
    (p_household_id, 'lyca', v_services, 10);

  -- Insurance
  INSERT INTO category_rules (household_id, keyword, category_id, priority) VALUES
    (p_household_id, 'car insurance', v_insurance, 100),
    (p_household_id, 'aviva', v_insurance, 10);

  -- Special
  INSERT INTO category_rules (household_id, keyword, category_id, priority) VALUES
    (p_household_id, 'castletown golf', v_special, 100),
    (p_household_id, 'specsavers', v_special, 10),
    (p_household_id, 'glasses', v_special, 10);

  -- Bank Transfers
  INSERT INTO category_rules (household_id, keyword, category_id, priority) VALUES
    (p_household_id, 'revolut', v_bank_transfers, 10);

END;
$$;
