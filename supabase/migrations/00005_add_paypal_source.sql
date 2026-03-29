ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_source_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_source_check
  CHECK (source IN ('revolut', 'natwest', 'manual', 'notification', 'paypal'));

ALTER TABLE import_batches DROP CONSTRAINT IF EXISTS import_batches_bank_type_check;
ALTER TABLE import_batches ADD CONSTRAINT import_batches_bank_type_check
  CHECK (bank_type IN ('revolut', 'natwest', 'paypal'));
