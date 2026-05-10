# Energy Dashboard

Dashboard privado de consumo eléctrico doméstico. Conecta con la API de [Datadis](https://datadis.es) (datos reales del contador inteligente) y con [REData](https://www.ree.es/es/apidatos) (precio PVPC horario de Red Eléctrica) para mostrar consumo, coste estimado, comparativa de precios de mercado y recomendaciones de tarifa.

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
- **Consumo** — gráficas horaria, diaria y mensual; heatmap; comparativa año anterior; patrón semanal; detección de anomalías; exportación CSV
- **Coste** — estimación de factura con desglose de energía, potencia, impuesto eléctrico e IVA; coste acumulado del mes
- **PVPC** — comparativa entre consumo real y precio de mercado horario; horas baratas y caras del día
- **Ofertas** — perfil de consumo por períodos P1/P2/P3; comparativa coste real vs PVPC en los últimos 12 meses; simulador de tarifa fija alternativa; enlace al comparador oficial CNMC
- **Configuración** — credenciales Datadis, multi-suministro (varios CUPS), tarifa fija o PVPC con precios personalizados, potencia contratada, objetivo mensual de kWh, notificaciones push

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
  (auth)/
    login/                 → Inicio de sesión
    register/              → Registro (allowlist de emails)
  (dashboard)/             → Rutas protegidas (middleware)
    page.tsx               → Home — resumen del mes
    consumption/           → Gráficas de consumo
    cost/                  → Estimación de factura
    pvpc/                  → Comparativa mercado horario
    offers/                → Comparativa de ofertas y simulador
    settings/              → Configuración de cuenta
    help/                  → Ayuda y preguntas frecuentes
    welcome/               → Onboarding primer acceso
  api/
    datadis/sync/          → POST: fetch Datadis + upsert DB
    datadis/supplies/      → GET: suministros del usuario
    datadis/credentials/   → PATCH: guardar contraseña cifrada
    pvpc/sync/             → POST: sincronizar precios REData
    cron/sync/             → GET: sync Datadis + PVPC diario (05:00 UTC)
    cron/pvpc-alert/       → GET: notificación precio PVPC bajo (20:00 UTC)
    cron/consumption-alert/→ GET: notificación consumo elevado (opcional)
    push/                  → GET/POST/DELETE: suscripciones push
    user/delete/           → DELETE: borrar cuenta y datos
lib/
  datadis.ts               → Cliente API Datadis
  redata.ts                → Cliente API REData (PVPC)
  tariff.ts                → Lógica de períodos 2.0TD + festivos
  pricing.ts               → Cálculo de precios e impuestos
  encrypt.ts               → Cifrado/descifrado de credenciales
  webpush.ts               → Envío de notificaciones push (VAPID)
  constants.ts             → Colores y tokens compartidos
  supabase/                → Clientes server y browser
components/
  charts/                  → Componentes Recharts (horario, diario, mensual,
                             heatmap, PVPC, YoY, patrón, coste acumulado)
  dashboard/               → Cards, selectores, badges
  layout/                  → Shell, sidebar, topbar, nav móvil
```

## Variables de entorno

Crea un archivo `.env.local` en la raíz:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=

# Notificaciones push (Web Push / VAPID)
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_EMAIL=
```

Las variables `NEXT_PUBLIC_*` se exponen al cliente. Las demás son exclusivamente server-side.

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
- La contraseña se guarda cifrada (`bytea` con AES-256) en Supabase
- RLS activado en todas las tablas de usuario (`profiles`, `consumption`, `maximeter`, `user_supplies`)
- `pvpc_prices` es pública (datos compartidos, sin RLS)
- Acceso restringido a emails en allowlist vía Supabase Auth

## Crons automáticos

Configurados en `vercel.json` y ejecutados por Vercel:

| Ruta | Horario | Función |
|---|---|---|
| `/api/cron/sync` | 05:00 UTC | Sincroniza consumo Datadis + precios PVPC del mes anterior y actual |
| `/api/cron/pvpc-alert` | 20:00 UTC | Envía notificación push si el precio de mañana es bajo |

Todos los endpoints de cron requieren la cabecera `Authorization: Bearer {CRON_SECRET}`.
