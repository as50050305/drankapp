import type { Entry, Member, Settings } from '../types'

/** 純酒精（g）= 容量(ml) × 酒精度(%) ÷ 100 × 酒精密度 */
export function pureGrams(ml: number, abv: number, density: number): number {
  return (ml * abv * density) / 100
}

export function entryMl(e: Pick<Entry, 'ml' | 'count'>): number {
  return e.ml * e.count
}

export function entryGrams(e: Pick<Entry, 'ml' | 'count' | 'abv'>, s: Pick<Settings, 'density'>): number {
  return pureGrams(e.ml * e.count, e.abv, s.density)
}

export function toStd(grams: number, s: Pick<Settings, 'stdGrams'>): number {
  return s.stdGrams > 0 ? grams / s.stdGrams : 0
}

export interface Totals {
  grams: number
  std: number
  ml: number
  count: number
}

export function totals(entries: Entry[], s: Settings): Totals {
  let grams = 0
  let ml = 0
  let count = 0
  for (const e of entries) {
    grams += entryGrams(e, s)
    ml += entryMl(e)
    count += e.count
  }
  return { grams, std: toStd(grams, s), ml, count }
}

/** 「一天」從清晨 05:00 起算，跨午夜的續攤才會算在同一天 */
export const DAY_START_HOUR = 5

export function dayStart(t: number): number {
  const d = new Date(t)
  if (d.getHours() < DAY_START_HOUR) d.setDate(d.getDate() - 1)
  d.setHours(DAY_START_HOUR, 0, 0, 0)
  return d.getTime()
}

/** 一週從週一 05:00 起算 */
export function weekStart(t: number): number {
  const d = new Date(dayStart(t))
  const dow = (d.getDay() + 6) % 7 // 週一 = 0
  d.setDate(d.getDate() - dow)
  return d.getTime()
}

export function widmarkR(m: Pick<Member, 'sex'>, s: Pick<Settings, 'rMale' | 'rFemale'>): number {
  if (m.sex === 'male') return s.rMale
  if (m.sex === 'female') return s.rFemale
  return (s.rMale + s.rFemale) / 2
}

export interface BacResult {
  /** 目前估算 BAC（%） */
  bac: number
  /** 估計降到 0 還需幾小時 */
  hoursToZero: number
}

/**
 * Widmark 公式：每喝一筆，BAC 增加 酒精(g) ÷ (體重(kg) × r × 10)（單位 %），
 * 並隨時間以代謝速率（%/小時）線性下降，最低為 0。
 * 僅為粗略估算。
 */
export function estimateBac(
  entries: Entry[],
  member: Pick<Member, 'sex' | 'weightKg'>,
  s: Settings,
  now: number,
): BacResult | null {
  if (!member.weightKg || member.weightKg <= 0) return null
  const r = widmarkR(member, s)
  if (r <= 0) return null
  const sorted = entries.filter((e) => e.time <= now).sort((a, b) => a.time - b.time)
  let bac = 0
  let last = sorted.length ? sorted[0].time : now
  for (const e of sorted) {
    bac = Math.max(0, bac - s.metabolism * ((e.time - last) / 3600000))
    bac += entryGrams(e, s) / (member.weightKg * r * 10)
    last = e.time
  }
  bac = Math.max(0, bac - s.metabolism * ((now - last) / 3600000))
  return { bac, hoursToZero: s.metabolism > 0 ? bac / s.metabolism : 0 }
}
