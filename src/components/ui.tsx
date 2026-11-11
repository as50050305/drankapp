import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Drink, Member } from '../types'

/* ---------- 返回鍵堆疊：Android 返回鍵會先關掉最上層的視窗 ---------- */
const backStack: Array<() => void> = []
export function handleBack(): boolean {
  const top = backStack[backStack.length - 1]
  if (top) {
    top()
    return true
  }
  return false
}
export function useBackHandler(fn: () => void, active = true) {
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => {
    if (!active) return
    const h = () => ref.current()
    backStack.push(h)
    return () => {
      const i = backStack.indexOf(h)
      if (i >= 0) backStack.splice(i, 1)
    }
  }, [active])
}

/* ---------- 底部彈出視窗 ---------- */
export function Modal(props: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useBackHandler(props.onClose)
  return (
    <div className="modal-backdrop" onClick={props.onClose}>
      <div className="modal" role="dialog" aria-label={props.title} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{props.title}</h2>
          <button className="icon-btn" aria-label="關閉" onClick={props.onClose}>✕</button>
        </div>
        <div className="modal-body">{props.children}</div>
        {props.footer && <div className="modal-foot">{props.footer}</div>}
      </div>
    </div>
  )
}

/* ---------- 確認對話框與提示訊息（不使用瀏覽器原生 alert/confirm） ---------- */
interface ConfirmReq {
  message: string
  confirmText: string
  danger: boolean
  resolve: (ok: boolean) => void
}
let pushConfirm: ((r: ConfirmReq) => void) | null = null
let pushToast: ((msg: string) => void) | null = null

export function confirmDialog(message: string, opts: { confirmText?: string; danger?: boolean } = {}): Promise<boolean> {
  return new Promise((resolve) => {
    if (!pushConfirm) return resolve(false)
    pushConfirm({ message, confirmText: opts.confirmText ?? '確定', danger: opts.danger ?? false, resolve })
  })
}
export function toast(msg: string) {
  pushToast?.(msg)
}

export function OverlayHost() {
  const [req, setReq] = useState<ConfirmReq | null>(null)
  const [msg, setMsg] = useState<{ text: string; id: number } | null>(null)
  useEffect(() => {
    pushConfirm = setReq
    pushToast = (text) => setMsg({ text, id: Date.now() })
    return () => {
      pushConfirm = null
      pushToast = null
    }
  }, [])
  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(null), 2600)
    return () => clearTimeout(t)
  }, [msg])
  const done = (ok: boolean) => {
    req?.resolve(ok)
    setReq(null)
  }
  useBackHandler(() => done(false), !!req)
  return (
    <>
      {req && (
        <div className="modal-backdrop center" onClick={() => done(false)}>
          <div className="confirm" role="alertdialog" onClick={(e) => e.stopPropagation()}>
            <p>{req.message}</p>
            <div className="row">
              <button className="btn" onClick={() => done(false)}>取消</button>
              <button className={'btn ' + (req.danger ? 'danger' : 'primary')} onClick={() => done(true)}>
                {req.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
      {msg && <div className="toast" role="status" key={msg.id}>{msg.text}</div>}
    </>
  )
}

/* ---------- 數字輸入（可輸入小數） ---------- */
export function NumField(props: {
  value: number | null
  onChange: (v: number | null) => void
  placeholder?: string
  ariaLabel?: string
  min?: number
}) {
  const [text, setText] = useState(props.value == null ? '' : String(props.value))
  const lastEmitted = useRef<number | null>(props.value)
  useEffect(() => {
    if (props.value !== lastEmitted.current) {
      lastEmitted.current = props.value
      setText(props.value == null ? '' : String(props.value))
    }
  }, [props.value])
  return (
    <input
      className="input"
      inputMode="decimal"
      aria-label={props.ariaLabel}
      placeholder={props.placeholder}
      value={text}
      onChange={(e) => {
        const t = e.target.value.replace(/[^0-9.]/g, '')
        setText(t)
        const n = t === '' ? null : Number(t)
        const v = n == null || isNaN(n) || n < (props.min ?? 0) ? null : n
        lastEmitted.current = v
        props.onChange(v)
      }}
    />
  )
}

export function Field(props: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="field">
      <span className="field-label">{props.label}</span>
      {props.children}
      {props.hint && <span className="field-hint">{props.hint}</span>}
    </div>
  )
}

export function Avatar({ member, size = 40 }: { member: Pick<Member, 'color' | 'emoji'>; size?: number }) {
  return (
    <span className="avatar" style={{ background: member.color, width: size, height: size, fontSize: size * 0.55 }}>
      {member.emoji}
    </span>
  )
}

export function DrinkIcon({ drink, size = 44 }: { drink: Pick<Drink, 'emoji' | 'image'>; size?: number }) {
  if (drink.image) {
    return <img className="drink-img" src={drink.image} alt="" style={{ width: size, height: size }} />
  }
  return (
    <span className="drink-emoji" style={{ width: size, height: size, fontSize: size * 0.6 }}>
      {drink.emoji}
    </span>
  )
}

export function Segmented<T extends string>(props: {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (v: T) => void
}) {
  return (
    <div className="segmented" role="tablist">
      {props.options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === props.value}
          className={o.value === props.value ? 'on' : ''}
          onClick={() => props.onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function MemberChips(props: {
  members: Member[]
  value: string | null
  onChange: (id: string) => void
  trailing?: ReactNode
}) {
  return (
    <div className="chips">
      {props.members.map((m) => (
        <button
          key={m.id}
          className={'member-chip' + (m.id === props.value ? ' on' : '')}
          style={{ ['--c' as string]: m.color }}
          aria-pressed={m.id === props.value}
          onClick={() => props.onChange(m.id)}
        >
          <Avatar member={m} size={34} />
          <span>{m.name}</span>
        </button>
      ))}
      {props.trailing}
    </div>
  )
}

export function BacWarning() {
  return (
    <div className="bac-warning" role="note">
      ⚠️ 這只是粗略估算，<b>不可作為能否開車的依據</b>。喝酒不開車，開車不喝酒。
    </div>
  )
}
