export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          display_name: string | null
          datadis_username: string | null
          datadis_password_encrypted: string | null
          datadis_authorized_nif: string | null
          cups: string | null
          distributor_code: string | null
          point_type: number
          last_sync_at: string | null
          created_at: string
          tariff_type: 'pvpc' | 'fixed'
          price_p1_eur_kwh: number | null
          price_p2_eur_kwh: number | null
          price_p3_eur_kwh: number | null
          power_kw: number | null
          power_price_eur_kw_month: number | null
        }
        Insert: {
          id: string
          email: string
          display_name?: string | null
          datadis_username?: string | null
          datadis_password_encrypted?: string | null
          datadis_authorized_nif?: string | null
          cups?: string | null
          distributor_code?: string | null
          point_type?: number
          last_sync_at?: string | null
          created_at?: string
          tariff_type?: 'pvpc' | 'fixed'
          price_p1_eur_kwh?: number | null
          price_p2_eur_kwh?: number | null
          price_p3_eur_kwh?: number | null
          power_kw?: number | null
          power_price_eur_kw_month?: number | null
        }
        Update: {
          id?: string
          email?: string
          display_name?: string | null
          datadis_username?: string | null
          datadis_password_encrypted?: string | null
          datadis_authorized_nif?: string | null
          cups?: string | null
          distributor_code?: string | null
          point_type?: number
          last_sync_at?: string | null
          created_at?: string
          tariff_type?: 'pvpc' | 'fixed'
          price_p1_eur_kwh?: number | null
          price_p2_eur_kwh?: number | null
          price_p3_eur_kwh?: number | null
          power_kw?: number | null
          power_price_eur_kw_month?: number | null
        }
        Relationships: []
      }
      consumption: {
        Row: {
          id: number
          user_id: string
          cups: string
          datetime: string
          consumption_kwh: number
          period: number | null
          obtained_by_real_or_max: boolean | null
          created_at: string
        }
        Insert: {
          user_id: string
          cups: string
          datetime: string
          consumption_kwh: number
          period?: number | null
          obtained_by_real_or_max?: boolean | null
          created_at?: string
        }
        Update: {
          user_id?: string
          cups?: string
          datetime?: string
          consumption_kwh?: number
          period?: number | null
          obtained_by_real_or_max?: boolean | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'consumption_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      pvpc_prices: {
        Row: {
          id: number
          datetime: string
          price_eur_kwh: number
          created_at: string
        }
        Insert: {
          datetime: string
          price_eur_kwh: number
          created_at?: string
        }
        Update: {
          datetime?: string
          price_eur_kwh?: number
          created_at?: string
        }
        Relationships: []
      }
      maximeter: {
        Row: {
          id: number
          user_id: string
          cups: string
          datetime: string
          max_power_kw: number
          period: number | null
          created_at: string
        }
        Insert: {
          user_id: string
          cups: string
          datetime: string
          max_power_kw: number
          period?: number | null
          created_at?: string
        }
        Update: {
          user_id?: string
          cups?: string
          datetime?: string
          max_power_kw?: number
          period?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'maximeter_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
