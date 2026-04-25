// Tarifa 2.0TD — períodos horarios para España peninsular
// P1 (punta):  Lun–Vie 10h–14h y 18h–22h
// P2 (llano):  Lun–Vie 8h–10h, 14h–18h, 22h–24h
// P3 (valle):  Resto (noches, fines de semana, festivos nacionales)

import type { TariffPeriod } from '@/lib/types/consumption'

// Festivos nacionales fijos (MM-DD)
const FIXED_HOLIDAYS = new Set([
  '01-01', // Año Nuevo
  '01-06', // Reyes Magos
  '05-01', // Día del Trabajo
  '08-15', // Asunción de la Virgen
  '10-12', // Fiesta Nacional de España
  '11-01', // Todos los Santos
  '12-06', // Día de la Constitución
  '12-08', // Inmaculada Concepción
  '12-25', // Navidad
])

// Algoritmo de Meeus para calcular el Viernes Santo
function getGoodFriday(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) // Easter month
  const day = ((h + l - 7 * m + 114) % 31) + 1          // Easter Sunday day

  // Viernes Santo = 2 días antes del Domingo de Pascua
  const easter = new Date(Date.UTC(year, month - 1, day))
  easter.setUTCDate(easter.getUTCDate() - 2)
  return easter
}

function isHoliday(date: Date): boolean {
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const mmdd = `${month}-${day}`

  if (FIXED_HOLIDAYS.has(mmdd)) return true

  // Viernes Santo (variable)
  const goodFriday = getGoodFriday(date.getUTCFullYear())
  return (
    date.getUTCFullYear() === goodFriday.getUTCFullYear() &&
    date.getUTCMonth() === goodFriday.getUTCMonth() &&
    date.getUTCDate() === goodFriday.getUTCDate()
  )
}

/**
 * Devuelve el período tarifario 2.0TD para una fecha/hora dada.
 * @param date - Fecha/hora del INICIO del intervalo de consumo (UTC, pero interpretada como hora española)
 */
export function getPeriod(date: Date): TariffPeriod {
  const dayOfWeek = date.getUTCDay() // 0=Dom, 1=Lun, ... 6=Sáb
  const hour = date.getUTCHours()    // 0–23

  // Sábados, domingos y festivos → P3 (valle)
  if (dayOfWeek === 0 || dayOfWeek === 6 || isHoliday(date)) return 3

  // P1 (punta): 10:00–14:00 y 18:00–22:00
  if ((hour >= 10 && hour < 14) || (hour >= 18 && hour < 22)) return 1

  // P2 (llano): 8:00–10:00, 14:00–18:00, 22:00–24:00
  if ((hour >= 8 && hour < 10) || (hour >= 14 && hour < 18) || hour >= 22) return 2

  // P3 (valle): 0:00–8:00
  return 3
}

export const PERIOD_COLORS: Record<TariffPeriod, string> = {
  1: '#ef4444',
  2: '#f59e0b',
  3: '#22c55e',
}

export const PERIOD_NAMES: Record<TariffPeriod, string> = {
  1: 'Punta (P1)',
  2: 'Llano (P2)',
  3: 'Valle (P3)',
}
