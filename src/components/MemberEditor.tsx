import { useState } from 'react'
import { db, updateSettings } from '../db'
import { deleteMember } from '../actions'
import { MEMBER_COLORS, MEMBER_EMOJIS } from '../data/seed'
import { uid } from '../lib/format'
import type { Member, Sex } from '../types'
import { Avatar, confirmDialog, Field, Modal, NumField, Segmented, toast } from './ui'

export function MemberEditor(props: { member: Member | null; existingCount: number; onClose: () => void }) {
  const m = props.member
  const [name, setName] = useState(m?.name ?? '')
  const [color, setColor] = useState(m?.color ?? MEMBER_COLORS[props.existingCount % MEMBER_COLORS.length])
  const [emoji, setEmoji] = useState(m?.emoji ?? MEMBER_EMOJIS[props.existingCount % MEMBER_EMOJIS.length])
  const [weight, setWeight] = useState<number | null>(m?.weightKg ?? null)
  const [sex, setSex] = useState<Sex>(m?.sex ?? null)

  const save = async () => {
    const n = name.trim()
    if (!n) return toast('請輸入暱稱')
    props.onClose()
    if (m) {
      await db.members.update(m.id, { name: n, color, emoji, weightKg: weight, sex })
    } else {
      const id = uid()
      await db.members.add({ id, name: n, color, emoji, weightKg: weight, sex, createdAt: Date.now() })
      await updateSettings({ currentMemberId: id })
    }
  }

  const remove = async () => {
    if (!m) return
    if (await confirmDialog(`刪除「${m.name}」？這位成員的所有喝酒紀錄也會一併刪除。`, { confirmText: '刪除', danger: true })) {
      await deleteMember(m.id)
      props.onClose()
    }
  }

  return (
    <Modal
      title={m ? '編輯成員' : '新增成員'}
      onClose={props.onClose}
      footer={
        <div className="row">
          {m && <button className="btn danger ghost" onClick={remove}>刪除</button>}
          <button className="btn primary grow" onClick={save}>儲存</button>
        </div>
      }
    >
      <div className="center-row">
        <Avatar member={{ color, emoji }} size={72} />
      </div>
      <Field label="暱稱">
        <input className="input" aria-label="暱稱" value={name} maxLength={12} onChange={(e) => setName(e.target.value)} placeholder="例如：阿哲" />
      </Field>
      <Field label="代表色">
        <div className="swatches">
          {MEMBER_COLORS.map((c) => (
            <button key={c} aria-label={`顏色 ${c}`} className={'swatch' + (c === color ? ' on' : '')} style={{ background: c }} onClick={() => setColor(c)} />
          ))}
        </div>
      </Field>
      <Field label="頭像">
        <div className="swatches">
          {MEMBER_EMOJIS.map((e) => (
            <button key={e} className={'emoji-pick' + (e === emoji ? ' on' : '')} onClick={() => setEmoji(e)}>{e}</button>
          ))}
        </div>
      </Field>
      <Field label="體重（kg，選填）" hint="用來估算血中酒精濃度">
        <NumField value={weight} onChange={setWeight} ariaLabel="體重" placeholder="例如：70" />
      </Field>
      <Field label="性別（選填）" hint="只用來選擇 Widmark 係數；不填會用男女平均值">
        <Segmented
          value={sex ?? 'none'}
          options={[{ value: 'male', label: '男' }, { value: 'female', label: '女' }, { value: 'none', label: '不填' }]}
          onChange={(v) => setSex(v === 'none' ? null : (v as Sex))}
        />
      </Field>
    </Modal>
  )
}
