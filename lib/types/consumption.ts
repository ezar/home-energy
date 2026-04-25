// Tipos de dominio para consumo y visualización

export type TariffPeriod = 1 | 2 | 3

export interface ConsumptionRecord {
  id: number
  userId: string
  cups: string
  datetime: string       // ISO 8601
  consumptionKwh: number
  period: TariffPeriod | null
  isReal: boolean | null
  createdAt: string
}

export interface PvpcRecord {
  id: number
  datetime: string
  priceEurKwh: number
  createdAt: string
}

export interface MaximeterRecord {
  id: number
  userId: string
  cups: string
  datetime: string
  maxPowerKw: number
  period: TariffPeriod | null
  createdAt: string
}

// Punto combinado para gráficas (consumo + precio PVPC)
export interface ChartDataPoint {
  datetime: string
  hour: string                    // "HH:mm" para el eje X
  consumptionKwh: number
  period: TariffPeriod | null
  priceEurKwh: number | null
  estimatedCostEur: number | null
}

// Resumen por día
export interface DailySummary {
  date: string                    // "YYYY-MM-DD"
  totalKwh: number
  estimatedCostEur: number
  kwhP1: number
  kwhP2: number
  kwhP3: number
}

// Resumen por mes
export interface MonthlySummary {
  month: string                   // "YYYY-MM"
  totalKwh: number
  estimatedCostEur: number
  avgPriceEurKwh: number
}

// Stats para la home
export interface DashboardStats {
  currentMonthKwh: number
  previousMonthKwh: number
  currentMonthCostEur: number
  latestDataDatetime: string | null
  currentPvpcEurKwh: number | null
  lastSyncAt: string | null
}

export interface SyncResult {
  synced: number
  from: string
  to: string
  pvpcSynced: number
}
