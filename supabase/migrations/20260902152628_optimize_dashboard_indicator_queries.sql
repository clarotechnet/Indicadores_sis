-- Supports city-wide dashboard pagination ordered by date, login and id.
create index if not exists indicadores_tecnicos_cidade_data_login_id_idx
  on public.indicadores_tecnicos (cidade, data_referencia, login, id);

create index if not exists horario_primeiro_cliente_cidade_data_login_id_idx
  on public.horario_primeiro_cliente (cidade, data_referencia, login, id);

-- Supports the technician path and the normalized login comparison used by RLS.
create index if not exists indicadores_tecnicos_cidade_login_data_id_idx
  on public.indicadores_tecnicos (cidade, upper(login), data_referencia, id);

create index if not exists horario_primeiro_cliente_cidade_login_data_id_idx
  on public.horario_primeiro_cliente (cidade, upper(login), data_referencia, id);

-- Cache profile lookups once per statement instead of evaluating them for every row.
drop policy if exists "Technet indicadores select" on public.indicadores_tecnicos;
create policy "Technet indicadores select"
on public.indicadores_tecnicos
for select
to authenticated
using (
  (select public.current_profile_role()) in ('admin', 'user')
  or (
    (select public.current_profile_role()) = 'tecnico'
    and upper(login) = (select public.current_profile_login_tecnico())
  )
);

drop policy if exists "Technet horario primeiro cliente select" on public.horario_primeiro_cliente;
create policy "Technet horario primeiro cliente select"
on public.horario_primeiro_cliente
for select
to authenticated
using (
  (select public.current_profile_role()) in ('admin', 'user')
  or (
    (select public.current_profile_role()) = 'tecnico'
    and upper(login) = (select public.current_profile_login_tecnico())
  )
);

analyze public.indicadores_tecnicos;
analyze public.horario_primeiro_cliente;
