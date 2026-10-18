-- Apply to the existing table in the Supabase project reporting the lint.
-- Existing policies and grants are preserved. Without a matching policy,
-- ordinary API roles cannot access rows. See sql/README.md before applying.
alter table public.floorplan_annotations enable row level security;
