-- Supports the admin path: city equality, date range and keyset pagination.
create index if not exists km_tecnica_cidade_data_id_idx
  on public.km_tecnica (cidade, data, id);

-- Supports the technician path and matches the normalized login used by RLS.
create index if not exists km_tecnica_cidade_login_data_id_idx
  on public.km_tecnica (cidade, upper(login_tecnico), data, id);

-- Cache profile lookups once per statement instead of evaluating them per row.
drop policy if exists "Technet km tecnica select" on public.km_tecnica;
create policy "Technet km tecnica select"
on public.km_tecnica
for select
to authenticated
using (
  (select public.current_profile_role()) in ('admin', 'user')
  or (
    (select public.current_profile_role()) = 'tecnico'
    and upper(login_tecnico) = (select public.current_profile_login_tecnico())
  )
);

analyze public.km_tecnica;
