-- Permitir que cada usuario elimine sus propias actividades (RLS).
-- Suficiente para eliminarActividadCompleta(): DELETE con .eq("user_id", auth.uid()).

drop policy if exists "actividades_delete_own" on public.actividades;

create policy "actividades_delete_own"
on public.actividades
for delete
using (auth.uid() = user_id);
