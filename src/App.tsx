import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { ensureSeed } from './db'
import { DataProvider } from './store'
import { handleBack, OverlayHost } from './components/ui'
import { RecordPage } from './pages/RecordPage'
import { SessionsPage } from './pages/SessionsPage'
import { StatsPage } from './pages/StatsPage'
import { CatalogPage } from './pages/CatalogPage'
import { SettingsPage } from './pages/SettingsPage'

type Tab = 'record' | 'sessions' | 'stats' | 'catalog' | 'settings'
const TABS: Array<{ id: Tab; label: string; icon: string }> = [
  { id: 'record', label: '記錄', icon: '🍺' },
  { id: 'sessions', label: '場次', icon: '🎉' },
  { id: 'stats', label: '統計', icon: '📊' },
  { id: 'catalog', label: '酒款與杯具', icon: '🍾' },
  { id: 'settings', label: '設定', icon: '⚙️' },
]

export default function App() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('record')

  useEffect(() => {
    ensureSeed().then(() => setReady(true), (e) => setError(String(e?.message ?? e)))
  }, [])

  // Android 返回鍵：先關視窗 → 回到「記錄」頁 → 縮小 App
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const sub = CapApp.addListener('backButton', () => {
      if (handleBack()) return
      setTab((t) => {
        if (t !== 'record') return 'record'
        CapApp.minimizeApp()
        return t
      })
    })
    return () => {
      sub.then((s) => s.remove())
    }
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [tab])

  if (error) return <div className="loading">無法開啟資料庫：{error}</div>
  if (!ready) return <div className="loading">載入中…</div>

  return (
    <DataProvider>
      <main>
        {tab === 'record' && <RecordPage />}
        {tab === 'sessions' && <SessionsPage />}
        {tab === 'stats' && <StatsPage />}
        {tab === 'catalog' && <CatalogPage />}
        {tab === 'settings' && <SettingsPage />}
      </main>
      <nav className="tabbar" aria-label="主選單">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>
            <span className="tab-icon">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
      <OverlayHost />
    </DataProvider>
  )
}
