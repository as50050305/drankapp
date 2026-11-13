/**
 * 種子資料：App 第一次開啟（或在設定頁按「重設為預設」）時會寫入資料庫。
 * 想換掉預設酒款 / 杯具 / 參數，只要改這個檔案即可。
 * 注意：id 請保持唯一；酒款的 defaultVesselId 要對應到下面杯具的 id。
 */
import type { Drink, DrinkCategory, Settings, Vessel } from '../types'

export const CATEGORY_LABELS: Record<DrinkCategory, string> = {
  beer: '啤酒',
  rtd: '氣泡酒精飲料',
  wine: '葡萄酒',
  spirit: '烈酒',
  sake: '清酒・燒酒・梅酒',
  chinese: '中式酒',
  cocktail: '調酒',
  other: '其他',
}

export const CATEGORY_EMOJI: Record<DrinkCategory, string> = {
  beer: '🍺',
  rtd: '🥤',
  wine: '🍷',
  spirit: '🥃',
  sake: '🍶',
  chinese: '🏺',
  cocktail: '🍸',
  other: '🍹',
}

type V = [id: string, name: string, ml: number, emoji: string]
const vessels: V[] = [
  // 台灣酒吧的 shot 多以 1 oz ≈ 30 ml 計，double 為 60 ml
  ['v-shot30', 'Shot 杯（1 oz）', 30, '🥃'],
  ['v-shot45', 'Shot 杯（1.5 oz）', 45, '🥃'],
  ['v-shot50', 'Shot 杯（50）', 50, '🥃'],
  ['v-shot60', 'Double shot', 60, '🥃'],
  ['v-kaoliang', '高粱小酒杯', 15, '🏺'],
  ['v-whisky', '威士忌杯（單份）', 45, '🥃'],
  ['v-sake90', '清酒杯', 90, '🍶'],
  ['v-sake180', '清酒一合', 180, '🍶'],
  ['v-wine150', '紅酒杯', 150, '🍷'],
  ['v-flute120', '香檳杯', 120, '🥂'],
  // 熱炒店常見的台啤杯，容量約 143 ml
  ['v-taipi143', '台啤杯（熱炒店）', 143, '🍺'],
  ['v-beer250', '啤酒杯（小）', 250, '🍺'],
  ['v-draft300', '生啤杯', 300, '🍺'],
  ['v-can330', '罐裝 330', 330, '🥫'],
  ['v-can350', '罐裝 350', 350, '🥫'],
  ['v-pint473', 'Pint（美式）', 473, '🍺'],
  ['v-can500', '罐裝 500', 500, '🥫'],
  ['v-pint568', 'Pint（英式）', 568, '🍺'],
  ['v-bottle600', '玻璃瓶 600', 600, '🍾'],
  ['v-stein1000', '大杯 Stein', 1000, '🍻'],
  ['v-short90', '調酒杯（短飲）', 90, '🍸'],
  ['v-highball300', '調酒杯（長飲 Highball）', 300, '🍹'],
]

type D = [id: string, category: DrinkCategory, brand: string, name: string, abv: number, vessel: string, emoji?: string]
const drinks: D[] = [
  ['d-beer', 'beer', '', '啤酒（一般）', 5, 'v-can330'],
  ['d-tb-gold', 'beer', '台灣啤酒', '金牌', 5, 'v-taipi143'],
  ['d-tb-classic', 'beer', '台灣啤酒', '經典', 4.5, 'v-taipi143'],
  ['d-tb-18', 'beer', '台灣啤酒', '18天生啤酒', 5, 'v-taipi143'],
  ['d-heineken', 'beer', '海尼根', 'Heineken', 5, 'v-can330'],
  ['d-kirin', 'beer', '麒麟', '一番搾', 5, 'v-can330'],
  ['d-asahi', 'beer', '朝日', 'Super Dry', 5, 'v-can330'],
  ['d-bud', 'beer', '百威', 'Budweiser', 5, 'v-can330'],
  ['d-corona', 'beer', '可樂娜', 'Corona Extra', 4.5, 'v-can330'],
  ['d-ipa', 'beer', '', '精釀啤酒 IPA', 6.5, 'v-pint473'],
  ['d-strong', 'rtd', 'Strong Zero', '-196℃', 9, 'v-can350'],
  ['d-hyoketsu', 'rtd', '冰結', '調酒', 5, 'v-can350'],
  ['d-horoyoi', 'rtd', 'HOROYOI', '微醉', 3, 'v-can350'],
  ['d-fruitbeer', 'rtd', '台灣啤酒', '水果系列', 2.8, 'v-can330'],
  ['d-red', 'wine', '', '紅酒', 13, 'v-wine150', '🍷'],
  ['d-white', 'wine', '', '白酒', 12.5, 'v-wine150', '🥂'],
  ['d-sparkling', 'wine', '', '氣泡酒／香檳', 12, 'v-flute120', '🍾'],
  ['d-rose', 'wine', '', '粉紅酒', 12, 'v-wine150', '🍷'],
  ['d-whisky', 'spirit', '', '威士忌', 40, 'v-shot30'],
  ['d-jack', 'spirit', "Jack Daniel's", 'Old No.7', 40, 'v-shot30'],
  ['d-jw-black', 'spirit', '約翰走路', '黑牌', 40, 'v-shot30'],
  ['d-kavalan', 'spirit', '噶瑪蘭', '經典單一麥芽', 40, 'v-shot30'],
  ['d-vodka', 'spirit', '', '伏特加', 40, 'v-shot30'],
  ['d-gin', 'spirit', '', '琴酒', 40, 'v-shot30'],
  ['d-rum', 'spirit', '', '蘭姆酒', 40, 'v-shot30'],
  ['d-tequila', 'spirit', '', '龍舌蘭', 40, 'v-shot30'],
  ['d-brandy', 'spirit', '', '白蘭地', 40, 'v-shot30'],
  ['d-jager', 'spirit', '野格', 'Jägermeister', 35, 'v-shot30'],
  ['d-sake', 'sake', '', '清酒', 15, 'v-sake90'],
  ['d-soju', 'sake', '真露', '韓國燒酒', 16.5, 'v-shot50'],
  ['d-shochu', 'sake', '', '日本燒酎', 25, 'v-sake90'],
  ['d-umeshu', 'sake', '', '梅酒', 12, 'v-sake90'],
  ['d-kaoliang58', 'chinese', '金門高粱', '58度', 58, 'v-kaoliang'],
  ['d-kaoliang38', 'chinese', '金門高粱', '38度', 38, 'v-kaoliang'],
  ['d-mijiu', 'chinese', '', '米酒', 19.5, 'v-shot30'],
  ['d-shaoxing', 'chinese', '', '紹興酒', 16, 'v-shot50'],
  ['d-cocktail', 'cocktail', '', '調酒（自己填度數）', 12, 'v-highball300'],
  ['d-highball', 'cocktail', '', 'Highball 威士忌蘇打', 7, 'v-highball300'],
  ['d-longisland', 'cocktail', '', '長島冰茶', 20, 'v-highball300'],
]

export function seedVessels(): Vessel[] {
  return vessels.map(([id, name, ml, emoji], i) => ({ id, name, ml, emoji, order: i }))
}

export function seedDrinks(): Drink[] {
  return drinks.map(([id, category, brand, name, abv, vessel, emoji], i) => ({
    id,
    category,
    brand,
    name,
    abv,
    emoji: emoji ?? CATEGORY_EMOJI[category],
    image: null,
    defaultVesselId: vessel,
    order: i,
  }))
}

export const DEFAULT_SETTINGS: Settings = {
  density: 0.789, // 酒精密度 g/ml
  stdGrams: 10, // 一個標準杯的純酒精克數
  metabolism: 0.015, // 代謝速率 %/小時
  rMale: 0.68, // Widmark 係數（男）
  rFemale: 0.55, // Widmark 係數（女）
  limitUnit: 'std',
  dailyLimit: 2,
  weeklyLimit: 14,
  volUnit: 'ml',
  bacEnabled: true,
  currentMemberId: null,
  lastDrinkId: 'd-tb-gold',
  lastVesselId: 'v-taipi143',
  nagEnabled: true,
  nagNotify: true,
  nagVibrate: true,
  nagTorch: true,
  nagOverlay: true,
  nagAutoEnd: true,
  nagIntervalMin: 10,
  nagWindowHours: 4,
  nagAutoEndMin: 60,
}

/**
 * 太久沒記錄時的催促台詞，亂序輪流出現。想換台詞改這裡。
 * 第二個欄位決定出現在哪裡：
 * - 'both'    手機通知和中毒畫面都會用
 * - 'notify'  只用在手機通知（內容是在抱怨你沒打開 App，App 開著時講不通）
 * - 'overlay' 只用在中毒畫面（「系統偵測到…」這種口吻，配中毒畫面才對味）
 */
type NagWhere = 'both' | 'notify' | 'overlay'
const NAG_LINES: Array<[text: string, where: NagWhere]> = [
  ['欸操，這麼久不登記，不會是杯底養金魚吧?', 'both'],
  ['開車不喝酒，喝酒不囉嗦，真想囉嗦，先登記再囉嗦?', 'both'],
  ['欸幹，自己一個人喝哦，敢不敢先登記再喝阿?', 'both'],
  ['你都喝三杯了，才登記一杯，確定不是在躲酒?', 'both'],
  ['今朝有酒今朝醉，再不登記，給我去沙發上睡?', 'both'],
  ['你要去催人家酒前，有沒有想過我在這邊催你登記?', 'both'],
  ['好了啦，別打鏢算分數了，能不能讓我算你杯數?', 'both'],
  ['別叫讓你喝醉的人對你負責，你要不要登記一下對我負責?', 'both'],
  ['每次都喝完就睡覺，你不登記，我也會想辦法不讓你睡覺。', 'both'],
  ['喝酒前啞巴，喝酒後喇叭，你再不登記 你就樹蛙懶爬。', 'both'],
  ['喝酒速度沒辦法這麼勤勞就算了，能不能動動手登記勤勞一點。', 'both'],
  ['喝酒完才敢嘴秋，那你要不要看一下才喝多少而已，在那邊。', 'both'],
  ['好了啦，別說自己多會喝，這邊你不登記一下，誰會知道你程度在哪裡。', 'both'],
  ['什麼無中指的喝，都沒在登記的還以為你乙武洋匡咧。', 'both'],
  ['我知道大家都有喝酒，但你把我丟在一邊，有沒有想過我的感受。', 'notify'],
  ['嘴上功夫挺厲害的，就不知道你的手速快不快。', 'both'],
  ['喝酒這麼積極，做紀錄這麼消極喔。', 'both'],
  ['酒杯空了，紀錄也是。', 'both'],
  ['一手拿著酒杯，另一手總該可以紀錄了吧。', 'both'],
  ['你可以不記得你的黑歷史，但能不能記得你剛剛喝了多少。', 'both'],
  ['不要只顧著開酒瓶，開一下APP好嗎幹。', 'notify'],
  ['連這種事情都要我提醒，我你老媽喔？', 'both'],
  ['連自己喝多少都管不了，你還想管什麼？', 'both'],
  ['數據不足，不確定你是酒鬼還是腦殘。', 'overlay'],
  ['偵測到使用者正在進行無紀錄飲酒行為。', 'overlay'],
  ['酒精攝取量未知，使用者智商已知。', 'overlay'],
  ['數據空空如也，你的腦袋也是。', 'overlay'],
  ['你以為不登記，酒就沒有被你喝進去身體裡嗎？', 'both'],
  ['離線了嗎？還是剩酒杯在線？', 'notify'],
  ['系統偵測使用者正在礦工，是否資遣？', 'overlay'],
]

export const NAG_MESSAGES = {
  /** 手機通知用的台詞 */
  notify: NAG_LINES.filter(([, w]) => w !== 'overlay').map(([t]) => t),
  /** 中毒畫面用的台詞 */
  overlay: NAG_LINES.filter(([, w]) => w !== 'notify').map(([t]) => t),
}

/** 檢查更新與分享 App 用的 GitHub 專案（帳號/專案名） */
export const GITHUB_REPO = 'as50050305/drankapp'

/** 超過自動結束時間都沒記錄時的最後一句話 */
export const NAG_FINAL_MESSAGE = '看樣子你是喝多了 廢物 還想要用我來登記杯數阿'

export const MEMBER_COLORS = [
  '#f5a524', '#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#ec4899',
  '#14b8a6', '#f97316', '#eab308', '#6366f1', '#84cc16', '#06b6d4',
]

export const MEMBER_EMOJIS = ['🍻', '🦊', '🐻', '🐼', '🐯', '🐸', '🐙', '🦄', '🐧', '🐶', '🐱', '🦁', '🐵', '👻', '🤠', '😎']
