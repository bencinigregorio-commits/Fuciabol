export function calcolaVotoFinale(partita, playerId, allVotazioni) {
  const votiAltriGiocatori = allVotazioni
    .filter(v => v.voterId !== playerId && v.voterId !== 'admin')
    .map(v => v.voti[playerId])
    .filter(v => v !== undefined)
  
  const autovoto = allVotazioni.find(v => v.voterId === playerId)?.voti[playerId] || 6
  const votoAdmin = allVotazioni.find(v => v.voterId === 'admin')?.voti[playerId] || 6
  
  const mediaAltri = votiAltriGiocatori.length > 0 
    ? votiAltriGiocatori.reduce((s, v) => s + v, 0) / votiAltriGiocatori.length 
    : 6
  
  let autovotoCorretto = autovoto
  if (autovoto > mediaAltri + 0.5) autovotoCorretto = mediaAltri + 0.5
  if (autovoto < mediaAltri - 0.5) autovotoCorretto = mediaAltri - 0.5
  
  const votoBase = mediaAltri * 0.7 + votoAdmin * 0.2 + autovotoCorretto * 0.1
  
  const eventi = partita.eventi?.[playerId] || {}
  let bonusStatistici = 0
  bonusStatistici += (eventi.gol || 0) * 0.20
  bonusStatistici += (eventi.assist || 0) * 0.15
  bonusStatistici = Math.max(-0.8, Math.min(0.8, bonusStatistici))
  
  const inSquadraA = partita.squadra_a.includes(playerId)
  const vintoA = partita.punteggio_a > partita.punteggio_b
  const vintoB = partita.punteggio_b > partita.punteggio_a
  const haVinto = (inSquadraA && vintoA) || (!inSquadraA && vintoB)
  const haPerso = (inSquadraA && vintoB) || (!inSquadraA && vintoA)
  
  let bonusRisultato = 0
  if (haVinto) bonusRisultato = 0.20
  if (haPerso) bonusRisultato = -0.20
  
  const votoFinale = votoBase + bonusStatistici + bonusRisultato
  
  return {
    votoFinale: Math.max(1, Math.min(10, votoFinale)),
    votoBase,
    mediaAltri,
    autovotoCorretto,
    votoAdmin,
    bonusStatistici,
    bonusRisultato
  }
}

export function votoToPuntiForma(voto) {
  if (voto >= 9.0) return 8
  if (voto >= 8.5) return 6
  if (voto >= 8.0) return 5
  if (voto >= 7.5) return 4
  if (voto >= 7.0) return 3
  if (voto >= 6.5) return 2
  if (voto >= 6.0) return 1
  if (voto >= 5.5) return -1
  return -2
}

export function aggiornaOverall(currentOverall, puntiFormaAccumulati) {
  let soglia
  if (currentOverall >= 95) soglia = 15
  else if (currentOverall >= 90) soglia = 10
  else if (currentOverall >= 85) soglia = 7
  else if (currentOverall >= 75) soglia = 5
  else if (currentOverall >= 65) soglia = 3
  else soglia = 2
  
  const cambio = Math.floor(puntiFormaAccumulati / soglia)
  const residuo = puntiFormaAccumulati % soglia
  const newOverall = Math.max(55, Math.min(99, currentOverall + cambio))
  
  return { newOverall, residuo }
}