alter table public.contratos
  add column if not exists supervisor_nombre text not null default '',
  add column if not exists supervisor_cargo text not null default '';
