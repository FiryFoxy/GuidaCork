-- Fix for: new row violates row-level security policy for table "proposal_versions".
-- Run this once in Supabase SQL Editor if the full schema was already installed.

create or replace function public.record_proposal_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.current_version is distinct from old.current_version then
    insert into public.proposal_versions (
      proposal_id,
      version_number,
      title,
      description,
      day_date,
      location,
      place_id,
      changed_by
    )
    values (
      new.id,
      new.current_version,
      new.title,
      new.description,
      new.day_date,
      new.location,
      new.place_id,
      auth.uid()
    )
    on conflict (proposal_id, version_number) do nothing;
  end if;
  return new;
end;
$$;
