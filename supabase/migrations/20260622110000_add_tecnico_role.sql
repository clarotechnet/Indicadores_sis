alter table public.profiles
  add column if not exists login_tecnico text;

alter table public.solicitacoes_acesso
  add column if not exists login_tecnico text;

update public.profiles
set login_tecnico = upper(trim(login_tecnico))
where login_tecnico is not null;

update public.solicitacoes_acesso
set login_tecnico = upper(trim(login_tecnico))
where login_tecnico is not null;

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'user', 'tecnico'));

alter table public.solicitacoes_acesso
  drop constraint if exists solicitacoes_acesso_role_solicitado_check;

alter table public.solicitacoes_acesso
  add constraint solicitacoes_acesso_role_solicitado_check
  check (role_solicitado in ('admin', 'user', 'tecnico'));

alter table public.profiles
  drop constraint if exists profiles_tecnico_login_required;

alter table public.profiles
  add constraint profiles_tecnico_login_required
  check (role <> 'tecnico' or nullif(trim(login_tecnico), '') is not null);

alter table public.solicitacoes_acesso
  drop constraint if exists solicitacoes_tecnico_login_required;

alter table public.solicitacoes_acesso
  add constraint solicitacoes_tecnico_login_required
  check (role_solicitado <> 'tecnico' or nullif(trim(login_tecnico), '') is not null);

create index if not exists profiles_login_tecnico_idx
  on public.profiles (upper(login_tecnico))
  where login_tecnico is not null;

create index if not exists solicitacoes_acesso_login_tecnico_idx
  on public.solicitacoes_acesso (upper(login_tecnico))
  where login_tecnico is not null;

create index if not exists dados_tecnicos_login_idx
  on public.dados_tecnicos (upper(login));

create index if not exists indicadores_tecnicos_login_idx
  on public.indicadores_tecnicos (upper(login));

create index if not exists horario_primeiro_cliente_login_idx
  on public.horario_primeiro_cliente (upper(login));

create index if not exists horario_entrada_tecnico_login_idx
  on public.horario_entrada_tecnico (upper(login_tecnico));

create index if not exists km_tecnica_login_tecnico_idx
  on public.km_tecnica (upper(login_tecnico));

create index if not exists transporte_tecnico_login_idx
  on public.transporte_tecnico (upper(login));

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
    and p.status_aprovacao = 'aprovado'
  limit 1
$$;

create or replace function public.current_profile_login_tecnico()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select upper(trim(p.login_tecnico))
  from public.profiles p
  where p.id = auth.uid()
    and p.status_aprovacao = 'aprovado'
  limit 1
$$;

alter table public.profiles enable row level security;
alter table public.solicitacoes_acesso enable row level security;
alter table public.dados_tecnicos enable row level security;
alter table public.indicadores_tecnicos enable row level security;
alter table public.horario_primeiro_cliente enable row level security;
alter table public.horario_entrada_tecnico enable row level security;
alter table public.km_tecnica enable row level security;
alter table public.transporte_tecnico enable row level security;

do $$
declare
  policy_item record;
begin
  for policy_item in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles',
        'solicitacoes_acesso',
        'dados_tecnicos',
        'indicadores_tecnicos',
        'horario_primeiro_cliente',
        'horario_entrada_tecnico',
        'km_tecnica',
        'transporte_tecnico'
      )
      and policyname not like 'Technet %'
  loop
    execute format('drop policy if exists %I on public.%I', policy_item.policyname, policy_item.tablename);
  end loop;
end $$;

drop policy if exists "Technet profiles select" on public.profiles;
create policy "Technet profiles select"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.current_profile_role() = 'admin'
);

drop policy if exists "Technet profiles admin manage" on public.profiles;
create policy "Technet profiles admin manage"
on public.profiles
for all
to authenticated
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

drop policy if exists "Technet access requests select" on public.solicitacoes_acesso;
create policy "Technet access requests select"
on public.solicitacoes_acesso
for select
to authenticated
using (
  user_id = auth.uid()
  or public.current_profile_role() = 'admin'
);

drop policy if exists "Technet access requests insert own" on public.solicitacoes_acesso;
create policy "Technet access requests insert own"
on public.solicitacoes_acesso
for insert
to authenticated
with check (
  user_id = auth.uid()
  and status = 'pendente'
  and role_solicitado in ('admin', 'user', 'tecnico')
  and (role_solicitado <> 'tecnico' or nullif(trim(login_tecnico), '') is not null)
);

drop policy if exists "Technet access requests admin manage" on public.solicitacoes_acesso;
create policy "Technet access requests admin manage"
on public.solicitacoes_acesso
for all
to authenticated
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

drop policy if exists "Technet dados tecnicos select" on public.dados_tecnicos;
create policy "Technet dados tecnicos select"
on public.dados_tecnicos
for select
to authenticated
using (
  public.current_profile_role() in ('admin', 'user')
  or (
    public.current_profile_role() = 'tecnico'
    and upper(login) = public.current_profile_login_tecnico()
  )
);

drop policy if exists "Technet dados tecnicos admin manage" on public.dados_tecnicos;
create policy "Technet dados tecnicos admin manage"
on public.dados_tecnicos
for all
to authenticated
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

drop policy if exists "Technet indicadores select" on public.indicadores_tecnicos;
create policy "Technet indicadores select"
on public.indicadores_tecnicos
for select
to authenticated
using (
  public.current_profile_role() in ('admin', 'user')
  or (
    public.current_profile_role() = 'tecnico'
    and upper(login) = public.current_profile_login_tecnico()
  )
);

drop policy if exists "Technet indicadores admin manage" on public.indicadores_tecnicos;
create policy "Technet indicadores admin manage"
on public.indicadores_tecnicos
for all
to authenticated
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

drop policy if exists "Technet horario primeiro cliente select" on public.horario_primeiro_cliente;
create policy "Technet horario primeiro cliente select"
on public.horario_primeiro_cliente
for select
to authenticated
using (
  public.current_profile_role() in ('admin', 'user')
  or (
    public.current_profile_role() = 'tecnico'
    and upper(login) = public.current_profile_login_tecnico()
  )
);

drop policy if exists "Technet horario primeiro cliente admin manage" on public.horario_primeiro_cliente;
create policy "Technet horario primeiro cliente admin manage"
on public.horario_primeiro_cliente
for all
to authenticated
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

drop policy if exists "Technet horario entrada tecnico select" on public.horario_entrada_tecnico;
create policy "Technet horario entrada tecnico select"
on public.horario_entrada_tecnico
for select
to authenticated
using (
  public.current_profile_role() in ('admin', 'user')
  or (
    public.current_profile_role() = 'tecnico'
    and upper(login_tecnico) = public.current_profile_login_tecnico()
  )
);

drop policy if exists "Technet horario entrada tecnico admin manage" on public.horario_entrada_tecnico;
create policy "Technet horario entrada tecnico admin manage"
on public.horario_entrada_tecnico
for all
to authenticated
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

drop policy if exists "Technet km tecnica select" on public.km_tecnica;
create policy "Technet km tecnica select"
on public.km_tecnica
for select
to authenticated
using (
  public.current_profile_role() in ('admin', 'user')
  or (
    public.current_profile_role() = 'tecnico'
    and upper(login_tecnico) = public.current_profile_login_tecnico()
  )
);

drop policy if exists "Technet km tecnica admin manage" on public.km_tecnica;
create policy "Technet km tecnica admin manage"
on public.km_tecnica
for all
to authenticated
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

drop policy if exists "Technet transporte tecnico select" on public.transporte_tecnico;
create policy "Technet transporte tecnico select"
on public.transporte_tecnico
for select
to authenticated
using (
  public.current_profile_role() in ('admin', 'user')
  or (
    public.current_profile_role() = 'tecnico'
    and upper(login) = public.current_profile_login_tecnico()
  )
);

drop policy if exists "Technet transporte tecnico admin manage" on public.transporte_tecnico;
create policy "Technet transporte tecnico admin manage"
on public.transporte_tecnico
for all
to authenticated
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');
