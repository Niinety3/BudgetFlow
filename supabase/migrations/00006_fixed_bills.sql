ALTER TABLE settings ADD COLUMN IF NOT EXISTS fixed_bills JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE settings SET fixed_bills = '[{"name": "Electric", "amount": 209}, {"name": "Broadband (Manx Telecom)", "amount": 51.65}]'::jsonb
WHERE fixed_bills = '[]'::jsonb;
