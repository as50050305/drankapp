import type { Entry, Session, Settings } from '../types'

export interface NagPlan {
  sessionId: string
  /** 計時起點：最後一次記錄（或活動開始）的時間 */
  lastActivity: number
  /** 每一次催促的時間，以及手機通知、中毒畫面各自的台詞 */
  nags: Array<{ at: number; message: string; overlayMessage: string }>
  /** 自動結束活動的時間；null 表示不自動結束 */
  endAt: number | null
}

type NagSettings = Pick<Settings, 'nagEnabled' | 'nagAutoEnd' | 'nagIntervalMin' | 'nagWindowHours' | 'nagAutoEndMin'>

const MIN = 60000

/** 活動的起點：重新開啟過就從重新開啟的時間算 */
export function sessionStart(session: Session): number {
  return Math.max(session.createdAt, session.resumedAt ?? 0)
}

/** 這場活動最後一次有人登記的時間（沒有紀錄就是活動開始時間） */
export function lastActivityOf(session: Session, entries: Entry[]): number {
  let t = sessionStart(session)
  for (const e of entries) if (e.sessionId === session.id && e.createdAt > t) t = e.createdAt
  return t
}

/** 洗牌後輪流出牌，用完再洗，且不會連續兩次同一句 */
export function shuffledCycle(items: string[], n: number, rng: () => number = Math.random): string[] {
  const out: string[] = []
  let deck: string[] = []
  while (out.length < n && items.length) {
    if (!deck.length) {
      deck = [...items]
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1))
        ;[deck[i], deck[j]] = [deck[j], deck[i]]
      }
      if (deck.length > 1 && deck[0] === out[out.length - 1]) deck.push(deck.shift()!)
    }
    out.push(deck.shift()!)
  }
  return out
}

/**
 * 依「活動開始時間、最後記錄時間」排出接下來的催促時間表：
 * - 每隔 nagIntervalMin 分鐘沒記錄催一次，只催到活動開始後 nagWindowHours 小時為止
 * - 連續 nagAutoEndMin 分鐘沒記錄就自動結束活動（不受時段限制）
 */
export function buildPlan(
  session: Session,
  entries: Entry[],
  s: NagSettings,
  messages: { notify: string[]; overlay: string[] },
  rng: () => number = Math.random,
): NagPlan | null {
  if (!s.nagEnabled || session.archived) return null
  const start = sessionStart(session)
  const last = lastActivityOf(session, entries)
  const interval = Math.max(1, s.nagIntervalMin) * MIN
  const windowEnd = start + Math.max(0, s.nagWindowHours) * 60 * MIN
  const endAt = s.nagAutoEnd && s.nagAutoEndMin > 0 ? last + s.nagAutoEndMin * MIN : null
  const times: number[] = []
  for (let t = last + interval; t <= windowEnd && (endAt == null || t < endAt) && times.length < 60; t += interval) {
    times.push(t)
  }
  const notify = shuffledCycle(messages.notify, times.length, rng)
  const overlay = shuffledCycle(messages.overlay, times.length, rng)
  return {
    sessionId: session.id,
    lastActivity: last,
    nags: times.map((at, i) => ({ at, message: notify[i], overlayMessage: overlay[i] })),
    endAt,
  }
}

/** 到 now 為止已經到期的催促次數 */
export function dueCount(plan: NagPlan, now: number): number {
  let n = 0
  for (const x of plan.nags) if (x.at <= now) n++
  return n
}
