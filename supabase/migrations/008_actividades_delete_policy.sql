-- Permitir que cada usuario elimine sus propias actividades (RLS).

drop policy if exists "actividades_delete_own" on public.actividades;

create policy "actividades_delete_own"
on public.actividades
for delete
using (auth.uid() = user_id);
