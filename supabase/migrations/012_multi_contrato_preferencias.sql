-- Sprint J.1: multi-contrato — metadatos, preferencias y contrato activo

alter table public.contratos
  add column if not exists alias text not null default '',
  add column if not exists estado text not null default 'activo'
    check (estado in ('activo', 'archivado')),
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

drop index if exists public.contratos_user_id_unique;

create table if not exists public.preferencias_usuario (
  user_id uuid primary key references auth.users (id) on delete cascade,
  contrato_activo_id uuid references public.contratos (id) on delete set null,
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at_contratos()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists contratos_updated_at on public.contratos;

create trigger contratos_updated_at
before update on public.contratos
for each row
execute function public.set_updated_at_contratos();

create or replace function public.validar_contrato_activo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.contrato_activo_id is null then
    new.updated_at = now();
    return new;
  end if;

  if not exists (
    select 1
    from public.contratos c
    where c.id = new.contrato_activo_id
      and c.user_id = new.user_id
  ) then
    raise exception 'El contrato activo no pertenece al usuario';
  end if;

  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists validar_preferencias_contrato_activo on public.preferencias_usuario;

create trigger validar_preferencias_contrato_activo
before insert or update on public.preferencias_usuario
for each row
execute function public.validar_contrato_activo_usuario();

-- Backfill: contrato existente del usuario → preferencia activa
insert into public.preferencias_usuario (user_id, contrato_activo_id)
select distinct on (c.user_id)
  c.user_id,
  c.id
from public.contratos c
where c.user_id is not null
order by c.user_id, c.created_at asc, c.id asc
on conflict (user_id) do nothing;

alter table public.preferencias_usuario enable row level security;

drop policy if exists "preferencias_usuario_select_own" on public.preferencias_usuario;

create policy "preferencias_usuario_select_own"
on public.preferencias_usuario
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "preferencias_usuario_insert_own" on public.preferencias_usuario;

create policy "preferencias_usuario_insert_own"
on public.preferencias_usuario
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "preferencias_usuario_update_own" on public.preferencias_usuario;

create policy "preferencias_usuario_update_own"
on public.preferencias_usuario
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists contratos_user_id_estado_idx
  on public.contratos (user_id, estado);
