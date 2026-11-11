import { db, updateSettings } from './db'
import type { Drink, Entry, Session, Vessel } from './types'
import { drinkLabel, uid } from './lib/format'

export interface NewEntryInput {
  memberId: string
  drink: Drink
  vessel: Vessel
  count: number
  ml?: number
  abv?: number
  time?: number
  note?: string
  session: Session | null
}

/** 新增一筆紀錄；有進行中的場次就自動歸入，並把這位成員加進場次 */
export async function addEntry(i: NewEntryInput): Promise<Entry> {
  const now = Date.now()
  const entry: Entry = {
    id: uid(),
    memberId: i.memberId,
    sessionId: i.session?.id ?? null,
    drinkId: i.drink.id,
    drinkName: drinkLabel(i.drink),
    drinkEmoji: i.drink.emoji,
    vesselName: i.vessel.name,
    ml: i.ml ?? i.vessel.ml,
    abv: i.abv ?? i.drink.abv,
    count: i.count,
    time: i.time ?? now,
    note: i.note ?? '',
    createdAt: now,
  }
  await db.entries.add(entry)
  await joinSession(i.session, i.memberId)
  await updateSettings({ lastDrinkId: i.drink.id, lastVesselId: i.vessel.id })
  return entry
}

async function joinSession(session: Session | null, memberId: string) {
  if (session && !session.memberIds.includes(memberId)) {
    await db.sessions.update(session.id, { memberIds: [...session.memberIds, memberId] })
  }
}

/** 重複這位成員最近記錄的一筆（時間改為現在） */
export async function repeatLast(memberId: string, session: Session | null): Promise<Entry | null> {
  const mine = await db.entries.where('memberId').equals(memberId).toArray()
  if (!mine.length) return null
  const last = mine.reduce((a, b) => (b.createdAt > a.createdAt ? b : a))
  const now = Date.now()
  const entry: Entry = { ...last, id: uid(), time: now, createdAt: now, sessionId: session?.id ?? null, note: '' }
  await db.entries.add(entry)
  await joinSession(session, memberId)
  return entry
}

/** 復原（刪除）最後新增的一筆紀錄 */
export async function undoLast(): Promise<Entry | null> {
  const all = await db.entries.toArray()
  if (!all.length) return null
  const last = all.reduce((a, b) => (b.createdAt > a.createdAt ? b : a))
  await db.entries.delete(last.id)
  return last
}

export async function deleteMember(id: string): Promise<void> {
  await db.transaction('rw', db.members, db.entries, db.sessions, async () => {
    await db.entries.where('memberId').equals(id).delete()
    const sessions = await db.sessions.toArray()
    for (const s of sessions) {
      if (s.memberIds.includes(id)) {
        await db.sessions.update(s.id, { memberIds: s.memberIds.filter((m) => m !== id) })
      }
    }
    await db.members.delete(id)
  })
}

export async function deleteSession(id: string): Promise<void> {
  await db.transaction('rw', db.sessions, db.entries, async () => {
    await db.entries.where('sessionId').equals(id).modify({ sessionId: null })
    await db.sessions.delete(id)
  })
}
