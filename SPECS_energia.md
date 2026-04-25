# SPECS — Dashboard Consumo Eléctrico
*App privada familiar · Next.js 14 · Supabase · Datadis + REData PVPC*

---

## 1. Visión general

Dashboard privado para visualizar y analizar el consumo eléctrico del hogar, conectado a Datadis (datos reales del contador inteligente) y al precio PVPC horario de REData. Permite a un grupo cerrado de usuarios (familia/amigos) conectar su suministro y ver sus datos en gráficas claras.

**Usuarios objetivo**: 2–5 personas de confianza, acceso por invitación (allowlist de emails en Supabase).

---

## 2. Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Gráficas | Recharts |
| Auth | Supabase Auth (email/password, allowlist) |
| Base de datos | Supabase (PostgreSQL) |
| Backend | Next.js API Routes (server-side) |
| Deploy | Vercel |
| APIs externas | Datadis API privada + REData API (PVPC) |

---

## 3. Estructura de carpetas

```
/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # Home: resumen general
│   │   ├── consumo/page.tsx          # Gráficas detalladas
│   │   ├── coste/page.tsx            # Estimación de factura
│   │   ├── pvpc/page.tsx             # Comparativa precio mercado
│   │   └── configuracion/page.tsx   # Credenciales Datadis
│   └── api/
│       ├── datadis/
│       │   ├── sync/route.ts         # Fetch y guarda consumo de Datadis
│       │   └── supplies/route.ts     # Lista suministros del usuario
│       ├── pvpc/
│       │   └── route.ts              # Proxy a REData API
│       └── cron/
│           └── sync/route.ts         # Sync automático diario
├── lib/
│   ├── datadis.ts                    # Cliente Datadis API
│   ├── redata.ts                     # Cliente REData API (PVPC)
│   ├── tariff.ts                     # Función getPeriod (2.0TD)
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   └── types/
│       ├── datadis.ts
│       ├── redata.ts
│       └── consumption.ts
├── components/
│   ├── charts/
│   │   ├── HourlyConsumptionChart.tsx
│   │   ├── DailyConsumptionChart.tsx
│   │   ├── MonthlyConsumptionChart.tsx
│   │   ├── CostBreakdownChart.tsx
│   │   └── PvpcOverlayChart.tsx      # Consumo + precio PVPC superpuestos
│   ├── dashboard/
│   │   ├── StatsCard.tsx
│   │   ├── PeriodSelector.tsx
│   │   └── SyncStatus.tsx
│   └── ui/                           # shadcn/ui components
├── supabase/
│   └── migrations/                   # SQL migrations con timestamp
├── docs/
│   └── datadis-api.md                # Referencia completa API Datadis
└── middleware.ts                     # Protección de rutas
```

---

## 4. Base de datos (Supabase)

### 4.1 Tabla `profiles`
```sql
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  display_name text,
  datadis_username text,                    -- NIF del usuario
  datadis_password_encrypted text,          -- Contraseña cifrada (vault)
  datadis_authorized_nif text,              -- NIF autorizado (si no es el titular)
  cups text,                                -- CUPS principal configurado
  distributor_code text,                    -- Código distribuidora (e.g. "0022" para e-distribución)
  point_type integer default 1,             -- 1=hora, 2=cuarto de hora
  last_sync_at timestamptz,
  created_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "Users can only see their own profile"
  on profiles for all using (auth.uid() = id);
```

### 4.2 Tabla `consumption`
```sql
create table consumption (
  id bigint generated always as identity primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  cups text not null,
  datetime timestamptz not null,            -- Hora exacta del registro
  consumption_kwh numeric(10,4) not null,   -- kWh consumidos
  period integer,                           -- 1=P1 punta, 2=P2 llano, 3=P3 valle
  obtained_by_real_or_max boolean,          -- true=real, false=estimado
  created_at timestamptz default now(),
  unique(user_id, cups, datetime)
);

alter table consumption enable row level security;
create policy "Users can only see their own consumption"
  on consumption for all using (auth.uid() = user_id);

create index consumption_user_datetime on consumption(user_id, datetime desc);
create index consumption_cups_datetime on consumption(cups, datetime desc);
```

### 4.3 Tabla `pvpc_prices`
```sql
create table pvpc_prices (
  id bigint generated always as identity primary key,
  datetime timestamptz not null unique,     -- Hora del precio
  price_eur_kwh numeric(8,6) not null,      -- Precio en €/kWh
  created_at timestamptz default now()
);

create index pvpc_prices_datetime on pvpc_prices(datetime desc);
-- Sin RLS: datos públicos compartidos por todos los usuarios
```

### 4.4 Tabla `maximeter`
```sql
create table maximeter (
  id bigint generated always as identity primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  cups text not null,
  datetime timestamptz not null,
  max_power_kw numeric(8,3) not null,
  period integer,
  created_at timestamptz default now(),
  unique(user_id, cups, datetime)
);

alter table maximeter enable row level security;
create policy "Users can only see their own maximeter"
  on maximeter for all using (auth.uid() = user_id);
```

---

## 5. APIs externas

### 5.1 Datadis API privada

> Referencia completa en `docs/datadis-api.md`

**Base URL privada**: `https://datadis.es/api-private/api`

**Autenticación**: Token Bearer obtenido con POST (URL diferente a la base privada):
```
POST https://datadis.es/nikola-auth/tokens/login
Body: username=NIF&password=PASSWORD (application/x-www-form-urlencoded)
Response: string (el token directamente, sin JSON wrapper)
```

**Endpoints a usar** (preferir versiones v2 por mejor manejo de errores):
```
GET /get-supplies-v2
  → { supplies: [...], distributorError: [...] }

GET /get-consumption-data-v2
  ?cups=&distributorCode=&startDate=YYYY/MM&endDate=YYYY/MM
  &measurementType=0&pointType=5
  → { timeCurve: [...], distributorError: [...] }

GET /get-max-power-v2
  ?cups=&distributorCode=&startDate=YYYY/MM&endDate=YYYY/MM
  → { maxPower: [...], distributorError: [...] }

GET /get-contract-detail-v2
  ?cups=&distributorCode=
  → { contract: [...], distributorError: [...] }
```

**Notas importantes**:
- El token expira, obtener uno nuevo en cada sync (no persistir)
- Datadis tiene hasta 2 días de retraso en los datos
- Respetar rate limiting: no más de 1 request/segundo
- Los datos históricos llegan hasta 2 años atrás
- `obtainMethod`: "Real" | "Estimated"

### 5.2 REData API (PVPC)

**Base URL**: `https://apidatos.ree.es/es/datos`

**Endpoint PVPC**:
```
GET /mercados/precios-mercados-tiempo-real
  ?start_date=YYYY-MM-DDTHH:mm
  &end_date=YYYY-MM-DDTHH:mm
  &time_trunc=hour
  &geo_trunc=electric_system
  &geo_limit=peninsular
  &geo_ids=8741
```

**Sin autenticación** — API pública gratuita de Red Eléctrica.

---

## 6. Lógica de negocio

### 6.1 Sync de datos
```typescript
// Flujo de sincronización (API route /api/datadis/sync)
1. Obtener token de Datadis con las credenciales del usuario (guardadas en Supabase)
2. Consultar get-consumption-data-v2 para el último mes disponible
3. Upsert en tabla consumption (unique constraint evita duplicados)
4. Consultar PVPC de REData para el mismo período
5. Upsert en pvpc_prices
6. Actualizar last_sync_at en profiles
7. Responder con { synced: N, from: date, to: date }
```

### 6.2 Estimación de coste
```typescript
// Cálculo de coste estimado por hora
// Para tarifa 2.0TD PVPC:
coste_hora = consumption_kwh * pvpc_price_eur_kwh

// Desglose por período (P1/P2/P3):
// P1 (punta): lunes-viernes 10h-14h y 18h-22h
// P2 (llano): lunes-viernes 8h-10h, 14h-18h, 22h-24h
// P3 (valle): resto (noches, fines de semana, festivos)

// Término de potencia: no calculado (requiere datos del contrato)
// Mostrar disclaimer: "Estimación solo de término de energía"
```

### 6.3 Cron automático
- Vercel Cron Job diario a las 6:00 AM
- Llama a `/api/cron/sync` con header `Authorization: Bearer CRON_SECRET`
- Itera sobre todos los usuarios con Datadis configurado
- Sincroniza últimos 3 días (para cubrir retrasos de Datadis)

---

## 7. Vistas del dashboard

### 7.1 Home (resumen)
- Consumo total del mes actual vs mes anterior (diferencia en %)
- Coste estimado del mes actual
- Última hora con datos disponibles
- Precio PVPC ahora mismo y las próximas 24h
- Botón "Sincronizar ahora"
- Estado de última sync

### 7.2 Consumo — gráficas
- **Vista horaria**: barras por hora del día seleccionado, coloreadas por período (P1/P2/P3)
- **Vista diaria**: barras por día del mes, con selector de mes
- **Vista mensual**: barras por mes, últimos 12 meses
- Selector de período (hoy / esta semana / este mes / rango custom)
- Toggle para superponer precio PVPC en el gráfico horario (eje secundario)

### 7.3 Coste estimado
- Tabla mensual: kWh · precio medio · coste estimado
- Desglose por período P1/P2/P3 del mes actual
- Gráfica de coste diario acumulado en el mes

### 7.4 Comparativa PVPC
- Gráfica: consumo real (barras) + precio PVPC (línea) superpuestos — últimas 48h
- Horas más caras vs horas donde más consumes (detectar optimizaciones)
- Precio medio pagado vs precio medio del mercado

### 7.5 Configuración
- Formulario: NIF Datadis + contraseña + CUPS + distribuidora
- Test de conexión (botón "Verificar credenciales")
- Estado de sync + botón manual
- Listado de suministros detectados

---

## 8. Seguridad

- Credenciales Datadis cifradas en Supabase Vault (nunca en columnas planas)
- Llamadas a Datadis siempre server-side (API routes), nunca desde el browser
- RLS en todas las tablas de usuario
- Allowlist de emails: solo usuarios invitados pueden registrarse
  ```sql
  -- En Supabase: activar "Email allowlist" en Authentication > Settings
  ```
- Variables de entorno: ninguna credencial en el cliente

---

## 9. Variables de entorno

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

CRON_SECRET=          # Token para el cron job de Vercel
```

---

## 10. Roadmap

| Fase | Feature |
|---|---|
| **MVP** | Auth · Config Datadis · Sync manual · Gráficas horaria/diaria/mensual · PVPC overlay |
| **v1.1** | Cron automático diario · Notificación email si sync falla |
| **v1.2** | Alertas: "hoy el precio baja de X€/kWh entre 14h-16h" |
| **v1.3** | Exportar datos a CSV |
| **v2.0** | Multi-suministro (casa + garaje, etc.) |
| **v2.1** | Soporte autoconsumo solar (generación vs consumo) |
| **v2.2** | Bot Telegram para consultas |

---

## 11. Configuración del proyecto

**GitHub**: usar cuenta `ezar` / `ezarlive@gmail.com`
- Repo: `home-energy` (privado)
- Branch principal: `main`

**Escalabilidad**: la arquitectura actual soporta crecimiento a app pública sin cambios estructurales.
