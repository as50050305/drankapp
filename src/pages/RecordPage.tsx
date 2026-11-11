import { useState } from 'react'
import { addEntry, repeatLast, undoLast } from '../actions'
import { updateSettings } from '../db'
import { useData } from '../store'
import { CATEGORY_LABELS } from '../data/seed'
import { dayStart, pureGrams, toStd } from '../lib/calc'
import { drinkLabel, fmt, fmtVol, fromLocalInput, toLocalInput } from '../lib/format'
import type { Drink, DrinkCategory, Vessel } from '../types'
import { DrinkIcon, Field, MemberChips, Modal, NumField, toast } from '../components/ui'
import { MemberEditor } from '../components/MemberEditor'
import { MemberSummary, useNow } from '../components/MemberSummary'
import { EntryList } from '../components/EntryList'

export function RecordPage() {
  const { members, drinks, vessels, entries, settings, activeSession } = useData()
  const now = useNow()
  const member = members.find((m) => m.id === settings.currentMemberId) ?? members[0] ?? null
  const [drinkId, setDrinkId] = useState(settings.lastDrinkId)
  const [vesselId, setVesselId] = useState(settings.lastVesselId)
  const drink = drinks.find((d) => d.id === drinkId) ?? drinks[0] ?? null
  const vessel = vessels.find((v) => v.id === vesselId) ?? vessels[0] ?? null

  const [count, setCount] = useState(1)
  const [more, setMore] = useState(false)
  const [mlOver, setMlOver] = useState<number | null>(null)
  const [abvOver, setAbvOver] = useState<number | null>(null)
  const [time, setTime] = useState('')
  const [note, setNote] = useState('')
  const [picker, setPicker] = useState<'drink' | 'vessel' | null>(null)
  const [addingMember, setAddingMember] = useState(false)

  if (!member) {
    return (
      <div className="page">
        <h1>喝多少 🍻</h1>
        <div className="card welcome">
          <p className="big-emoji">🥂</p>
          <p>先新增今晚一起喝的成員，就可以開始記錄每個人喝了多少純酒精。</p>
          <button className="btn primary xl" onClick={() => setAddingMember(true)}>＋ 新增第一位成員</button>
        </div>
        {addingMember && <MemberEditor member={null} existingCount={0} onClose={() => setAddingMember(false)} />}
      </div>
    )
  }

  const ml = mlOver ?? vessel?.ml ?? 0
  const abv = abvOver ?? drink?.abv ?? 0
  const grams = pureGrams(ml * count, abv, settings.density)

  const pickDrink = (d: Drink) => {
    setDrinkId(d.id)
    setAbvOver(null)
    if (d.defaultVesselId && vessels.some((v) => v.id === d.defaultVesselId)) {
      setVesselId(d.defaultVesselId)
      setMlOver(null)
    }
    setPicker(null)
  }
  const pickVessel = (v: Vessel) => {
    setVesselId(v.id)
    setMlOver(null)
    setPicker(null)
  }

  const record = async (quick: boolean) => {
    if (!drink || !vessel) return toast('請先到「酒款與杯具」新增酒款和杯具')
    if (!quick && abv > 100) return toast('酒精度不能超過 100%')
    const e = await addEntry({
      memberId: member.id,
      drink,
      vessel,
      count: quick ? 1 : count,
      ml: quick ? undefined : ml,
      abv: quick ? undefined : abv,
      time: quick || !time ? undefined : fromLocalInput(time),
      note: quick ? '' : note,
      session: activeSession,
    })
    toast(`已記錄：${member.name} ${e.drinkName} × ${fmt(e.count, 1)}`)
    if (!quick) {
      setCount(1)
      setMlOver(null)
      setAbvOver(null)
      setTime('')
      setNote('')
      setMore(false)
    }
  }
  const repeat = async () => {
    const e = await repeatLast(member.id, activeSession)
    toast(e ? `再一杯：${member.name} ${e.drinkName} × ${fmt(e.count, 1)}` : `${member.name} 還沒有紀錄可以重複`)
  }
  const undo = async () => {
    const e = await undoLast()
    const who = e ? members.find((m) => m.id === e.memberId)?.name ?? '' : ''
    toast(e ? `已復原：${who} ${e.drinkName} × ${fmt(e.count, 1)}` : '沒有可以復原的紀錄')
  }

  const today = dayStart(now)
  const recent = entries
    .filter((e) => e.time >= today || (activeSession && e.sessionId === activeSession.id))
    .slice(0, 40)

  return (
    <div className="page">
      <div className="page-head">
        <h1>記錄</h1>
        <span className={'session-pill' + (activeSession ? ' on' : '')}>
          {activeSession ? `🎉 ${activeSession.name}` : '個人紀錄（無進行中場次）'}
        </span>
      </div>

      <MemberChips
        members={members}
        value={member.id}
        onChange={(id) => updateSettings({ currentMemberId: id })}
        trailing={<button className="member-chip add" aria-label="新增成員" onClick={() => setAddingMember(true)}>＋</button>}
      />

      <MemberSummary member={member} />

      <div className="pick-row">
        <button className="pick" onClick={() => setPicker('drink')} aria-label="選擇酒款">
          {drink ? <DrinkIcon drink={drink} size={48} /> : null}
          <span className="pick-text">
            <small>酒款</small>
            <b>{drink ? drinkLabel(drink) : '尚無酒款'}</b>
            <span>{fmt(abv, 1)}%{abvOver != null ? '（本次）' : ''}</span>
          </span>
        </button>
        <button className="pick" onClick={() => setPicker('vessel')} aria-label="選擇杯具">
          <span className="drink-emoji" style={{ width: 48, height: 48, fontSize: 28 }}>{vessel?.emoji ?? '🥛'}</span>
          <span className="pick-text">
            <small>杯具</small>
            <b>{vessel?.name ?? '尚無杯具'}</b>
            <span>{fmtVol(ml, settings)}{mlOver != null ? '（本次）' : ''}</span>
          </span>
        </button>
      </div>

      <div className="card">
        <div className="stepper">
          <button className="step-btn" aria-label="減少半杯" onClick={() => setCount((c) => Math.max(0.5, c - 0.5))}>−</button>
          <div className="step-val">
            <b>{fmt(count, 1)}</b>
            <small>杯</small>
          </div>
          <button className="step-btn" aria-label="增加半杯" onClick={() => setCount((c) => c + 0.5)}>＋</button>
        </div>
        <p className="preview">
          這一筆 ≈ <b>{fmt(grams, 1)} g</b> 純酒精・{fmt(toStd(grams, settings), 2)} 標準杯
        </p>
        <button className="link-btn" onClick={() => setMore((v) => !v)} aria-expanded={more}>
          {more ? '▲ 收起' : '▼ 臨時改容量／度數／時間／備註'}
        </button>
        {more && (
          <div className="more">
            <div className="grid2">
              <Field label="本次容量（ml）" hint="只套用這一筆">
                <NumField value={mlOver} onChange={setMlOver} ariaLabel="本次容量" placeholder={String(vessel?.ml ?? '')} />
              </Field>
              <Field label="本次酒精度（%）" hint="只套用這一筆">
                <NumField value={abvOver} onChange={setAbvOver} ariaLabel="本次酒精度" placeholder={String(drink?.abv ?? '')} />
              </Field>
            </div>
            <Field label="時間" hint="不填就是現在">
              <input className="input" type="datetime-local" aria-label="時間" value={time} max={toLocalInput(now + 86400000)} onChange={(e) => setTime(e.target.value)} />
            </Field>
            <Field label="備註">
              <input className="input" aria-label="備註" value={note} onChange={(e) => setNote(e.target.value)} placeholder="選填" />
            </Field>
          </div>
        )}
        <button className="btn primary xl" style={{ background: member.color }} onClick={() => record(false)}>
          記錄 {member.name} 喝了 {fmt(count, 1)} 杯
        </button>
      </div>

      <div className="quick-row">
        <button className="btn quick" onClick={() => record(true)}>⚡<span>快速 +1 杯</span></button>
        <button className="btn quick" onClick={repeat}>🔁<span>重複上一杯</span></button>
        <button className="btn quick" onClick={undo}>↩️<span>復原上一筆</span></button>
      </div>

      <h2>{activeSession ? '本場次與今日紀錄' : '今日紀錄'}</h2>
      <EntryList entries={recent} empty="今天還沒有人喝，乾杯吧！" />

      {picker === 'drink' && <DrinkPicker drinks={drinks} current={drink?.id ?? null} onPick={pickDrink} onClose={() => setPicker(null)} />}
      {picker === 'vessel' && (
        <Modal title="選擇杯具" onClose={() => setPicker(null)}>
          <div className="tile-grid">
            {vessels.map((v) => (
              <button key={v.id} className={'tile' + (v.id === vessel?.id ? ' on' : '')} onClick={() => pickVessel(v)}>
                <span className="tile-emoji">{v.emoji}</span>
                <b>{v.name}</b>
                <span>{fmtVol(v.ml, settings)}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}
      {addingMember && <MemberEditor member={null} existingCount={members.length} onClose={() => setAddingMember(false)} />}
    </div>
  )
}

function DrinkPicker(props: { drinks: Drink[]; current: string | null; onPick: (d: Drink) => void; onClose: () => void }) {
  const cats = Array.from(new Set(props.drinks.map((d) => d.category)))
  const [cat, setCat] = useState<DrinkCategory | 'all'>('all')
  const list = cat === 'all' ? props.drinks : props.drinks.filter((d) => d.category === cat)
  return (
    <Modal title="選擇酒款" onClose={props.onClose}>
      <div className="chips wrap">
        <button className={'chip' + (cat === 'all' ? ' on' : '')} onClick={() => setCat('all')}>全部</button>
        {cats.map((c) => (
          <button key={c} className={'chip' + (cat === c ? ' on' : '')} onClick={() => setCat(c)}>{CATEGORY_LABELS[c]}</button>
        ))}
      </div>
      <div className="tile-grid">
        {list.map((d) => (
          <button key={d.id} className={'tile' + (d.id === props.current ? ' on' : '')} onClick={() => props.onPick(d)}>
            <DrinkIcon drink={d} size={48} />
            <b>{drinkLabel(d)}</b>
            <span>{fmt(d.abv, 1)}%</span>
          </button>
        ))}
      </div>
    </Modal>
  )
}
