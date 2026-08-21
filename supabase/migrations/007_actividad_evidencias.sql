-- Evidencias fotográficas por actividad + bucket Supabase Storage

create table if not exists public.actividad_evidencias (
  id uuid primary key default gen_random_uuid(),
  actividad_id uuid not null references public.actividades(id) on delete cascade,
  url text not null,
  nombre_archivo text not null,
  created_at timestamptz not null default now()
);

create index if not exists actividad_evidencias_actividad_id_idx
  on public.actividad_evidencias (actividad_id);

alter table public.actividad_evidencias enable row level security;

drop policy if exists "actividad_evidencias_select_own" on public.actividad_evidencias;

create policy "actividad_evidencias_select_own"
on public.actividad_evidencias
for select
using (
  exists (
    select 1
    from public.actividades a
    where a.id = actividad_id
      and a.user_id = auth.uid()
  )
);

drop policy if exists "actividad_evidencias_insert_own" on public.actividad_evidencias;

create policy "actividad_evidencias_insert_own"
on public.actividad_evidencias
for insert
with check (
  exists (
    select 1
    from public.actividades a
    where a.id = actividad_id
      and a.user_id = auth.uid()
  )
);

drop policy if exists "actividad_evidencias_delete_own" on public.actividad_evidencias;

create policy "actividad_evidencias_delete_own"
on public.actividad_evidencias
for delete
using (
  exists (
    select 1
    from public.actividades a
    where a.id = actividad_id
      and a.user_id = auth.uid()
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evidencias',
  'evidencias',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "evidencias_storage_select_own" on storage.objects;

create policy "evidencias_storage_select_own"
on storage.objects
for select
using (
  bucket_id = 'evidencias'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "evidencias_storage_insert_own" on storage.objects;

create policy "evidencias_storage_insert_own"
on storage.objects
for insert
with check (
  bucket_id = 'evidencias'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "evidencias_storage_delete_own" on storage.objects;

create policy "evidencias_storage_delete_own"
on storage.objects
for delete
using (
  bucket_id = 'evidencias'
  and auth.uid()::text = (storage.foldername(name))[1]
);
