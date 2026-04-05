import { SPC_COLORS } from './config'
import type { SpcColor, WarningType } from './types'

export function p2(n: number) {
  return String(n).padStart(2, '0')
}

export function normalizeStationId(stn: string | null) {
  if (!stn) return null
  let s = String(stn).trim().toUpperCase()
  if (!s.startsWith('K')) s = 'K' + s
  return s
}

export function stationCodeForIEM(stn: string | null) {
  const norm = normalizeStationId(stn)
  return norm ? norm.slice(1) : null
}

export function classifyNwsEvent(ev?: string): WarningType {
  const e = String(ev || '').trim()
  if (e === 'Tornado Warning') return 'TOR'
  if (e === 'Severe Thunderstorm Warning') return 'SVR'
  if (e === 'Special Weather Statement') return 'SPS'
  if (e === 'Special Marine Warning') return 'SMW'
  if (e === 'Tornado Watch') return 'TWA'
  if (e === 'Severe Thunderstorm Watch') return 'SWA'
  if (e === 'Flash Flood Warning' || e === 'Flash Flood Watch') return 'FF'
  if (/Flood/i.test(e)) return 'FLD'
  if (/Winter|Blizzard|Ice Storm|Snow Squall/i.test(e)) return 'WS'
  if (/Heat|Excessive Heat/i.test(e)) return 'HEAT'
  if (/Red Flag|Fire Weather/i.test(e)) return 'FIRE'
  if (/Wind|Dust Storm/i.test(e)) return 'WIND'
  if (/Marine|Gale|Storm Warning|Hurricane Force Wind/i.test(e)) return 'MAR'
  return 'GEN'
}

export function getSpcColor(props: Record<string, unknown>): SpcColor {
  const dn = props.DN !== undefined ? Number(props.DN) : null
  if (dn !== null && SPC_COLORS[dn]) return SPC_COLORS[dn]
  const lbl = String((props.LABEL || props.label || props.TITLE || '') as string)
    .trim()
    .toUpperCase()
  if (SPC_COLORS[lbl]) return SPC_COLORS[lbl]
  return { fill: '#888888', stroke: '#555555', label: lbl || 'Unknown' }
}

export function parseVtecToWwaUrl(parameters: unknown): string | null {
  if (!parameters || typeof parameters !== 'object') return null
  const vtec = (parameters as { VTEC?: unknown }).VTEC
  const first = Array.isArray(vtec) ? vtec[0] : null
  if (typeof first !== 'string') return null

  // Example: "/O.NEW.KOUN.TO.W.0001.240505T0000Z-240505T0045Z/"
  const m = first.match(/\.(K[A-Z]{3})\.(?:[A-Z0-9]{2})\.([A-Z0-9]{2})\.([A-Z])\./)
  if (!m) return null

  const wfo4 = m[1] // KOUN
  const phen = m[2] // TO / SV / FF ...
  const sig = m[3] // W / A / Y ...
  const cwa = wfo4.slice(1)

  const wwa = `${phen}.${sig}`
  return `https://forecast.weather.gov/wwamap/wwatxtget.php?cwa=${encodeURIComponent(cwa)}&wwa=${encodeURIComponent(wwa)}`
}
