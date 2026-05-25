// Calcola la forza di una squadra considerando overall medio e forma
export function calcolaForzaSquadra(giocatori, squadraIds) {
  if (!squadraIds || squadraIds.length === 0) return 65 // default

  const giocatoriSquadra = giocatori.filter(g => squadraIds.includes(g.id))
  
  // Media overall
  const mediaOverall = giocatoriSquadra.reduce((sum, g) => sum + g.overall, 0) / giocatoriSquadra.length
  
  // Bonus forma medio (punti forma diviso soglia standard)
  const bonusForma = giocatoriSquadra.reduce((sum, g) => {
    const punti = g.forma_punti || 0
    return sum + (punti / 5) // normalizza
  }, 0) / giocatoriSquadra.length

  return mediaOverall + bonusForma
}

// Calcola quote per risultato partita
export function calcolaQuoteRisultato(giocatori, squadraA, squadraB) {
  const forzaA = calcolaForzaSquadra(giocatori, squadraA)
  const forzaB = calcolaForzaSquadra(giocatori, squadraB)
  const forzaTotale = forzaA + forzaB
  
  // Probabilità grezze (85% diviso tra vittorie, 15% base pareggio)
  let probA = (forzaA / forzaTotale) * 0.85
  let probB = (forzaB / forzaTotale) * 0.85
  
  // Probabilità pareggio aumenta se squadre equilibrate
  const differenza = Math.abs(forzaA - forzaB)
  let probPareggio = 0.15 + (Math.max(0, (10 - differenza)) * 0.01) // max +10%
  
  // Normalizza (deve fare 1.00)
  const totale = probA + probB + probPareggio
  probA = probA / totale
  probB = probB / totale
  probPareggio = probPareggio / totale
  
  // Converti in quote con margine bookmaker 5%
  const quotaA = Math.max(1.20, ((1 / probA) * 0.95))
  const quotaPareggio = Math.max(2.00, ((1 / probPareggio) * 0.95))
  const quotaB = Math.max(1.20, ((1 / probB) * 0.95))
  
  return {
    squadra_a: parseFloat(quotaA.toFixed(2)),
    pareggio: parseFloat(quotaPareggio.toFixed(2)),
    squadra_b: parseFloat(quotaB.toFixed(2))
  }
}

// Calcola quote per migliore in campo
export function calcolaQuoteMiglioreInCampo(giocatori, allPlayerIds) {
  const giocatoriPartita = giocatori.filter(g => allPlayerIds.includes(g.id))
  
  // Overall totale
  const overallTotale = giocatoriPartita.reduce((sum, g) => sum + g.overall, 0)
  
  const quote = {}
  
  giocatoriPartita.forEach(g => {
    // Probabilità proporzionale all'overall
    const prob = g.overall / overallTotale
    
    // Quota con margine
    const quota = Math.max(1.50, ((1 / prob) * 0.90))
    
    quote[g.id] = parseFloat(quota.toFixed(2))
  })
  
  return quote
}

// Calcola quote per capocannoniere (tutti uguali)
export function calcolaQuoteCapocannoniere(allPlayerIds) {
  const numGiocatori = allPlayerIds.length
  const quotaBase = numGiocatori * 0.8 // es: 10 giocatori → quota 8.00
  
  const quote = {}
  allPlayerIds.forEach(id => {
    quote[id] = parseFloat(Math.max(2.00, quotaBase).toFixed(2))
  })
  
  return quote
}

// Verifica vincita risultato
export function verificaVincitaRisultato(partita, scelta) {
  if (partita.punteggio_a > partita.punteggio_b) return scelta === 'squadra_a'
  if (partita.punteggio_b > partita.punteggio_a) return scelta === 'squadra_b'
  return scelta === 'pareggio'
}

// Verifica vincita migliore in campo
export function verificaVincitaMiglioreInCampo(partita, giocatoreId) {
  if (!partita.voti_calcolati) return false
  
  const voti = partita.voti_calcolati
  const maxVoto = Math.max(...voti.map(v => v.votoFinale))
  const migliore = voti.find(v => v.votoFinale === maxVoto)
  
  return migliore?.playerId === giocatoreId
}

// Verifica vincita capocannoniere
export function verificaVincitaCapocannoniere(partita, giocatoreId) {
  if (!partita.eventi) return false
  
  const allPlayers = [...partita.squadra_a, ...partita.squadra_b]
  
  let maxGol = 0
  let capocannonieri = []
  
  allPlayers.forEach(id => {
    const gol = partita.eventi[id]?.gol || 0
    if (gol > maxGol) {
      maxGol = gol
      capocannonieri = [id]
    } else if (gol === maxGol && gol > 0) {
      capocannonieri.push(id)
    }
  })
  
  // Se nessuno ha segnato, tutti perdono
  if (maxGol === 0) return false
  
  // Se pareggio tra più giocatori, dividono la vincita
  return capocannonieri.includes(giocatoreId)
}