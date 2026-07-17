ALTER TABLE entries ADD COLUMN IF NOT EXISTS issue_date TEXT;
UPDATE entries SET issue_date = due_date WHERE issue_date IS NULL;
ALTER TABLE entries ALTER COLUMN issue_date SET NOT NULL;
