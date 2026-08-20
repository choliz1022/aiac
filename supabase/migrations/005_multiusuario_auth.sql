-- Multiusuario básico: user_id + RLS + triggers
-- Ejecutar en Supabase SQL Editor.
-- Tras registrar al usuario bootstrap, ejecutar:
--   select public.asignar_datos_legacy_a_usuario('<uuid-del-usuario>');

alter table public.contratos
add column if not exists user_id uuid references auth.users (id) on delete cascade;

alter table public.actividades
add column if not exists user_id uuid references auth.users (id) on delete cascade;

alter table public.configuracion_ia
add column if not exists user_id uuid references auth.users (id) on delete cascade;

create index if not exists contratos_user_id_idx on public.contratos (user_id);

create index if not exists actividades_user_id_idx on public.actividades (user_id);

create index if not exists configuracion_ia_user_id_idx on public.configuracion_ia (user_id);

create unique index if not exists contratos_user_id_unique
on public.contratos (user_id)
where user_id is not null;

create unique index if not exists configuracion_ia_user_id_unique
on public.configuracion_ia (user_id)
where user_id is not null;

create or replace function public.asignar_datos_legacy_a_usuario(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    raise exception 'user_id es obligatorio';
  end if;

  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'El usuario no existe en auth.users';
  end if;

  update public.contratos
  set user_id = p_user_id
  where user_id is null;

  update public.configuracion_ia
  set user_id = p_user_id
  where user_id is null;

  update public.actividades
  set user_id = p_user_id
  where user_id is null;

  update public.actividades a
  set user_id = c.user_id
  from public.contratos c
  where a.contrato_id = c.id
    and c.user_id is not null
    and (a.user_id is null or a.user_id <> c.user_id);
end;
$$;

create or replace function public.set_user_id_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;

  if auth.uid() is null then
    raise exception 'Se requiere sesión autenticada';
  end if;

  if new.user_id is distinct from auth.uid() then
    raise exception 'No autorizado: user_id no coincide con la sesión';
  end if;

  return new;
end;
$$;

create or replace function public.validar_actividad_user_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  contrato_user_id uuid;
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;

  if auth.uid() is null then
    raise exception 'Se requiere sesión autenticada';
  end if;

  if new.user_id is distinct from auth.uid() then
    raise exception 'No autorizado: user_id no coincide con la sesión';
  end if;

  select user_id into contrato_user_id
  from public.contratos
  where id = new.contrato_id;

  if contrato_user_id is null then
    raise exception 'El contrato referenciado no existe o no tiene propietario';
  end if;

  if contrato_user_id <> new.user_id then
    raise exception 'El contrato no pertenece al usuario autenticado';
  end if;

  return new;
end;
$$;

drop trigger if exists set_contratos_user_id on public.contratos;

create trigger set_contratos_user_id
before insert or update on public.contratos
for each row
execute function public.set_user_id_from_auth();

drop trigger if exists set_configuracion_ia_user_id on public.configuracion_ia;

create trigger set_configuracion_ia_user_id
before insert or update on public.configuracion_ia
for each row
execute function public.set_user_id_from_auth();

drop trigger if exists validar_actividad_user_id on public.actividades;

create trigger validar_actividad_user_id
before insert or update on public.actividades
for each row
execute function public.validar_actividad_user_id();

alter table public.configuracion_ia enable row level security;

drop policy if exists "Permitir lectura de configuracion_ia" on public.configuracion_ia;

drop policy if exists "Permitir insercion de configuracion_ia" on public.configuracion_ia;

drop policy if exists "Permitir actualizacion de configuracion_ia" on public.configuracion_ia;

drop policy if exists "configuracion_ia_select_own" on public.configuracion_ia;

create policy "configuracion_ia_select_own"
on public.configuracion_ia
for select
using (auth.uid() = user_id);

drop policy if exists "configuracion_ia_insert_own" on public.configuracion_ia;

create policy "configuracion_ia_insert_own"
on public.configuracion_ia
for insert
with check (auth.uid() = user_id);

drop policy if exists "configuracion_ia_update_own" on public.configuracion_ia;

create policy "configuracion_ia_update_own"
on public.configuracion_ia
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

alter table public.contratos enable row level security;

drop policy if exists "contratos_select_own" on public.contratos;

create policy "contratos_select_own"
on public.contratos
for select
using (auth.uid() = user_id);

drop policy if exists "contratos_insert_own" on public.contratos;

create policy "contratos_insert_own"
on public.contratos
for insert
with check (auth.uid() = user_id);

drop policy if exists "contratos_update_own" on public.contratos;

create policy "contratos_update_own"
on public.contratos
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

alter table public.actividades enable row level security;

drop policy if exists "actividades_select_own" on public.actividades;

create policy "actividades_select_own"
on public.actividades
for select
using (auth.uid() = user_id);

drop policy if exists "actividades_insert_own" on public.actividades;

create policy "actividades_insert_own"
on public.actividades
for insert
with check (auth.uid() = user_id);

drop policy if exists "actividades_update_own" on public.actividades;

create policy "actividades_update_own"
on public.actividades
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
