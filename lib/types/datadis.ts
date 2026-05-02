// Tipos para la API de Datadis (v2)
// Referencia: docs/datadis-api.md

export interface DatadisSupply {
  address: string
  cups: string
  postalCode: string
  province: string
  municipality: string
  distributor: string
  validDateFrom: string
  validDateTo: string
  pointType: number
  distributorCode: string
}

export interface DatadisDistributorError {
  distributorCode: string
  distributorName: string
  errorCode: string
  errorDescription: string
}

export interface DatadisSuppliesResponse {
  supplies: DatadisSupply[]
  distributorError: DatadisDistributorError[]
}

export interface DatadisConsumptionEntry {
  cups: string
  date: string       // "2022/07/01"
  time: string       // "01:00"
  consumptionKWh: number
  obtainMethod: 'Real' | 'Estimated'
  surplusEnergyKWh: number
  generationEnergyKWh: number
  selfConsumptionEnergyKWh: number
}

export interface DatadisConsumptionResponse {
  timeCurve: DatadisConsumptionEntry[]
  distributorError: DatadisDistributorError[]
}

export interface DatadisMaxPowerEntry {
  cups: string
  date: string       // "2022/07/01"
  time: string       // "01:00"
  maxPower: number   // en kW (Datadis devuelve kW, no W)
  period: string     // "VALLE" | "LLANO" | "PUNTA"
}

export interface DatadisMaxPowerResponse {
  maxPower: DatadisMaxPowerEntry[]
  distributorError: DatadisDistributorError[]
}

export interface DatadisContractEntry {
  cups: string
  distributor: string
  marketer: string
  tension: string
  accessFare: string
  province: string
  municipality: string
  postalCode: string
  contractedPowerkW: number[]
  timeDiscrimination: string
  modePowerControl: string
  startDate: string
  endDate: string
  codeFare: string
  selfConsumptionTypeCode?: string
  selfConsumptionTypeDesc?: string | null
  section?: string
  subsection?: string
  partitionCoefficient?: number
  cau?: string
  installedCapacityKW?: number
  dateOwner?: Array<{ startDate: string; endDate: string }>
  lastMarketerDate?: string
  maxPowerInstall?: string
}

export interface DatadisContractResponse {
  contract: DatadisContractEntry[]
  distributorError: DatadisDistributorError[]
}

export interface DatadisDistributorsResponse {
  distExistenceUser: {
    distributorCodes: string[]
  }
  distributorError: DatadisDistributorError[]
}

export interface DatadisTokenError {
  type: 'auth_error'
  message: string
}

export interface DatadisFetchError {
  type: 'fetch_error'
  status: number
  message: string
}

export type DatadisError = DatadisTokenError | DatadisFetchError
