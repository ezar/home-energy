// Helper para castear resultados de queries Supabase sin genérico Database
// Usado mientras se resuelve la compatibilidad de tipos con supabase-js 2.x
import type { Database } from '@/lib/types/database'

export type Tables = Database['public']['Tables']

export type ProfileRow = Tables['profiles']['Row']
export type ProfileInsert = Tables['profiles']['Insert']
export type ProfileUpdate = Tables['profiles']['Update']

export type ConsumptionRow = Tables['consumption']['Row']
export type ConsumptionInsert = Tables['consumption']['Insert']

export type PvpcPriceRow = Tables['pvpc_prices']['Row']
export type PvpcPriceInsert = Tables['pvpc_prices']['Insert']

export type MaximeterRow = Tables['maximeter']['Row']
export type MaximeterInsert = Tables['maximeter']['Insert']

export type UserSupplyRow = Tables['user_supplies']['Row']
export type UserSupplyInsert = Tables['user_supplies']['Insert']
