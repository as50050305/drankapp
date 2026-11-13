import { Capacitor } from '@capacitor/core'
import { AppLauncher } from '@capacitor/app-launcher'
import { GITHUB_REPO } from '../data/seed'

export const APP_VERSION = __APP_VERSION__
export const BUILD_TIME = new Date(__BUILD_TIME__).getTime()
export const RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases/latest`
const APK_URL = `https://github.com/${GITHUB_REPO}/releases/latest/download/drankapp-debug.apk`

export interface UpdateInfo {
  hasUpdate: boolean
  /** GitHub 上最新版的版本號；舊的打包設定沒有標版本時為 null */
  latestVersion: string | null
  /** GitHub 上 APK 的上傳時間 */
  publishedAt: number | null
  apkUrl: string
}

/** 1.10.0 > 1.9.3 這種比較；a 比較新回傳正數 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((x) => parseInt(x, 10) || 0)
  const pb = b.split('.').map((x) => parseInt(x, 10) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d !== 0) return d
  }
  return 0
}

interface GithubRelease {
  name?: string
  assets?: Array<{ name: string; browser_download_url: string; updated_at: string }>
}

/**
 * 判斷 GitHub 上的 Release 是不是比目前安裝的新：
 * 1. Release 標題有版本號（v1.2.3）就比版本號
 * 2. 否則比時間：GitHub 上的 APK 比這個 App 的打包時間晚 20 分鐘以上，就當作有新版
 *    （同一次打包，APK 上傳只會比建置晚幾分鐘）
 */
export function evaluateRelease(rel: GithubRelease, currentVersion: string, buildTime: number): UpdateInfo {
  const apk = rel.assets?.find((a) => a.name.endsWith('.apk'))
  const latestVersion = rel.name?.match(/v(\d+\.\d+\.\d+)/)?.[1] ?? null
  const publishedAt = apk ? new Date(apk.updated_at).getTime() : null
  const newerByTime = publishedAt != null && publishedAt > buildTime + 20 * 60000
  const cmp = latestVersion ? compareVersions(latestVersion, currentVersion) : 0
  return {
    hasUpdate: cmp > 0 || (cmp === 0 && newerByTime),
    latestVersion,
    publishedAt,
    apkUrl: apk?.browser_download_url ?? APK_URL,
  }
}

/** 到 GitHub 查最新的 Release（需要網路；只有按下「檢查更新」時才會連線） */
export async function checkForUpdate(): Promise<UpdateInfo> {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json' },
    cache: 'no-store',
  })
  if (res.status === 404) throw new Error('GitHub 上還沒有發佈任何版本')
  if (res.status === 403 || res.status === 429) throw new Error('查詢太頻繁，請過一小時再試')
  if (!res.ok) throw new Error(`GitHub 回應錯誤（${res.status}）`)
  return evaluateRelease(await res.json(), APP_VERSION, BUILD_TIME)
}

/** 用手機瀏覽器開啟網址（下載 APK 或開 Releases 頁） */
export async function openExternal(url: string): Promise<void> {
  if (Capacitor.isNativePlatform()) await AppLauncher.openUrl({ url })
  else window.open(url, '_blank', 'noopener')
}
