import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { db } from '../db'
import { useData } from '../store'
import { fmtVol } from '../lib/format'
import { blockRange, moveBlock, moveRow, rowsToVessels, toRows, type SortRow } from '../lib/vesselGroups'
import type { Vessel } from '../types'

const EDGE = 90 // 手指靠近畫面上下邊緣多少 px 內就自動捲動
const SPEED = 14

/**
 * 杯具清單：按住左邊的 ≡ 直接拖曳排序。
 * - 拖杯具：可以在組內移動，也可以拖過分組標題換到別組
 * - 拖分組標題：整組一起移動
 * 放手時才存檔。
 */
export function VesselSortList({ onEdit }: { onEdit: (v: Vessel) => void }) {
  const { vessels, settings } = useData()
  const [rows, setRows] = useState<SortRow[]>(() => toRows(vessels))
  const [dragKey, setDragKey] = useState<string | null>(null)
  const rowsRef = useRef(rows)
  rowsRef.current = rows
  const els = useRef(new Map<string, HTMLElement>())
  const drag = useRef<{ key: string; y: number; raf: number } | null>(null)

  // 沒在拖的時候，跟著資料庫更新（新增、修改、刪除杯具）
  useEffect(() => {
    if (!drag.current) setRows(toRows(vessels))
  }, [vessels])

  const rect = (key: string) => els.current.get(key)?.getBoundingClientRect()

  /** 依手指位置決定要不要跟上下鄰居交換；回傳有沒有動 */
  const step = (): boolean => {
    const d = drag.current
    if (!d) return false
    const cur = rowsRef.current
    const i = cur.findIndex((r) => r.key === d.key)
    if (i < 0) return false
    let next = cur
    if (cur[i].kind === 'vessel') {
      const me = rect(d.key)
      const below = cur[i + 1] && rect(cur[i + 1].key)
      const above = i > 1 ? rect(cur[i - 1].key) : undefined
      if (!me) return false
      // 交換後手指仍落在被拖的那一列上才交換，高度不同的列才不會來回跳
      if (below && d.y > below.bottom - me.height) next = moveRow(cur, i, 1)
      else if (above && d.y < above.top + me.height) next = moveRow(cur, i, -1)
    } else {
      const [a0, a1] = blockRange(cur, i)
      const top = rect(cur[a0].key)?.top
      const bottom = rect(cur[a1].key)?.bottom
      if (top == null || bottom == null) return false
      const height = bottom - top
      if (a1 + 1 < cur.length) {
        const [, b1] = blockRange(cur, a1 + 1)
        const bBottom = rect(cur[b1].key)?.bottom
        if (bBottom != null && d.y > bBottom - height) next = moveBlock(cur, i, 1)
      }
      if (next === cur && a0 > 0) {
        let b0 = a0 - 1
        while (b0 > 0 && cur[b0].kind !== 'group') b0--
        const bTop = rect(cur[b0].key)?.top
        if (bTop != null && d.y < bTop + height) next = moveBlock(cur, i, -1)
      }
    }
    if (next === cur) return false
    rowsRef.current = next
    flushSync(() => setRows(next)) // 立刻更新畫面，下一次量到的位置才是對的
    return true
  }

  const loop = () => {
    const d = drag.current
    if (!d) return
    const bottomEdge = window.innerHeight - 80 // 扣掉底部導覽列
    if (d.y < EDGE) window.scrollBy(0, -SPEED)
    else if (d.y > bottomEdge - EDGE) window.scrollBy(0, SPEED)
    for (let n = 0; n < 4 && step(); n++) {
      /* 手指移動很快時一次追上幾列 */
    }
    d.raf = requestAnimationFrame(loop)
  }

  const end = () => {
    const d = drag.current
    if (!d) return
    cancelAnimationFrame(d.raf)
    drag.current = null
    setDragKey(null)
    const next = rowsToVessels(rowsRef.current)
    const before = new Map(vessels.map((v) => [v.id, v]))
    const changed = next.filter((v) => {
      const b = before.get(v.id)
      return !b || b.order !== v.order || (b.group ?? '') !== (v.group ?? '')
    })
    if (changed.length) void db.vessels.bulkPut(next)
  }
  // 拖曳中的移動與放手改在整個視窗監聽：列在畫面上換位置時，按住的那顆 ≡ 會被搬動，
  // 只聽它自己的事件會中途斷掉
  const endRef = useRef(end)
  endRef.current = end
  const stopDrag = useRef<(() => void) | null>(null)
  const start = (key: string) => (e: React.PointerEvent<HTMLButtonElement>) => {
    stopDrag.current?.() // 上一次拖曳沒有正常結束時，先收尾
    e.preventDefault()
    const onMove = (ev: PointerEvent) => {
      if (drag.current) drag.current.y = ev.clientY
    }
    const stop = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
      window.removeEventListener('blur', stop)
      stopDrag.current = null
      endRef.current()
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
    window.addEventListener('blur', stop)
    stopDrag.current = stop
    drag.current = { key, y: e.clientY, raf: requestAnimationFrame(loop) }
    setDragKey(key)
    navigator.vibrate?.(15)
  }
  useEffect(() => () => stopDrag.current?.(), [])

  const handle = (key: string, label: string) => (
    <button
      className="drag-handle"
      aria-label={`拖曳 ${label}`}
      onPointerDown={start(key)}
      onContextMenu={(e) => e.preventDefault()}
    >
      ≡
    </button>
  )
  const setEl = (key: string) => (el: HTMLElement | null) => {
    if (el) els.current.set(key, el)
    else els.current.delete(key)
  }
  // 拖整組時，底下的杯具也一起標示
  const dragIdx = dragKey ? rows.findIndex((r) => r.key === dragKey) : -1
  const dragBlock = dragIdx >= 0 && rows[dragIdx].kind === 'group' ? blockRange(rows, dragIdx) : null

  return (
    <div className={'sort-list' + (dragKey ? ' sorting' : '')}>
      {rows.map((r, i) => {
        const active = r.key === dragKey || (dragBlock != null && i >= dragBlock[0] && i <= dragBlock[1])
        if (r.kind === 'group') {
          return (
            <div key={r.key} ref={setEl(r.key)} className={'sort-row sort-group' + (active ? ' dragging' : '')}>
              {handle(r.key, r.name + ' 整組')}
              <h2>{r.name}</h2>
            </div>
          )
        }
        const v = r.vessel
        return (
          <div key={r.key} ref={setEl(r.key)} className={'sort-row sort-item' + (active ? ' dragging' : '')}>
            {handle(r.key, v.name)}
            <button className="sort-main" onClick={() => onEdit(v)}>
              <span className="drink-emoji" style={{ width: 40, height: 40, fontSize: 24 }}>{v.emoji}</span>
              <span className="grow">{v.name}</span>
              <b>{fmtVol(v.ml, settings)}</b>
            </button>
          </div>
        )
      })}
    </div>
  )
}
