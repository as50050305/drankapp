import { describe, expect, it } from 'vitest'
import { groupOf, groupVessels, moveGroup, moveVessel } from '../src/lib/vesselGroups'
import { seedVessels } from '../src/data/seed'
import type { Vessel } from '../src/types'

const names = (vs: Vessel[]) => vs.sort((a, b) => a.order - b.order).map((v) => v.id)

describe('杯具分組與排序', () => {
  it('預設分成 5 組，順序為烈酒杯、清酒杯、葡萄酒杯、啤酒杯、調酒杯', () => {
    const g = groupVessels(seedVessels())
    expect(g.map((x) => `${x.name}:${x.items.length}`)).toEqual(['烈酒杯:6', '清酒杯:2', '葡萄酒杯:2', '啤酒杯:10', '調酒杯:2'])
  })
  it('舊資料沒有分組欄位時：預設杯具照預設分組，自訂杯具歸到「其他」', () => {
    expect(groupOf({ id: 'v-can330' })).toBe('啤酒杯')
    expect(groupOf({ id: 'abc-123' })).toBe('其他')
    expect(groupOf({ id: 'v-can330', group: '我的最愛' })).toBe('我的最愛')
  })
  it('組內上下移動，不會跑到別組', () => {
    const moved = moveVessel(seedVessels(), 'v-shot45', -1)
    expect(names(moved).slice(0, 3)).toEqual(['v-shot45', 'v-shot30', 'v-shot50'])
    // 已經在組內最上面，再往上不動
    expect(names(moveVessel(moved, 'v-shot45', -1)).slice(0, 2)).toEqual(['v-shot45', 'v-shot30'])
    // 組內最後一個往下不動
    const g = groupVessels(moveVessel(seedVessels(), 'v-whisky', 1))
    expect(g[0].items[g[0].items.length - 1].id).toBe('v-whisky')
    expect(g[1].items[0].id).toBe('v-sake90')
  })
  it('整組移動', () => {
    const moved = moveGroup(moveGroup(moveGroup(seedVessels(), '啤酒杯', -1), '啤酒杯', -1), '啤酒杯', -1)
    expect(groupVessels(moved).map((x) => x.name)).toEqual(['啤酒杯', '烈酒杯', '清酒杯', '葡萄酒杯', '調酒杯'])
    expect(moved.map((v) => v.order)).toEqual(moved.map((_, i) => i)) // 重新編號連續
    expect(groupVessels(moveGroup(moved, '啤酒杯', -1))[0].name).toBe('啤酒杯') // 已在最上面
  })
  it('後來才加入某一組的杯具會排在該組最後', () => {
    const vs = [...seedVessels(), { id: 'x', name: '我的馬克杯', ml: 400, emoji: '☕', order: 99, group: '啤酒杯' }]
    const beer = groupVessels(vs).find((g) => g.name === '啤酒杯')!
    expect(beer.items[beer.items.length - 1].id).toBe('x')
  })
})
