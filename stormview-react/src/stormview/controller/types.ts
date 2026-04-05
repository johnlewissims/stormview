export type LayerId = 'ref' | 'sat' | 'vel'

export type WarningType =
  | 'TOR'
  | 'SVR'
  | 'SPS'
  | 'SMW'
  | 'TWA'
  | 'SWA'
  | 'MCD'
  | 'FF'
  | 'FLD'
  | 'WS'
  | 'HEAT'
  | 'FIRE'
  | 'WIND'
  | 'MAR'
  | 'GEN'

export type OverlayName = 'county' | 'state' | 'cwa'

export type SpcDay = 1 | 2 | 3

export type AlertSource = 'nws' | 'spc'

export type AlertItem = {
  type: WarningType
  event: string
  area: string
  exp: string
  src: AlertSource
  key: string
  feat?: GeoJSON.Feature
}

export type City = { n: string; lat: number; lon: number; p: 1 | 2 | 3 | 4 }

export type NexradStation = { id: string; lat: number; lon: number; name: string }

export type LayerDef = {
  label: string
  unit: string
  stops: number[]
  cols: string[]
}

export type WarningStyle = {
  c: string
  f: string
  fa: number
  w: number
  d: string
  z: number
  lbl: string
}

export type SpcColor = { fill: string; stroke: string; label: string }
