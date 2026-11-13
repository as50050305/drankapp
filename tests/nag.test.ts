import { describe, expect, it } from 'vitest'
import { buildPlan, dueCount, lastActivityOf, shuffledCycle } from '../src/lib/nag'
import { DEFAULT_SETTINGS as S, NAG_MESSAGES } from '../src/data/seed'
import type { Entry, Session } from '../src/types'

const MIN = 60000
const T0 = 1_800_000_000_000
const session = (p: Partial<Session> = {}): Session => ({ id: 's', name: '', date: '', memberIds: [], archived: false, createdAt: T0, ...p })
const entry = (createdAt: number, sessionId: string | null = 's'): Entry => ({
  id: 'e' + createdAt, memberId: 'm', sessionId, drinkId: null, drinkName: '', drinkEmoji: '', vesselName: '',
  ml: 1, abv: 1, count: 1, time: createdAt, note: '', createdAt,
})

describe('催記錄時間表', () => {
  it('活動剛開始、沒人登記：10/20/30/40/50 分各催一次，60 分自動結束', () => {
    const p = buildPlan(session(), [], S, NAG_MESSAGES)!
    expect(p.nags.map((n) => (n.at - T0) / MIN)).toEqual([10, 20, 30, 40, 50])
    expect((p.endAt! - T0) / MIN).toBe(60)
    expect(new Set(p.nags.map((n) => n.message)).size).toBe(5) // 台詞不重複
  })
  it('有人登記後重新計時；別場的紀錄不算', () => {
    const p = buildPlan(session(), [entry(T0 + 25 * MIN), entry(T0 + 90 * MIN, 'other')], S, NAG_MESSAGES)!
    expect(p.lastActivity).toBe(T0 + 25 * MIN)
    expect((p.nags[0].at - T0) / MIN).toBe(35)
    expect((p.endAt! - T0) / MIN).toBe(85)
  })
  it('活動開始超過 4 小時就不再催，但仍會在 1 小時沒登記後自動結束', () => {
    const last = T0 + 215 * MIN // 3 小時 35 分
    const p = buildPlan(session(), [entry(last)], S, NAG_MESSAGES)!
    expect(p.nags.map((n) => (n.at - T0) / MIN)).toEqual([225, 235]) // 245 已超過 240
    expect(p.endAt).toBe(last + 60 * MIN)
    const late = buildPlan(session(), [entry(T0 + 300 * MIN)], S, NAG_MESSAGES)!
    expect(late.nags).toEqual([])
    expect(late.endAt).toBe(T0 + 360 * MIN)
  })
  it('關掉自動結束時，會一路催到 4 小時為止', () => {
    const p = buildPlan(session(), [], { ...S, nagAutoEnd: false }, NAG_MESSAGES)!
    expect(p.endAt).toBeNull()
    expect(p.nags.length).toBe(24)
    expect(p.nags[23].at).toBe(T0 + 240 * MIN)
  })
  it('總開關關閉或已封存就沒有時間表', () => {
    expect(buildPlan(session(), [], { ...S, nagEnabled: false }, NAG_MESSAGES)).toBeNull()
    expect(buildPlan(session({ archived: true }), [], S, NAG_MESSAGES)).toBeNull()
  })
  it('重新開啟的活動從重新開啟的時間起算', () => {
    const s = session({ resumedAt: T0 + 500 * MIN })
    expect(lastActivityOf(s, [entry(T0 + 20 * MIN)])).toBe(T0 + 500 * MIN)
    expect(buildPlan(s, [], S, NAG_MESSAGES)!.nags[0].at).toBe(T0 + 510 * MIN)
  })
  it('dueCount 計算已到期的次數', () => {
    const p = buildPlan(session(), [], S, NAG_MESSAGES)!
    expect(dueCount(p, T0 + 9 * MIN)).toBe(0)
    expect(dueCount(p, T0 + 10 * MIN)).toBe(1)
    expect(dueCount(p, T0 + 35 * MIN)).toBe(3)
  })
})

describe('台詞分類', () => {
  it('共 30 句：通知 25 句、中毒畫面 27 句，各自不重複', () => {
    expect(NAG_MESSAGES.notify.length).toBe(25)
    expect(NAG_MESSAGES.overlay.length).toBe(27)
    expect(new Set([...NAG_MESSAGES.notify, ...NAG_MESSAGES.overlay]).size).toBe(30)
  })
  it('「系統偵測」口吻只出現在中毒畫面；抱怨沒開 App 的只出現在通知', () => {
    expect(NAG_MESSAGES.notify.some((m) => m.includes('偵測'))).toBe(false)
    expect(NAG_MESSAGES.overlay.some((m) => m.includes('開一下APP'))).toBe(false)
    const p = buildPlan(session(), [], S, NAG_MESSAGES)!
    for (const n of p.nags) {
      expect(NAG_MESSAGES.notify).toContain(n.message)
      expect(NAG_MESSAGES.overlay).toContain(n.overlayMessage)
    }
  })
})

describe('自動結束的計時起點', () => {
  it('以「最後一次登記」為準：每登記一次就往後延 60 分鐘', () => {
    const e1 = entry(T0 + 50 * MIN)
    expect(buildPlan(session(), [e1], S, NAG_MESSAGES)!.endAt).toBe(T0 + 110 * MIN)
    const e2 = entry(T0 + 105 * MIN)
    expect(buildPlan(session(), [e1, e2], S, NAG_MESSAGES)!.endAt).toBe(T0 + 165 * MIN)
  })
  it('以按下登記的時間為準，不是手動填的喝酒時間', () => {
    const e = { ...entry(T0 + 30 * MIN), time: T0 - 300 * MIN }
    expect(buildPlan(session(), [e], S, NAG_MESSAGES)!.endAt).toBe(T0 + 90 * MIN)
  })
})

describe('台詞亂序', () => {
  it('每一句都出現過一輪才重複，且不會連續兩次同一句', () => {
    for (let k = 0; k < 50; k++) {
      const out = shuffledCycle(NAG_MESSAGES.notify, 60)
      const n = NAG_MESSAGES.notify.length
      expect(new Set(out.slice(0, n)).size).toBe(n)
      expect(new Set(out.slice(n, 2 * n)).size).toBe(n)
      for (let i = 1; i < out.length; i++) expect(out[i]).not.toBe(out[i - 1])
    }
  })
  it('每次順序不同', () => {
    const orders = new Set(Array.from({ length: 20 }, () => shuffledCycle(NAG_MESSAGES.notify, 10).join('|')))
    expect(orders.size).toBeGreaterThan(10)
  })
})
