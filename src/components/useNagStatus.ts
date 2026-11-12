import { useEffect, useState } from 'react'
import { getNagStatus, onNagStatusChange, type NagStatus } from '../lib/nagNative'

/** 通知狀態；回到 App、排程變動或按過開啟設定的按鈕後會自動更新 */
export function useNagStatus(): NagStatus | null {
  const [status, setStatus] = useState<NagStatus | null>(null)
  useEffect(() => {
    let alive = true
    const refresh = () => {
      void getNagStatus().then((s) => {
        if (alive) setStatus(s)
      })
    }
    refresh()
    const off = onNagStatusChange(refresh)
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      alive = false
      off()
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])
  return status
}
