import { creaFormazione, coordinateCampo, immagineCampo, nomeCampo } from './formazioni.js'

function loadImage(url) {
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    const timer = setTimeout(() => { img.onload = null; img.onerror = null; resolve(null) }, 6000)
    img.onload = () => { clearTimeout(timer); resolve(img) }
    img.onerror = () => { clearTimeout(timer); resolve(null) }
    img.src = url
  })
}

function round(ctx, x, y, w, h, r, color) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill()
}

function fitText(ctx, value, width, size = 26) {
  let text = String(value)
  ctx.font = `800 ${size}px system-ui, sans-serif`
  while (text.length > 1 && ctx.measureText(text).width > width) text = text.slice(0, -2) + '…'
  return text
}

export async function generaLocandina(partita, giocatori, overrides) {
  const formation = creaFormazione(partita, giocatori, overrides)
  const canvas = document.createElement('canvas')
  const width = 1080, height = formation.A.size > 5 ? 2100 : 1800
  canvas.width = width; canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas non disponibile')
  const all = [...formation.A.players, ...formation.B.players]
  const urls = [...new Set(all.map(item => immagineCampo(item.player)))]
  const images = new Map(await Promise.all(urls.map(async url => [url, await loadImage(url)])))
  const fallback = await loadImage('/campioncini/guest-robot.svg')
  ctx.fillStyle = '#091222'; ctx.fillRect(0, 0, width, height)
  ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = '900 88px system-ui, sans-serif'; ctx.fillText('FUCIABOL', 540, 112)
  ctx.fillStyle = '#64e1ff'; ctx.font = '700 23px system-ui, sans-serif'; ctx.fillText('LE FORMAZIONI UFFICIALI', 540, 164)
  const date = partita.data ? new Date(`${String(partita.data).slice(0, 10)}T12:00:00`).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }) : ''
  ctx.fillStyle = '#e2e8f0'; ctx.font = '600 26px system-ui, sans-serif'; ctx.fillText(`${date}${partita.ora ? ` · ${partita.ora.slice(0, 5)}` : ''}`, 540, 216)
  ctx.fillStyle = '#94a3b8'; ctx.fillText(fitText(ctx, partita.luogo || 'Campo da confermare', 940), 540, 256)
  const px = 55, py = 340, pw = 970, ph = height - 490
  round(ctx, px - 8, py - 8, pw + 16, ph + 16, 26, '#ffffff18')
  ctx.save(); ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 20); ctx.clip()
  for (let i = 0; i < 10; i++) { ctx.fillStyle = i % 2 ? '#19523f' : '#164a3b'; ctx.fillRect(px, py + ph * i / 10, pw, ph / 10 + 1) }
  ctx.strokeStyle = '#d8fff370'; ctx.lineWidth = 3
  ctx.strokeRect(px + 15, py + 15, pw - 30, ph - 30)
  ctx.beginPath(); ctx.moveTo(px + 15, py + ph / 2); ctx.lineTo(px + pw - 15, py + ph / 2); ctx.stroke()
  ctx.beginPath(); ctx.arc(540, py + ph / 2, 105, 0, 2 * Math.PI); ctx.stroke()
  for (const bottom of [false, true]) {
    const y = bottom ? py + ph - 170 : py + 15
    ctx.strokeRect(330, y, 420, 155)
    ctx.strokeRect(435, bottom ? py + ph - 74 : py + 15, 210, 59)
  }
  for (const team of ['B', 'A']) {
    const color = team === 'A' ? '#64e1ff' : '#ff9a76'
    for (const item of formation[team].players) {
      const pos = coordinateCampo(item, team)
      const x = px + pos.x * pw, y = py + pos.y * ph
      const image = images.get(immagineCampo(item.player)) || fallback
      const avatarH = formation.A.size > 5 ? 86 : 105
      const avatarW = 160
      if (image) {
        const scale = Math.min(avatarW / image.width, avatarH / image.height)
        ctx.drawImage(image, x - image.width * scale / 2, y - 70, image.width * scale, image.height * scale)
      }
      round(ctx, x - 108, y + avatarH - 70, 216, 37, 10, '#071322ee')
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x - 108, y + avatarH - 70, 216, 37, 10); ctx.stroke()
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(fitText(ctx, nomeCampo(item.player), 200, 24), x, y + avatarH - 43)
      round(ctx, x + 62, y - 64, 44, 24, 6, '#071322ee')
      ctx.fillStyle = color; ctx.font = '800 16px system-ui, sans-serif'; ctx.fillText(item.role, x + 84, y - 47)
    }
  }
  ctx.restore()
  ctx.font = '800 25px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#ff9a76'; ctx.fillText(`SQUADRA B · ${formation.B.count}/${formation.B.size}`, 65, 310)
  ctx.textAlign = 'right'; ctx.fillStyle = '#64e1ff'; ctx.fillText(`SQUADRA A · ${formation.A.count}/${formation.A.size}`, 1015, 310)
  ctx.textAlign = 'center'; ctx.fillStyle = '#cbd5e1'; ctx.font = '500 22px system-ui, sans-serif'
  const status = ['A', 'B'].map(team => `Squadra ${team}${formation[team].vacancies ? `: ${formation[team].vacancies} posti liberi` : ': completa'}${!formation[team].hasKeeper && formation[team].count ? ' · portiere a turno' : ''}`)
  ctx.fillText(status[0], 540, height - 91); ctx.fillText(status[1], 540, height - 56)
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Esportazione non riuscita')), 'image/png'))
}
