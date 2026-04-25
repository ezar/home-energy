# Datadis API — Referencia completa

> Documentación oficial de la API de Datadis para integración en home-energy.
> Fuente: documentación oficial Datadis. Última revisión: 2025.

---

## Introducción

La API de Datadis permite acceder a la información de consumo almacenada en las bases de datos de las distintas distribuidoras eléctricas mediante una única API. Soporta datos propios, de terceros autorizados y datos agregados.

**URL base**: `https://datadis.es/`

- API privada (datos propios): `https://datadis.es/api-private/api`
- API pública (datos agregados): `https://datadis.es/api-public`
- Autenticación: `https://datadis.es/nikola-auth/tokens/login`

**Solo lectura**: verbos GET (datos) y POST (autenticación únicamente).

---

## Códigos de respuesta HTTP

| Código | Descripción |
|--------|-------------|
| 200 | OK |
| 400 | Bad request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

---

## Códigos de distribuidora

| Código | Distribuidora |
|--------|--------------|
| 1 | Viesgo |
| 2 | E-distribución |
| 3 | E-redes |
| 4 | ASEME |
| 5 | UFD |
| 6 | EOSA |
| 7 | CIDE |
| 8 | IDE (I-DE Redes Eléctricas Inteligentes) |

---

## Autenticación

### `POST /nikola-auth/tokens/login`

Obtiene el token Bearer para la API privada.

**URL completa**: `https://datadis.es/nikola-auth/tokens/login`

**Request**:
```
Content-Type: application/x-www-form-urlencoded
Body: username=NIF&password=PASSWORD
```

**Response**: string plano con el token (sin JSON wrapper).

```
eyJhbGciOiJIUzI1NiJ9...
```

> **Nota**: El token debe incluirse en todas las llamadas como `Authorization: Bearer <token>`.

---

## API Privada — Endpoints v1

> Preferir los endpoints v2 que incluyen información de errores por distribuidora.

### `GET /api-private/api/get-supplies`

Lista todos los suministros del usuario.

**Parámetros opcionales**:
- `authorizedNif` — NIF autorizado para ver sus suministros
- `distributorCode` — Filtrar por distribuidora

**Response**:
```json
[
  {
    "address": "C/ MORIONES, 23, 1ºG 03182-TORREVIEJA - ALICANTE",
    "cups": "ES002100xxxxxxxxxxJL",
    "postalCode": "3182",
    "province": "Alicante",
    "municipality": "TORREVIEJA",
    "distributor": "I-DE REDES ELÉCTRICAS INTELIGENTES, S.A.U.",
    "validDateFrom": "2021/11/29",
    "validDateTo": "2023/11/29",
    "pointType": 5,
    "distributorCode": "8"
  }
]
```

---

### `GET /api-private/api/get-contract-detail`

Detalle del contrato de un suministro.

**Parámetros requeridos**: `cups`, `distributorCode`
**Parámetros opcionales**: `authorizedNif`

**Response** (campos relevantes):
```json
[
  {
    "cups": "ES002100xxxxxxxxxxJL",
    "distributor": "I-DE REDES ELÉCTRICAS INTELIGENTES, S.A.U.",
    "marketer": "TOTALENERGIES MERCADO ESPAÑA, S.A.",
    "contractedPowerkW": [3.45, 3.45],
    "modePowerControl": "ICP",
    "codeFare": "2T",
    "startDate": "2022/09/13",
    "endDate": ""
  }
]
```

---

### `GET /api-private/api/get-consumption-data`

Datos de consumo horario o cuarto-horario.

**Parámetros requeridos**: `cups`, `distributorCode`, `startDate` (YYYY/MM), `endDate` (YYYY/MM), `measurementType` (0=hora, 1=cuarto de hora), `pointType`
**Parámetros opcionales**: `authorizedNif`

**Response**:
```json
[
  {
    "cups": "ES002100xxxxxxxxxxJL",
    "date": "2022/07/01",
    "time": "01:00",
    "consumptionKWh": 0.423,
    "obtainMethod": "Real",
    "surplusEnergyKWh": 0.0,
    "generationEnergyKWh": 0.0,
    "selfConsumptionEnergyKWh": 0.0
  }
]
```

---

### `GET /api-private/api/get-max-power`

Potencia máxima demandada (maxímetro).

**Parámetros requeridos**: `cups`, `distributorCode`, `startDate` (YYYY/MM), `endDate` (YYYY/MM)
**Parámetros opcionales**: `authorizedNif`

**Response**:
```json
[
  {
    "cups": "ES002100xxxxxxxxxxJL",
    "date": "2022/07/01",
    "time": "01:00",
    "maxPower": 4879.0,
    "period": "VALLE"
  }
]
```

---

### `GET /api-private/api/get-distributors-with-supplies`

Códigos de distribuidoras donde el usuario tiene suministros.

**Response**:
```json
[{ "distributorCodes": ["1", "7"] }]
```

---

## API Privada — Endpoints v2 (recomendados)

Los endpoints v2 añaden un array `distributorError` para informar de errores por distribuidora sin romper la respuesta completa.

### `GET /api-private/api/get-supplies-v2`

**Response**:
```json
{
  "supplies": [
    {
      "address": "...",
      "cups": "ES002100xxxxxxxxxxJL",
      "postalCode": "3182",
      "province": "Alicante",
      "municipality": "TORREVIEJA",
      "distributor": "I-DE REDES ELÉCTRICAS INTELIGENTES, S.A.U.",
      "validDateFrom": "2021/11/29",
      "validDateTo": "2023/11/29",
      "pointType": 5,
      "distributorCode": "8"
    }
  ],
  "distributorError": [
    {
      "distributorCode": "1",
      "distributorName": "VIESGO",
      "errorCode": "10",
      "errorDescription": "Error interno distribuidora"
    }
  ]
}
```

---

### `GET /api-private/api/get-contract-detail-v2`

**Parámetros requeridos**: `cups`, `distributorCode`

**Response**:
```json
{
  "contract": [{ /* mismo formato que v1 */ }],
  "distributorError": []
}
```

---

### `GET /api-private/api/get-consumption-data-v2`

**Parámetros**: mismos que v1.

**Response**:
```json
{
  "timeCurve": [
    {
      "cups": "ES002100xxxxxxxxxxJL",
      "date": "2022/07/01",
      "time": "01:00",
      "consumptionKWh": 0.423,
      "obtainMethod": "Real",
      "surplusEnergyKWh": 0.0,
      "generationEnergyKWh": 0.0,
      "selfConsumptionEnergyKWh": 0.0
    }
  ],
  "distributorError": []
}
```

---

### `GET /api-private/api/get-max-power-v2`

**Response**:
```json
{
  "maxPower": [
    {
      "cups": "ES002100xxxxxxxxxxJL",
      "date": "2022/07/01",
      "time": "01:00",
      "maxPower": 4879.0,
      "period": "VALLE"
    }
  ],
  "distributorError": []
}
```

---

### `GET /api-private/api/get-distributors-with-supplies-v2`

**Response**:
```json
{
  "distExistenceUser": {
    "distributorCodes": ["1", "7"]
  },
  "distributorError": [
    {
      "distributorCode": "1",
      "distributorName": "VIESGO",
      "errorCode": "10",
      "errorDescription": "Error interno distribuidora"
    }
  ]
}
```

---

### `GET /api-private/api/get-reactive-data-v2`

Energía reactiva mensual por período.

**Parámetros requeridos**: `cups`, `distributorCode`, `startDate`, `endDate`

**Response**:
```json
{
  "reactiveEnergy": {
    "cups": "ES002100xxxxxxxxxxJL",
    "energy": [
      {
        "date": "2024/01",
        "energy_p1": 0,
        "energy_p2": 100,
        "energy_p3": 0,
        "energy_p4": 1200,
        "energy_p5": 0,
        "energy_p6": -150
      }
    ],
    "code": "001",
    "code_desc": "Correcto"
  },
  "distributorError": []
}
```

---

## Gestión de autorizaciones

### `GET /api-private/api/new-authorization`

Crea una autorización para que otro NIF vea tus suministros.

**Parámetros**: `authorizedNif` (requerido), `startDate`, `endDate`, `cups[]`

### `GET /api-private/api/cancel-authorization`

Cancela una autorización existente.

**Parámetros**: `authorizedNif` (requerido), `cups[]`

### `GET /api-private/api/list-authorization`

Lista todas las autorizaciones.

**Response**:
```json
[
  {
    "id": 28908,
    "ownerDocument": "X88888888",
    "requesterDocument": "X99999999",
    "cups": "ES0021000846719380RX",
    "status": "PENDIENTE DE VALIDACION",
    "validityDateStart": "2025-03-21 00:00:00.0",
    "validityDateEnd": "2025-05-24 23:59:59.0",
    "distributorCodeFather": "0021"
  }
]
```

---

## Notas de implementación

### Rate limiting
- Máximo ~1 request/segundo para evitar error 429
- Implementar delay de 1000ms entre llamadas consecutivas

### Parseo de fecha/hora
Los datos vienen en formato separado:
```typescript
// Combinar date + time para obtener datetime
// date: "2022/07/01", time: "01:00"
// El time "01:00" significa que el intervalo es de 00:00 a 01:00
const datetime = parse(`${date} ${time}`, 'yyyy/MM/dd HH:mm', new Date())
```

### obtainMethod
- `"Real"` → `obtained_by_real_or_max = true`
- `"Estimated"` → `obtained_by_real_or_max = false`

### pointType
- 5 → Medida horaria (más común en contadores inteligentes domésticos)
- 1, 2 → Cuarto-horaria (requiere `measurementType=1`)
