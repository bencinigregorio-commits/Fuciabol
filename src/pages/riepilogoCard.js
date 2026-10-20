// Generazione immagine riepilogo partita (stile pagelle Fantacalcio.it) via Canvas.
// Nessuna libreria esterna: disegna su un canvas offscreen e restituisce un Blob PNG.

function loadImage(url) {
  return new Promise((resolve) => {
    if (!url) { resolve(null); return }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function drawAvatar(ctx, img, initials, x, y, size, bg) {
  ctx.save()
  ctx.beginPath()
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()
  if (img) {
    const scale = Math.max(size / img.width, size / img.height)
    const w = img.width * scale
    const h = img.height * scale
    ctx.drawImage(img, x + size / 2 - w / 2, y + size / 2 - h / 2, w, h)
  } else {
    ctx.fillStyle = bg
    ctx.fillRect(x, y, size, size)
    ctx.fillStyle = '#0f1729'
    ctx.font = `900 ${Math.round(size * 0.38)}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(initials, x + size / 2, y + size / 2 + 1)
  }
  ctx.restore()
}

function votoColor(v) {
  if (v >= 7) return '#00ff88'
  if (v >= 6) return '#00d4ff'
  return '#ef4444'
}

function getInitials(nome = '') {
  const parts = nome.replace(/\s*\(.*?\)/g, '').trim().split(' ').filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export async function generaImmagineRiepilogo(partita, giocatori) {
  const getG = (id) => giocatori.find(g => String(g.id) === String(id))
  const getNome = (id) => (getG(id)?.nome || `#${id}`).replace(/\s*\(.*?\)/g, '').trim()

  const squadraA = partita.squadra_a || []
  const squadraB = partita.squadra_b || []
  const allPlayers = [...squadraA, ...squadraB]
  const punteggioA = partita.punteggio_a ?? 0
  const punteggioB = partita.punteggio_b ?? 0
  const vittoriaA = punteggioA > punteggioB
  const vittoriaB = punteggioB > punteggioA

  const votiOrdinati = [...(partita.voti_calcolati || [])]
    .filter(v => allPlayers.some(id => String(id) === String(v.playerId)))
    .sort((a, b) => b.votoFinale - a.votoFinale)
    .slice(0, 18)
  const mvp = votiOrdinati[0] || null

  const marcatori = allPlayers
    .map(id => ({ id, gol: partita.eventi?.[id]?.gol || 0 }))
    .filter(p => p.gol > 0)
    .sort((a, b) => b.gol - a.gol)
  const assistman = allPlayers
    .map(id => ({ id, assist: partita.eventi?.[id]?.assist || 0 }))
    .filter(p => p.assist > 0)
    .sort((a, b) => b.assist - a.assist)

  const dataStr = new Date(partita.data).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })

  // Precarica immagini (con fallback automatico a iniziali se CORS/errore)
  const fotoCache = {}
  await Promise.all(allPlayers.map(async id => {
    fotoCache[id] = await loadImage(getG(id)?.foto_url)
  }))

  // --- Layout ---
  const W = 1000
  const PAD = 48
  const CARD_W = (W - PAD * 2 - 20 * 2) / 3
  const CARD_H = 158
  const rows = Math.ceil(votiOrdinati.length / 3)
  const golAssistLine = marcatori.length > 0 || assistman.length > 0

  const headerH = 150
  const scoreH = 130
  const mvpH = mvp ? 150 : 0
  const golAssistH = golAssistLine ? 56 : 0
  const pagelleTitleH = votiOrdinati.length > 0 ? 46 : 0
  const pagelleGridH = rows * CARD_H + Math.max(0, rows - 1) * 18
  const footerH = 70
  const gaps = 28

  const H = PAD * 2 + headerH + scoreH + mvpH + golAssistH + pagelleTitleH + pagelleGridH + footerH + gaps * 5

  const SCALE = 1.6
  const canvas = document.createElement('canvas')
  canvas.width = W * SCALE
  canvas.height = H * SCALE
  const ctx = canvas.getContext('2d')
  ctx.scale(SCALE, SCALE)

  // Sfondo
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H)
  bgGrad.addColorStop(0, '#0f1729')
  bgGrad.addColorStop(1, '#070b16')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, W, H)

  const glow = ctx.createRadialGradient(W * 0.2, 60, 10, W * 0.2, 60, 320)
  glow.addColorStop(0, 'rgba(0,212,255,0.12)')
  glow.addColorStop(1, 'rgba(0,212,255,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  let y = PAD

  // Header
  ctx.textAlign = 'center'
  ctx.fillStyle = '#00d4ff'
  ctx.font = '900 46px sans-serif'
  ctx.shadowColor = 'rgba(0,212,255,0.5)'
  ctx.shadowBlur = 18
  ctx.fillText('FUCIABOL', W / 2, y + 48)
  ctx.shadowBlur = 0

  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.font = '700 15px sans-serif'
  ctx.fillText('R I E P I L O G O   P A R T I T A', W / 2, y + 78)

  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.font = '600 16px sans-serif'
  ctx.fillText(dataStr + (partita.luogo ? ` · ${partita.luogo}` : ''), W / 2, y + 108)

  y += headerH + gaps

  // Score
  roundRect(ctx, PAD, y, W - PAD * 2, scoreH, 24)
  const panelGrad = ctx.createLinearGradient(0, y, 0, y + scoreH)
  panelGrad.addColorStop(0, 'rgba(255,255,255,0.05)')
  panelGrad.addColorStop(1, 'rgba(255,255,255,0.015)')
  ctx.fillStyle = panelGrad
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = 1
  ctx.stroke()

  const midY = y + scoreH / 2
  ctx.font = '800 15px sans-serif'
  ctx.fillStyle = vittoriaA ? '#ffd700' : 'rgba(255,255,255,0.6)'
  ctx.fillText((vittoriaA ? '👑 ' : '') + 'SQUADRA A', W * 0.22, midY - 10)
  ctx.font = '600 13px sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.fillText(`${squadraA.length} giocatori`, W * 0.22, midY + 14)

  ctx.font = '800 15px sans-serif'
  ctx.fillStyle = vittoriaB ? '#ffd700' : 'rgba(255,255,255,0.6)'
  ctx.fillText('SQUADRA B' + (vittoriaB ? ' 👑' : ''), W * 0.78, midY - 10)
  ctx.font = '600 13px sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.fillText(`${squadraB.length} giocatori`, W * 0.78, midY + 14)

  ctx.font = '900 56px sans-serif'
  ctx.fillStyle = '#fff'
  ctx.fillText(`${punteggioA} - ${punteggioB}`, W / 2, midY + 18)

  y += scoreH + gaps

  // MVP
  if (mvp) {
    roundRect(ctx, PAD, y, W - PAD * 2, mvpH, 20)
    const mvpGrad = ctx.createLinearGradient(PAD, y, W - PAD, y)
    mvpGrad.addColorStop(0, 'rgba(255,215,0,0.14)')
    mvpGrad.addColorStop(1, 'rgba(255,215,0,0.03)')
    ctx.fillStyle = mvpGrad
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,215,0,0.35)'
    ctx.stroke()

    const avSize = 96
    const avX = PAD + 28
    const avY = y + (mvpH - avSize) / 2
    drawAvatar(ctx, fotoCache[mvp.playerId], getInitials(getNome(mvp.playerId)), avX, avY, avSize, '#ffd700')

    ctx.textAlign = 'left'
    ctx.font = '800 13px sans-serif'
    ctx.fillStyle = '#ffd700'
    ctx.fillText('⭐ MIGLIORE IN CAMPO', avX + avSize + 28, y + 46)
    ctx.font = '900 28px sans-serif'
    ctx.fillStyle = '#fff'
    ctx.fillText(getNome(mvp.playerId), avX + avSize + 28, y + 84)

    ctx.textAlign = 'right'
    ctx.font = '900 46px sans-serif'
    ctx.fillStyle = votoColor(mvp.votoFinale)
    ctx.fillText(mvp.votoFinale.toFixed(1), W - PAD - 28, y + mvpH / 2 + 16)
    ctx.textAlign = 'center'

    y += mvpH + gaps
  }

  // Gol/assist
  if (golAssistLine) {
    ctx.textAlign = 'left'
    let gy = y + 18
    if (marcatori.length > 0) {
      ctx.font = '800 14px sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      ctx.fillText('⚽ GOL', PAD, gy)
      ctx.font = '600 15px sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      const txt = marcatori.map(m => `${getNome(m.id)}${m.gol > 1 ? ` (${m.gol})` : ''}`).join(' · ')
      ctx.fillText(txt, PAD + 68, gy)
      gy += 26
    }
    if (assistman.length > 0) {
      ctx.font = '800 14px sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      ctx.fillText('🎯 ASSIST', PAD, gy)
      ctx.font = '600 15px sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      const txt = assistman.map(m => `${getNome(m.id)}${m.assist > 1 ? ` (${m.assist})` : ''}`).join(' · ')
      ctx.fillText(txt, PAD + 68, gy)
    }
    ctx.textAlign = 'center'
    y += golAssistH + gaps
  }

  // Pagelle
  if (votiOrdinati.length > 0) {
    ctx.textAlign = 'left'
    ctx.font = '800 14px sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.fillText('PAGELLE', PAD, y + 16)
    ctx.textAlign = 'center'
    y += pagelleTitleH

    votiOrdinati.forEach((v, i) => {
      const col = i % 3
      const row = Math.floor(i / 3)
      const cx = PAD + col * (CARD_W + 20)
      const cy = y + row * (CARD_H + 18)

      roundRect(ctx, cx, cy, CARD_W, CARD_H, 16)
      ctx.fillStyle = 'rgba(255,255,255,0.035)'
      ctx.fill()
      ctx.strokeStyle = i === 0 ? 'rgba(255,215,0,0.3)' : 'rgba(255,255,255,0.06)'
      ctx.stroke()

      const avSize = 64
      const avX = cx + CARD_W / 2 - avSize / 2
      const avY = cy + 16
      drawAvatar(ctx, fotoCache[v.playerId], getInitials(getNome(v.playerId)), avX, avY, avSize, '#00d4ff')

      // Badge voto
      const badgeR = 20
      const bx = avX + avSize - 6
      const by = avY + avSize - 6
      ctx.beginPath()
      ctx.arc(bx, by, badgeR, 0, Math.PI * 2)
      ctx.fillStyle = votoColor(v.votoFinale)
      ctx.fill()
      ctx.strokeStyle = '#0f1729'
      ctx.lineWidth = 3
      ctx.stroke()
      ctx.fillStyle = '#0f1729'
      ctx.font = '900 16px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(v.votoFinale.toFixed(1), bx, by + 1)
      ctx.textBaseline = 'alphabetic'

      ctx.font = '700 14px sans-serif'
      ctx.fillStyle = '#fff'
      let nome = getNome(v.playerId)
      if (ctx.measureText(nome).width > CARD_W - 16) {
        while (ctx.measureText(nome + '…').width > CARD_W - 16 && nome.length > 1) nome = nome.slice(0, -1)
        nome += '…'
      }
      ctx.fillText(nome, cx + CARD_W / 2, cy + avSize + 42)
    })

    y += pagelleGridH + gaps
  }

  // Footer
  ctx.font = '700 13px sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  ctx.fillText('⚽ FUCIABOL · Calcetto League', W / 2, y + 30)

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Impossibile generare immagine')), 'image/png')
  })
}
