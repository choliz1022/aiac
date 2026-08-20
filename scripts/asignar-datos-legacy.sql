-- Ejecutar UNA VEZ en Supabase SQL Editor, después de que Andrés
-- se registre en la aplicación.
--
-- Opción A: por UUID (copiar desde Authentication → Users)
-- select public.asignar_datos_legacy_a_usuario('00000000-0000-0000-0000-000000000000');
--
-- Opción B: por correo
-- select public.asignar_datos_legacy_a_usuario(
--   (select id from auth.users where email = 'tu-correo@ejemplo.com' limit 1)
-- );

select public.asignar_datos_legacy_a_usuario(
  (select id from auth.users where email = 'REEMPLAZAR@CORREO.COM' limit 1)
);
