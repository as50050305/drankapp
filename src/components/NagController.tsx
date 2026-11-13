import { useEffect, useRef, useState } from 'react'
import { db } from '../db'
import { useData } from '../store'
import { NAG_FINAL_MESSAGE, NAG_MESSAGES } from '../data/seed'
import { buildPlan, dueCount, type NagPlan } from '../lib/nag'
import { buzz, flashTorch, syncNotifications } from '../lib/nagNative'
import { useBackHandler } from './ui'

interface Alarm {
  kind: 'nag' | 'final' | 'test'
  message: string
  key: number
}

/* 讓設定頁的「測試」按鈕可以叫出中毒畫面 */
let fireTest: (() => void) | null = null
export function testNag() {
  fireTest?.()
}

const TICK = 5000

/**
 * 催記錄的大腦：
 * 1. 每次有人登記／活動開始或結束／設定改變 → 重排系統通知（App 在背景也會跳）
 * 2. App 開著時每 5 秒檢查一次：到時間就震動、閃手電筒、跳中毒畫面
 * 3. 太久沒登記 → 自動結束活動
 */
export function NagController({ onGoRecord }: { onGoRecord: () => void }) {
  const { activeSession, entries, settings } = useData()
  const [alarm, setAlarm] = useState<Alarm | null>(null)
  const planRef = useRef<NagPlan | null>(null)
  const shownRef = useRef(0)
  const lastTickRef = useRef(Date.now())
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  // 只在「會影響時間表」的東西改變時才重排
  const sessionKey = activeSession
    ? [activeSession.id, activeSession.createdAt, activeSession.resumedAt ?? 0].join(':')
    : ''
  const lastEntryAt = activeSession
    ? entries.reduce((t, e) => (e.sessionId === activeSession.id && e.createdAt > t ? e.createdAt : t), 0)
    : 0
  const s = settings
  const settingsKey = [s.nagEnabled, s.nagNotify, s.nagVibrate, s.nagAutoEnd, s.nagIntervalMin, s.nagWindowHours, s.nagAutoEndMin].join(':')

  const trigger = (a: Omit<Alarm, 'key'>) => {
    const cur = settingsRef.current
    if (cur.nagVibrate) void buzz()
    if (cur.nagTorch) void flashTorch()
    if (cur.nagOverlay || a.kind === 'final') setAlarm({ ...a, key: Date.now() })
  }

  useEffect(() => {
    const plan = activeSession ? buildPlan(activeSession, entries, settings, NAG_MESSAGES) : null
    planRef.current = plan
    shownRef.current = plan ? dueCount(plan, Date.now()) : 0
    void syncNotifications(plan, settings)
    // 有人登記了就把還掛著的催促畫面收掉
    setAlarm((a) => (a && a.kind === 'nag' ? null : a))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey, lastEntryAt, settingsKey])

  useEffect(() => {
    const tick = async () => {
      const now = Date.now()
      const wasRunning = now - lastTickRef.current < TICK * 3
      lastTickRef.current = now
      const plan = planRef.current
      if (!plan) return
      if (plan.endAt != null && now >= plan.endAt) {
        planRef.current = null
        await db.sessions.update(plan.sessionId, { archived: true })
        trigger({ kind: 'final', message: NAG_FINAL_MESSAGE })
        return
      }
      const due = dueCount(plan, now)
      if (due > shownRef.current) {
        shownRef.current = due
        // App 剛從背景回來時不補跳（通知已經提醒過了）
        if (wasRunning && document.visibilityState === 'visible') {
          trigger({ kind: 'nag', message: plan.nags[due - 1].overlayMessage })
        }
      }
    }
    const timer = setInterval(tick, TICK)
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      void tick()
      // 從系統設定回來時權限可能剛被打開，重排一次通知
      void syncNotifications(planRef.current, settingsRef.current)
    }
    document.addEventListener('visibilitychange', onVisible)
    fireTest = () => trigger({ kind: 'test', message: NAG_MESSAGES.overlay[Math.floor(Math.random() * NAG_MESSAGES.overlay.length)] })
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      fireTest = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!alarm) return null
  return (
    <VirusOverlay
      key={alarm.key}
      alarm={alarm}
      onClose={() => setAlarm(null)}
      onRecord={() => {
        setAlarm(null)
        onGoRecord()
      }}
    />
  )
}

const POPUPS = [
  { title: '杯數.exe', text: '沒有回應', top: '7%', left: '4%' },
  { title: '錯誤 0xBEER', text: '記憶體不足：肝', top: '15%', left: '38%' },
  { title: 'LIVER32.DLL', text: '發生不合法的操作', top: '70%', left: '8%' },
  { title: '警告', text: '偵測到杯底養金魚', top: '78%', left: '42%' },
]

/** 古早電腦中毒風格的全螢幕畫面 */
function VirusOverlay({ alarm, onClose, onRecord }: { alarm: Alarm; onClose: () => void; onRecord: () => void }) {
  useBackHandler(onClose)
  const final = alarm.kind === 'final'
  return (
    <div className="virus" role="alertdialog" aria-label={final ? '活動已自動結束' : '該登記了'}>
      <div className="virus-noise" aria-hidden="true">
        {Array.from({ length: 28 }, (_, i) => (
          <span key={i}>{'01 DRUNK 0xDEAD BEER.SYS 乾杯 ERROR 404 肝 NOT FOUND ☠ '.repeat(3)}</span>
        ))}
      </div>
      {POPUPS.map((p, i) => (
        <div key={i} className="virus-popup" aria-hidden="true" style={{ top: p.top, left: p.left, animationDelay: `${i * 0.18}s` }}>
          <div className="virus-bar"><span>{p.title}</span><span>✕</span></div>
          <div className="virus-pop-body">⛔ {p.text}</div>
        </div>
      ))}
      <div className="virus-main">
        <div className="virus-bar"><span>{final ? 'GAME OVER' : alarm.kind === 'test' ? 'VIRUS ALERT（測試）' : 'VIRUS ALERT'}</span><span>✕</span></div>
        <div className="virus-body">
          <p className="virus-skull" aria-hidden="true">☠</p>
          <p className="virus-title">{final ? '活動已自動結束' : '您的手機已中毒'}</p>
          <p className="virus-msg">{alarm.message}</p>
          <div className="virus-btns">
            {final ? (
              <button className="virus-btn" onClick={onClose}>好啦</button>
            ) : (
              <>
                <button className="virus-btn primary" onClick={onRecord}>馬上登記</button>
                <button className="virus-btn" onClick={onClose}>等一下啦</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
