alter table public.actividades
add column if not exists tipo_actividad_detectada text not null default '';
