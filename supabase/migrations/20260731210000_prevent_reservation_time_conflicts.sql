create extension if not exists btree_gist;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reservations_no_time_overlap'
      and conrelid = 'public.reservations'::regclass
  ) then
    alter table public.reservations
      add constraint reservations_no_time_overlap
      exclude using gist (
        court_id with =,
        reservation_date with =,
        tsrange(
          reservation_date + start_time,
          reservation_date + end_time,
          '[)'
        ) with &&
      )
      where (status <> 'cancelled');
  end if;
end;
$$;

comment on constraint reservations_no_time_overlap
on public.reservations is
'Prevents overlapping active reservations for the same court and date.';
