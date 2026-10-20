// Calcolo condiviso della classifica — usato da Classifica.jsx e Dashboard.jsx
// (sezione "rivale più vicino"), così i numeri non divergono mai tra le pagine.

export function calcolaClassifica(giocatori, partite) {
  const giocatoriConStats = giocatori.map(g => {
    let punti = 0, pg = 0, v = 0, p = 0, s = 0, gf = 0, gs = 0

    partite.forEach(partita => {
      const inA = partita.squadra_a?.includes(g.id)
      const inB = partita.squadra_b?.includes(g.id)
      if (!inA && !inB) return

      pg++
      gf += partita.eventi?.[g.id]?.gol || 0

      const isVittoriaA = partita.punteggio_a > partita.punteggio_b
      const isVittoriaB = partita.punteggio_b > partita.punteggio_a
      const isPareggio = partita.punteggio_a === partita.punteggio_b

      if (inA) {
        gs += partita.punteggio_b || 0
        if (isVittoriaA) { punti += 3; v++ }
        else if (isPareggio) { punti += 1; p++ }
        else { s++ }
      } else {
        gs += partita.punteggio_a || 0
        if (isVittoriaB) { punti += 3; v++ }
        else if (isPareggio) { punti += 1; p++ }
        else { s++ }
      }
    })

    const winRate = pg > 0 ? (v / pg) * 100 : 0
    const mediaGol = pg > 0 ? gf / pg : 0

    return { ...g, punti, pg, v, p, s, gf, gs, dr: gf - gs, winRate, mediaGol }
  })

  return giocatoriConStats.sort((a, b) => {
    if (b.punti !== a.punti) return b.punti - a.punti
    if (b.dr !== a.dr) return b.dr - a.dr
    return b.gf - a.gf
  })
}
