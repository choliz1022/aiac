-- Sprint P.3: roles de usuario y consola administrativa

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'user'
    check (role in ('admin', 'coadmin', 'user')),
  created_at timestamptz not null default now()
);

create index if not exists user_roles_role_idx on public.user_roles (role);

-- Usuarios existentes → admin (grandfathering)
insert into public.user_roles (user_id, role)
select u.id, 'admin'
from auth.users u
where not exists (
  select 1
  from public.user_roles ur
  where ur.user_id = u.id
);

create or replace function public.handle_new_user_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_role on auth.users;

create trigger on_auth_user_created_role
after insert on auth.users
for each row
execute function public.handle_new_user_role();

create or replace function public.obtener_rol_usuario(p_user_id uuid default auth.uid())
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select ur.role
      from public.user_roles ur
      where ur.user_id = coalesce(p_user_id, auth.uid())
    ),
    'user'
  );
$$;

create or replace function public.es_staff(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.obtener_rol_usuario(p_user_id) in ('admin', 'coadmin');
$$;

create or replace function public.es_admin(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.obtener_rol_usuario(p_user_id) = 'admin';
$$;

alter table public.user_roles enable row level security;

drop policy if exists "user_roles_select_own" on public.user_roles;

create policy "user_roles_select_own"
on public.user_roles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "user_roles_select_staff" on public.user_roles;

create policy "user_roles_select_staff"
on public.user_roles
for select
to authenticated
using (public.es_staff());

drop policy if exists "suscripciones_usuario_select_staff" on public.suscripciones_usuario;

create policy "suscripciones_usuario_select_staff"
on public.suscripciones_usuario
for select
to authenticated
using (public.es_staff());

-- Listado de usuarios para consola admin
create or replace function public.admin_listar_usuarios()
returns table (
  user_id uuid,
  email text,
  plan_id text,
  plan_nombre text,
  rol text,
  estado_suscripcion text,
  total_contratos bigint,
  registrado_en timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.es_staff(auth.uid()) then
    raise exception 'No autorizado';
  end if;

  return query
  select
    u.id,
    u.email::text,
    coalesce(s.plan_id, 'early_adopter') as plan_id,
    coalesce(p.nombre, 'Early Adopter') as plan_nombre,
    public.obtener_rol_usuario(u.id) as rol,
    coalesce(s.estado, 'activa') as estado_suscripcion,
    (
      select count(*)
      from public.contratos c
      where c.user_id = u.id
        and c.estado = 'activo'
    ) as total_contratos,
    u.created_at as registrado_en
  from auth.users u
  left join public.suscripciones_usuario s on s.user_id = u.id
  left join public.planes p on p.id = s.plan_id
  order by u.created_at asc;
end;
$$;

create or replace function public.admin_obtener_usuario(p_target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_result jsonb;
begin
  if not public.es_staff(auth.uid()) then
    raise exception 'No autorizado';
  end if;

  if not exists (select 1 from auth.users u where u.id = p_target_user_id) then
    raise exception 'Usuario no encontrado';
  end if;

  select jsonb_build_object(
    'user_id', u.id,
    'email', u.email,
    'registrado_en', u.created_at,
    'rol', public.obtener_rol_usuario(u.id),
    'plan_id', coalesce(s.plan_id, 'early_adopter'),
    'plan_nombre', coalesce(p.nombre, 'Early Adopter'),
    'estado_suscripcion', coalesce(s.estado, 'activa'),
    'inicio_en', s.inicio_en,
    'fin_en', s.fin_en,
    'total_contratos', (
      select count(*)
      from public.contratos c
      where c.user_id = u.id
        and c.estado = 'activo'
    ),
    'contratos', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', c.id,
            'nombre', c.nombre,
            'entidad', c.entidad,
            'alias', c.alias,
            'estado', c.estado,
            'created_at', c.created_at
          )
          order by c.created_at asc
        )
        from public.contratos c
        where c.user_id = u.id
      ),
      '[]'::jsonb
    ),
    'features', coalesce(
      (
        select jsonb_agg(pf.feature_id order by pf.feature_id)
        from public.plan_features pf
        where pf.plan_id = coalesce(s.plan_id, 'early_adopter')
          and exists (
            select 1
            from public.suscripciones_usuario su
            where su.user_id = u.id
              and su.estado = 'activa'
              and (su.fin_en is null or su.fin_en > now())
          )
      ),
      (
        select jsonb_agg(pf.feature_id order by pf.feature_id)
        from public.plan_features pf
        where pf.plan_id = 'early_adopter'
          and not exists (
            select 1
            from public.suscripciones_usuario su
            where su.user_id = u.id
          )
      ),
      '[]'::jsonb
    )
  )
  into v_result
  from auth.users u
  left join public.suscripciones_usuario s on s.user_id = u.id
  left join public.planes p on p.id = s.plan_id
  where u.id = p_target_user_id;

  return v_result;
end;
$$;

create or replace function public.admin_cambiar_plan_usuario(
  p_target_user_id uuid,
  p_plan_id text
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.es_staff(auth.uid()) then
    raise exception 'No autorizado';
  end if;

  if not exists (select 1 from public.planes pl where pl.id = p_plan_id and pl.activo = true) then
    raise exception 'Plan no válido';
  end if;

  if not exists (select 1 from auth.users u where u.id = p_target_user_id) then
    raise exception 'Usuario no encontrado';
  end if;

  insert into public.suscripciones_usuario (user_id, plan_id, estado, origen, notas)
  values (p_target_user_id, p_plan_id, 'activa', 'admin', 'Asignado desde consola administrativa')
  on conflict (user_id) do update
  set
    plan_id = excluded.plan_id,
    estado = case
      when public.suscripciones_usuario.estado = 'cancelada' then 'activa'
      else public.suscripciones_usuario.estado
    end,
    origen = 'admin',
    notas = 'Actualizado desde consola administrativa',
    updated_at = now();
end;
$$;

create or replace function public.admin_cambiar_rol_usuario(
  p_target_user_id uuid,
  p_nuevo_rol text
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_rol_caller text;
  v_rol_target text;
begin
  v_rol_caller := public.obtener_rol_usuario(auth.uid());
  v_rol_target := public.obtener_rol_usuario(p_target_user_id);

  if v_rol_caller not in ('admin', 'coadmin') then
    raise exception 'No autorizado';
  end if;

  if p_nuevo_rol not in ('admin', 'coadmin', 'user') then
    raise exception 'Rol no válido';
  end if;

  if p_nuevo_rol = 'admin' and v_rol_caller <> 'admin' then
    raise exception 'Solo un administrador puede asignar el rol admin';
  end if;

  if v_rol_target = 'admin' and v_rol_caller <> 'admin' then
    raise exception 'Solo un administrador puede modificar administradores';
  end if;

  if not exists (select 1 from auth.users u where u.id = p_target_user_id) then
    raise exception 'Usuario no encontrado';
  end if;

  insert into public.user_roles (user_id, role)
  values (p_target_user_id, p_nuevo_rol)
  on conflict (user_id) do update
  set role = excluded.role;
end;
$$;

create or replace function public.admin_actualizar_estado_suscripcion(
  p_target_user_id uuid,
  p_estado text
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_rol_caller text;
  v_rol_target text;
begin
  v_rol_caller := public.obtener_rol_usuario(auth.uid());
  v_rol_target := public.obtener_rol_usuario(p_target_user_id);

  if v_rol_caller not in ('admin', 'coadmin') then
    raise exception 'No autorizado';
  end if;

  if p_estado not in ('activa', 'suspendida') then
    raise exception 'Estado no válido';
  end if;

  if v_rol_target = 'admin' and v_rol_caller <> 'admin' then
    raise exception 'Solo un administrador puede modificar administradores';
  end if;

  if not exists (select 1 from auth.users u where u.id = p_target_user_id) then
    raise exception 'Usuario no encontrado';
  end if;

  insert into public.suscripciones_usuario (user_id, plan_id, estado, origen, notas)
  values (
    p_target_user_id,
    'basico',
    p_estado,
    'admin',
    'Estado actualizado desde consola administrativa'
  )
  on conflict (user_id) do update
  set
    estado = excluded.estado,
    origen = 'admin',
    notas = 'Estado actualizado desde consola administrativa',
    updated_at = now();
end;
$$;

grant execute on function public.obtener_rol_usuario(uuid) to authenticated;
grant execute on function public.es_staff(uuid) to authenticated;
grant execute on function public.es_admin(uuid) to authenticated;
grant execute on function public.admin_listar_usuarios() to authenticated;
grant execute on function public.admin_obtener_usuario(uuid) to authenticated;
grant execute on function public.admin_cambiar_plan_usuario(uuid, text) to authenticated;
grant execute on function public.admin_cambiar_rol_usuario(uuid, text) to authenticated;
grant execute on function public.admin_actualizar_estado_suscripcion(uuid, text) to authenticated;
