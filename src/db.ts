import Dexie, { type Table } from 'dexie'
import type { Drink, Entry, Member, Session, Settings, Vessel } from './types'
import { DEFAULT_SETTINGS, seedDrinks, seedVessels } from './data/seed'

interface KV {
  key: string
  value: unknown
}

class AppDB extends Dexie {
  members!: Table<Member, string>
  drinks!: Table<Drink, string>
  vessels!: Table<Vessel, string>
  sessions!: Table<Session, string>
  entries!: Table<Entry, string>
  kv!: Table<KV, string>

  constructor() {
    super('drankapp')
    this.version(1).stores({
      members: 'id',
      drinks: 'id',
      vessels: 'id',
      sessions: 'id',
      entries: 'id, memberId, sessionId, time',
      kv: 'key',
    })
  }
}

export const db = new AppDB()

/** 第一次開啟時寫入種子資料 */
export async function ensureSeed(): Promise<void> {
  await db.transaction('rw', db.drinks, db.vessels, db.kv, async () => {
    const seeded = await db.kv.get('seeded')
    if (seeded) return
    await db.vessels.bulkPut(seedVessels())
    await db.drinks.bulkPut(seedDrinks())
    await db.kv.put({ key: 'settings', value: DEFAULT_SETTINGS })
    await db.kv.put({ key: 'seeded', value: true })
  })
}

export async function getSettings(): Promise<Settings> {
  const row = await db.kv.get('settings')
  return { ...DEFAULT_SETTINGS, ...((row?.value as Partial<Settings>) ?? {}) }
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  await db.transaction('rw', db.kv, async () => {
    const cur = await getSettings()
    await db.kv.put({ key: 'settings', value: { ...cur, ...patch } })
  })
}

/** 把酒款與杯具重設為種子資料（不影響成員、場次與紀錄） */
export async function resetCatalog(): Promise<void> {
  await db.transaction('rw', db.drinks, db.vessels, async () => {
    await db.drinks.clear()
    await db.vessels.clear()
    await db.vessels.bulkPut(seedVessels())
    await db.drinks.bulkPut(seedDrinks())
  })
}

export async function resetParams(): Promise<void> {
  const cur = await getSettings()
  await updateSettings({
    ...DEFAULT_SETTINGS,
    currentMemberId: cur.currentMemberId,
    lastDrinkId: cur.lastDrinkId,
    lastVesselId: cur.lastVesselId,
  })
}

export interface Backup {
  app: 'drankapp'
  version: 1
  exportedAt: string
  settings: Settings
  members: Member[]
  drinks: Drink[]
  vessels: Vessel[]
  sessions: Session[]
  entries: Entry[]
}

export async function exportBackup(): Promise<Backup> {
  return {
    app: 'drankapp',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: await getSettings(),
    members: await db.members.toArray(),
    drinks: await db.drinks.toArray(),
    vessels: await db.vessels.toArray(),
    sessions: await db.sessions.toArray(),
    entries: await db.entries.toArray(),
  }
}

export function validateBackup(data: unknown): Backup {
  const b = data as Backup
  if (!b || b.app !== 'drankapp' || !Array.isArray(b.members) || !Array.isArray(b.entries) ||
      !Array.isArray(b.drinks) || !Array.isArray(b.vessels) || !Array.isArray(b.sessions)) {
    throw new Error('這不是「喝多少」的備份檔')
  }
  return b
}

/** 匯入完整備份：會取代目前所有資料 */
export async function importBackup(data: unknown): Promise<void> {
  const b = validateBackup(data)
  await db.transaction('rw', [db.members, db.drinks, db.vessels, db.sessions, db.entries, db.kv], async () => {
    await Promise.all([db.members.clear(), db.drinks.clear(), db.vessels.clear(), db.sessions.clear(), db.entries.clear()])
    await db.members.bulkPut(b.members)
    await db.drinks.bulkPut(b.drinks)
    await db.vessels.bulkPut(b.vessels)
    await db.sessions.bulkPut(b.sessions)
    await db.entries.bulkPut(b.entries)
    await db.kv.put({ key: 'settings', value: { ...DEFAULT_SETTINGS, ...(b.settings ?? {}) } })
    await db.kv.put({ key: 'seeded', value: true })
  })
}

/** 清除全部資料並回到初始狀態 */
export async function wipeAll(): Promise<void> {
  await db.transaction('rw', [db.members, db.drinks, db.vessels, db.sessions, db.entries, db.kv], async () => {
    await Promise.all([
      db.members.clear(), db.drinks.clear(), db.vessels.clear(),
      db.sessions.clear(), db.entries.clear(), db.kv.clear(),
    ])
  })
  await ensureSeed()
}
