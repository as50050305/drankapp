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
