// Tipos para la API de REData (PVPC)
// Referencia: https://apidatos.ree.es

export interface RedataValue {
  value: number
  percentage: number
  datetime: string  // ISO 8601
}

export interface RedataAttribute {
  title: string
  'last-update': string
  description: string
  magnitude: string
  composite: boolean
  'zero-values': boolean
  values: RedataValue[]
}

export interface RedataIncluded {
  type: string
  id: string
  groupId: string | null
  attributes: RedataAttribute
}

export interface RedataResponse {
  data: {
    type: string
    id: string
    attributes: {
      title: string
      'last-update': string
      description: string
      magnitude: string
      composite: boolean
      'zero-values': boolean
    }
    meta: {
      'cache-control': string
    }
  }
  included: RedataIncluded[]
}

export interface PvpcPrice {
  datetime: string   // ISO 8601 (UTC)
  priceEurKwh: number
}
