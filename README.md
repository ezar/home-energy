# Energy Dashboard

Dashboard privado de consumo eléctrico doméstico. Conecta con la API de [Datadis](https://datadis.es) (datos reales del contador inteligente) y con [REData](https://www.ree.es/es/apidatos) (precio PVPC horario de Red Eléctrica) para mostrar consumo, coste estimado y comparativa de precios de mercado.

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 14 — App Router |
| Lenguaje | TypeScript estricto |
| UI | Tailwind CSS + shadcn/ui + Recharts |
| Auth + DB | Supabase (PostgreSQL + RLS) |
| i18n | next-intl (ES / EN) |
| Deploy | Vercel |

## Funcionalidades

- **Home** — stats del mes en curso, desglose P1/P2/P3, consumo diario, mejor hora PVPC y sugerencias de carga por electrodoméstico
- **Consumo** — gráficas horaria, diaria, mensual, patrón semanal y heatmap; detección de anomalías; exportación CSV
- **Coste** — estimación de factura con desglose de energía, potencia, impuesto eléctrico e IVA; simulador de tarifa alternativa
- **PVPC** — comparativa entre consumo real y precio de mercado; horas baratas y caras
- **Configuración** — credenciales Datadis, multi-suministro (varios CUPS), tarifa fija/PVPC, objetivo mensual, notificaciones push

## Tarifas soportadas

| Período | Nombre | Horario |
|---|---|---|
| P1 | Punta (🔴) | Lun–Vie 10–14h y 18–22h |
| P2 | Llano (🟡) | Lun–Vie 8–10h, 14–18h, 22–24h |
| P3 | Valle (🟢) | Noches, fines de semana y festivos nacionales |

Festivos calculados dinámicamente (incluye Semana Santa con algoritmo de Meeus).

## Estructura del proyecto

```
app/
  (auth)/login|register/   → Rutas públicas
  (dashboard)/             → Rutas protegidas (middleware)
    page.tsx               → Home
    consumption/           → Gráficas de consumo
    cost/                  → Estimación de factura
    pvpc/                  → Comparativa mercado
    settings/              → Configuración
  api/
    datadis/sync/          → POST: fetch Datadis + upsert DB
    datadis/supplies/      → GET: suministros del usuario
    datadis/credentials/   → PATCH: guardar contraseña cifrada
    pvpc/sync/             → POST: sincronizar precios REData
    cron/sync/             → GET: sync diario automático (CRON_SECRET)
    push/                  → GET/POST/DELETE: notificaciones push
lib/
  datadis.ts               → Cliente API Datadis
  redata.ts                → Cliente API REData (PVPC)
  tariff.ts                → Lógica de períodos 2.0TD + festivos
  pricing.ts               → Cálculo de precios e impuestos
  constants.ts             → Colores y tokens compartidos
  supabase/                → Clientes server y browser
components/
  charts/                  → Todos los componentes Recharts
  dashboard/               → Cards, selectores, badges
  layout/                  → Shell, sidebar, topbar, nav móvil
```

## Variables de entorno

Crea un archivo `.env.local` en la raíz con:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
# Opcional — notificaciones push
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
```

## Desarrollo local

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # build de producción
npm run lint         # ESLint
```

Base de datos (requiere [Supabase CLI](https://supabase.com/docs/guides/cli)):

```bash
npx supabase start   # instancia local
npx supabase db push # aplicar migraciones
```

## Seguridad

- Las credenciales Datadis nunca se envían al cliente — todas las llamadas son server-side
- La contraseña se guarda cifrada en Supabase Vault / columna `bytea`
- RLS activado en todas las tablas de usuario
- Acceso restringido a emails en allowlist vía Supabase Auth

## Cron automático

El sync diario se ejecuta a las **05:00 UTC** via Vercel Cron (`/api/cron/sync`).  
Requiere la variable `CRON_SECRET` y la entrada correspondiente en `vercel.json`.
