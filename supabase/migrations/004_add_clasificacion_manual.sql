alter table public.actividades
add column if not exists clasificacion_manual boolean not null default false;

alter table public.actividades
add column if not exists puntaje_clasificacion integer not null default 0;
