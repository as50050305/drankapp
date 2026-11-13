import { SEED_VESSEL_GROUPS } from '../data/seed'
import type { Vessel } from '../types'

export const DEFAULT_GROUP = '其他'

export function groupOf(v: Pick<Vessel, 'id' | 'group'>): string {
  return v.group?.trim() || SEED_VESSEL_GROUPS[v.id] || DEFAULT_GROUP
}

export interface VesselGroup {
  name: string
  items: Vessel[]
}

/** 依分組整理杯具。分組的先後 = 該組第一個杯具的順序；組內照杯具自己的順序 */
export function groupVessels(vessels: Vessel[]): VesselGroup[] {
  const sorted = [...vessels].sort((a, b) => a.order - b.order)
  const map = new Map<string, Vessel[]>()
  for (const v of sorted) {
    const g = groupOf(v)
    if (!map.has(g)) map.set(g, [])
    map.get(g)!.push(v)
  }
  return [...map.entries()].map(([name, items]) => ({ name, items }))
}

const flatten = (groups: VesselGroup[]): Vessel[] => groups.flatMap((g) => g.items).map((v, i) => ({ ...v, order: i }))

function swap<T>(arr: T[], i: number, j: number): boolean {
  if (i < 0 || j < 0 || i >= arr.length || j >= arr.length) return false
  ;[arr[i], arr[j]] = [arr[j], arr[i]]
  return true
}

/** 把一個杯具在自己的分組裡往上（-1）或往下（+1）移一格；回傳重新編號後的完整清單 */
export function moveVessel(vessels: Vessel[], id: string, dir: -1 | 1): Vessel[] {
  const groups = groupVessels(vessels)
  for (const g of groups) {
    const i = g.items.findIndex((v) => v.id === id)
    if (i >= 0) swap(g.items, i, i + dir)
  }
  return flatten(groups)
}

/** 把整個分組往上或往下移一格 */
export function moveGroup(vessels: Vessel[], name: string, dir: -1 | 1): Vessel[] {
  const groups = groupVessels(vessels)
  const i = groups.findIndex((g) => g.name === name)
  if (i >= 0) swap(groups, i, i + dir)
  return flatten(groups)
}

/* ---------- 拖曳排序用：把分組標題和杯具攤平成一列一列 ---------- */

export type SortRow = { kind: 'group'; key: string; name: string } | { kind: 'vessel'; key: string; vessel: Vessel }

export function toRows(vessels: Vessel[]): SortRow[] {
  return groupVessels(vessels).flatMap((g): SortRow[] => [
    { kind: 'group', key: 'g:' + g.name, name: g.name },
    ...g.items.map((v): SortRow => ({ kind: 'vessel', key: 'v:' + v.id, vessel: v })),
  ])
}

/** 把排好的列轉回杯具清單：杯具屬於它上方最近的那個分組標題，順序重新編號 */
export function rowsToVessels(rows: SortRow[]): Vessel[] {
  const out: Vessel[] = []
  let group = DEFAULT_GROUP
  for (const r of rows) {
    if (r.kind === 'group') group = r.name
    else out.push({ ...r.vessel, group, order: out.length })
  }
  return out
}

/** 一個分組在列表中佔的範圍 [標題位置, 最後一個杯具的位置] */
export function blockRange(rows: SortRow[], headerIndex: number): [number, number] {
  let end = headerIndex
  while (end + 1 < rows.length && rows[end + 1].kind === 'vessel') end++
  return [headerIndex, end]
}

/** 把一個杯具往上或往下移一列（可以越過分組標題換到別組，但不能排到第一個標題上面） */
export function moveRow(rows: SortRow[], index: number, dir: -1 | 1): SortRow[] {
  const j = index + dir
  if (rows[index]?.kind !== 'vessel' || j < 1 || j >= rows.length) return rows
  const next = [...rows]
  ;[next[index], next[j]] = [next[j], next[index]]
  return next
}

/** 把整個分組（標題＋底下的杯具）跟上一組或下一組對調 */
export function moveBlock(rows: SortRow[], headerIndex: number, dir: -1 | 1): SortRow[] {
  if (rows[headerIndex]?.kind !== 'group') return rows
  const [a0, a1] = blockRange(rows, headerIndex)
  if (dir === 1) {
    if (a1 + 1 >= rows.length) return rows
    const [, b1] = blockRange(rows, a1 + 1)
    return [...rows.slice(0, a0), ...rows.slice(a1 + 1, b1 + 1), ...rows.slice(a0, a1 + 1), ...rows.slice(b1 + 1)]
  }
  if (a0 === 0) return rows
  let b0 = a0 - 1
  while (b0 > 0 && rows[b0].kind !== 'group') b0--
  return [...rows.slice(0, b0), ...rows.slice(a0, a1 + 1), ...rows.slice(b0, a0), ...rows.slice(a1 + 1)]
}
