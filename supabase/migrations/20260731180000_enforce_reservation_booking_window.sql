create or replace function public.enforce_reservation_booking_window()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  reservation_starts_at timestamptz;
begin
  reservation_starts_at :=
    (new.reservation_date::date + new.start_time::time)
    at time zone 'Europe/Istanbul';

  if reservation_starts_at < now() + interval '3 hours' then
    raise exception using
      errcode = 'P0001',
      message = 'reservations_booking_window_violation',
      detail = 'Reservations must be created at least 3 hours before their start time.';
  end if;

  return new;
end;
$$;

drop trigger if exists reservations_enforce_booking_window
on public.reservations;

create trigger reservations_enforce_booking_window
before insert or update of reservation_date, start_time
on public.reservations
for each row
execute function public.enforce_reservation_booking_window();
