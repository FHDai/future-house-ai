do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reservations_max_two_hours'
      and conrelid = 'public.reservations'::regclass
  ) then
    alter table public.reservations
      add constraint reservations_max_two_hours
      check (
        end_time > start_time
        and end_time - start_time <= interval '2 hours'
      );
  end if;
end;
$$;

comment on constraint reservations_max_two_hours
on public.reservations is
'Limits standard reservations to a maximum duration of two hours.';
