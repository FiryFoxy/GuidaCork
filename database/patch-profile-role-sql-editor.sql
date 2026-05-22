-- Fix for: Solo un admin puo modificare ruolo o stato.
-- Run this once in Supabase SQL Editor if you manage users manually there.

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Supabase SQL Editor/backend maintenance runs without an auth.uid().
  -- Keep frontend users restricted, but allow trusted database-side edits.
  if auth.uid() is null then
    return new;
  end if;

  if not public.is_admin(auth.uid()) and (new.role is distinct from old.role or new.status is distinct from old.status) then
    raise exception 'Solo un admin puo modificare ruolo o stato.';
  end if;

  return new;
end;
$$;
