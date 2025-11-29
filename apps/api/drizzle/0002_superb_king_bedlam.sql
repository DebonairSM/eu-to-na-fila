-- Add avatar_url and is_present columns to barbers table
ALTER TABLE barbers ADD COLUMN avatar_url TEXT;
ALTER TABLE barbers ADD COLUMN is_present INTEGER DEFAULT 1 NOT NULL;

-- Note: service_id on tickets remains NOT NULL in SQLite (changing would require table recreation)
-- Application can use a default service when none is specified
