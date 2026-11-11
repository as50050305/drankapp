export type Sex = 'male' | 'female' | null

export interface Member {
  id: string
  name: string
  color: string
  emoji: string
  weightKg: number | null
  sex: Sex
  createdAt: number
}

export type DrinkCategory = 'beer' | 'rtd' | 'wine' | 'spirit' | 'sake' | 'chinese' | 'cocktail' | 'other'

export interface Drink {
  id: string
  category: DrinkCategory
  brand: string
  name: string
  /** 酒精度（%），可為小數 */
  abv: number
  emoji: string
  /** 使用者上傳的圖片（壓縮後的 data URL），null 表示使用預設 emoji */
  image: string | null
  /** 選到這個酒款時自動帶入的杯具 */
  defaultVesselId: string | null
  order: number
}

export interface Vessel {
  id: string
  name: string
  ml: number
  emoji: string
  order: number
}

export interface Session {
  id: string
  name: string
  /** YYYY-MM-DD */
  date: string
  memberIds: string[]
  archived: boolean
  createdAt: number
  /** 封存後重新開啟的時間；催記錄的計時會從這裡重新起算 */
  resumedAt?: number
}

export interface Entry {
  id: string
  memberId: string
  sessionId: string | null
  drinkId: string | null
  /** 記錄當下的酒款名稱與圖示快照，酒款之後被改名或刪除也不影響歷史 */
  drinkName: string
  drinkEmoji: string
  vesselName: string
  /** 每杯容量（ml） */
  ml: number
  /** 酒精度（%） */
  abv: number
  /** 杯數，可為 0.5 的倍數 */
  count: number
  /** 喝的時間（epoch ms） */
  time: number
  note: string
  createdAt: number
}

export interface Settings {
  density: number
  stdGrams: number
  metabolism: number
  rMale: number
  rFemale: number
  limitUnit: 'std' | 'g'
  dailyLimit: number
  weeklyLimit: number
  volUnit: 'ml' | 'oz'
  bacEnabled: boolean
  currentMemberId: string | null
  lastDrinkId: string | null
  lastVesselId: string | null
  /** 催記錄：總開關 */
  nagEnabled: boolean
  /** 催記錄：手機通知 */
  nagNotify: boolean
  /** 催記錄：震動 */
  nagVibrate: boolean
  /** 催記錄：閃手電筒 */
  nagTorch: boolean
  /** 催記錄：中毒畫面 */
  nagOverlay: boolean
  /** 太久沒記錄自動結束活動 */
  nagAutoEnd: boolean
  /** 多久沒記錄就催一次（分鐘） */
  nagIntervalMin: number
  /** 只在活動開始後幾小時內催 */
  nagWindowHours: number
  /** 多久沒記錄就自動結束活動（分鐘） */
  nagAutoEndMin: number
}
