import { useState } from 'react'
import { db } from '../db'
import { useData } from '../store'
import { entryGrams, toStd } from '../lib/calc'
import { fmt, fromLocalInput, toLocalInput } from '../lib/format'
import type { Entry } from '../types'
import { confirmDialog, Field, Modal, NumField, toast } from './ui'

/** 事後編輯或刪除一筆紀錄 */
export function EntryEditor({ entry, onClose }: { entry: Entry; onClose: () => void }) {
  const { members, sessions, settings } = useData()
  const [memberId, setMemberId] = useState(entry.memberId)
  const [drinkName, setDrinkName] = useState(entry.drinkName)
  const [ml, setMl] = useState<number | null>(entry.ml)
  const [abv, setAbv] = useState<number | null>(entry.abv)
  const [count, setCount] = useState<number | null>(entry.count)
  const [time, setTime] = useState(toLocalInput(entry.time))
  const [note, setNote] = useState(entry.note)
  const [sessionId, setSessionId] = useState(entry.sessionId ?? '')

  const grams = entryGrams({ ml: ml ?? 0, abv: abv ?? 0, count: count ?? 0 }, settings)

  const save = async () => {
    if (ml == null || abv == null || !count) return toast('請填寫容量、酒精度與杯數')
    if (abv > 100) return toast('酒精度不能超過 100%')
    await db.entries.update(entry.id, {
      memberId, drinkName: drinkName.trim() || entry.drinkName, ml, abv, count,
      time: fromLocalInput(time), note, sessionId: sessionId || null,
    })
    onClose()
  }
  const remove = async () => {
    if (await confirmDialog('刪除這筆紀錄？', { confirmText: '刪除', danger: true })) {
      await db.entries.delete(entry.id)
      onClose()
    }
  }

  return (
    <Modal
      title="編輯紀錄"
      onClose={onClose}
      footer={
        <div className="row">
          <button className="btn danger ghost" onClick={remove}>刪除</button>
          <button className="btn primary grow" onClick={save}>儲存</button>
        </div>
      }
    >
      <Field label="成員">
        <select className="input" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </Field>
      <Field label="酒款名稱">
        <input className="input" value={drinkName} onChange={(e) => setDrinkName(e.target.value)} />
      </Field>
      <div className="grid3">
        <Field label="每杯 ml"><NumField value={ml} onChange={setMl} ariaLabel="每杯容量" /></Field>
        <Field label="酒精度 %"><NumField value={abv} onChange={setAbv} ariaLabel="酒精度" /></Field>
        <Field label="杯數"><NumField value={count} onChange={setCount} ariaLabel="杯數" /></Field>
      </div>
      <p className="muted">≈ {fmt(grams, 1)} g 純酒精・{fmt(toStd(grams, settings), 2)} 標準杯</p>
      <Field label="時間">
        <input className="input" type="datetime-local" value={time} onChange={(e) => setTime(e.target.value)} />
      </Field>
      <Field label="場次">
        <select className="input" value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
          <option value="">（不屬於任何場次）</option>
          {sessions.map((s) => <option key={s.id} value={s.id}>{s.name}{s.archived ? '（已封存）' : ''}</option>)}
        </select>
      </Field>
      <Field label="備註">
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="選填" />
      </Field>
    </Modal>
  )
}
