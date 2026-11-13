import { useRef, useState } from 'react'
import { db } from '../db'
import { useData } from '../store'
import { CATEGORY_EMOJI, CATEGORY_LABELS } from '../data/seed'
import { compressImage } from '../lib/image'
import { drinkLabel, fmt, fmtVol, uid } from '../lib/format'
import type { Drink, DrinkCategory, Vessel } from '../types'
import { DEFAULT_GROUP, groupOf, groupVessels } from '../lib/vesselGroups'
import { VesselSortList } from '../components/VesselSortList'
import { confirmDialog, DrinkIcon, Field, Modal, NumField, Segmented, toast } from '../components/ui'

const CATS = Object.keys(CATEGORY_LABELS) as DrinkCategory[]

export function CatalogPage() {
  const { drinks, vessels } = useData()
  const [tab, setTab] = useState<'drinks' | 'vessels'>('drinks')
  const [drink, setDrink] = useState<Drink | 'new' | null>(null)
  const [vessel, setVessel] = useState<Vessel | 'new' | null>(null)

  return (
    <div className="page">
      <div className="page-head">
        <h1>酒款與杯具</h1>
        <button className="btn primary" onClick={() => (tab === 'drinks' ? setDrink('new') : setVessel('new'))}>
          ＋ {tab === 'drinks' ? '新酒款' : '新杯具'}
        </button>
      </div>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'drinks', label: `酒款（${drinks.length}）` }, { value: 'vessels', label: `杯具（${vessels.length}）` }]} />

      {tab === 'drinks' &&
        CATS.filter((c) => drinks.some((d) => d.category === c)).map((c) => (
          <section key={c}>
            <h2>{CATEGORY_EMOJI[c]} {CATEGORY_LABELS[c]}</h2>
            <div className="list">
              {drinks.filter((d) => d.category === c).map((d) => (
                <button key={d.id} className="list-item" onClick={() => setDrink(d)}>
                  <DrinkIcon drink={d} size={40} />
                  <span className="grow">{drinkLabel(d)}</span>
                  <b>{fmt(d.abv, 1)}%</b>
                </button>
              ))}
            </div>
          </section>
        ))}

      {tab === 'vessels' && (
        <>
          <p className="muted" style={{ marginTop: 14 }}>按住左邊的 ≡ 拖曳就能排序：拖杯具可以換位置或換到別組，拖分組標題會整組一起移動。</p>
          <VesselSortList onEdit={setVessel} />
        </>
      )}
      <p className="muted" style={{ marginTop: 16 }}>點一下就能修改或刪除。想整批還原成預設值，請到「設定 → 資料管理」。</p>

      {drink && <DrinkEditor drink={drink === 'new' ? null : drink} onClose={() => setDrink(null)} />}
      {vessel && <VesselEditor vessel={vessel === 'new' ? null : vessel} onClose={() => setVessel(null)} />}
    </div>
  )
}

function DrinkEditor({ drink, onClose }: { drink: Drink | null; onClose: () => void }) {
  const { drinks, vessels, settings } = useData()
  const [brand, setBrand] = useState(drink?.brand ?? '')
  const [name, setName] = useState(drink?.name ?? '')
  const [category, setCategory] = useState<DrinkCategory>(drink?.category ?? 'beer')
  const [abv, setAbv] = useState<number | null>(drink?.abv ?? 5)
  const [emoji, setEmoji] = useState(drink?.emoji ?? CATEGORY_EMOJI.beer)
  const [image, setImage] = useState<string | null>(drink?.image ?? null)
  const [vesselId, setVesselId] = useState(drink?.defaultVesselId ?? '')
  const galleryRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      setImage(await compressImage(f, 512))
    } catch (err) {
      toast((err as Error).message)
    }
  }

  const save = async () => {
    if (!name.trim() && !brand.trim()) return toast('請輸入品牌或名稱')
    if (abv == null) return toast('請輸入酒精度')
    if (abv > 100) return toast('酒精度不能超過 100%')
    const data = { brand: brand.trim(), name: name.trim(), category, abv, emoji: emoji.trim() || CATEGORY_EMOJI[category], image, defaultVesselId: vesselId || null }
    if (drink) await db.drinks.update(drink.id, data)
    else await db.drinks.add({ id: uid(), ...data, order: Math.max(0, ...drinks.map((d) => d.order)) + 1 })
    onClose()
  }
  const remove = async () => {
    if (!drink) return
    if (await confirmDialog(`刪除「${drinkLabel(drink)}」？已記錄的歷史不受影響。`, { confirmText: '刪除', danger: true })) {
      await db.drinks.delete(drink.id)
      onClose()
    }
  }

  return (
    <Modal
      title={drink ? '編輯酒款' : '新酒款'}
      onClose={onClose}
      footer={
        <div className="row">
          {drink && <button className="btn danger ghost" onClick={remove}>刪除</button>}
          <button className="btn primary grow" onClick={save}>儲存</button>
        </div>
      }
    >
      <div className="img-edit">
        <DrinkIcon drink={{ emoji: emoji || CATEGORY_EMOJI[category], image }} size={96} />
        <div className="img-btns">
          <button className="btn" onClick={() => galleryRef.current?.click()}>🖼️ 從相簿選擇</button>
          <button className="btn" onClick={() => cameraRef.current?.click()}>📷 用相機拍照</button>
          {image && <button className="btn ghost" onClick={() => setImage(null)}>↺ 還原成預設圖</button>}
        </div>
        <input ref={galleryRef} data-testid="gallery-input" type="file" accept="image/*" hidden onChange={onFile} />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onFile} />
      </div>
      <Field label="品牌（選填）">
        <input className="input" aria-label="品牌" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="例如：金門高粱" />
      </Field>
      <Field label="名稱">
        <input className="input" aria-label="名稱" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：58度" />
      </Field>
      <div className="grid2">
        <Field label="酒精度（%）">
          <NumField value={abv} onChange={setAbv} ariaLabel="酒精度" placeholder="例如：4.5" />
        </Field>
        <Field label="預設圖示（emoji）">
          <input className="input" aria-label="圖示" value={emoji} maxLength={4} onChange={(e) => setEmoji(e.target.value)} />
        </Field>
      </div>
      <Field label="分類">
        <select className="input" value={category} onChange={(e) => { const c = e.target.value as DrinkCategory; if (emoji === CATEGORY_EMOJI[category]) setEmoji(CATEGORY_EMOJI[c]); setCategory(c) }}>
          {CATS.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
        </select>
      </Field>
      <Field label="預設杯具" hint="選到這個酒款時自動帶入，記錄時仍可更換">
        <select className="input" value={vesselId} onChange={(e) => setVesselId(e.target.value)}>
          <option value="">（不指定）</option>
          {vessels.map((v) => <option key={v.id} value={v.id}>{v.name}（{fmtVol(v.ml, settings)}）</option>)}
        </select>
      </Field>
    </Modal>
  )
}

function VesselEditor({ vessel, onClose }: { vessel: Vessel | null; onClose: () => void }) {
  const { vessels } = useData()
  const [name, setName] = useState(vessel?.name ?? '')
  const [ml, setMl] = useState<number | null>(vessel?.ml ?? null)
  const [emoji, setEmoji] = useState(vessel?.emoji ?? '🥃')
  const groupNames = groupVessels(vessels).map((g) => g.name)
  const [group, setGroup] = useState(vessel ? groupOf(vessel) : groupNames[0] ?? DEFAULT_GROUP)
  const save = async () => {
    if (!name.trim()) return toast('請輸入名稱')
    if (!ml) return toast('請輸入容量')
    const data = { name: name.trim(), ml, emoji: emoji.trim() || '🥛', group: group.trim() || DEFAULT_GROUP }
    if (vessel) await db.vessels.update(vessel.id, data)
    else await db.vessels.add({ id: uid(), ...data, order: Math.max(0, ...vessels.map((v) => v.order)) + 1 })
    onClose()
  }
  const remove = async () => {
    if (!vessel) return
    if (await confirmDialog(`刪除「${vessel.name}」？已記錄的歷史不受影響。`, { confirmText: '刪除', danger: true })) {
      await db.vessels.delete(vessel.id)
      onClose()
    }
  }
  return (
    <Modal
      title={vessel ? '編輯杯具' : '新杯具'}
      onClose={onClose}
      footer={
        <div className="row">
          {vessel && <button className="btn danger ghost" onClick={remove}>刪除</button>}
          <button className="btn primary grow" onClick={save}>儲存</button>
        </div>
      }
    >
      <Field label="名稱">
        <input className="input" aria-label="杯具名稱" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：我家的馬克杯" />
      </Field>
      <div className="grid2">
        <Field label="容量（ml）">
          <NumField value={ml} onChange={setMl} ariaLabel="容量" placeholder="例如：330" />
        </Field>
        <Field label="圖示（emoji）">
          <input className="input" aria-label="圖示" value={emoji} maxLength={4} onChange={(e) => setEmoji(e.target.value)} />
        </Field>
      </div>
      <Field label="分組" hint="點選現有分組，或直接輸入新的分組名稱">
        <div className="chips wrap">
          {groupNames.map((g) => (
            <button key={g} className={'chip' + (g === group.trim() ? ' on' : '')} onClick={() => setGroup(g)}>{g}</button>
          ))}
        </div>
        <input className="input" aria-label="分組" value={group} maxLength={12} onChange={(e) => setGroup(e.target.value)} placeholder="例如：啤酒杯" />
      </Field>
    </Modal>
  )
}
