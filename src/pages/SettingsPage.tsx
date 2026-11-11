import { useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { exportBackup, importBackup, resetCatalog, resetParams, updateSettings, validateBackup, wipeAll } from '../db'
import { useData } from '../store'
import { buildCsv, saveTextFile } from '../lib/exporter'
import { fmtDate } from '../lib/format'
import type { Member, Settings } from '../types'
import { Avatar, BacWarning, confirmDialog, Field, NumField, Segmented, toast } from '../components/ui'
import { MemberEditor } from '../components/MemberEditor'
import { testNag } from '../components/NagController'
import { NAG_MESSAGES } from '../data/seed'
import { testNotification } from '../lib/nagNative'

export function SettingsPage() {
  const data = useData()
  const { members, settings } = data
  const [editing, setEditing] = useState<Member | 'new' | null>(null)
  const importRef = useRef<HTMLInputElement>(null)

  const set = (patch: Partial<Settings>) => updateSettings(patch)
  const num = (key: keyof Settings) => (v: number | null) => {
    if (v != null) set({ [key]: v } as Partial<Settings>)
  }
  const stamp = () => fmtDate(Date.now())

  const doExportJson = async () => {
    try {
      await saveTextFile(`drankapp-backup-${stamp()}.json`, JSON.stringify(await exportBackup(), null, 2), 'application/json')
    } catch (e) {
      toast('匯出失敗：' + (e as Error).message)
    }
  }
  const doExportCsv = async () => {
    try {
      await saveTextFile(`drankapp-${stamp()}.csv`, buildCsv(data.entries, data.members, data.sessions, settings), 'text/csv')
    } catch (e) {
      toast('匯出失敗：' + (e as Error).message)
    }
  }
  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      const b = validateBackup(JSON.parse(await f.text()))
      const ok = await confirmDialog(
        `匯入備份（${b.members.length} 位成員、${b.entries.length} 筆紀錄）？目前手機上的所有資料會被取代。`,
        { confirmText: '匯入並取代', danger: true },
      )
      if (!ok) return
      await importBackup(b)
      toast('匯入完成')
    } catch (err) {
      toast('匯入失敗：' + ((err as Error).message || '檔案格式不正確'))
    }
  }
  const doWipe = async () => {
    if (!(await confirmDialog('清除全部資料？成員、紀錄、場次、自訂酒款與圖片都會刪除。', { confirmText: '繼續', danger: true }))) return
    if (!(await confirmDialog('最後確認：這個動作無法復原，建議先匯出備份。真的要全部清除嗎？', { confirmText: '全部清除', danger: true }))) return
    await wipeAll()
    toast('已清除全部資料')
  }
  const doResetCatalog = async () => {
    if (await confirmDialog('把酒款與杯具重設為預設值？自訂的酒款、杯具與上傳的圖片會消失（喝酒紀錄不受影響）。', { confirmText: '重設', danger: true })) {
      await resetCatalog()
      toast('已重設酒款與杯具')
    }
  }
  const doTestNag = async () => {
    testNag()
    if (!settings.nagNotify) return
    const ok = await testNotification(NAG_MESSAGES[Math.floor(Math.random() * NAG_MESSAGES.length)], settings)
    if (!ok && Capacitor.isNativePlatform()) toast('通知權限沒有開，請到手機的系統設定允許「喝多少」顯示通知')
  }
  const doResetParams = async () => {
    if (await confirmDialog('把計算參數還原成預設值？')) {
      await resetParams()
      toast('已還原預設參數')
    }
  }

  return (
    <div className="page">
      <h1>設定</h1>

      <h2>成員</h2>
      <div className="list">
        {members.map((m) => (
          <button key={m.id} className="list-item" onClick={() => setEditing(m)}>
            <Avatar member={m} size={40} />
            <span className="grow">{m.name}</span>
            <span className="muted">
              {m.weightKg ? `${m.weightKg} kg` : '未填體重'}{m.sex ? (m.sex === 'male' ? '・男' : '・女') : ''}
            </span>
          </button>
        ))}
        <button className="list-item add" onClick={() => setEditing('new')}>＋ 新增成員</button>
      </div>

      <h2>計算參數</h2>
      <div className="card">
        <p className="muted">純酒精（g）＝ 容量(ml) × 酒精度(%) ÷ 100 × 酒精密度</p>
        <Field label="酒精密度（g/ml）">
          <NumField value={settings.density} onChange={num('density')} ariaLabel="酒精密度" />
        </Field>
        <Field label="一個標準杯 = 幾克純酒精">
          <NumField value={settings.stdGrams} onChange={num('stdGrams')} ariaLabel="標準杯克數" />
          <div className="chips">
            {[[10, '10 g（台灣／WHO）'], [14, '14 g（美國）'], [8, '8 g（英國）']].map(([g, label]) => (
              <button key={g} className={'chip' + (settings.stdGrams === g ? ' on' : '')} onClick={() => set({ stdGrams: g as number })}>{label}</button>
            ))}
          </div>
        </Field>
        <Field label="單位顯示">
          <Segmented value={settings.volUnit} onChange={(v) => set({ volUnit: v })} options={[{ value: 'ml', label: 'ml' }, { value: 'oz', label: 'oz' }]} />
        </Field>
      </div>

      <h2>提醒上限</h2>
      <div className="card">
        <Field label="上限單位">
          <Segmented value={settings.limitUnit} onChange={(v) => set({ limitUnit: v })} options={[{ value: 'std', label: '標準杯' }, { value: 'g', label: '純酒精 g' }]} />
        </Field>
        <div className="grid2">
          <Field label="每日上限" hint="填 0 表示不提醒">
            <NumField value={settings.dailyLimit} onChange={num('dailyLimit')} ariaLabel="每日上限" />
          </Field>
          <Field label="每週上限" hint="填 0 表示不提醒">
            <NumField value={settings.weeklyLimit} onChange={num('weeklyLimit')} ariaLabel="每週上限" />
          </Field>
        </div>
        <p className="muted">「一天」從清晨 5:00 起算，跨午夜續攤仍算同一天；一週從週一開始。</p>
      </div>

      <h2>血中酒精濃度（BAC）估算</h2>
      <div className="card">
        <label className="switch-row">
          <span>顯示 BAC 估算</span>
          <input type="checkbox" role="switch" aria-label="顯示 BAC 估算" checked={settings.bacEnabled} onChange={(e) => set({ bacEnabled: e.target.checked })} />
        </label>
        <BacWarning />
        <Field label="酒精代謝速率（%/小時）">
          <NumField value={settings.metabolism} onChange={num('metabolism')} ariaLabel="代謝速率" />
        </Field>
        <div className="grid2">
          <Field label="Widmark 係數（男）">
            <NumField value={settings.rMale} onChange={num('rMale')} ariaLabel="Widmark 男" />
          </Field>
          <Field label="Widmark 係數（女）">
            <NumField value={settings.rFemale} onChange={num('rFemale')} ariaLabel="Widmark 女" />
          </Field>
        </div>
        <button className="btn ghost" onClick={doResetParams}>↺ 所有參數還原預設值</button>
      </div>

      <h2>催記錄提醒</h2>
      <div className="card">
        <p className="muted">
          活動開始後 {settings.nagWindowHours} 小時內，只要 {settings.nagIntervalMin} 分鐘沒有人登記就會催一次，台詞亂序出現。每一項都可以單獨關掉。
        </p>
        <Toggle label="啟用催記錄" checked={settings.nagEnabled} onChange={(v) => set({ nagEnabled: v })} />
        {settings.nagEnabled && (
          <>
            <Toggle label="手機通知" hint="App 在背景或螢幕關閉時也會跳出" checked={settings.nagNotify} onChange={(v) => set({ nagNotify: v })} />
            <Toggle label="震動" checked={settings.nagVibrate} onChange={(v) => set({ nagVibrate: v })} />
            <Toggle label="閃手電筒" hint="只有 App 開在畫面上時才會閃" checked={settings.nagTorch} onChange={(v) => set({ nagTorch: v })} />
            <Toggle label="中毒畫面" hint="只有 App 開在畫面上時才會出現；畫面會閃爍" checked={settings.nagOverlay} onChange={(v) => set({ nagOverlay: v })} />
            <Toggle label="太久沒登記自動結束活動" checked={settings.nagAutoEnd} onChange={(v) => set({ nagAutoEnd: v })} />
            <div className="grid3">
              <Field label="每幾分鐘催">
                <NumField value={settings.nagIntervalMin} onChange={num('nagIntervalMin')} ariaLabel="催記錄間隔" min={1} />
              </Field>
              <Field label="開始後幾小時內">
                <NumField value={settings.nagWindowHours} onChange={num('nagWindowHours')} ariaLabel="催記錄時段" />
              </Field>
              <Field label="幾分鐘後結束">
                <NumField value={settings.nagAutoEndMin} onChange={num('nagAutoEndMin')} ariaLabel="自動結束時間" min={1} />
              </Field>
            </div>
            <button className="btn" onClick={doTestNag}>🧪 測試一下（畫面、震動、手電筒，5 秒後跳通知）</button>
          </>
        )}
      </div>

      <h2>資料管理</h2>
      <div className="card stack">
        <p className="muted">所有資料只存在這支手機，不會上傳。換手機或重裝前請先匯出備份。</p>
        <button className="btn" onClick={doExportJson}>⬆️ 匯出完整備份（JSON）</button>
        <button className="btn" onClick={() => importRef.current?.click()}>⬇️ 匯入備份（JSON）</button>
        <input ref={importRef} data-testid="import-input" type="file" accept="application/json,.json,text/plain,*/*" hidden onChange={onImport} />
        <button className="btn" onClick={doExportCsv}>📊 匯出紀錄（CSV，可用 Excel／Google 試算表開啟）</button>
        <button className="btn ghost" onClick={doResetCatalog}>↺ 酒款與杯具重設為預設</button>
        <button className="btn danger" onClick={doWipe}>🗑️ 清除全部資料</button>
      </div>

      <p className="muted about">喝多少 v1.1.0・資料僅存於本機・理性飲酒，未成年請勿飲酒</p>

      {editing && <MemberEditor member={editing === 'new' ? null : editing} existingCount={members.length} onClose={() => setEditing(null)} />}
    </div>
  )
}

function Toggle(props: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="switch-row">
      <span>
        {props.label}
        {props.hint && <small className="switch-hint">{props.hint}</small>}
      </span>
      <input type="checkbox" role="switch" aria-label={props.label} checked={props.checked} onChange={(e) => props.onChange(e.target.checked)} />
    </label>
  )
}
