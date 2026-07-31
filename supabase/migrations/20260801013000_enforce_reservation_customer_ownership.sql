create or replace function public.enforce_reservation_customer_ownership()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  customer_owner_id uuid;
  court_owner_id uuid;
begin
  if new.customer_id is null then
    return new;
  end if;

  select customers.owner_id
  into customer_owner_id
  from public.customers
  where customers.id = new.customer_id;

  select facilities.owner_id
  into court_owner_id
  from public.courts
  join public.facilities
    on facilities.id = courts.facility_id
  where courts.id = new.court_id;

  if customer_owner_id is null
    or court_owner_id is null
    or customer_owner_id <> court_owner_id
  then
    raise exception using
      errcode = 'P0001',
      message = 'reservation_customer_ownership_violation',
      detail = 'The reservation customer and court must belong to the same owner.';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_reservation_customer_ownership()
from public, anon, authenticated;

drop trigger if exists reservations_enforce_customer_ownership
on public.reservations;

create trigger reservations_enforce_customer_ownership
before insert or update of customer_id, court_id
on public.reservations
for each row
execute function public.enforce_reservation_customer_ownership();

comment on function public.enforce_reservation_customer_ownership() is
'Prevents reservations from referencing a customer owned by another tenant.';
