create table if not exists public.reservation_audit_logs (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null,
  court_id uuid not null,
  operation text not null
    check (operation in ('INSERT', 'UPDATE', 'DELETE')),
  old_record jsonb,
  new_record jsonb,
  changed_by uuid,
  changed_at timestamptz not null default now()
);

create index if not exists reservation_audit_logs_reservation_id_idx
on public.reservation_audit_logs (reservation_id, changed_at desc);

create index if not exists reservation_audit_logs_court_id_idx
on public.reservation_audit_logs (court_id);

alter table public.reservation_audit_logs
enable row level security;

drop policy if exists "Users can view audit logs of their own courts"
on public.reservation_audit_logs;
create policy "Users can view audit logs of their own courts"
on public.reservation_audit_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.courts
    join public.facilities
      on facilities.id = courts.facility_id
    where courts.id = reservation_audit_logs.court_id
      and facilities.owner_id = (select auth.uid())
  )
);

revoke all on table public.reservation_audit_logs
from anon, authenticated;
grant select on table public.reservation_audit_logs
to authenticated;

create or replace function public.log_reservation_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  audit_reservation_id uuid;
  audit_court_id uuid;
begin
  if tg_op = 'DELETE' then
    audit_reservation_id := old.id;
    audit_court_id := old.court_id;
  else
    audit_reservation_id := new.id;
    audit_court_id := new.court_id;
  end if;

  insert into public.reservation_audit_logs (
    reservation_id,
    court_id,
    operation,
    old_record,
    new_record,
    changed_by
  )
  values (
    audit_reservation_id,
    audit_court_id,
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE')
      then to_jsonb(old)
      else null
    end,
    case when tg_op in ('INSERT', 'UPDATE')
      then to_jsonb(new)
      else null
    end,
    auth.uid()
  );

  return null;
end;
$$;

revoke all on function public.log_reservation_change()
from public, anon, authenticated;

drop trigger if exists reservations_write_audit_log
on public.reservations;

create trigger reservations_write_audit_log
after insert or update or delete
on public.reservations
for each row
execute function public.log_reservation_change();

comment on table public.reservation_audit_logs is
'Immutable history of reservation inserts, updates and deletes.';
