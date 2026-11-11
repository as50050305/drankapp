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
}

export const MEMBER_COLORS = [
  '#f5a524', '#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#ec4899',
  '#14b8a6', '#f97316', '#eab308', '#6366f1', '#84cc16', '#06b6d4',
]

export const MEMBER_EMOJIS = ['🍻', '🦊', '🐻', '🐼', '🐯', '🐸', '🐙', '🦄', '🐧', '🐶', '🐱', '🦁', '🐵', '👻', '🤠', '😎']
