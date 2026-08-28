alter table public.contratos
  add column if not exists contratista_nombre text not null default '',
  add column if not exists contrato_fecha_inicio date,
  add column if not exists contrato_fecha_fin date;
