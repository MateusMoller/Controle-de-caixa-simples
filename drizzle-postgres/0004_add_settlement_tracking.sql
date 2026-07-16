ALTER TABLE entries ADD COLUMN IF NOT EXISTS paid_amount_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS settlement_date TEXT;
ALTER TABLE entries ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'Não informado';
UPDATE entries SET paid_amount_cents = amount_cents, settlement_date = COALESCE(settlement_date, due_date) WHERE paid = TRUE AND paid_amount_cents = 0;
