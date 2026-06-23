create table if not exists public.comissao_tecnicos (
  id uuid primary key default gen_random_uuid(),
  id_instalador integer not null,
  tecnico text not null,
  login text not null,
  cidade text not null default 'NATAL/PARNAMIRIM',
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comissao_tecnicos_id_instalador_key unique (id_instalador),
  constraint comissao_tecnicos_login_check check (length(trim(login)) > 0),
  constraint comissao_tecnicos_tecnico_check check (length(trim(tecnico)) > 0),
  constraint comissao_tecnicos_cidade_check check (cidade = 'NATAL/PARNAMIRIM')
);

create table if not exists public.comissao_servicos (
  id uuid primary key default gen_random_uuid(),
  id_comissionamento integer not null,
  produto text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comissao_servicos_id_comissionamento_key unique (id_comissionamento),
  constraint comissao_servicos_produto_check check (length(trim(produto)) > 0)
);

create index if not exists comissao_tecnicos_login_idx
  on public.comissao_tecnicos (upper(login));

create index if not exists comissao_tecnicos_cidade_ativo_idx
  on public.comissao_tecnicos (cidade, ativo);

create index if not exists comissao_servicos_ativo_idx
  on public.comissao_servicos (ativo);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_comissao_tecnicos_updated_at on public.comissao_tecnicos;
create trigger set_comissao_tecnicos_updated_at
before update on public.comissao_tecnicos
for each row
execute function public.set_updated_at();

drop trigger if exists set_comissao_servicos_updated_at on public.comissao_servicos;
create trigger set_comissao_servicos_updated_at
before update on public.comissao_servicos
for each row
execute function public.set_updated_at();

alter table public.comissao_tecnicos enable row level security;
alter table public.comissao_servicos enable row level security;

drop policy if exists "Admins can read commission technicians" on public.comissao_tecnicos;
create policy "Admins can read commission technicians"
on public.comissao_tecnicos
for select
to authenticated
using (public.current_profile_role() = 'admin');

drop policy if exists "Admins can manage commission technicians" on public.comissao_tecnicos;
create policy "Admins can manage commission technicians"
on public.comissao_tecnicos
for all
to authenticated
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');

drop policy if exists "Admins can read commission services" on public.comissao_servicos;
create policy "Admins can read commission services"
on public.comissao_servicos
for select
to authenticated
using (public.current_profile_role() = 'admin');

drop policy if exists "Admins can manage commission services" on public.comissao_servicos;
create policy "Admins can manage commission services"
on public.comissao_servicos
for all
to authenticated
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');
