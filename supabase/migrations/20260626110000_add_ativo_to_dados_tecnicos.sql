alter table public.dados_tecnicos
  add column if not exists ativo boolean;

update public.dados_tecnicos
set ativo = true
where ativo is null;

alter table public.dados_tecnicos
  alter column ativo set default true;

alter table public.dados_tecnicos
  alter column ativo set not null;

create index if not exists dados_tecnicos_cidade_ativo_login_idx
  on public.dados_tecnicos (cidade, ativo, login);

