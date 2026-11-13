import { describe, expect, it } from 'vitest'
import { compareVersions, evaluateRelease } from '../src/lib/update'

const T = Date.parse('2026-11-13T10:00:00Z')
const rel = (name: string, minutesAfterBuild: number) => ({
  name,
  assets: [
    { name: 'drankapp-debug.apk', browser_download_url: 'https://example.invalid/app.apk', updated_at: new Date(T + minutesAfterBuild * 60000).toISOString() },
  ],
})

describe('檢查更新', () => {
  it('版本號比較', () => {
    expect(compareVersions('1.10.0', '1.9.3')).toBeGreaterThan(0)
    expect(compareVersions('1.3.0', '1.3.0')).toBe(0)
    expect(compareVersions('1.2.9', '1.3.0')).toBeLessThan(0)
  })
  it('GitHub 版本號較新 → 有更新', () => {
    const r = evaluateRelease(rel('最新版 APK v1.4.0（2026-11-14 20:00 打包）', 2000), '1.3.0', T)
    expect(r.hasUpdate).toBe(true)
    expect(r.latestVersion).toBe('1.4.0')
    expect(r.apkUrl).toBe('https://example.invalid/app.apk')
  })
  it('同一次打包（APK 只比建置晚幾分鐘）→ 已是最新', () => {
    expect(evaluateRelease(rel('最新版 APK v1.3.0（…）', 4), '1.3.0', T).hasUpdate).toBe(false)
  })
  it('版本號相同但之後重新打包過 → 有更新', () => {
    expect(evaluateRelease(rel('最新版 APK v1.3.0（…）', 180), '1.3.0', T).hasUpdate).toBe(true)
  })
  it('舊的打包設定（標題沒有版本號）改用時間判斷', () => {
    expect(evaluateRelease(rel('最新版 APK', 300), '1.3.0', T).hasUpdate).toBe(true)
    expect(evaluateRelease(rel('最新版 APK', 3), '1.3.0', T).hasUpdate).toBe(false)
  })
  it('GitHub 上的版本比較舊 → 不提示', () => {
    expect(evaluateRelease(rel('最新版 APK v1.2.0（…）', 500), '1.3.0', T).hasUpdate).toBe(false)
  })
})
