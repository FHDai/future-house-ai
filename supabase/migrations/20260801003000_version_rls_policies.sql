alter table public.facilities enable row level security;
alter table public.courts enable row level security;
alter table public.customers enable row level security;
alter table public.reservations enable row level security;

drop policy if exists "Users can view their own facilities"
on public.facilities;
create policy "Users can view their own facilities"
on public.facilities
for select
to authenticated
using ((select auth.uid()) = owner_id);

drop policy if exists "Users can create their own facilities"
on public.facilities;
create policy "Users can create their own facilities"
on public.facilities
for insert
to authenticated
with check ((select auth.uid()) = owner_id);

drop policy if exists "Users can update their own facilities"
on public.facilities;
create policy "Users can update their own facilities"
on public.facilities
for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

drop policy if exists "Users can delete their own facilities"
on public.facilities;
create policy "Users can delete their own facilities"
on public.facilities
for delete
to authenticated
using ((select auth.uid()) = owner_id);

drop policy if exists "Users can view courts of their own facilities"
on public.courts;
create policy "Users can view courts of their own facilities"
on public.courts
for select
to authenticated
using (
  exists (
    select 1
    from public.facilities
    where facilities.id = courts.facility_id
      and facilities.owner_id = (select auth.uid())
  )
);

drop policy if exists "Users can create courts for their own facilities"
on public.courts;
create policy "Users can create courts for their own facilities"
on public.courts
for insert
to authenticated
with check (
  exists (
    select 1
    from public.facilities
    where facilities.id = courts.facility_id
      and facilities.owner_id = (select auth.uid())
  )
);

drop policy if exists "Users can update courts of their own facilities"
on public.courts;
create policy "Users can update courts of their own facilities"
on public.courts
for update
to authenticated
using (
  exists (
    select 1
    from public.facilities
    where facilities.id = courts.facility_id
      and facilities.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.facilities
    where facilities.id = courts.facility_id
      and facilities.owner_id = (select auth.uid())
  )
);

drop policy if exists "Users can delete courts of their own facilities"
on public.courts;
create policy "Users can delete courts of their own facilities"
on public.courts
for delete
to authenticated
using (
  exists (
    select 1
    from public.facilities
    where facilities.id = courts.facility_id
      and facilities.owner_id = (select auth.uid())
  )
);

drop policy if exists "Users can view their own customers"
on public.customers;
create policy "Users can view their own customers"
on public.customers
for select
to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists "Users can create their own customers"
on public.customers;
create policy "Users can create their own customers"
on public.customers
for insert
to authenticated
with check (owner_id = (select auth.uid()));

drop policy if exists "Users can update their own customers"
on public.customers;
create policy "Users can update their own customers"
on public.customers
for update
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

drop policy if exists "Users can delete their own customers"
on public.customers;
create policy "Users can delete their own customers"
on public.customers
for delete
to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists "Users can view reservations of their own courts"
on public.reservations;
create policy "Users can view reservations of their own courts"
on public.reservations
for select
to authenticated
using (
  exists (
    select 1
    from public.courts
    join public.facilities
      on facilities.id = courts.facility_id
    where courts.id = reservations.court_id
      and facilities.owner_id = (select auth.uid())
  )
);

drop policy if exists "Users can create reservations for their own courts"
on public.reservations;
create policy "Users can create reservations for their own courts"
on public.reservations
for insert
to authenticated
with check (
  exists (
    select 1
    from public.courts
    join public.facilities
      on facilities.id = courts.facility_id
    where courts.id = reservations.court_id
      and facilities.owner_id = (select auth.uid())
  )
);

drop policy if exists "Users can update reservations of their own courts"
on public.reservations;
create policy "Users can update reservations of their own courts"
on public.reservations
for update
to authenticated
using (
  exists (
    select 1
    from public.courts
    join public.facilities
      on facilities.id = courts.facility_id
    where courts.id = reservations.court_id
      and facilities.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.courts
    join public.facilities
      on facilities.id = courts.facility_id
    where courts.id = reservations.court_id
      and facilities.owner_id = (select auth.uid())
  )
);

drop policy if exists "Users can delete reservations of their own courts"
on public.reservations;
create policy "Users can delete reservations of their own courts"
on public.reservations
for delete
to authenticated
using (
  exists (
    select 1
    from public.courts
    join public.facilities
      on facilities.id = courts.facility_id
    where courts.id = reservations.court_id
      and facilities.owner_id = (select auth.uid())
  )
);
