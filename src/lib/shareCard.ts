import type { Member, Session, Settings } from '../types'
import type { Totals } from './calc'
import { fmt, fmtVol } from './format'

export interface RankRow extends Totals {
  member: Member
}

const MEDALS = ['🥇', '🥈', '🥉']
const FONT = "system-ui, -apple-system, 'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', sans-serif"

/** 可以直接貼到 LINE 的文字戰報 */
export function buildShareText(session: Session, ranking: RankRow[], all: Totals, s: Settings): string {
  const lines = [`🍻 ${session.name}（${session.date}）戰報`]
  ranking.forEach((r, i) => {
    const rank = r.grams > 0 ? MEDALS[i] ?? `${i + 1}.` : '–'
    lines.push(`${rank} ${r.member.name}　${fmt(r.grams, 1)} g 純酒精（${fmt(r.std, 1)} 標準杯・${fmtVol(r.ml, s)}）`)
  })
  lines.push(`全場共 ${fmt(all.grams, 1)} g 純酒精・${fmt(all.std, 1)} 標準杯・${fmtVol(all.ml, s)}`)
  lines.push('— 用「喝多少」記錄。喝酒不開車。')
  return lines.join('\n')
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let t = text
  while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1)
  return t + '…'
}

/** 把場次排名畫成一張 1080px 寬的圖（PNG data URL），方便分享給朋友 */
export function drawShareCard(session: Session, ranking: RankRow[], all: Totals, s: Settings): string {
  const W = 1080
  const PAD = 64
  const ROW = 148
  const headH = 300
  const footH = 250
  const H = headH + Math.max(1, ranking.length) * ROW + footH
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#3a2410')
  bg.addColorStop(0.35, '#14110f')
  bg.addColorStop(1, '#14110f')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#f5a524'
  ctx.font = `700 40px ${FONT}`
  ctx.fillText('🍻 喝多少・戰報', PAD, 92)
  ctx.fillStyle = '#f3ece0'
  ctx.font = `800 72px ${FONT}`
  ctx.fillText(fitText(ctx, session.name, W - PAD * 2), PAD, 176)
  ctx.fillStyle = '#a89c8c'
  ctx.font = `500 36px ${FONT}`
  ctx.fillText(`${session.date}・${ranking.length} 人`, PAD, 248)

  const max = Math.max(1, ...ranking.map((r) => r.grams))
  ranking.forEach((r, i) => {
    const y = headH + i * ROW
    ctx.fillStyle = '#1e1915'
    roundRect(ctx, PAD - 20, y, W - PAD * 2 + 40, ROW - 20, 28)
    ctx.fill()
    const cy = y + (ROW - 20) / 2

    ctx.font = `700 52px ${FONT}`
    ctx.fillStyle = '#a89c8c'
    ctx.textAlign = 'center'
    ctx.fillText(r.grams > 0 ? MEDALS[i] ?? String(i + 1) : '–', PAD + 30, cy)

    ctx.fillStyle = r.member.color
    ctx.beginPath()
    ctx.arc(PAD + 124, cy, 44, 0, Math.PI * 2)
    ctx.fill()
    ctx.font = `48px ${FONT}`
    ctx.fillText(r.member.emoji, PAD + 124, cy + 2)

    ctx.textAlign = 'left'
    ctx.fillStyle = '#f3ece0'
    ctx.font = `700 46px ${FONT}`
    ctx.fillText(fitText(ctx, r.member.name, 380), PAD + 190, cy - 26)

    // 長條
    const barX = PAD + 190
    const barW = 420
    ctx.fillStyle = '#2a231e'
    roundRect(ctx, barX, cy + 14, barW, 22, 11)
    ctx.fill()
    ctx.fillStyle = r.member.color
    roundRect(ctx, barX, cy + 14, Math.max(22, (r.grams / max) * barW), 22, 11)
    ctx.fill()

    ctx.textAlign = 'right'
    ctx.fillStyle = '#f3ece0'
    ctx.font = `800 56px ${FONT}`
    ctx.fillText(`${fmt(r.grams, 1)} g`, W - PAD, cy - 22)
    ctx.fillStyle = '#a89c8c'
    ctx.font = `500 30px ${FONT}`
    ctx.fillText(`${fmt(r.std, 1)} 標準杯・${fmtVol(r.ml, s)}`, W - PAD, cy + 30)
    ctx.textAlign = 'left'
  })
  if (!ranking.length) {
    ctx.fillStyle = '#a89c8c'
    ctx.font = `500 40px ${FONT}`
    ctx.fillText('這場還沒有人喝', PAD, headH + 60)
  }

  const fy = headH + Math.max(1, ranking.length) * ROW + 30
  ctx.fillStyle = '#f5a524'
  ctx.font = `800 48px ${FONT}`
  ctx.fillText(`全場 ${fmt(all.grams, 1)} g 純酒精`, PAD, fy + 30)
  ctx.fillStyle = '#f3ece0'
  ctx.font = `500 36px ${FONT}`
  ctx.fillText(`${fmt(all.std, 1)} 標準杯・總共喝了 ${fmtVol(all.ml, s)}`, PAD, fy + 92)
  ctx.fillStyle = '#a89c8c'
  ctx.font = `500 30px ${FONT}`
  ctx.fillText(`純酒精 = 容量 × 酒精度 × ${s.density}・喝酒不開車，開車不喝酒`, PAD, fy + 166)

  return canvas.toDataURL('image/png')
}
