import { useEffect, useState } from 'react'
import { useData } from '../store'
import { dayStart, estimateBac, totals, weekStart } from '../lib/calc'
import { fmt, fmtDuration, fmtVol } from '../lib/format'
import type { Member } from '../types'
import { BacWarning } from './ui'

export function useNow(intervalMs = 30000): number {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}

/** 一位成員的今日／本週用量、上限提醒與 BAC 估算 */
export function MemberSummary({ member, showWeek = false }: { member: Member; showWeek?: boolean }) {
  const { entries, settings } = useData()
  const now = useNow()
  const mine = entries.filter((e) => e.memberId === member.id)
  const day = totals(mine.filter((e) => e.time >= dayStart(now)), settings)
  const week = totals(mine.filter((e) => e.time >= weekStart(now)), settings)
  const unit = settings.limitUnit === 'std' ? '標準杯' : 'g'
  const val = (t: { std: number; grams: number }) => (settings.limitUnit === 'std' ? t.std : t.grams)
  const dayOver = settings.dailyLimit > 0 && val(day) > settings.dailyLimit
  const weekOver = settings.weeklyLimit > 0 && val(week) > settings.weeklyLimit
  const bac = settings.bacEnabled ? estimateBac(mine, member, settings, now) : null

  return (
    <div className="card summary" style={{ ['--c' as string]: member.color }}>
      <div className="stat-row">
        <div className="stat">
          <span className="stat-num">{fmt(day.grams, 1)}<small> g</small></span>
          <span className="stat-label">今日純酒精</span>
        </div>
        <div className="stat">
          <span className="stat-num">{fmt(day.std, 1)}</span>
          <span className="stat-label">標準杯</span>
        </div>
        <div className="stat">
          <span className="stat-num">{fmtVol(day.ml, settings)}</span>
          <span className="stat-label">總喝酒量</span>
        </div>
      </div>
      {showWeek && (
        <p className="muted">本週：{fmt(week.grams, 1)} g・{fmt(week.std, 1)} 標準杯・{fmtVol(week.ml, settings)}</p>
      )}
      {dayOver && (
        <div className="alert" role="alert">🚨 {member.name} 今天已超過每日上限（{fmt(settings.dailyLimit, 1)} {unit}），該喝水了！</div>
      )}
      {weekOver && (
        <div className="alert" role="alert">🚨 {member.name} 本週已超過每週上限（{fmt(settings.weeklyLimit, 1)} {unit}）。</div>
      )}
      {settings.bacEnabled && (
        <div className="bac">
          {bac ? (
            <p className="bac-line">
              估算 BAC <b>{bac.bac.toFixed(3)}%</b>
              <span className="muted">　{bac.bac > 0 ? `約 ${fmtDuration(bac.hoursToZero)}後降到 0` : '目前為 0'}</span>
            </p>
          ) : (
            <p className="muted">設定體重後可估算血中酒精濃度（設定 → 成員）。</p>
          )}
          <BacWarning />
        </div>
      )}
    </div>
  )
}
