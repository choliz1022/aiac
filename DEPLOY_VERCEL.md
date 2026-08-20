# Despliegue de AIAC en Vercel

Guía para publicar AIAC (Next.js 16 + Supabase + OpenAI) en Vercel sin cambiar la lógica de negocio.

---

## Prerequisitos

### Cuentas y servicios

| Recurso | Uso en AIAC |
|---------|-------------|
| [Vercel](https://vercel.com) | Hosting del frontend y Server Actions |
| [Supabase](https://supabase.com) | Base de datos (`contratos`, `actividades`, `configuracion_ia`) |
| [OpenAI](https://platform.openai.com) | Análisis de actividades, consolidación e informe mensual |

### Repositorio

- Código en Git (GitHub, GitLab o Bitbucket) conectado a Vercel, **o** despliegue con Vercel CLI.
- Node.js **20.x** recomendado (Vercel lo detecta automáticamente desde `package.json`).

### Base de datos Supabase

El proyecto debe tener ya creadas las tablas base (`contratos`, `actividades`, etc.) en Supabase.  
En el repositorio solo están migraciones incrementales en `supabase/migrations/`:

| Migración | Contenido |
|-----------|-----------|
| `001_create_configuracion_ia.sql` | Tabla `configuracion_ia` |
| `002_add_contexto_tecnico.sql` | Columna `contexto_tecnico` |
| `003_add_tipo_actividad_detectada.sql` | Columna `tipo_actividad_detectada` |
| `004_add_clasificacion_manual.sql` | Columnas `clasificacion_manual`, `puntaje_clasificacion` |
| `005_multiusuario_auth.sql` | `user_id`, RLS por usuario, triggers Auth |
| `006_fix_legacy_bootstrap_triggers.sql` | Bootstrap legacy sin conflicto con triggers |

Ver también [`MULTIUSUARIO.md`](MULTIUSUARIO.md) para bootstrap de datos legacy y configuración de Supabase Auth.

Ejecuta en el SQL Editor de Supabase las migraciones que aún no estén aplicadas.

### Verificación local previa

```bash
npm install
npm run build
```

El build debe terminar sin errores de TypeScript ni de compilación.

---

## Variables de entorno

Configúralas en **Vercel → Project → Settings → Environment Variables** para los entornos **Production**, **Preview** y **Development**.

### Obligatorias

| Variable | Dónde se usa | Notas |
|----------|--------------|-------|
| `OPENAI_API_KEY` | Server Actions (`registrar-actividad`, `informe-mensual`) | Solo servidor. Sin prefijo `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_SUPABASE_URL` | Cliente y servidor Supabase | URL del proyecto Supabase (`https://xxxx.supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente y servidor Supabase | Clave **anon/public** de Supabase. |

### Opcionales

| Variable | Estado actual en AIAC |
|----------|------------------------|
| `SUPABASE_SERVICE_ROLE_KEY` | **No se usa hoy** en el código. La app opera con la clave anon en servidor y cliente. Puedes omitirla o reservarla para tareas administrativas futuras. **No la expongas con prefijo `NEXT_PUBLIC_`.** |
| `OPENAI_MODEL` | Opcional. Por defecto: `gpt-4o-mini` (`lib/openai.ts`). |

### Plantilla `.env.local` (solo desarrollo)

```env
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
# Opcional
OPENAI_MODEL=gpt-4o-mini
# SUPABASE_SERVICE_ROLE_KEY=eyJ...  # No requerida por AIAC actual
```

> **Importante:** `.env*` está en `.gitignore`. Nunca subas claves al repositorio.

---

## Pasos de despliegue

### Opción A — Importar desde Git (recomendada)

1. Sube el repositorio a GitHub/GitLab/Bitbucket.
2. En [vercel.com/new](https://vercel.com/new), importa el repositorio.
3. Framework preset: **Next.js** (auto-detectado).
4. Build Command: `npm run build` (default).
5. Output Directory: `.next` (default).
6. Agrega las variables de entorno obligatorias.
7. Deploy.

### Opción B — Vercel CLI

```bash
npm i -g vercel
vercel login
vercel link
vercel env add OPENAI_API_KEY
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel --prod
```

### Post-despliegue

1. Abre la URL de producción.
2. Verifica **Mi contrato**: debe cargar o permitir guardar el contrato activo.
3. Registra una actividad de prueba (**Registrar actividad**).
4. Revisa **Historial** y **Auditoría de obligaciones**.
5. Genera un **Informe mensual** y descarga el **DOCX**.

---

## Compatibilidad verificada con Vercel

### Build de producción

- `npm run build` completado correctamente (Next.js 16.3.1, React 19).
- Sin API Routes personalizadas; la app usa App Router + Server Actions.
- Sin middleware ni configuración especial en `next.config.ts`.

### OpenAI (servidor)

- Cliente en `lib/openai.ts`, invocado solo desde Server Actions y librerías de servidor.
- Requiere `OPENAI_API_KEY` en Vercel.
- Compatible con runtime Node.js de Vercel.

### Supabase

- Cliente único en `lib/supabase.ts` con URL y anon key públicas.
- Lecturas/escrituras desde Server Components, Server Actions y formularios cliente (`contrato-form`, `configuracion-ia-form`).
- Funciona en Vercel si las variables `NEXT_PUBLIC_*` están configuradas y Supabase permite las operaciones con la clave anon (RLS/policies).

### DOCX (cliente)

- Exportación en `lib/exportar-informe-docx.ts` con `Packer.toBlob()` en el navegador.
- **No usa filesystem del servidor** ni rutas locales.
- La descarga se dispara con `URL.createObjectURL` + enlace `<a download>`.
- Compatible con Vercel sin configuración adicional.

### Datos dinámicos en producción

- `app/layout.tsx` exporta `dynamic = "force-dynamic"` para que historial, auditoría, sidebar y demás vistas consulten Supabase en cada request, no queden congeladas en el HTML del build.

---

## Dependencias locales revisadas

| Ubicación | ¿Afecta producción? |
|-----------|---------------------|
| `scripts/probe-contratos.mjs` | No. Lee `.env.local` con `fs`; solo desarrollo. |
| `scripts/inspect-contratos.mjs` | No. Igual que arriba. |
| `lib/exportar-informe-docx.ts` | No usa `fs`; genera blob en memoria en el cliente. |
| Resto de `app/` y `lib/` | Sin `localhost`, `fs`, ni rutas de disco en runtime de la app. |

---

## Archivos revisados

### Configuración y build

- `package.json`
- `package-lock.json`
- `next.config.ts`
- `tsconfig.json`
- `eslint.config.mjs`
- `.gitignore`

### Entorno e integraciones

- `lib/supabase.ts`
- `lib/openai.ts`
- `lib/configuracion-ia.ts`
- `lib/resumen-sidebar.ts`
- `lib/exportar-informe-docx.ts`
- `lib/analizar-actividad.ts`
- `lib/consolidar-informe.ts`
- `lib/informe-mensual.ts`
- `lib/clasificar-obligacion.ts`

### App y acciones

- `app/layout.tsx`
- `app/page.tsx`
- `app/mi-contrato/page.tsx`
- `app/registrar-actividad/page.tsx`
- `app/registrar-actividad/actions.ts`
- `app/historial/page.tsx`
- `app/auditoria-obligaciones/page.tsx`
- `app/auditoria-obligaciones/actions.ts`
- `app/configuracion-ia/page.tsx`
- `app/informe-mensual/page.tsx`
- `app/informe-mensual/actions.ts`

### Componentes con Supabase en cliente

- `components/contrato-form.tsx`
- `components/configuracion-ia-form.tsx`
- `components/informe-mensual-form.tsx`

### Migraciones

- `supabase/migrations/001` … `004`

### Scripts de desarrollo (no desplegados)

- `scripts/probe-contratos.mjs`
- `scripts/inspect-contratos.mjs`

---

## Posibles riesgos

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| **Timeout en informe mensual** | La generación llama a OpenAI por obligación; en plan Hobby (≈10 s) puede fallar con muchas actividades. | Usar plan Pro o aumentar `maxDuration` en la ruta del informe; generar con menos actividades de prueba primero. |
| **RLS de Supabase restrictivo** | Inserciones/updates desde el navegador (anon key) fallan con error de permisos. | Ajustar policies en Supabase para el uso actual (app sin autenticación, un solo operador). |
| **Migraciones pendientes** | Errores tipo *column does not exist* (`tipo_actividad_detectada`, `clasificacion_manual`, etc.). | Aplicar migraciones 002–004 en Supabase. |
| **Claves expuestas en logs** | `app/mi-contrato/page.tsx` imprime URL y prefijo de la anon key en consola del servidor durante el build/runtime. | Revisar logs de Vercel; no compartir logs públicamente. Considerar quitar esos `console.log` en un sprint futuro de contratos. |
| **Sin autenticación** | Cualquiera con la URL puede usar la app y modificar datos si RLS lo permite. | Uso interno/privado; restringir acceso por Vercel Authentication o Supabase Auth en el futuro (fuera de alcance actual). |
| **Anon key en cliente** | Esperado en la arquitectura actual; la clave anon es pública por diseño de Supabase. | Proteger con RLS estricto; reservar `SUPABASE_SERVICE_ROLE_KEY` solo para backend admin futuro. |
| **`NODE_TLS_REJECT_UNAUTHORIZED=0`** | Si existe en el entorno local, desactiva verificación TLS (inseguro). | **No** configurar esta variable en Vercel. |
| **Cuota OpenAI** | Errores 429/401 al registrar actividades o generar informes. | Verificar saldo, límites y facturación en OpenAI. |

---

## Solución de errores comunes

### `OPENAI_API_KEY no está configurada`

- Agrega `OPENAI_API_KEY` en Vercel → Environment Variables.
- Redespliega después de guardar variables.

### Pantalla vacía o error al cargar contrato / actividades

- Verifica `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Confirma que exista al menos un registro en `contratos`.
- Revisa **Vercel → Logs** y **Supabase → Logs** por errores de RLS.

### `column "..." does not exist`

- Ejecuta las migraciones pendientes en Supabase SQL Editor (`supabase/migrations/`).

### Informe mensual: timeout o `504 Gateway Timeout`

- Reduce actividades del periodo de prueba.
- Sube de plan Vercel o configura mayor duración de funciones serverless.
- Revisa logs: múltiples llamadas OpenAI secuenciales por obligación.

### Registrar actividad falla con error de OpenAI

- Clave inválida o sin crédito.
- Modelo inexistente si personalizaste `OPENAI_MODEL`.

### DOCX no descarga

- Ocurre en el navegador tras generar el informe; no depende del servidor Vercel.
- Prueba en Chrome/Edge; desactiva bloqueadores de descargas.
- Genera primero el informe en pantalla; luego pulsa **Descargar DOCX**.

### Build falla en Vercel

- Ejecuta `npm run build` localmente con las mismas variables.
- Revisa que Node 20 esté seleccionado en Vercel → Settings → General.

### Datos desactualizados tras registrar actividad

- Debe estar activo `export const dynamic = "force-dynamic"` en `app/layout.tsx`.
- Si se elimina, las páginas pueden quedar estáticas desde el último build.

---

## Checklist final de despliegue

### Supabase

- [ ] Proyecto Supabase activo
- [ ] Tablas base (`contratos`, `actividades`) existentes
- [ ] Migraciones `001`–`004` aplicadas
- [ ] Policies/RLS compatibles con operaciones anon actuales
- [ ] Contrato activo cargado en `contratos`

### Vercel

- [ ] Repositorio conectado o CLI configurado
- [ ] `OPENAI_API_KEY` configurada (Production)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` configurada (Production)
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configurada (Production)
- [ ] Build `npm run build` exitoso en Vercel
- [ ] URL de producción accesible

### Smoke test en producción

- [ ] Inicio carga sidebar y resumen
- [ ] Mi contrato: lectura/edición OK
- [ ] Configuración IA: guardado OK
- [ ] Registrar actividad: OpenAI + guardado OK
- [ ] Historial muestra la actividad nueva
- [ ] Auditoría muestra clasificación e indicadores
- [ ] Informe mensual se genera sin timeout
- [ ] Descarga DOCX funciona en el navegador

### Seguridad operativa (alcance actual)

- [ ] URL no compartida públicamente si no hay auth
- [ ] `SUPABASE_SERVICE_ROLE_KEY` no expuesta al cliente
- [ ] Logs de Vercel sin compartir claves

---

## Comandos útiles

```bash
# Build local
npm run build

# Desarrollo local
npm run dev

# Despliegue producción (CLI)
vercel --prod
```

---

*Documento generado para el sprint Deploy Vercel. No introduce tablas, autenticación ni multiusuario.*
