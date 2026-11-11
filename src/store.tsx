import { createContext, useContext, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, getSettings } from './db'
import type { Drink, Entry, Member, Session, Settings, Vessel } from './types'

export interface Data {
  members: Member[]
  drinks: Drink[]
  vessels: Vessel[]
  sessions: Session[]
  entries: Entry[]
  settings: Settings
  /** 進行中（未封存）的最新場次 */
  activeSession: Session | null
}

const Ctx = createContext<Data | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const data = useLiveQuery(async (): Promise<Data> => {
    const [members, drinks, vessels, sessions, entries, settings] = await Promise.all([
      db.members.toArray(),
      db.drinks.toArray(),
      db.vessels.toArray(),
      db.sessions.toArray(),
      db.entries.toArray(),
      getSettings(),
    ])
    members.sort((a, b) => a.createdAt - b.createdAt)
    drinks.sort((a, b) => a.order - b.order)
    vessels.sort((a, b) => a.order - b.order)
    sessions.sort((a, b) => b.createdAt - a.createdAt)
    entries.sort((a, b) => b.time - a.time)
    const activeSession = sessions.find((s) => !s.archived) ?? null
    return { members, drinks, vessels, sessions, entries, settings, activeSession }
  }, [])
  if (!data) return <div className="loading">載入中…</div>
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>
}

export function useData(): Data {
  const d = useContext(Ctx)
  if (!d) throw new Error('DataProvider missing')
  return d
}
