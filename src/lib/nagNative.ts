import { Capacitor } from '@capacitor/core'
import { Haptics } from '@capacitor/haptics'
import { LocalNotifications, type LocalNotificationSchema } from '@capacitor/local-notifications'
import { Torch } from '@capawesome/capacitor-torch'
import { NAG_FINAL_MESSAGE } from '../data/seed'
import type { Settings } from '../types'
import type { NagPlan } from './nag'

const native = () => Capacitor.isNativePlatform()
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const CH_VIBRATE = 'nag-vibrate'
const CH_QUIET = 'nag-quiet'
let channelsReady = false

async function ensureChannels() {
  if (channelsReady) return
  // 震動與否是通知頻道的屬性，所以開兩個頻道，依設定選用
  await LocalNotifications.createChannel({ id: CH_VIBRATE, name: '催記錄（震動）', description: '太久沒登記時提醒', importance: 4, visibility: 1, vibration: true })
  await LocalNotifications.createChannel({ id: CH_QUIET, name: '催記錄（不震動）', description: '太久沒登記時提醒', importance: 4, visibility: 1, vibration: false })
  channelsReady = true
}

/** 需要時向使用者要求通知權限（Android 13 以上才會跳出詢問） */
export async function ensureNotifyPermission(): Promise<boolean> {
  if (!native()) return false
  let p = await LocalNotifications.checkPermissions()
  if (p.display !== 'granted' && p.display !== 'denied') p = await LocalNotifications.requestPermissions()
  return p.display === 'granted'
}

async function clearPending() {
  const pending = await LocalNotifications.getPending()
  if (pending.notifications.length) {
    await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) })
  }
}

let chain: Promise<unknown> = Promise.resolve()

/**
 * 把催促時間表排進系統通知。App 在背景或手機鎖定時也會準時跳出。
 * 每次有人登記、活動開始或結束、設定改變時都會重排。
 */
export function syncNotifications(plan: NagPlan | null, s: Settings): Promise<unknown> {
  chain = chain
    .then(async () => {
      if (!native()) return
      await clearPending()
      if (!plan || !s.nagNotify) return
      if (!(await ensureNotifyPermission())) return
      await ensureChannels()
      const now = Date.now()
      const channelId = s.nagVibrate ? CH_VIBRATE : CH_QUIET
      const list: LocalNotificationSchema[] = plan.nags
        .filter((n) => n.at > now + 1000)
        .map((n, i) => ({
          id: 1000 + i,
          title: '🍻 該登記了',
          body: n.message,
          largeBody: n.message,
          channelId,
          foreground: true,
          schedule: { at: new Date(n.at), allowWhileIdle: true },
        }))
      if (plan.endAt && plan.endAt > now + 1000) {
        list.push({
          id: 1999,
          title: '☠️ 活動已自動結束',
          body: NAG_FINAL_MESSAGE,
          largeBody: NAG_FINAL_MESSAGE,
          channelId,
          foreground: true,
          schedule: { at: new Date(plan.endAt), allowWhileIdle: true },
        })
      }
      if (list.length) await LocalNotifications.schedule({ notifications: list })
    })
    .catch((e) => console.warn('排程通知失敗', e))
  return chain
}

/** 設定頁的「測試」：5 秒後跳一則通知。回傳 false 表示沒有通知權限或不是在手機上 */
export async function testNotification(message: string, s: Settings): Promise<boolean> {
  if (!native()) return false
  if (!(await ensureNotifyPermission())) return false
  await ensureChannels()
  await LocalNotifications.schedule({
    notifications: [{
      id: 2999,
      title: '🍻 該登記了（測試）',
      body: message,
      largeBody: message,
      channelId: s.nagVibrate ? CH_VIBRATE : CH_QUIET,
      foreground: true,
      schedule: { at: new Date(Date.now() + 5000), allowWhileIdle: true },
    }],
  })
  return true
}

/** App 開著時的震動 */
export async function buzz(): Promise<void> {
  try {
    if (native()) {
      for (let i = 0; i < 3; i++) {
        await Haptics.vibrate({ duration: 400 })
        await sleep(600)
      }
    } else {
      navigator.vibrate?.([400, 200, 400, 200, 400])
    }
  } catch {
    /* 裝置不支援就算了 */
  }
}

let flashing = false
/** App 開著時閃手電筒（約每秒 2 次，共 3 秒）。只有手機 App 才有作用 */
export async function flashTorch(): Promise<void> {
  if (!native() || flashing) return
  flashing = true
  try {
    const { available } = await Torch.isAvailable()
    if (!available) return
    for (let i = 0; i < 6; i++) {
      await Torch.enable()
      await sleep(250)
      await Torch.disable()
      await sleep(250)
    }
  } catch {
    /* 沒有閃光燈或被其他 App 佔用 */
  } finally {
    try {
      await Torch.disable()
    } catch {
      /* ignore */
    }
    flashing = false
  }
}
