-- Sprint J.1: multi-contrato — configuracion_ia por contrato, RLS e índices

alter table public.configuracion_ia
  add column if not exists contrato_id uuid references public.contratos (id) on delete cascade;

-- Backfill sin sesión auth (SQL Editor): deshabilitar triggers que exigen auth.uid()
alter table public.configuracion_ia disable trigger set_configuracion_ia_user_id;

begin;

update public.configuracion_ia ci
set contrato_id = c.id
from (
  select distinct on (user_id)
    user_id,
    id
  from public.contratos
  where user_id is not null
  order by user_id, created_at asc, id asc
) c
where ci.contrato_id is null
  and ci.user_id = c.user_id;

update public.preferencias_usuario p
set contrato_activo_id = ci.contrato_id,
    updated_at = now()
from public.configuracion_ia ci
where p.user_id = ci.user_id
  and ci.contrato_id is not null
  and p.contrato_activo_id is null;

commit;

alter table public.configuracion_ia enable trigger set_configuracion_ia_user_id;

drop index if exists public.configuracion_ia_user_id_unique;

create unique index if not exists configuracion_ia_contrato_id_unique
  on public.configuracion_ia (contrato_id)
  where contrato_id is not null;

create or replace function public.validar_configuracion_ia_contrato()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.contrato_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.contratos c
    where c.id = new.contrato_id
      and c.user_id = new.user_id
  ) then
    raise exception 'La configuracion_ia no pertenece al contrato del usuario';
  end if;

  return new;
end;
$$;

drop trigger if exists validar_configuracion_ia_contrato on public.configuracion_ia;

create trigger validar_configuracion_ia_contrato
before insert or update on public.configuracion_ia
for each row
execute function public.validar_configuracion_ia_contrato();

drop policy if exists "configuracion_ia_select_own" on public.configuracion_ia;

create policy "configuracion_ia_select_own"
on public.configuracion_ia
for select
to authenticated
using (
  (
    contrato_id is not null
    and exists (
      select 1
      from public.contratos c
      where c.id = contrato_id
        and c.user_id = auth.uid()
    )
  )
  or (
    contrato_id is null
    and auth.uid() = user_id
  )
);

drop policy if exists "configuracion_ia_insert_own" on public.configuracion_ia;

create policy "configuracion_ia_insert_own"
on public.configuracion_ia
for insert
to authenticated
with check (
  auth.uid() = user_id
  and (
    contrato_id is null
    or exists (
      select 1
      from public.contratos c
      where c.id = contrato_id
        and c.user_id = auth.uid()
    )
  )
);

drop policy if exists "configuracion_ia_update_own" on public.configuracion_ia;

create policy "configuracion_ia_update_own"
on public.configuracion_ia
for update
to authenticated
using (
  (
    contrato_id is not null
    and exists (
      select 1
      from public.contratos c
      where c.id = contrato_id
        and c.user_id = auth.uid()
    )
  )
  or (
    contrato_id is null
    and auth.uid() = user_id
  )
)
with check (
  auth.uid() = user_id
  and (
    contrato_id is null
    or exists (
      select 1
      from public.contratos c
      where c.id = contrato_id
        and c.user_id = auth.uid()
    )
  )
);

drop policy if exists "contratos_delete_own" on public.contratos;

create policy "contratos_delete_own"
on public.contratos
for delete
to authenticated
using (auth.uid() = user_id);

create index if not exists actividades_contrato_fecha_idx
  on public.actividades (contrato_id, fecha desc);

-- Bootstrap legacy: vincular config al contrato tras asignación
create or replace function public.asignar_datos_legacy_a_usuario(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contrato_id uuid;
begin
  if p_user_id is null then
    raise exception 'user_id es obligatorio';
  end if;

  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'El usuario no existe en auth.users';
  end if;

  alter table public.contratos disable trigger set_contratos_user_id;
  alter table public.configuracion_ia disable trigger set_configuracion_ia_user_id;
  alter table public.actividades disable trigger validar_actividad_user_id;

  begin
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
  exception
    when others then
      alter table public.contratos enable trigger set_contratos_user_id;
      alter table public.configuracion_ia enable trigger set_configuracion_ia_user_id;
      alter table public.actividades enable trigger validar_actividad_user_id;
      raise;
  end;

  alter table public.contratos enable trigger set_contratos_user_id;
  alter table public.configuracion_ia enable trigger set_configuracion_ia_user_id;
  alter table public.actividades enable trigger validar_actividad_user_id;

  select c.id
  into v_contrato_id
  from public.contratos c
  where c.user_id = p_user_id
  order by c.created_at asc, c.id asc
  limit 1;

  if v_contrato_id is not null then
    alter table public.configuracion_ia disable trigger validar_configuracion_ia_contrato;

    update public.configuracion_ia
    set contrato_id = v_contrato_id
    where user_id = p_user_id
      and contrato_id is null;

    alter table public.configuracion_ia enable trigger validar_configuracion_ia_contrato;

    insert into public.preferencias_usuario (user_id, contrato_activo_id)
    values (p_user_id, v_contrato_id)
    on conflict (user_id) do update
    set contrato_activo_id = coalesce(
      public.preferencias_usuario.contrato_activo_id,
      excluded.contrato_activo_id
    ),
    updated_at = now();
  end if;
end;
$$;

revoke all on function public.asignar_datos_legacy_a_usuario(uuid) from public;

revoke all on function public.asignar_datos_legacy_a_usuario(uuid) from anon, authenticated;
