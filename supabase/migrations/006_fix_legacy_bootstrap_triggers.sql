-- Corrige bootstrap legacy: los triggers exigen auth.uid(), ausente en SQL Editor.
-- Opción aplicada: deshabilitar triggers SOLO dentro de asignar_datos_legacy_a_usuario().
-- Los triggers permanecen estrictos para la aplicación en todo momento.

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
end;
$$;

revoke all on function public.asignar_datos_legacy_a_usuario(uuid) from public;

revoke all on function public.asignar_datos_legacy_a_usuario(uuid) from anon, authenticated;
