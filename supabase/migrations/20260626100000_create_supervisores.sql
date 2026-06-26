create table if not exists public.supervisores (
  id bigint generated always as identity primary key,
  nome text not null,
  cidade text not null,
  nome_normalizado text generated always as (upper(trim(nome))) stored,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint supervisores_nome_check check (length(trim(nome)) > 0),
  constraint supervisores_cidade_check check (length(trim(cidade)) > 0)
);

create unique index if not exists supervisores_cidade_nome_normalizado_key
  on public.supervisores (cidade, nome_normalizado);

create index if not exists supervisores_cidade_ativo_nome_idx
  on public.supervisores (cidade, ativo, nome);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_supervisores_updated_at on public.supervisores;
create trigger set_supervisores_updated_at
before update on public.supervisores
for each row
execute function public.set_updated_at();

insert into public.supervisores (nome, cidade)
select distinct trim(dados.supervisor), trim(dados.cidade)
from public.dados_tecnicos dados
where nullif(trim(dados.supervisor), '') is not null
  and nullif(trim(dados.cidade), '') is not null
on conflict do nothing;

alter table public.supervisores enable row level security;

drop policy if exists "Technet supervisores admin select" on public.supervisores;
create policy "Technet supervisores admin select"
on public.supervisores
for select
to authenticated
using (public.current_profile_role() = 'admin');

drop policy if exists "Technet supervisores admin manage" on public.supervisores;
create policy "Technet supervisores admin manage"
on public.supervisores
for all
to authenticated
using (public.current_profile_role() = 'admin')
with check (public.current_profile_role() = 'admin');
