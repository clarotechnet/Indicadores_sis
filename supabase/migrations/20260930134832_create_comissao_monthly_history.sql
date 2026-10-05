create table if not exists public.comissao_periodos (
  id uuid primary key default gen_random_uuid(),
  competencia date not null,
  data_inicio date not null,
  data_fim date not null,
  cidade text not null,
  consultado_por uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comissao_periodos_cidade_competencia_key unique (cidade, competencia),
  constraint comissao_periodos_competencia_check check (extract(day from competencia) = 1),
  constraint comissao_periodos_datas_check check (
    data_inicio <= data_fim
    and date_trunc('month', data_inicio)::date = competencia
    and date_trunc('month', data_fim)::date = competencia
  )
);

create table if not exists public.comissao_periodo_tecnicos (
  id uuid primary key default gen_random_uuid(),
  periodo_id uuid not null references public.comissao_periodos(id) on delete cascade,
  id_instalador integer not null,
  tecnico_api text not null,
  tecnico text not null,
  login text,
  qtd_produtos integer not null default 0,
  qtd_contrato integer not null default 0,
  qtd_os integer not null default 0,
  total_valor numeric(14, 2) not null default 0,
  total_valor_instalador numeric(14, 2) not null default 0,
  total_valor_auxiliar numeric(14, 2) not null default 0,
  constraint comissao_periodo_tecnicos_periodo_instalador_key
    unique (periodo_id, id_instalador)
);

create table if not exists public.comissao_periodo_detalhes (
  id uuid primary key default gen_random_uuid(),
  periodo_id uuid not null references public.comissao_periodos(id) on delete cascade,
  id_instalador integer not null,
  tecnico_api text not null,
  tecnico text not null,
  login text,
  id_comissionamento integer not null,
  produto_api text not null,
  produto text not null,
  qtd_contrato integer not null default 0,
  qtd_os integer not null default 0,
  valor numeric(14, 2) not null default 0,
  valor_instalador numeric(14, 2) not null default 0,
  valor_auxiliar numeric(14, 2) not null default 0,
  constraint comissao_periodo_detalhes_periodo_item_key
    unique (periodo_id, id_instalador, id_comissionamento)
);

create index if not exists comissao_periodos_cidade_competencia_idx
  on public.comissao_periodos (cidade, competencia desc);

create index if not exists comissao_periodo_tecnicos_periodo_idx
  on public.comissao_periodo_tecnicos (periodo_id, qtd_contrato desc);

create index if not exists comissao_periodo_detalhes_periodo_instalador_idx
  on public.comissao_periodo_detalhes (periodo_id, id_instalador);

create index if not exists comissao_periodo_detalhes_periodo_servico_idx
  on public.comissao_periodo_detalhes (periodo_id, id_comissionamento);

drop trigger if exists set_comissao_periodos_updated_at on public.comissao_periodos;
create trigger set_comissao_periodos_updated_at
before update on public.comissao_periodos
for each row
execute function public.set_updated_at();

alter table public.comissao_periodos enable row level security;
alter table public.comissao_periodo_tecnicos enable row level security;
alter table public.comissao_periodo_detalhes enable row level security;

drop policy if exists "Admins can manage commission periods" on public.comissao_periodos;
create policy "Admins can manage commission periods"
on public.comissao_periodos
for all
to authenticated
using ((select public.current_profile_role()) = 'admin')
with check ((select public.current_profile_role()) = 'admin');

drop policy if exists "Admins can manage commission period technicians" on public.comissao_periodo_tecnicos;
create policy "Admins can manage commission period technicians"
on public.comissao_periodo_tecnicos
for all
to authenticated
using ((select public.current_profile_role()) = 'admin')
with check ((select public.current_profile_role()) = 'admin');

drop policy if exists "Admins can manage commission period details" on public.comissao_periodo_detalhes;
create policy "Admins can manage commission period details"
on public.comissao_periodo_detalhes
for all
to authenticated
using ((select public.current_profile_role()) = 'admin')
with check ((select public.current_profile_role()) = 'admin');

revoke all on table public.comissao_periodos from anon;
revoke all on table public.comissao_periodo_tecnicos from anon;
revoke all on table public.comissao_periodo_detalhes from anon;

grant select, insert, update, delete on table public.comissao_periodos to authenticated;
grant select, insert, update, delete on table public.comissao_periodo_tecnicos to authenticated;
grant select, insert, update, delete on table public.comissao_periodo_detalhes to authenticated;

create or replace function public.salvar_comissao_mensal(
  p_cidade text,
  p_data_inicio date,
  p_data_fim date,
  p_resumo jsonb,
  p_detalhado jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_competencia date;
  v_periodo_id uuid;
begin
  if (select public.current_profile_role()) is distinct from 'admin' then
    raise exception 'Apenas administradores podem salvar dados de comissão.';
  end if;

  if p_data_inicio is null or p_data_fim is null or p_data_inicio > p_data_fim then
    raise exception 'Período de comissão inválido.';
  end if;

  v_competencia := date_trunc('month', p_data_inicio)::date;

  if date_trunc('month', p_data_fim)::date <> v_competencia then
    raise exception 'A consulta deve ficar dentro de uma única competência mensal.';
  end if;

  if jsonb_typeof(p_resumo) <> 'array' or jsonb_typeof(p_detalhado) <> 'array' then
    raise exception 'Os dados de comissão devem ser enviados como listas JSON.';
  end if;

  insert into public.comissao_periodos (
    competencia,
    data_inicio,
    data_fim,
    cidade,
    consultado_por
  )
  values (
    v_competencia,
    p_data_inicio,
    p_data_fim,
    upper(trim(p_cidade)),
    auth.uid()
  )
  on conflict (cidade, competencia)
  do update set
    data_inicio = excluded.data_inicio,
    data_fim = excluded.data_fim,
    consultado_por = excluded.consultado_por,
    updated_at = now()
  returning id into v_periodo_id;

  delete from public.comissao_periodo_tecnicos
  where periodo_id = v_periodo_id;

  delete from public.comissao_periodo_detalhes
  where periodo_id = v_periodo_id;

  insert into public.comissao_periodo_tecnicos (
    periodo_id,
    id_instalador,
    tecnico_api,
    tecnico,
    login,
    qtd_produtos,
    qtd_contrato,
    qtd_os,
    total_valor,
    total_valor_instalador,
    total_valor_auxiliar
  )
  select
    v_periodo_id,
    source.id_instalador,
    coalesce(max(nullif(trim(source.nome_abreviado), '')), 'Instalador ' || source.id_instalador),
    coalesce(
      max(nullif(trim(mapping.tecnico), '')),
      max(nullif(trim(source.nome_abreviado), '')),
      'Instalador ' || source.id_instalador
    ),
    max(nullif(trim(mapping.login), '')),
    coalesce(max(source.qtd_produtos), 0),
    coalesce(sum(source.qtd_contrato), 0),
    coalesce(sum(source.qtd_os), 0),
    coalesce(sum(source.total_valor), 0),
    coalesce(sum(source.total_valor_instalador), 0),
    coalesce(sum(source.total_valor_auxiliar), 0)
  from (
    select
      item."IdInstalador" as id_instalador,
      item."NomeAbreviado" as nome_abreviado,
      item."QtdProdutos" as qtd_produtos,
      item."QtdContrato" as qtd_contrato,
      item."QtdOs" as qtd_os,
      item."TotalValor" as total_valor,
      item."TotalValorInstalador" as total_valor_instalador,
      item."TotalValorAuxiliar" as total_valor_auxiliar
    from jsonb_to_recordset(p_resumo) as item(
      "IdInstalador" integer,
      "NomeAbreviado" text,
      "QtdProdutos" integer,
      "QtdContrato" integer,
      "QtdOs" integer,
      "TotalValor" numeric,
      "TotalValorInstalador" numeric,
      "TotalValorAuxiliar" numeric
    )
  ) source
  left join public.comissao_tecnicos mapping
    on mapping.id_instalador = source.id_instalador
   and mapping.cidade = upper(trim(p_cidade))
  where source.id_instalador is not null
  group by source.id_instalador;

  insert into public.comissao_periodo_detalhes (
    periodo_id,
    id_instalador,
    tecnico_api,
    tecnico,
    login,
    id_comissionamento,
    produto_api,
    produto,
    qtd_contrato,
    qtd_os,
    valor,
    valor_instalador,
    valor_auxiliar
  )
  select
    v_periodo_id,
    source.id_instalador,
    coalesce(max(nullif(trim(source.nome_abreviado), '')), 'Instalador ' || source.id_instalador),
    coalesce(
      max(nullif(trim(tecnico_mapping.tecnico), '')),
      max(nullif(trim(source.nome_abreviado), '')),
      'Instalador ' || source.id_instalador
    ),
    max(nullif(trim(tecnico_mapping.login), '')),
    source.id_comissionamento,
    coalesce(max(nullif(trim(source.produto_api), '')), 'Serviço ' || source.id_comissionamento),
    coalesce(
      max(nullif(trim(servico_mapping.produto), '')),
      max(nullif(trim(source.produto_api), '')),
      'Serviço ' || source.id_comissionamento
    ),
    coalesce(sum(source.qtd_contrato), 0),
    coalesce(sum(source.qtd_os), 0),
    coalesce(sum(source.valor), 0),
    coalesce(sum(source.valor_instalador), 0),
    coalesce(sum(source.valor_auxiliar), 0)
  from (
    select
      item."IdInstalador" as id_instalador,
      item."NomeAbreviado" as nome_abreviado,
      item."IdComissionamento" as id_comissionamento,
      item."Produto" as produto_api,
      item."QtdContrato" as qtd_contrato,
      item."QtdOs" as qtd_os,
      item."Valor" as valor,
      item."ValorInstalador" as valor_instalador,
      item."ValorAuxiliar" as valor_auxiliar
    from jsonb_to_recordset(p_detalhado) as item(
      "IdInstalador" integer,
      "NomeAbreviado" text,
      "IdComissionamento" integer,
      "Produto" text,
      "QtdContrato" integer,
      "QtdOs" integer,
      "Valor" numeric,
      "ValorInstalador" numeric,
      "ValorAuxiliar" numeric
    )
  ) source
  left join public.comissao_tecnicos tecnico_mapping
    on tecnico_mapping.id_instalador = source.id_instalador
   and tecnico_mapping.cidade = upper(trim(p_cidade))
  left join public.comissao_servicos servico_mapping
    on servico_mapping.id_comissionamento = source.id_comissionamento
  where source.id_instalador is not null
    and source.id_comissionamento is not null
  group by source.id_instalador, source.id_comissionamento;

  return v_periodo_id;
end;
$$;

revoke all on function public.salvar_comissao_mensal(text, date, date, jsonb, jsonb) from public;
grant execute on function public.salvar_comissao_mensal(text, date, date, jsonb, jsonb) to authenticated;
