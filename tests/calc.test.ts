import { describe, expect, it } from 'vitest'
import { dayStart, entryGrams, estimateBac, pureGrams, totals, weekStart } from '../src/lib/calc'
import { DEFAULT_SETTINGS as S } from '../src/data/seed'
import type { Entry } from '../src/types'

const entry = (p: Partial<Entry>): Entry => ({
  id: 'x', memberId: 'm', sessionId: null, drinkId: null, drinkName: '', drinkEmoji: '',
  vesselName: '', ml: 0, abv: 0, count: 1, time: 0, note: '', createdAt: 0, ...p,
})

describe('純酒精計算（與手算核對）', () => {
  it('500 ml、5%、密度 0.789 ≈ 19.7 g', () => {
    expect(pureGrams(500, 5, 0.789)).toBeCloseTo(19.725, 6)
  })
  it('30 ml、40% 威士忌 = 9.468 g', () => {
    expect(pureGrams(30, 40, 0.789)).toBeCloseTo(9.468, 6)
  })
  it('143 ml 台啤杯、5% × 2.5 杯 = 14.103 g', () => {
    expect(entryGrams(entry({ ml: 143, abv: 5, count: 2.5 }), S)).toBeCloseTo(14.103375, 6)
  })
  it('15 ml、58% 高粱 = 6.864 g', () => {
    expect(pureGrams(15, 58, 0.789)).toBeCloseTo(6.8643, 4)
  })
  it('150 ml、13% 紅酒 = 15.386 g', () => {
    expect(pureGrams(150, 13, 0.789)).toBeCloseTo(15.3855, 4)
  })
  it('加總與標準杯換算', () => {
    const t = totals([entry({ ml: 500, abv: 5 }), entry({ ml: 30, abv: 40, count: 2 })], S)
    expect(t.grams).toBeCloseTo(19.725 + 18.936, 6)
    expect(t.std).toBeCloseTo(3.8661, 4)
    expect(t.ml).toBe(560)
    expect(totals([entry({ ml: 500, abv: 5 })], { ...S, stdGrams: 14 }).std).toBeCloseTo(1.4089, 4)
  })
})

describe('BAC（Widmark）', () => {
  const now = 1_700_000_000_000
  it('70 kg 男性剛喝完 19.725 g → 0.0414%', () => {
    const r = estimateBac([entry({ ml: 500, abv: 5, time: now })], { sex: 'male', weightKg: 70 }, S, now)!
    expect(r.bac).toBeCloseTo(19.725 / (70 * 0.68 * 10), 6)
    expect(r.hoursToZero).toBeCloseTo(r.bac / 0.015, 6)
  })
  it('兩小時後扣掉 0.03%，不會低於 0', () => {
    const e = [entry({ ml: 500, abv: 5, time: now - 2 * 3600000 })]
    expect(estimateBac(e, { sex: 'male', weightKg: 70 }, S, now)!.bac).toBeCloseTo(0.04144 - 0.03, 4)
    expect(estimateBac(e, { sex: 'male', weightKg: 70 }, S, now + 10 * 3600000)!.bac).toBe(0)
  })
  it('很久以前喝的不會影響之後的估算', () => {
    const e = [entry({ ml: 500, abv: 5, time: now - 48 * 3600000 }), entry({ ml: 500, abv: 5, time: now })]
    expect(estimateBac(e, { sex: 'female', weightKg: 55 }, S, now)!.bac).toBeCloseTo(19.725 / (55 * 0.55 * 10), 6)
  })
  it('沒有體重就不估算', () => {
    expect(estimateBac([], { sex: null, weightKg: null }, S, now)).toBeNull()
  })
})

describe('日／週界線', () => {
  it('凌晨 2 點算前一天', () => {
    const t = new Date(2026, 10, 11, 2, 0).getTime()
    expect(new Date(dayStart(t)).getDate()).toBe(10)
  })
  it('一週從週一開始', () => {
    const t = new Date(2026, 10, 12, 20, 0).getTime() // 週四
    expect(new Date(weekStart(t)).getDay()).toBe(1)
  })
})
