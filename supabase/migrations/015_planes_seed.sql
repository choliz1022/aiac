-- Sprint P.1: catálogo inicial de planes y backfill de usuarios existentes

insert into public.features (id, nombre, descripcion, categoria)
values
  (
    'informe_contratista',
    'Informe contratista',
    'Informe mensual contractual con evidencias.',
    'informes'
  ),
  (
    'informe_supervision',
    'Informe de supervisión',
    'Informe narrativo en tercera persona para supervisor.',
    'informes'
  ),
  (
    'multi_contrato',
    'Multi-contrato',
    'Gestionar varios contratos en la misma cuenta.',
    'contratos'
  )
on conflict (id) do nothing;

insert into public.planes (id, nombre, descripcion, max_contratos, orden)
values
  (
    'basico',
    'Básico',
    'Un contrato e informe contratista.',
    1,
    10
  ),
  (
    'profesional',
    'Profesional',
    'Multi-contrato e informes avanzados.',
    null,
    20
  ),
  (
    'early_adopter',
    'Early Adopter',
    'Acceso completo para usuarios actuales.',
    null,
    0
  )
on conflict (id) do nothing;

insert into public.plan_features (plan_id, feature_id)
values
  ('basico', 'informe_contratista')
on conflict do nothing;

insert into public.plan_features (plan_id, feature_id)
values
  ('profesional', 'informe_contratista'),
  ('profesional', 'informe_supervision'),
  ('profesional', 'multi_contrato')
on conflict do nothing;

insert into public.plan_features (plan_id, feature_id)
select 'early_adopter', f.id
from public.features f
on conflict do nothing;

-- Usuarios registrados en auth → early_adopter (grandfathering)
insert into public.suscripciones_usuario (user_id, plan_id, estado, origen, notas)
select
  u.id,
  'early_adopter',
  'activa',
  'migracion',
  'Grandfathering Sprint P.1 — acceso completo pre-planes'
from auth.users u
where not exists (
  select 1
  from public.suscripciones_usuario s
  where s.user_id = u.id
);

-- Propietarios de contratos sin fila en auth.users (legacy)
insert into public.suscripciones_usuario (user_id, plan_id, estado, origen, notas)
select distinct
  c.user_id,
  'early_adopter',
  'activa',
  'migracion',
  'Grandfathering Sprint P.1 — contrato legacy'
from public.contratos c
where c.user_id is not null
  and not exists (
    select 1
    from public.suscripciones_usuario s
    where s.user_id = c.user_id
  );
