# Multiusuario básico — AIAC

Guía para activar autenticación, aislamiento por usuario y migración de datos legacy.

---

## 1. Supabase Dashboard (antes del código)

### Authentication → Providers

- Activar **Email**
- Desactivar **Confirm email** (fase piloto)

### Authentication → URL Configuration

| Entorno | Site URL |
|---------|----------|
| Local | `http://localhost:3000` |
| Producción | `https://tu-proyecto.vercel.app` |

Redirect URLs:

- `http://localhost:3000/auth/callback`
- `https://tu-proyecto.vercel.app/auth/callback`

---

## 2. Migración SQL

Ejecutar en **SQL Editor**:

`supabase/migrations/005_multiusuario_auth.sql`

Esto agrega:

- `user_id` en `contratos`, `actividades`, `configuracion_ia`
- índices y unicidad (1 contrato / 1 config por usuario)
- triggers que asignan `user_id = auth.uid()`
- RLS: `auth.uid() = user_id`

---

## 3. Bootstrap de datos legacy (Andrés)

Orden obligatorio:

1. Desplegar la app con login/registro.
2. **Registrarse** con el correo de Andrés en `/login`.
3. Copiar el UUID del usuario en **Authentication → Users**.
4. Ejecutar en SQL Editor:

```sql
select public.asignar_datos_legacy_a_usuario(
  (select id from auth.users where email = 'TU_CORREO@ejemplo.com' limit 1)
);
```

Plantilla editable: `scripts/asignar-datos-legacy.sql`

Tras esto, Andrés verá contrato, actividades y configuración IA existentes.

---

## 4. Verificación con 2 usuarios

1. Registrar **Usuario A** y cargar su contrato.
2. Registrar **Usuario B** y cargar otro contrato.
3. Cada uno registra actividades.
4. Confirmar que A no ve datos de B (historial, auditoría, informe, sidebar).

---

## 5. Variables de entorno

Sin cambios respecto al despliegue anterior:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`

No se usa `SUPABASE_SERVICE_ROLE_KEY` en la app.

---

## 6. Rutas de la app

| Ruta | Acceso |
|------|--------|
| `/login` | Público (login + registro) |
| `/auth/callback` | Público |
| Resto | Requiere sesión (middleware) |

---

## 7. Modelo de datos

```
auth.users
   └── user_id
         ├── contratos (1)
         ├── configuracion_ia (1)
         └── actividades (N)
```

Los informes no tienen tabla propia: se generan desde actividades filtradas por RLS.

---

## 8. Errores comunes

| Error | Causa | Solución |
|-------|--------|----------|
| Pantallas vacías tras login | Legacy sin `user_id` | Ejecutar `asignar_datos_legacy_a_usuario` |
| `42501` / permiso denegado | RLS activo sin sesión | Verificar middleware y clientes SSR |
| No puedo crear segundo contrato | `unique(user_id)` en contratos | Esperado: 1 contrato por usuario |
| Registro sin sesión inmediata | Confirm email activado | Desactivar en Supabase Auth |

---

## 9. Fuera de alcance (este sprint)

- Roles y administración
- Equipos
- Compartir contratos entre usuarios
