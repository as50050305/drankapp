import { useState } from 'react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useData } from '../store'
import { dayStart, entryGrams, totals } from '../lib/calc'
import { fmt, fmtVol } from '../lib/format'
import { Avatar, MemberChips } from '../components/ui'
import { MemberSummary, useNow } from '../components/MemberSummary'
import { EntryList } from '../components/EntryList'

export function StatsPage() {
  const { members, entries, settings } = useData()
  const now = useNow()
  const [sel, setSel] = useState<string | null>(settings.currentMemberId)
  const member = members.find((m) => m.id === sel) ?? members[0] ?? null

  if (!member) {
    return (
      <div className="page">
        <h1>統計</h1>
        <p className="empty">還沒有成員。先到「記錄」頁新增成員吧。</p>
      </div>
    )
  }

  const mine = entries.filter((e) => e.memberId === member.id)
  const all = totals(mine, settings)

  // 最近 14 天每日純酒精
  const today = dayStart(now)
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (13 - i))
    return d.getTime()
  })
  const daily = days.map((start, i) => {
    const end = i < 13 ? days[i + 1] : Infinity
    const g = mine.filter((e) => e.time >= start && e.time < end).reduce((s, e) => s + entryGrams(e, settings), 0)
    const d = new Date(start)
    return { day: `${d.getMonth() + 1}/${d.getDate()}`, g: +g.toFixed(1) }
  })

  // 最常喝的酒款
  const byDrink = new Map<string, { name: string; emoji: string; grams: number; count: number }>()
  for (const e of mine) {
    const cur = byDrink.get(e.drinkName) ?? { name: e.drinkName, emoji: e.drinkEmoji, grams: 0, count: 0 }
    cur.grams += entryGrams(e, settings)
    cur.count += e.count
    byDrink.set(e.drinkName, cur)
  }
  const top = [...byDrink.values()].sort((a, b) => b.grams - a.grams).slice(0, 5)

  const board = members
    .map((m) => ({ member: m, ...totals(entries.filter((e) => e.memberId === m.id), settings) }))
    .sort((a, b) => b.grams - a.grams)
  const max = Math.max(1, ...board.map((b) => b.grams))

  return (
    <div className="page">
      <h1>統計</h1>
      <MemberChips members={members} value={member.id} onChange={setSel} />
      <MemberSummary member={member} showWeek />

      <h2>{member.name} 的累積</h2>
      <div className="card">
        <div className="stat-row">
          <div className="stat"><span className="stat-num">{fmt(all.grams, 0)}<small> g</small></span><span className="stat-label">純酒精</span></div>
          <div className="stat"><span className="stat-num">{fmt(all.std, 1)}</span><span className="stat-label">標準杯</span></div>
          <div className="stat"><span className="stat-num">{fmtVol(all.ml, settings)}</span><span className="stat-label">喝酒量</span></div>
        </div>
        <p className="muted">共 {mine.length} 筆紀錄、{fmt(all.count, 1)} 杯</p>
      </div>

      <h2>最近 14 天（g）</h2>
      <div className="card chart">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={daily} margin={{ left: -20, right: 4, top: 8, bottom: 0 }}>
            <XAxis dataKey="day" tick={{ fill: '#a89c8c', fontSize: 11 }} interval={1} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#a89c8c', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: '#ffffff10' }} contentStyle={{ background: '#221c18', border: '1px solid #3a322b', borderRadius: 8 }} formatter={(v) => [`${v} g`, '純酒精']} />
            <Bar dataKey="g" fill={member.color} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <h2>最常喝</h2>
      <div className="card">
        {top.length === 0 && <p className="empty">還沒有紀錄</p>}
        {top.map((t) => (
          <div key={t.name} className="top-row">
            <span>{t.emoji} {t.name}</span>
            <span className="muted">{fmt(t.count, 1)} 杯・{fmt(t.grams, 1)} g</span>
          </div>
        ))}
      </div>

      <h2>全員累積排行</h2>
      <div className="card">
        {board.map((b) => (
          <div key={b.member.id} className="board-row">
            <Avatar member={b.member} size={28} />
            <span className="board-name">{b.member.name}</span>
            <span className="board-bar"><i style={{ width: `${(b.grams / max) * 100}%`, background: b.member.color }} /></span>
            <span className="board-val">{fmt(b.grams, 0)} g</span>
          </div>
        ))}
      </div>

      <h2>{member.name} 的全部紀錄</h2>
      <EntryList entries={mine.slice(0, 100)} showDate />
    </div>
  )
}
