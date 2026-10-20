// Generazione immagine "Team of the Week" (formazione dei migliori della settimana)
// via Canvas, stesso pattern di riepilogoCard.js — nessuna libreria esterna.

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

function getInitials(nome = '') {
  const parts = nome.replace(/\s*\(.*?\)/g, '').trim().split(' ').filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function bucketRuolo(ruolo = '') {
  const primo = (ruolo.split('/')[0] || '').toUpperCase()
  if (primo === 'POR') return 'POR'
  if (primo === 'DC') return 'DC'
  if (primo === 'ATT') return 'ATT'
  return 'CC'
}

// topPlayers: [{ id, nome, ruolo, media, fotoUrl, partiteCount }], gia' ordinati per media desc
export async function generaImmagineTOTW(topPlayers, periodoLabel) {
  const righe = { ATT: [], CC: [], DC: [], POR: [] }
  topPlayers.forEach(p => righe[bucketRuolo(p.ruolo)].push(p))
  const ordineRighe = ['ATT', 'CC', 'DC', 'POR'].filter(k => righe[k].length > 0)

  const fotoCache = {}
  await Promise.all(topPlayers.map(async p => { fotoCache[p.id] = await loadImage(p.fotoUrl) }))

  const W = 900
  const PAD = 44
  const headerH = 150
  const pitchRowH = 160
  const pitchH = ordineRighe.length * pitchRowH + 40
  const footerH = 60
  const H = PAD * 2 + headerH + pitchH + footerH

  const SCALE = 1.6
  const canvas = document.createElement('canvas')
  canvas.width = W * SCALE
  canvas.height = H * SCALE
  const ctx = canvas.getContext('2d')
  ctx.scale(SCALE, SCALE)

  // Sfondo app (non il campo, lo sfondo generale)
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H)
  bgGrad.addColorStop(0, '#0f1729')
  bgGrad.addColorStop(1, '#070b16')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, W, H)

  let y = PAD
  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffd700'
  ctx.font = '900 20px sans-serif'
  ctx.shadowColor = 'rgba(255,215,0,0.5)'
  ctx.shadowBlur = 16
  ctx.fillText('🏆 TEAM OF THE WEEK', W / 2, y + 26)
  ctx.shadowBlur = 0

  ctx.fillStyle = '#fff'
  ctx.font = '900 38px sans-serif'
  ctx.fillText('FUCIABOL', W / 2, y + 70)

  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.font = '600 15px sans-serif'
  ctx.fillText(periodoLabel || 'I migliori della settimana', W / 2, y + 98)

  y += headerH

  // Campo da gioco
  const pitchX = PAD
  const pitchY = y
  const pitchW = W - PAD * 2
  roundRect(ctx, pitchX, pitchY, pitchW, pitchH, 22)
  const pitchGrad = ctx.createLinearGradient(0, pitchY, 0, pitchY + pitchH)
  pitchGrad.addColorStop(0, '#0d3b1f')
  pitchGrad.addColorStop(1, '#0a2e18')
  ctx.fillStyle = pitchGrad
  ctx.fill()
  ctx.save()
  roundRect(ctx, pitchX, pitchY, pitchW, pitchH, 22)
  ctx.clip()
  // righe orizzontali decorative stile erba
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.04)'
    ctx.fillRect(pitchX, pitchY + (pitchH / 8) * i, pitchW, pitchH / 8)
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'
  ctx.lineWidth = 2
  ctx.strokeRect(pitchX + 14, pitchY + 14, pitchW - 28, pitchH - 28)
  ctx.beginPath()
  ctx.arc(pitchX + pitchW / 2, pitchY + pitchH / 2, 48, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()

  // Giocatori per riga
  let rowY = pitchY + 24
  ordineRighe.forEach(ruoloKey => {
    const giocatoriRiga = righe[ruoloKey]
    const n = giocatoriRiga.length
    const slotW = pitchW / (n + 1)
    giocatoriRiga.forEach((p, i) => {
      const cx = pitchX + slotW * (i + 1)
      const avSize = 68
      const avX = cx - avSize / 2
      const avY = rowY

      drawAvatar(ctx, fotoCache[p.id], getInitials(p.nome), avX, avY, avSize, '#00d4ff')

      // Badge media voto
      ctx.beginPath()
      ctx.arc(avX + avSize - 6, avY + avSize - 6, 18, 0, Math.PI * 2)
      ctx.fillStyle = p.media >= 7 ? '#00ff88' : p.media >= 6 ? '#00d4ff' : '#ffd700'
      ctx.fill()
      ctx.strokeStyle = '#0a2e18'
      ctx.lineWidth = 3
      ctx.stroke()
      ctx.fillStyle = '#0f1729'
      ctx.font = '900 14px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(p.media.toFixed(1), avX + avSize - 6, avY + avSize - 5)
      ctx.textBaseline = 'alphabetic'

      // Nome su pillola scura
      let nome = p.nome.replace(/\s*\(.*?\)/g, '').trim().split(' ').pop().toUpperCase()
      ctx.font = '800 12px sans-serif'
      const textW = ctx.measureText(nome).width
      const pillW = Math.min(slotW - 6, textW + 18)
      roundRect(ctx, cx - pillW / 2, avY + avSize + 8, pillW, 20, 10)
      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      ctx.fill()
      ctx.fillStyle = '#fff'
      if (ctx.measureText(nome).width > pillW - 12) {
        while (ctx.measureText(nome + '…').width > pillW - 12 && nome.length > 1) nome = nome.slice(0, -1)
        nome += '…'
      }
      ctx.fillText(nome, cx, avY + avSize + 22)
    })
    rowY += pitchRowH
  })

  y = pitchY + pitchH + 30
  ctx.font = '700 13px sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  ctx.fillText('⚽ FUCIABOL · Calcetto League', W / 2, y)

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Impossibile generare immagine')), 'image/png')
  })
}
