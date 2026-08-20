alter table public.configuracion_ia
add column if not exists contexto_tecnico text not null default '';
