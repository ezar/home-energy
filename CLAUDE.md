# CLAUDE.md — energia-dashboard

> Contexto persistente para Claude Code. Leer antes de cualquier acción.

---

## Qué es este proyecto

Dashboard privado de consumo eléctrico para uso familiar. Conecta con la API
privada de Datadis (datos reales del contador inteligente) y con REData (precio
PVPC horario de Red Eléctrica) para mostrar gráficas de consumo + coste estimado.

Usuarios: 2–5 personas de confianza. Acceso por allowlist de emails en Supabase.
Arquitectura preparada para escalar a registro público sin cambios estructurales.

**Specs completas**: ver `SPECS_energia.md` en la raíz del proyecto.

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 14 — App Router |
| Lenguaje | TypeScript estricto (`strict: true`) |
| UI | Tailwind CSS + shadcn/ui |
| Gráficas | Recharts |
| Auth + DB | Supabase (PostgreSQL + RLS) |
| Deploy | Vercel |
| APIs externas | Datadis API privada · REData API pública |

---

## Repositorio

- **GitHub**: cuenta `ezar` (ezarlive@gmail.com)
- **Repo**: `home-energy` (privado)
- **Branch principal**: `main`
- **Convención de commits**: `feat:`, `fix:`, `chore:`, `refactor:`

---

## Estructura de carpetas clave

```
app/
  (auth)/login/          → Única ruta pública
  (dashboard)/           → Rutas protegidas por middleware
    page.tsx             → Home: stats resumen
    consumo/             → Gráficas detalladas
    coste/               → Estimación factura
    pvpc/                → Comparativa precio mercado
    configuracion/       → Credenciales Datadis del usuario
  api/
    datadis/sync/        → POST: fetch Datadis + upsert DB (server-side SIEMPRE)
    datadis/supplies/    → GET: suministros del usuario
    pvpc/                → GET: proxy a REData
    cron/sync/           → GET: sync automático diario (protegido con CRON_SECRET)
lib/
  datadis.ts             → Cliente Datadis (getToken, getSupplies, getConsumption)
  redata.ts              → Cliente REData (getPvpcPrices)
  supabase/
    client.ts            → Cliente browser
    server.ts            → Cliente server (cookies)
  types/                 → Tipos TypeScript de todas las entidades
components/
  charts/                → Todos los componentes Recharts
  dashboard/             → Cards, selectors, estado sync
middleware.ts            → Protege todas las rutas salvo /login
```

---

## Reglas de desarrollo — CRÍTICAS

### Seguridad (no negociable)
- Las credenciales Datadis (NIF + contraseña) **NUNCA** van al cliente
- Todas las llamadas a la API de Datadis son **exclusivamente server-side** (API routes)
- El token de Datadis se obtiene en cada sync, **no se persiste** en DB
- La contraseña Datadis se guarda **cifrada** en Supabase (Vault o columna `bytea` con pgcrypto)
- Activar RLS en todas las tablas de usuario (`profiles`, `consumption`, `maximeter`)
- `pvpc_prices` no necesita RLS (datos públicos compartidos)

### TypeScript
- `strict: true` siempre
- Sin `any` — usar `unknown` si el tipo es incierto
- Tipos en `/lib/types/`, nunca inline en componentes
- Interfaces para objetos de dominio, `type` para uniones y aliases

### Next.js / React
- Server Components por defecto; `'use client'` solo cuando sea necesario
  (interactividad, hooks, eventos)
- Recharts requiere `'use client'` — todos los componentes de charts llevan la directiva
- `ResponsiveContainer` envolviendo todos los charts para responsividad
- Fetch de datos en Server Components o API routes, nunca en `useEffect`

### Base de datos
- Upsert con `onConflict` en lugar de insert para evitar duplicados
  (`unique(user_id, cups, datetime)` en `consumption`)
- Índices ya definidos en SPECS — no omitir
- Migraciones SQL en `/supabase/migrations/` con timestamp como prefijo

### UI / Diseño
- shadcn/ui para todos los componentes base (Card, Button, Form, Tabs, Select...)
- Dark mode como modo por defecto (dashboard técnico, no marketing)
- Tailwind sin clases arbitrarias si hay equivalente estándar
- Recharts: paleta de colores coherente
  - P1 punta: `#ef4444` (rojo)
  - P2 llano: `#f59e0b` (amarillo)
  - P3 valle: `#22c55e` (verde)
  - PVPC precio: `#60a5fa` (azul, eje secundario)

---

## APIs externas — referencia rápida

### Datadis
```
Base URL: https://datadis.es/api-private/api

Auth:
  POST /get-token
  Body: username=NIF&password=PASS (x-www-form-urlencoded)
  Response: string plano (el token, sin JSON)

Endpoints:
  GET /get-supplies
  GET /get-consumption-data
    ?cups=&distributor=&startDate=YYYY/MM&endDate=YYYY/MM
    &measurementType=0&pointType=5
  GET /get-max-power
    ?cups=&distributor=&startDate=YYYY/MM&endDate=YYYY/MM

Notas:
  - Retraso de hasta 2 días en los datos
  - Rate limit: máximo 1 request/segundo
  - Histórico: hasta 2 años atrás
```

### REData (PVPC) — sin autenticación
```
Base URL: https://apidatos.ree.es/es/datos

GET /mercados/precios-mercados-tiempo-real
  ?start_date=YYYY-MM-DDTHH:mm
  &end_date=YYYY-MM-DDTHH:mm
  &time_trunc=hour
  &geo_trunc=electric_system
  &geo_limit=peninsular
  &geo_ids=8741
```

---

## Variables de entorno

```env
# .env.local — nunca commitear
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
```

El archivo `.env.local` debe estar en `.gitignore` desde el inicio.
Crear `.env.example` con las keys vacías para documentación.

---

## Períodos tarifarios 2.0TD (referencia)

| Período | Nombre | Horario |
|---|---|---|
| P1 | Punta | Lun–Vie 10h–14h y 18h–22h |
| P2 | Llano | Lun–Vie 8h–10h, 14h–18h, 22h–24h |
| P3 | Valle | Resto (noches, fines de semana, festivos) |

Festivos nacionales excluidos de P1/P2 (todo P3). Implementar función
`getPeriod(date: Date): 1 | 2 | 3` en `/lib/tariff.ts`.

---

## Orden de implementación

1. Setup Next.js 14 + TypeScript + Tailwind + shadcn/ui + Recharts
2. Supabase: client.ts, server.ts, migrations SQL completas
3. Tipos TypeScript en `/lib/types/`
4. `lib/datadis.ts` — cliente completo con manejo de errores
5. `lib/redata.ts` — cliente PVPC
6. `lib/tariff.ts` — función `getPeriod`
7. API routes: `/api/datadis/sync`, `/api/datadis/supplies`, `/api/pvpc`
8. Middleware de auth + página de login
9. Página Configuración — formulario + test de conexión
10. Home dashboard — stats cards + estado sync
11. Página Consumo — gráficas horaria / diaria / mensual
12. Página Coste — estimación P1/P2/P3
13. Página PVPC — comparativa consumo vs precio
14. Cron job (`/api/cron/sync`) + configuración Vercel Cron

---

## Comandos útiles

```bash
# Desarrollo
npm run dev

# Supabase local (opcional)
npx supabase start
npx supabase db push

# Build + check tipos
npm run build

# Lint
npm run lint
```
