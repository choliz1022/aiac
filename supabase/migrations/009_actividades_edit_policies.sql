-- Políticas para edición de actividades (CRUD).
-- actividades UPDATE ya existe en 005_multiusuario_auth.sql; se reafirma aquí de forma idempotente.
-- actividad_evidencias no requiere UPDATE: las evidencias se agregan (INSERT) o eliminan (DELETE).

drop policy if exists "actividades_update_own" on public.actividades;

create policy "actividades_update_own"
on public.actividades
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- actividad_evidencias: SELECT, INSERT y DELETE (007) cubren edición de evidencias.
-- No se agrega política UPDATE porque los metadatos de evidencia no se modifican in-place.
