-- Cache for the Airtable leads table (SPEC.md, "שכבת השרת ב-Supabase").
-- Airtable's free plan allows 1,000 API calls a month per workspace, and a
-- full read of 260 leads costs 3 calls, so the Edge Function keeps the last
-- read here and serves it for 15 minutes.
create table if not exists public.leads_cache (
  id smallint primary key default 1 check (id = 1),
  records jsonb not null default '[]'::jsonb,
  fetched_at timestamptz not null default now()
);

comment on table public.leads_cache is
  'Single-row cache of the Airtable Leads table, written only by the leads Edge Function.';

-- Row level security on, with no policies: the public anon and authenticated
-- roles cannot read or write this table. Only the Edge Function, which uses
-- the service role, can.
alter table public.leads_cache enable row level security;
