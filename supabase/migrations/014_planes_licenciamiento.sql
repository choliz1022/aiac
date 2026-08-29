-- Sprint P.1: infraestructura de planes (catálogo, suscripciones, overrides)

create table if not exists public.features (
  id text primary key,
  nombre text not null,
  descripcion text not null default '',
  categoria text not null default 'general'
    check (categoria in ('contratos', 'informes', 'ia', 'general')),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.planes (
  id text primary key,
  nombre text not null,
  descripcion text not null default '',
  max_contratos integer check (max_contratos is null or max_contratos >= 1),
  activo boolean not null default true,
  orden integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.plan_features (
  plan_id text not null references public.planes (id) on delete cascade,
  feature_id text not null references public.features (id) on delete cascade,
  primary key (plan_id, feature_id)
);

create table if not exists public.suscripciones_usuario (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan_id text not null references public.planes (id),
  estado text not null default 'activa'
    check (estado in ('activa', 'suspendida', 'cancelada')),
  inicio_en timestamptz not null default now(),
  fin_en timestamptz,
  origen text not null default 'manual',
  notas text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.usuario_feature_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  feature_id text not null references public.features (id) on delete cascade,
  habilitado boolean not null,
  motivo text not null default '',
  expira_en timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, feature_id)
);

create index if not exists suscripciones_usuario_plan_id_idx
  on public.suscripciones_usuario (plan_id);

create index if not exists usuario_feature_overrides_user_id_idx
  on public.usuario_feature_overrides (user_id);

create or replace function public.set_updated_at_suscripciones_usuario()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists suscripciones_usuario_updated_at on public.suscripciones_usuario;

create trigger suscripciones_usuario_updated_at
before update on public.suscripciones_usuario
for each row
execute function public.set_updated_at_suscripciones_usuario();

alter table public.features enable row level security;
alter table public.planes enable row level security;
alter table public.plan_features enable row level security;
alter table public.suscripciones_usuario enable row level security;
alter table public.usuario_feature_overrides enable row level security;

drop policy if exists "features_select_authenticated" on public.features;

create policy "features_select_authenticated"
on public.features
for select
to authenticated
using (true);

drop policy if exists "planes_select_authenticated" on public.planes;

create policy "planes_select_authenticated"
on public.planes
for select
to authenticated
using (true);

drop policy if exists "plan_features_select_authenticated" on public.plan_features;

create policy "plan_features_select_authenticated"
on public.plan_features
for select
to authenticated
using (true);

drop policy if exists "suscripciones_usuario_select_own" on public.suscripciones_usuario;

create policy "suscripciones_usuario_select_own"
on public.suscripciones_usuario
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "usuario_feature_overrides_select_own" on public.usuario_feature_overrides;

create policy "usuario_feature_overrides_select_own"
on public.usuario_feature_overrides
for select
to authenticated
using (auth.uid() = user_id);
