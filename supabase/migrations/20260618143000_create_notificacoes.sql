create table if not exists public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('importacao', 'cadastro_pendente', 'sistema')),
  titulo text not null,
  mensagem text not null,
  cidade text,
  origem text,
  actor_id uuid references auth.users(id) on delete set null,
  actor_nome text,
  target_role text not null default 'admin' check (target_role in ('admin', 'user', 'all')),
  target_user_id uuid references auth.users(id) on delete cascade,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.notificacoes enable row level security;

drop policy if exists "Ler notificacoes permitidas" on public.notificacoes;
create policy "Ler notificacoes permitidas"
on public.notificacoes
for select
to authenticated
using (
  target_role = 'all'
  or target_user_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.status_aprovacao = 'aprovado'
  )
);

drop policy if exists "Usuarios aprovados criam notificacoes" on public.notificacoes;
create policy "Usuarios aprovados criam notificacoes"
on public.notificacoes
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.status_aprovacao = 'aprovado'
  )
);

create index if not exists notificacoes_created_at_idx on public.notificacoes (created_at desc);
create index if not exists notificacoes_target_role_idx on public.notificacoes (target_role);
create index if not exists notificacoes_target_user_id_idx on public.notificacoes (target_user_id);
