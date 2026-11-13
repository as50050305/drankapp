import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import type { Entry, Member, Session, Settings } from '../types'
import { entryGrams, entryMl, toStd } from './calc'
import { fmtDateTime } from './format'

/** 手機上：寫到暫存區再開啟「分享」選單（可存到檔案、Drive、LINE…）；瀏覽器：直接下載 */
export async function saveTextFile(filename: string, text: string, mime: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const res = await Filesystem.writeFile({
      path: filename,
      data: text,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    })
    await Share.share({ title: filename, url: res.uri, dialogTitle: '儲存或分享檔案' })
    return
  }
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const esc = (v: string | number) => {
  const s = String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function buildCsv(entries: Entry[], members: Member[], sessions: Session[], s: Settings): string {
  const mName = new Map(members.map((m) => [m.id, m.name]))
  const sName = new Map(sessions.map((x) => [x.id, x.name]))
  const head = ['時間', '成員', '場次', '酒款', '杯具', '每杯容量(ml)', '酒精度(%)', '杯數', '總容量(ml)', '純酒精(g)', '標準杯', '備註']
  const rows = [...entries]
    .sort((a, b) => a.time - b.time)
    .map((e) => {
      const g = entryGrams(e, s)
      return [
        fmtDateTime(e.time),
        mName.get(e.memberId) ?? '（已刪除）',
        e.sessionId ? sName.get(e.sessionId) ?? '' : '',
        e.drinkName,
        e.vesselName,
        e.ml,
        e.abv,
        e.count,
        +entryMl(e).toFixed(2),
        +g.toFixed(2),
        +toStd(g, s).toFixed(2),
        e.note,
      ].map(esc).join(',')
    })
  // 加上 BOM，Excel 才會正確顯示中文
  return '﻿' + [head.join(','), ...rows].join('\r\n')
}

/** 分享一張圖片（PNG data URL）。手機上開啟分享選單；瀏覽器直接下載 */
export async function shareImage(filename: string, dataUrl: string, text: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const res = await Filesystem.writeFile({ path: filename, data: dataUrl.split(',')[1], directory: Directory.Cache })
    await Share.share({ title: filename, text, files: [res.uri], dialogTitle: '分享給朋友' })
    return
  }
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/** 分享文字。回傳 'copied' 表示沒有分享選單、已改為複製到剪貼簿 */
export async function shareText(text: string, title = '喝多少'): Promise<'shared' | 'copied'> {
  if (Capacitor.isNativePlatform()) {
    await Share.share({ title, text, dialogTitle: '分享給朋友' })
    return 'shared'
  }
  if (navigator.share) {
    await navigator.share({ title, text })
    return 'shared'
  }
  await navigator.clipboard.writeText(text)
  return 'copied'
}

/** 使用者自己關掉分享選單不算錯誤 */
export function isShareCancel(e: unknown): boolean {
  const m = String((e as Error)?.message ?? e).toLowerCase()
  return m.includes('cancel') || m.includes('abort')
}
