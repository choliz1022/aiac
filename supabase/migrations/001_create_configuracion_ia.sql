create table if not exists public.configuracion_ia (
  id uuid primary key default gen_random_uuid(),
  estilo_redaccion text not null default '',
  ejemplos_redaccion text not null default '',
  instrucciones_informe text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at_configuracion_ia()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists configuracion_ia_updated_at on public.configuracion_ia;

create trigger configuracion_ia_updated_at
before update on public.configuracion_ia
for each row
execute function public.set_updated_at_configuracion_ia();

alter table public.configuracion_ia enable row level security;

create policy "Permitir lectura de configuracion_ia"
on public.configuracion_ia
for select
using (true);

create policy "Permitir insercion de configuracion_ia"
on public.configuracion_ia
for insert
with check (true);

create policy "Permitir actualizacion de configuracion_ia"
on public.configuracion_ia
for update
using (true)
with check (true);
