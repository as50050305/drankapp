import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { db } from '../db'
import { deleteSession } from '../actions'
import { useData } from '../store'
import { entryGrams, totals } from '../lib/calc'
import { fmt, fmtDate, fmtTime, fmtVol, uid } from '../lib/format'
import type { Entry, Member, Session } from '../types'
import { Avatar, confirmDialog, Field, Modal, toast, useBackHandler } from '../components/ui'
import { EntryList } from '../components/EntryList'

export function SessionsPage() {
  const { sessions, entries } = useData()
  const [openId, setOpenId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Session | 'new' | null>(null)
  const open = sessions.find((s) => s.id === openId) ?? null

  if (open) return <SessionDetail session={open} onBack={() => setOpenId(null)} />

  const active = sessions.filter((s) => !s.archived)
  const archived = sessions.filter((s) => s.archived)
  const card = (s: Session) => {
    const n = entries.filter((e) => e.sessionId === s.id).length
    return (
      <button key={s.id} className="card session-card" onClick={() => setOpenId(s.id)}>
        <span className="session-title">{s.archived ? '📦' : '🎉'} {s.name}</span>
        <span className="muted">{s.date}・{s.memberIds.length} 人・{n} 筆紀錄</span>
      </button>
    )
  }
  return (
    <div className="page">
      <div className="page-head">
        <h1>場次</h1>
        <button className="btn primary" onClick={() => setEditing('new')}>＋ 新場次</button>
      </div>
      <h2>進行中</h2>
      {active.length ? active.map(card) : <p className="empty">沒有進行中的場次。建立一場，新的紀錄就會自動歸進去。</p>}
      {active.length > 1 && <p className="muted">有多場進行中時，新紀錄會歸入最新建立的那一場。</p>}
      <h2>已封存</h2>
      {archived.length ? archived.map(card) : <p className="empty">還沒有封存的場次</p>}
      {editing && <SessionEditor session={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function SessionEditor({ session, onClose }: { session: Session | null; onClose: () => void }) {
  const { members } = useData()
  const [name, setName] = useState(session?.name ?? '')
  const [date, setDate] = useState(session?.date ?? fmtDate(Date.now()))
  const [ids, setIds] = useState<string[]>(session?.memberIds ?? members.map((m) => m.id))
  const toggle = (id: string) => setIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
  const save = async () => {
    const n = name.trim() || `${date} 聚會`
    if (session) await db.sessions.update(session.id, { name: n, date, memberIds: ids })
    else await db.sessions.add({ id: uid(), name: n, date, memberIds: ids, archived: false, createdAt: Date.now() })
    onClose()
  }
  return (
    <Modal title={session ? '編輯場次' : '新場次'} onClose={onClose} footer={<button className="btn primary xl" onClick={save}>儲存</button>}>
      <Field label="名稱">
        <input className="input" aria-label="場次名稱" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：週五熱炒" />
      </Field>
      <Field label="日期">
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <div className="field">
        <span className="field-label">參與成員</span>
        {members.length === 0 && <p className="muted">還沒有成員，之後記錄時會自動加入。</p>}
        <div className="chips wrap">
          {members.map((m) => (
            <button key={m.id} className={'member-chip' + (ids.includes(m.id) ? ' on' : '')} style={{ ['--c' as string]: m.color }} aria-pressed={ids.includes(m.id)} onClick={() => toggle(m.id)}>
              <Avatar member={m} size={30} />
              <span>{m.name}</span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}

function SessionDetail({ session, onBack }: { session: Session; onBack: () => void }) {
  const { members, entries, settings } = useData()
  const [editing, setEditing] = useState(false)
  useBackHandler(onBack, !editing)
  const list = entries.filter((e) => e.sessionId === session.id)
  const ids = Array.from(new Set([...session.memberIds, ...list.map((e) => e.memberId)]))
  const people = ids.map((id) => members.find((m) => m.id === id)).filter((m): m is Member => !!m)
  const ranking = people
    .map((m) => ({ member: m, ...totals(list.filter((e) => e.memberId === m.id), settings) }))
    .sort((a, b) => b.grams - a.grams)
  const all = totals(list, settings)

  const archive = async () => {
    await db.sessions.update(session.id, { archived: !session.archived })
    toast(session.archived ? '已重新開啟場次' : '已封存，可在「已封存」回顧')
  }
  const remove = async () => {
    if (await confirmDialog(`刪除場次「${session.name}」？裡面的紀錄會保留為個人紀錄。`, { confirmText: '刪除', danger: true })) {
      await deleteSession(session.id)
      onBack()
    }
  }
  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="page">
      <div className="page-head">
        <button className="btn ghost" onClick={onBack}>‹ 返回</button>
        <button className="btn ghost" onClick={() => setEditing(true)}>編輯</button>
      </div>
      <h1>{session.archived ? '📦' : '🎉'} {session.name}</h1>
      <p className="muted">{session.date}・{people.length} 人・全場共 {fmt(all.grams, 1)} g 純酒精・{fmt(all.std, 1)} 標準杯・{fmtVol(all.ml, settings)}</p>

      <h2>排名</h2>
      <div className="card">
        {ranking.length === 0 && <p className="empty">還沒有成員</p>}
        <table className="rank">
          <thead>
            <tr><th></th><th>成員</th><th>純酒精</th><th>標準杯</th><th>喝酒量</th></tr>
          </thead>
          <tbody>
            {ranking.map((r, i) => (
              <tr key={r.member.id}>
                <td>{r.grams > 0 ? medals[i] ?? i + 1 : '–'}</td>
                <td><span className="rank-name"><Avatar member={r.member} size={26} />{r.member.name}</span></td>
                <td><b>{fmt(r.grams, 1)}</b> g</td>
                <td>{fmt(r.std, 1)}</td>
                <td>{fmtVol(r.ml, settings)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {list.length > 0 && (
        <>
          <h2>每人純酒精（g）</h2>
          <div className="card chart">
            <ResponsiveContainer width="100%" height={Math.max(120, ranking.length * 48)}>
              <BarChart data={ranking.map((r) => ({ name: r.member.name, g: +r.grams.toFixed(1), color: r.member.color }))} layout="vertical" margin={{ left: 0, right: 44, top: 4, bottom: 4 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={72} tick={{ fill: '#e9e2d6', fontSize: 14 }} axisLine={false} tickLine={false} />
                <Bar dataKey="g" radius={[0, 8, 8, 0]} isAnimationActive={false}>
                  {ranking.map((r) => <Cell key={r.member.id} fill={r.member.color} />)}
                  <LabelList dataKey="g" position="right" fill="#e9e2d6" fontSize={13} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <h2>累積曲線（g）</h2>
          <div className="card chart">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={cumulative(list, people, settings)} margin={{ left: -16, right: 12, top: 8, bottom: 0 }}>
                <CartesianGrid stroke="#3a322b" strokeDasharray="3 3" />
                <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={(t) => fmtTime(t)} tick={{ fill: '#a89c8c', fontSize: 12 }} />
                <YAxis tick={{ fill: '#a89c8c', fontSize: 12 }} />
                <Tooltip labelFormatter={(t) => fmtTime(Number(t))} contentStyle={{ background: '#221c18', border: '1px solid #3a322b', borderRadius: 8 }} />
                {people.map((m) => (
                  <Line key={m.id} dataKey={m.id} name={m.name} stroke={m.color} strokeWidth={3} type="stepAfter" dot={false} isAnimationActive={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <div className="legend">
              {people.map((m) => <span key={m.id}><i style={{ background: m.color }} />{m.name}</span>)}
            </div>
          </div>
        </>
      )}

      <h2>紀錄</h2>
      <EntryList entries={list} showDate empty="這個場次還沒有紀錄。到「記錄」頁開始喝吧！" />

      <div className="row" style={{ marginTop: 20 }}>
        <button className="btn danger ghost" onClick={remove}>刪除場次</button>
        <button className="btn primary grow" onClick={archive}>{session.archived ? '重新開啟場次' : '結束並封存'}</button>
      </div>
      {editing && <SessionEditor session={session} onClose={() => setEditing(false)} />}
    </div>
  )
}

/** 時間軸累積曲線的資料：每筆紀錄後，各成員累積的純酒精 */
function cumulative(list: Entry[], people: Member[], settings: { density: number }) {
  const sorted = [...list].sort((a, b) => a.time - b.time)
  const cum: Record<string, number> = Object.fromEntries(people.map((m) => [m.id, 0]))
  const rows: Array<Record<string, number>> = []
  if (sorted.length) rows.push({ t: sorted[0].time - 60000, ...cum })
  for (const e of sorted) {
    if (!(e.memberId in cum)) continue
    cum[e.memberId] = +(cum[e.memberId] + entryGrams(e, settings)).toFixed(2)
    rows.push({ t: e.time, ...cum })
  }
  return rows
}
