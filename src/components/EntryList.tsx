import { useState } from 'react'
import { useData } from '../store'
import { entryGrams } from '../lib/calc'
import { fmt, fmtDate, fmtTime, fmtVol } from '../lib/format'
import type { Entry } from '../types'
import { EntryEditor } from './EntryEditor'

export function EntryList({ entries, showDate = false, empty = '還沒有紀錄' }: { entries: Entry[]; showDate?: boolean; empty?: string }) {
  const { members, settings } = useData()
  const [editing, setEditing] = useState<Entry | null>(null)
  const byId = new Map(members.map((m) => [m.id, m]))
  if (!entries.length) return <p className="empty">{empty}</p>
  return (
    <>
      <ul className="entry-list">
        {entries.map((e) => {
          const m = byId.get(e.memberId)
          return (
            <li key={e.id}>
              <button className="entry" style={{ ['--c' as string]: m?.color ?? '#666' }} onClick={() => setEditing(e)}>
                <span className="entry-emoji">{e.drinkEmoji}</span>
                <span className="entry-main">
                  <span className="entry-title">
                    <b>{m?.name ?? '？'}</b>・{e.drinkName}
                  </span>
                  <span className="entry-sub">
                    {showDate ? fmtDate(e.time) + ' ' : ''}{fmtTime(e.time)}・{e.vesselName} {fmtVol(e.ml, settings)} × {fmt(e.count, 1)}・{fmt(e.abv, 1)}%
                    {e.note ? `・${e.note}` : ''}
                  </span>
                </span>
                <span className="entry-g">{fmt(entryGrams(e, settings), 1)}<small> g</small></span>
              </button>
            </li>
          )
        })}
      </ul>
      {editing && <EntryEditor entry={editing} onClose={() => setEditing(null)} />}
    </>
  )
}
