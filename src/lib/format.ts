import type { Drink, Settings } from '../types'

const OZ = 29.5735

export function fmt(n: number, digits = 1): string {
  if (!isFinite(n)) return '0'
  const f = n.toFixed(digits)
  return digits > 0 ? f.replace(/\.?0+$/, '') : f
}

export function fmtVol(ml: number, s: Pick<Settings, 'volUnit'>): string {
  return s.volUnit === 'oz' ? `${fmt(ml / OZ, 1)} oz` : `${fmt(ml, 0)} ml`
}

export function drinkLabel(d: Pick<Drink, 'brand' | 'name'>): string {
  return [d.brand, d.name].filter(Boolean).join(' ')
}

const pad = (n: number) => String(n).padStart(2, '0')

export function fmtTime(t: number): string {
  const d = new Date(t)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fmtDate(t: number): string {
  const d = new Date(t)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fmtDateTime(t: number): string {
  return `${fmtDate(t)} ${fmtTime(t)}`
}

/** 給 <input type="datetime-local"> 用 */
export function toLocalInput(t: number): string {
  return `${fmtDate(t)}T${fmtTime(t)}`
}

export function fromLocalInput(v: string): number {
  const t = new Date(v).getTime()
  return isNaN(t) ? Date.now() : t
}

export function fmtDuration(hours: number): string {
  const m = Math.round(hours * 60)
  if (m <= 0) return '0 分鐘'
  const h = Math.floor(m / 60)
  const mm = m % 60
  return h > 0 ? `${h} 小時 ${mm} 分` : `${mm} 分鐘`
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}
