-- Run this in Supabase SQL Editor if the main schema is already installed.
-- It lets everyone read only the admin-approved program, without opening admin tools.

create or replace function public.list_approved_program()
returns table (
  id uuid,
  title text,
  description text,
  day_date date,
  location text,
  place_id text,
  status text,
  current_version integer,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.title,
    p.description,
    p.day_date,
    p.location,
    p.place_id,
    p.status,
    p.current_version,
    p.created_at,
    p.updated_at
  from public.planning_proposals p
  where p.status = 'approved'
  order by p.day_date, p.created_at;
$$;

grant execute on function public.list_approved_program() to anon, authenticated;
