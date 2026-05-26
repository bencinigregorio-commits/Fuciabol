import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { calcolaVotoFinale, votoToPuntiForma, aggiornaOverall } from './calcoli'
import { calcolaQuoteRisultato, calcolaQuoteMiglioreInCampo, calcolaQuoteCapocannoniere, verificaVincitaRisultato, verificaVincitaMiglioreInCampo, verificaVincitaCapocannoniere } from './scommesseCalcoli'

function Calendario({ currentUser }) {
  const [partite, setPartite] = useState([])
  const [giocatoriAll, setGiocatoriAll] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [showVoting, setShowVoting] = useState(null)
  const [showScommessa, setShowScommessa] = useState(null)
  const [showRisultato, setShowRisultato] = useState(null)

  useEffect(() => { caricaPartite(); caricaGiocatori() }, [])

  async function caricaGiocatori() {
    const { data } = await supabase.from('giocatori').select('*')
    if (data) setGiocatoriAll(data)
  }

  async function caricaPartite() {
    const { data } = await supabase
      .from('partite')
      .select('*')
      .order('data', { ascending: false })
    if (data) setPartite(data)
  }

  async function chiudiVotazioni(partita) {
    if (!partita.votazioni || partita.votazioni.length === 0) {
      alert('Nessun voto da calcolare')
      return
    }

    const allPlayers = [...partita.squadra_a, ...partita.squadra_b]
    const votiCalcolati = []

    for (const playerId of allPlayers) {
      const calcolo = calcolaVotoFinale(partita, playerId, partita.votazioni)
      const puntiForma = votoToPuntiForma(calcolo.votoFinale)
      votiCalcolati.push({ playerId, ...calcolo, puntiForma })
    }

    const { error: errPartita } = await supabase
      .from('partite')
      .update({ votazioni_aperte: false, voti_calcolati: votiCalcolati, stato: 'chiusa' })
      .eq('id', partita.id)

    if (errPartita) { alert('Errore: ' + errPartita.message); return }

    const { data: giocatori } = await supabase
      .from('giocatori')
      .select('*')
      .in('id', allPlayers)

    for (const giocatore of giocatori) {
      const votoCalc = votiCalcolati.find(v => v.playerId === giocatore.id)
      if (!votoCalc) continue
      const nuoviPuntiForma = giocatore.forma_punti + votoCalc.puntiForma
      const { newOverall, residuo } = aggiornaOverall(giocatore.overall, nuoviPuntiForma)
      const votiStorico = giocatore.voti_storico || []
      votiStorico.push({ matchId: partita.id, votoFinale: votoCalc.votoFinale, data: partita.data })
      await supabase.from('giocatori').update({ overall: newOverall, forma_punti: residuo, voti_storico: votiStorico }).eq('id', giocatore.id)
    }

    await distribuisciVincite(partita, votiCalcolati)
    alert('✓ Votazioni chiuse! Overall e vincite aggiornati.')
    caricaPartite()
  }

  async function distribuisciVincite(partita, votiCalcolati) {
    const { data: scommesse } = await supabase
      .from('scommesse')
      .select('*')
      .eq('partita_id', partita.id)
      .eq('esito', 'pending')

    if (!scommesse || scommesse.length === 0) return

    const maxVoto = Math.max(...votiCalcolati.map(v => v.votoFinale))
    const miglioreInCampo = votiCalcolati.find(v => v.votoFinale === maxVoto)

    const allPlayers = [...partita.squadra_a, ...partita.squadra_b]
    let maxGol = 0
    let capocannonieri = []
    allPlayers.forEach(id => {
      const gol = partita.eventi?.[id]?.gol || 0
      if (gol > maxGol) { maxGol = gol; capocannonieri = [id] }
      else if (gol === maxGol && gol > 0) capocannonieri.push(id)
    })

    for (const s of scommesse) {
      let haVinto = false
      if (s.tipo === 'risultato') haVinto = verificaVincitaRisultato(partita, s.scelta)
      else if (s.tipo === 'migliore_in_campo') haVinto = miglioreInCampo?.playerId === parseInt(s.scelta)
      else if (s.tipo === 'capocannoniere') haVinto = maxGol > 0 && capocannonieri.includes(parseInt(s.scelta))

      const vincita = haVinto ? Math.floor(s.importo * s.quota) : 0
      await supabase.from('scommesse').update({ esito: haVinto ? 'vinta' : 'persa', vincita }).eq('id', s.id)

      if (haVinto) {
        const { data: g } = await supabase.from('giocatori').select('crediti').eq('id', s.giocatore_id).single()
        if (g) await supabase.from('giocatori').update({ crediti: (g.crediti || 500) + vincita }).eq('id', s.giocatore_id)
      }
    }
  }

  const isAdmin = currentUser?.role === 'admin'

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '3rem' }}>📅</div>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.25rem' }}>Calendario</h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.95rem' }}>Partite giocate e in programma.</p>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            style={{ background: 'linear-gradient(135deg, #00d4ff, #0099ff)', border: 'none', borderRadius: '12px', padding: '0.8rem 1.5rem', color: '#0f1729', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 15px rgba(0, 212, 255, 0.4)', transition: 'all 0.3s' }}
            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
          >
            + Nuova Partita
          </button>
        )}
      </div>

      {/* GAZZETTA FUCIABOL */}
      {partite.filter(p => p.stato === 'chiusa').length > 0 && (
        <GazzettaFuciabol
          partite={partite.filter(p => p.stato === 'chiusa').slice(0, 3)}
          giocatori={giocatoriAll}
          currentUser={currentUser}
        />
      )}

      {partite.length === 0 ? (
        <div style={{ background: 'rgba(15, 23, 41, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '20px', padding: '3rem', textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)' }}>
          Nessuna partita registrata
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {partite.map(partita => (
            <PartitaCard
              key={partita.id}
              partita={partita}
              currentUser={currentUser}
              onVoteClick={() => setShowVoting(partita)}
              onChiudiVoti={() => chiudiVotazioni(partita)}
              onScommessaClick={() => setShowScommessa(partita)}
              onRisultatoClick={() => setShowRisultato(partita)}
            />
          ))}
        </div>
      )}

      {showModal && (
        <ModalNuovaPartita
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); caricaPartite() }}
        />
      )}

      {showRisultato && (
        <ModalInserisciRisultato
          partita={showRisultato}
          onClose={() => setShowRisultato(null)}
          onSaved={() => { setShowRisultato(null); caricaPartite() }}
        />
      )}

      {showVoting && (
        <ModalVotazioni
          partita={showVoting}
          currentUser={currentUser}
          onClose={() => setShowVoting(null)}
          onSaved={() => { setShowVoting(null); caricaPartite() }}
        />
      )}

      {showScommessa && (
        <ModalScommessa
          partita={showScommessa}
          currentUser={currentUser}
          onClose={() => setShowScommessa(null)}
          onSaved={() => { setShowScommessa(null); caricaPartite() }}
        />
      )}
    </div>
  )
}


function GazzettaFuciabol({ partite, giocatori, currentUser }) {
  const [articolo, setArticolo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [topGiocatori, setTopGiocatori] = useState([])
  const [generato, setGenerato] = useState(false)

  useEffect(() => {
    if (partite.length > 0 && giocatori.length > 0) calcolaTopGiocatori()
  }, [partite, giocatori])

  function calcolaTopGiocatori() {
    const scores = {}
    partite.forEach(p => {
      if (!p.voti_calcolati) return
      p.voti_calcolati.forEach(v => {
        if (!scores[v.playerId]) scores[v.playerId] = { voti: [], gol: 0, assist: 0 }
        scores[v.playerId].voti.push(v.votoFinale)
        scores[v.playerId].gol += p.eventi?.[v.playerId]?.gol || 0
        scores[v.playerId].assist += p.eventi?.[v.playerId]?.assist || 0
      })
    })
    const ranked = Object.entries(scores)
      .map(([id, s]) => ({
        id: parseInt(id),
        media: s.voti.reduce((a, b) => a + b, 0) / s.voti.length,
        gol: s.gol,
        assist: s.assist,
        giocatore: giocatori.find(g => g.id === parseInt(id))
      }))
      .filter(x => x.giocatore)
      .sort((a, b) => b.media - a.media)
      .slice(0, 3)
    setTopGiocatori(ranked)
  }

  async function generaArticolo() {
    if (loading || partite.length === 0) return
    setLoading(true)
    setGenerato(true)
    const getNome = (id) => giocatori.find(g => g.id === id)?.nome || id
    const datiPartite = partite.map(p => {
      const squadraA = p.squadra_a.map(getNome).join(', ')
      const squadraB = p.squadra_b.map(getNome).join(', ')
      const allIds = [...p.squadra_a, ...p.squadra_b]
      const eventi = allIds.map(id => {
        const e = p.eventi?.[id] || {}
        const v = p.voti_calcolati?.find(x => x.playerId === id)
        if (e.gol > 0 || e.assist > 0 || v)
          return getNome(id) + (e.gol > 0 ? ' ' + e.gol + ' gol' : '') + (e.assist > 0 ? ' ' + e.assist + ' assist' : '') + (v ? ' voto ' + v.votoFinale.toFixed(1) : '')
        return null
      }).filter(Boolean).join('; ')
      return 'Partita ' + new Date(p.data).toLocaleDateString('it-IT') + ': Squadra A (' + squadraA + ') ' + p.punteggio_a + '-' + p.punteggio_b + ' Squadra B (' + squadraB + '). ' + (eventi ? 'Stats: ' + eventi : '')
    }).join('\n')
    const topNomi = topGiocatori.map(t => t.giocatore.nome + ' (media ' + t.media.toFixed(1) + ', ' + t.gol + ' gol)').join(', ')
    const prompt = 'Sei un commentatore sportivo ULTRA-ESAGERATO stile Mediaset Sport anni 90. Scrivi un articolo BREVISSIMO (max 5 righe) sulla Gazzetta Fuciabol, campionato di calcetto tra amici. Migliori: ' + topNomi + '. Risultati:\n' + datiPartite + '\nScrivi in italiano con toni esageratissimi, esclamazioni, MAIUSCOLO per enfasi. Inizia con titolone drammatico tra *** ***. Max 5 righe.'
    try {
      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 400, messages: [{ role: 'user', content: prompt }] })
      })
      const data = await response.json()
      if (data.error) {
        setArticolo('Errore: ' + data.error.message)
      } else {
        setArticolo(data.content?.[0]?.text || 'Errore nella generazione')
      }
    } catch (e) {
      setArticolo('Errore di connessione. Riprova!')
    }
    setLoading(false)
  }

  if (topGiocatori.length === 0) return null

  const medals = ['🥇', '🥈', '🥉']
  const cardCfgs = [
    { bg: 'linear-gradient(160deg, #b8800a 0%, #e8c040 20%, #f8e060 40%, #e0a820 55%, #f0c838 70%, #b8800a 100%)', border: 'rgba(255,235,80,0.9)', text: '#2a1800', glow: 'glowTop 2s ease-in-out infinite' },
    { bg: 'linear-gradient(160deg, #787878 0%, #c8c8c8 20%, #ebebeb 40%, #a0a0a0 55%, #d0d0d0 70%, #787878 100%)', border: 'rgba(220,220,220,0.8)', text: '#1a1a1a', glow: 'glowBlue 2.5s ease-in-out infinite' },
    { bg: 'linear-gradient(160deg, #6a3810 0%, #b86828 20%, #d88840 40%, #885018 55%, #c07030 70%, #6a3810 100%)', border: 'rgba(210,140,60,0.8)', text: '#200e00', glow: 'glowBlue 3s ease-in-out infinite' },
  ]

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <style>{`
        @keyframes sparkle {
          0%, 100% { opacity: 1; transform: scale(1) rotate(0deg); }
          25% { opacity: 0.8; transform: scale(1.2) rotate(5deg); }
          50% { opacity: 1; transform: scale(0.9) rotate(-3deg); }
          75% { opacity: 0.9; transform: scale(1.1) rotate(2deg); }
        }
        @keyframes glowTop {
          0%, 100% { box-shadow: 0 0 20px rgba(255,215,0,0.5), 0 0 40px rgba(255,215,0,0.2), 0 15px 35px rgba(0,0,0,0.6); }
          50% { box-shadow: 0 0 40px rgba(255,215,0,0.8), 0 0 80px rgba(255,215,0,0.4), 0 15px 40px rgba(0,0,0,0.7); }
        }
        @keyframes glowBlue {
          0%, 100% { box-shadow: 0 0 15px rgba(0,212,255,0.4), 0 12px 30px rgba(0,0,0,0.5); }
          50% { box-shadow: 0 0 30px rgba(0,212,255,0.6), 0 12px 35px rgba(0,0,0,0.6); }
        }
        @keyframes shimmerGaz {
          0% { transform: translateX(-100%) rotate(20deg); }
          100% { transform: translateX(300%) rotate(20deg); }
        }
        @keyframes fadeInGaz { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div style={{ background: 'linear-gradient(135deg, rgba(10,16,30,0.98), rgba(15,23,41,0.98))', border: '1px solid rgba(255,215,0,0.3)', borderRadius: '20px 20px 0 0', padding: '1.25rem 1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', borderBottom: '2px solid rgba(255,215,0,0.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '2rem', animation: 'sparkle 2s ease-in-out infinite' }}>📰</div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ffd700', letterSpacing: '2px', textTransform: 'uppercase', lineHeight: 1 }}>GAZZETTA FUCIABOL</div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '1px', marginTop: '2px' }}>IL GIORNALE DEI CAMPIONI DEL CALCETTO</div>
          </div>
        </div>
        {currentUser?.role === 'admin' && (
          <button onClick={generaArticolo} disabled={loading} style={{ background: loading ? 'rgba(255,215,0,0.1)' : 'linear-gradient(135deg, #ffd700, #ffa500)', border: loading ? '1px solid rgba(255,215,0,0.3)' : 'none', borderRadius: '10px', padding: '0.6rem 1.25rem', color: loading ? '#ffd700' : '#0f1729', fontWeight: 800, cursor: loading ? 'default' : 'pointer', fontSize: '0.85rem', transition: 'all 0.2s' }}>
            {loading ? '⏳ Scrivendo...' : generato ? '🔄 Rigenera' : '✍️ Genera articolo'}
          </button>
        )}
      </div>

      <div style={{ background: 'linear-gradient(135deg, rgba(10,16,30,0.95), rgba(8,12,25,0.98))', border: '1px solid rgba(255,215,0,0.2)', borderTop: 'none', borderRadius: '0 0 20px 20px', padding: '1.75rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'rgba(255,215,0,0.6)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '1rem' }}>⚡ MIGLIORI DELLA SETTIMANA</div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '0.5rem' }}>
            {topGiocatori.map((top, i) => {
              const cfg = cardCfgs[i]
              const isFirst = i === 0
              const nomiPuliti = top.giocatore.nome.replace(/\s*\(.*?\)/g, '').trim().split(' ')
              const cognome = nomiPuliti.length > 1 ? nomiPuliti[nomiPuliti.length - 1].toUpperCase() : top.giocatore.nome.replace(/\s*\(.*?\)/g, '').trim().toUpperCase()
              return (
                <div key={top.id} style={{ flex: isFirst ? '1.2' : '1', minWidth: '120px', maxWidth: isFirst ? '200px' : '170px', height: isFirst ? '200px' : '175px', borderRadius: '12px', background: cfg.bg, border: '2px solid ' + cfg.border, position: 'relative', overflow: 'hidden', animation: cfg.glow, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ position: 'absolute', top: '-50%', left: '-20%', width: '35%', height: '200%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)', animation: 'shimmerGaz 2.5s ease-in-out infinite', pointerEvents: 'none', zIndex: 2 }} />
                  <div style={{ position: 'absolute', top: '3px', left: '3px', right: '3px', bottom: '3px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', pointerEvents: 'none', zIndex: 3 }} />
                  <div style={{ position: 'absolute', top: '6px', right: '8px', zIndex: 4, fontSize: isFirst ? '1.4rem' : '1.1rem', animation: 'sparkle 1.5s ease-in-out infinite' }}>{medals[i]}</div>
                  <div style={{ position: 'absolute', top: '8px', left: '10px', zIndex: 4 }}>
                    <div style={{ fontSize: isFirst ? '1.6rem' : '1.3rem', fontWeight: 900, color: cfg.text, lineHeight: 1 }}>{top.giocatore.overall}</div>
                    <div style={{ fontSize: '0.5rem', fontWeight: 800, color: cfg.text + '99', letterSpacing: '0.5px' }}>{top.giocatore.ruolo}</div>
                  </div>
                  <div style={{ position: 'absolute', top: '6px', left: '50%', transform: 'translateX(-50%)', width: isFirst ? '80px' : '65px', height: isFirst ? '95px' : '80px', zIndex: 3, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden' }}>
                    {top.giocatore.foto_url ? <img src={top.giocatore.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }} /> : <div style={{ fontSize: isFirst ? '3.5rem' : '2.8rem', opacity: 0.5 }}>👤</div>}
                  </div>
                  <div style={{ position: 'absolute', bottom: isFirst ? '55px' : '48px', left: 0, right: 0, textAlign: 'center', zIndex: 4, padding: '0 6px' }}>
                    <div style={{ fontSize: isFirst ? '0.7rem' : '0.6rem', fontWeight: 900, color: cfg.text, letterSpacing: '1px', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cognome}</div>
                  </div>
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.45)', borderTop: '1px solid rgba(255,255,255,0.15)', padding: isFirst ? '6px 8px' : '4px 6px', zIndex: 4 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px' }}>
                      {[{ val: top.media.toFixed(1), label: 'MEDIA' }, { val: top.gol, label: 'GOL' }, { val: top.assist, label: 'ASS' }].map((s, j) => (
                        <div key={j} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: isFirst ? '0.8rem' : '0.7rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>{s.val}</div>
                          <div style={{ fontSize: '0.45rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {isFirst && (
                    <>
                      <div style={{ position: 'absolute', top: '50%', left: '4px', fontSize: '0.8rem', opacity: 0.4, animation: 'sparkle 1.8s ease-in-out infinite 0.3s', zIndex: 4 }}>⚡</div>
                      <div style={{ position: 'absolute', top: '30%', right: '4px', fontSize: '0.8rem', opacity: 0.4, animation: 'sparkle 2s ease-in-out infinite 0.6s', zIndex: 4 }}>⚡</div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {!generato && (
          <div style={{ background: 'rgba(255,215,0,0.04)', border: '1px dashed rgba(255,215,0,0.2)', borderRadius: '12px', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '2rem', flexShrink: 0 }}>🗞️</div>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'rgba(255,215,0,0.7)', marginBottom: '0.25rem' }}>I NOSTRI GIORNALISTI SONO AL LAVORO...</div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>
                {currentUser?.role === 'admin'
                  ? 'Clicca "Genera articolo" per pubblicare i titoli di oggi! 📰'
                  : 'Gli ultimi titoli saranno disponibili a breve. Torna più tardi! ⏳'}
              </div>
            </div>
          </div>
        )}
        {loading && (
          <div style={{ background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: '12px', padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem', animation: 'sparkle 0.8s ease-in-out infinite' }}>📝</div>
            <div style={{ fontSize: '0.85rem', color: '#ffd700', fontStyle: 'italic' }}>Il giornalista sta esagerando...</div>
          </div>
        )}
        {articolo && !loading && (
          <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: '12px', padding: '1.25rem', animation: 'fadeInGaz 0.5s ease' }}>
            {articolo.split('\n').filter(Boolean).map((riga, i) => {
              const isTitolo = riga.startsWith('***') && riga.endsWith('***')
              const testo = isTitolo ? riga.replace(/\*\*\*/g, '') : riga
              return (
                <div key={i} style={{ fontSize: isTitolo ? '1.1rem' : '0.875rem', fontWeight: isTitolo ? 900 : 400, color: isTitolo ? '#ffd700' : 'rgba(255,255,255,0.8)', marginBottom: '0.5rem', letterSpacing: isTitolo ? '0.5px' : '0', lineHeight: 1.6, textTransform: isTitolo ? 'uppercase' : 'none', fontStyle: isTitolo ? 'normal' : 'italic' }}>
                  {isTitolo ? '🗞️ ' + testo : testo}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function PartitaCard({ partita, currentUser, onVoteClick, onChiudiVoti, onScommessaClick, onRisultatoClick }) {
  const [giocatori, setGiocatori] = useState([])
  const [isHovered, setIsHovered] = useState(false)
  const [hasScommesso, setHasScommesso] = useState(false)

  useEffect(() => {
    caricaNomi()
    if (currentUser?.id) caricaScommessa()
  }, [])

  async function caricaNomi() {
    const ids = [...partita.squadra_a, ...partita.squadra_b]
    const { data } = await supabase.from('giocatori').select('id, nome, foto_url, overall').in('id', ids)
    if (data) setGiocatori(data)
  }

  async function caricaScommessa() {
    const { data } = await supabase.from('scommesse').select('id').eq('partita_id', partita.id).eq('giocatore_id', currentUser.id).limit(1)
    if (data && data.length > 0) setHasScommesso(true)
  }

  const getNome = (id) => giocatori.find(g => g.id === id)?.nome || `#${id}`
  const getFoto = (id) => giocatori.find(g => g.id === id)?.foto_url || null
  const getOverall = (id) => giocatori.find(g => g.id === id)?.overall || 65

  const dataStr = new Date(partita.data).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
  const stato = partita.stato || 'chiusa'
  const allPlayers = [...partita.squadra_a, ...partita.squadra_b]
  const isInSquadra = allPlayers.includes(currentUser?.id)
  const canVote = currentUser && (currentUser.role === 'admin' || isInSquadra)
  const canScommettere = currentUser?.role === 'player' && stato === 'pre_partita'
  const hasVoted = partita.votazioni?.some(v => v.voterId === (currentUser?.role === 'admin' ? 'admin' : currentUser?.id))
  const isVittoriaA = partita.punteggio_a > partita.punteggio_b
  const isVittoriaB = partita.punteggio_b > partita.punteggio_a
  const isPareggio = stato !== 'pre_partita' && partita.punteggio_a === partita.punteggio_b

  // Trova MVP (voto più alto)
  const mvp = partita.voti_calcolati?.length > 0
    ? partita.voti_calcolati.reduce((best, v) => v.votoFinale > (best?.votoFinale || 0) ? v : best, null)
    : null

  // Colori per stato
  const statoCfg = {
    pre_partita: { color: '#ffd700', bg: 'rgba(255,215,0,0.08)', border: 'rgba(255,215,0,0.3)', label: '🟡 IN PROGRAMMA' },
    in_votazione: { color: '#00d4ff', bg: 'rgba(0,212,255,0.08)', border: 'rgba(0,212,255,0.3)', label: '🗳️ VOTAZIONI APERTE' },
    chiusa: { color: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.08)', label: '✅ CHIUSA' },
  }
  const sc = statoCfg[stato] || statoCfg.chiusa

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        borderRadius: '20px',
        overflow: 'hidden',
        transition: 'all 0.3s',
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: isHovered ? `0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px ${sc.border}` : `0 4px 20px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)`,
      }}
    >
      {/* HEADER BAND */}
      <div style={{
        background: `linear-gradient(135deg, rgba(10,16,30,0.98), rgba(15,23,41,0.98))`,
        borderBottom: `1px solid ${sc.border}`,
        padding: '0.65rem 0.85rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600, letterSpacing: '0.5px' }}>
            📅 {dataStr.toUpperCase()}
          </div>
          <div style={{
            padding: '0.2rem 0.7rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800,
            background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, letterSpacing: '0.5px'
          }}>
            {sc.label}
          </div>
          {partita.votazioni?.length > 0 && stato !== 'pre_partita' && (
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
              {partita.votazioni.length} voti
            </div>
          )}
        </div>

        {/* Bottoni azione */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {stato === 'pre_partita' && (
            <>
              {canScommettere && (
                <button onClick={onScommessaClick} style={{
                  padding: '0.45rem 1rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, border: 'none', cursor: 'pointer',
                  background: hasScommesso ? 'rgba(0,212,255,0.15)' : 'linear-gradient(135deg, #ffd700, #ffa500)',
                  color: hasScommesso ? '#00d4ff' : '#0f1729',
                  border: hasScommesso ? '1px solid rgba(0,212,255,0.4)' : 'none',
                  transition: 'all 0.2s'
                }}>
                  {hasScommesso ? '✅ Scommesso' : '🎰 Scommetti'}
                </button>
              )}
              {currentUser?.role === 'admin' && (
                <button onClick={onRisultatoClick} style={{
                  padding: '0.45rem 1rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #00d4ff, #0099ff)', color: '#0f1729', transition: 'all 0.2s'
                }}>
                  📝 Risultato
                </button>
              )}
            </>
          )}
          {stato === 'in_votazione' && (
            <>
              {canVote && (
                <button onClick={onVoteClick} style={{
                  padding: '0.45rem 1rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, border: 'none', cursor: 'pointer',
                  background: hasVoted ? 'linear-gradient(135deg, #ffd700, #ffa500)' : 'linear-gradient(135deg, #00d4ff, #0099ff)',
                  color: '#0f1729', transition: 'all 0.2s'
                }}>
                  {hasVoted ? '✏️ Modifica voto' : '🗳️ Vota ora'}
                </button>
              )}
              {currentUser?.role === 'admin' && partita.votazioni?.length > 0 && (
                <button onClick={onChiudiVoti} style={{
                  padding: '0.45rem 1rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #9333ea, #7c3aed)', color: '#fff', transition: 'all 0.2s'
                }}>
                  🔒 Chiudi
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* CORPO CARD - Match area */}
      <div style={{
        background: `linear-gradient(135deg, rgba(15,23,41,0.97) 0%, rgba(10,16,30,0.98) 50%, rgba(15,23,41,0.97) 100%)`,
        padding: '0.85rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, rgba(0,212,255,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* PUNTEGGIO in cima */}
        <div style={{ textAlign: 'center', marginBottom: '0.85rem' }}>
          {stato === 'pre_partita' ? (
            <div style={{ display: 'inline-block', background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: '12px', padding: '0.5rem 1.5rem' }}>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#ffd700', letterSpacing: '2px' }}>VS</div>
              <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '1px' }}>DA GIOCARE</div>
            </div>
          ) : (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(0,0,0,0.4)', border: `2px solid ${isPareggio ? 'rgba(255,215,0,0.3)' : 'rgba(0,212,255,0.2)'}`, borderRadius: '14px', padding: '0.5rem 1.25rem' }}>
              <span style={{ fontSize: 'clamp(2rem, 8vw, 2.8rem)', fontWeight: 900, color: isVittoriaA ? '#00d4ff' : isPareggio ? '#ffd700' : 'rgba(255,255,255,0.5)' }}>{partita.punteggio_a}</span>
              <span style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.2)', fontWeight: 300 }}>—</span>
              <span style={{ fontSize: 'clamp(2rem, 8vw, 2.8rem)', fontWeight: 900, color: isVittoriaB ? '#00d4ff' : isPareggio ? '#ffd700' : 'rgba(255,255,255,0.5)' }}>{partita.punteggio_b}</span>
            </div>
          )}
          {stato !== 'pre_partita' && (
            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', marginTop: '0.25rem', letterSpacing: '0.5px' }}>
              {isVittoriaA ? 'VINCE A' : isVittoriaB ? 'VINCE B' : 'PAREGGIO'}
            </div>
          )}
        </div>

        {/* SQUADRE affiancate */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', position: 'relative' }}>

          {/* SQUADRA A */}
          <div style={{ borderRight: '1px solid rgba(255,255,255,0.06)', paddingRight: '0.75rem' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: stato === 'chiusa' && isVittoriaA ? '#00d4ff' : 'rgba(255,255,255,0.4)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              {stato === 'chiusa' && isVittoriaA && <span style={{ color: '#ffd700' }}>👑</span>}
              Squadra A
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {partita.squadra_a.map((id) => (
                <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem' }}>
                    {getFoto(id) ? <img src={getFoto(id)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} /> : '👤'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {getNome(id).replace(/\s*\(.*?\)/g, '').trim()}
                      {mvp?.playerId === id && <span style={{ marginLeft: '0.2rem', fontSize: '0.65rem', color: '#ffd700' }}>⭐</span>}
                    </div>
                    {(partita.eventi?.[id]?.gol > 0 || partita.eventi?.[id]?.assist > 0) && (
                      <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)' }}>
                        {partita.eventi[id]?.gol > 0 && `⚽${partita.eventi[id].gol} `}
                        {partita.eventi[id]?.assist > 0 && `🎯${partita.eventi[id].assist}`}
                      </div>
                    )}
                  </div>
                  {partita.voti_calcolati?.find(v => v.playerId === id) && (
                    <div style={{ fontSize: '0.7rem', fontWeight: 900, flexShrink: 0, color: partita.voti_calcolati.find(v => v.playerId === id).votoFinale >= 7 ? '#00d4ff' : partita.voti_calcolati.find(v => v.playerId === id).votoFinale >= 6 ? '#ffd700' : '#ef4444' }}>
                      {partita.voti_calcolati.find(v => v.playerId === id).votoFinale.toFixed(1)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>



          {/* SQUADRA B */}
          <div style={{ paddingLeft: '0.75rem' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: stato === 'chiusa' && isVittoriaB ? '#00d4ff' : 'rgba(255,255,255,0.4)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.3rem' }}>
              Squadra B
              {stato === 'chiusa' && isVittoriaB && <span style={{ color: '#ffd700' }}>👑</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {partita.squadra_b.map((id) => (
                <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexDirection: 'row-reverse' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem' }}>
                    {getFoto(id) ? <img src={getFoto(id)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} /> : '👤'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {mvp?.playerId === id && <span style={{ marginRight: '0.2rem', fontSize: '0.65rem', color: '#ffd700' }}>⭐</span>}
                      {getNome(id).replace(/\s*\(.*?\)/g, '').trim()}
                    </div>
                    {(partita.eventi?.[id]?.gol > 0 || partita.eventi?.[id]?.assist > 0) && (
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
                        {partita.eventi[id]?.gol > 0 && `⚽${partita.eventi[id].gol} `}
                        {partita.eventi[id]?.assist > 0 && `🎯${partita.eventi[id].assist}`}
                      </div>
                    )}
                  </div>
                  {/* Voto finale */}
                  {partita.voti_calcolati?.find(v => v.playerId === id) && (
                    <div style={{
                      fontSize: '0.75rem', fontWeight: 900,
                      color: partita.voti_calcolati.find(v => v.playerId === id).votoFinale >= 7 ? '#00d4ff' : partita.voti_calcolati.find(v => v.playerId === id).votoFinale >= 6 ? '#ffd700' : '#ef4444',
                      minWidth: '28px', textAlign: 'left'
                    }}>
                      {partita.voti_calcolati.find(v => v.playerId === id).votoFinale.toFixed(1)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ModalNuovaPartita({ onClose, onSaved }) {
  const [giocatori, setGiocatori] = useState([])
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [squadraA, setSquadraA] = useState([])
  const [squadraB, setSquadraB] = useState([])

  useEffect(() => { caricaGiocatori() }, [])

  async function caricaGiocatori() {
    const { data } = await supabase.from('giocatori').select('id, nome').order('nome')
    if (data) setGiocatori(data)
  }

  function toggleGiocatore(id, squadra) {
    if (squadra === 'A') {
      if (squadraB.includes(id)) return
      setSquadraA(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    } else {
      if (squadraA.includes(id)) return
      setSquadraB(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }
  }

  async function salvaPartita() {
    if (squadraA.length === 0 || squadraB.length === 0) {
      alert('Seleziona almeno 1 giocatore per squadra')
      return
    }
    const { error } = await supabase.from('partite').insert({
      data,
      squadra_a: squadraA,
      squadra_b: squadraB,
      punteggio_a: 0,
      punteggio_b: 0,
      stato: 'pre_partita',
      votazioni_aperte: false
    })
    if (error) alert('Errore: ' + error.message)
    else onSaved()
  }

  const getNomeGiocatore = (id) => giocatori.find(g => g.id === id)?.nome || `#${id}`

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50, backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ background: 'rgba(15, 23, 41, 0.95)', border: '1px solid rgba(0, 212, 255, 0.2)', borderRadius: '20px', padding: '2rem', maxWidth: '700px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem' }}>+ Nuova Partita</h2>
        <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Inserisci solo le squadre. Il risultato lo aggiungerai dopo la partita.
        </p>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.7)' }}>Data</label>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)}
            style={{ width: '100%', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(0, 212, 255, 0.3)', borderRadius: '12px', padding: '0.75rem', color: '#fff', outline: 'none' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '12px', padding: '1rem' }}>
            <div style={{ color: '#3b82f6', fontWeight: 700, marginBottom: '0.75rem', textAlign: 'center' }}>SQUADRA A ({squadraA.length})</div>
            <div style={{ fontSize: '0.85rem', minHeight: '60px' }}>
              {squadraA.map(id => <div key={id} style={{ color: '#93c5fd', marginBottom: '0.25rem' }}>• {getNomeGiocatore(id)}</div>)}
            </div>
          </div>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '1rem' }}>
            <div style={{ color: '#ef4444', fontWeight: 700, marginBottom: '0.75rem', textAlign: 'center' }}>SQUADRA B ({squadraB.length})</div>
            <div style={{ fontSize: '0.85rem', minHeight: '60px' }}>
              {squadraB.map(id => <div key={id} style={{ color: '#fca5a5', marginBottom: '0.25rem' }}>• {getNomeGiocatore(id)}</div>)}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem' }}>Assegna giocatori:</div>
          <div style={{ display: 'grid', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
            {giocatori.map(g => {
              const inA = squadraA.includes(g.id)
              const inB = squadraB.includes(g.id)
              return (
                <div key={g.id} style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ flex: 1, fontSize: '0.9rem' }}>{g.nome}</span>
                  <button onClick={() => toggleGiocatore(g.id, 'A')} style={{ padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, border: 'none', cursor: 'pointer', background: inA ? '#3b82f6' : 'rgba(100, 116, 139, 0.3)', color: inA ? '#fff' : 'rgba(255, 255, 255, 0.5)', transition: 'all 0.2s' }}>A</button>
                  <button onClick={() => toggleGiocatore(g.id, 'B')} style={{ padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, border: 'none', cursor: 'pointer', background: inB ? '#ef4444' : 'rgba(100, 116, 139, 0.3)', color: inB ? '#fff' : 'rgba(255, 255, 255, 0.5)', transition: 'all 0.2s' }}>B</button>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={salvaPartita} style={{ flex: 1, background: 'linear-gradient(135deg, #00d4ff, #0099ff)', border: 'none', borderRadius: '12px', padding: '1rem', color: '#0f1729', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 15px rgba(0, 212, 255, 0.4)', transition: 'all 0.2s' }}
            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'} onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}>
            CREA PARTITA
          </button>
          <button onClick={onClose} style={{ flex: 1, background: 'rgba(100, 116, 139, 0.3)', border: 'none', borderRadius: '12px', padding: '1rem', color: '#fff', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseOver={(e) => e.target.style.background = 'rgba(100, 116, 139, 0.5)'} onMouseOut={(e) => e.target.style.background = 'rgba(100, 116, 139, 0.3)'}>
            ANNULLA
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalInserisciRisultato({ partita, onClose, onSaved }) {
  const [giocatori, setGiocatori] = useState([])
  const [punteggioA, setPunteggioA] = useState(0)
  const [punteggioB, setPunteggioB] = useState(0)
  const [eventi, setEventi] = useState({})

  useEffect(() => { caricaGiocatori() }, [])

  async function caricaGiocatori() {
    const allIds = [...partita.squadra_a, ...partita.squadra_b]
    const { data } = await supabase.from('giocatori').select('id, nome').in('id', allIds)
    if (data) setGiocatori(data)
  }

  function setEvento(id, field, value) {
    setEventi(prev => ({ ...prev, [id]: { ...prev[id], [field]: parseInt(value) || 0 } }))
  }

  async function salvaRisultato() {
    const { error } = await supabase.from('partite').update({
      punteggio_a: punteggioA,
      punteggio_b: punteggioB,
      eventi,
      stato: 'in_votazione',
      votazioni_aperte: true
    }).eq('id', partita.id)

    if (error) alert('Errore: ' + error.message)
    else {
      alert('✓ Risultato inserito! Votazioni aperte.')
      onSaved()
    }
  }

  const getNome = (id) => giocatori.find(g => g.id === id)?.nome || `#${id}`
  const allIds = [...partita.squadra_a, ...partita.squadra_b]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50, backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ background: 'rgba(15, 23, 41, 0.95)', border: '1px solid rgba(0, 212, 255, 0.2)', borderRadius: '20px', padding: '2rem', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem' }}>📝 Inserisci Risultato</h2>
        <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Dopo aver salvato, le votazioni si apriranno automaticamente.
        </p>

        {/* Punteggio */}
        <div style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(0, 212, 255, 0.2)', borderRadius: '15px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '1rem', fontWeight: 600 }}>PUNTEGGIO FINALE</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#3b82f6', fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.85rem' }}>SQUADRA A</div>
              <input type="number" min="0" value={punteggioA} onChange={(e) => setPunteggioA(parseInt(e.target.value) || 0)}
                style={{ width: '80px', background: 'rgba(0, 0, 0, 0.4)', border: '2px solid rgba(59, 130, 246, 0.5)', borderRadius: '10px', padding: '0.75rem', textAlign: 'center', color: '#fff', fontSize: '2rem', fontWeight: 900, outline: 'none' }} />
            </div>
            <div style={{ fontSize: '2rem', color: 'rgba(255, 255, 255, 0.3)', fontWeight: 900 }}>-</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#ef4444', fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.85rem' }}>SQUADRA B</div>
              <input type="number" min="0" value={punteggioB} onChange={(e) => setPunteggioB(parseInt(e.target.value) || 0)}
                style={{ width: '80px', background: 'rgba(0, 0, 0, 0.4)', border: '2px solid rgba(239, 68, 68, 0.5)', borderRadius: '10px', padding: '0.75rem', textAlign: 'center', color: '#fff', fontSize: '2rem', fontWeight: 900, outline: 'none' }} />
            </div>
          </div>
        </div>

        {/* Gol e Assist */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem' }}>Gol e Assist:</div>
          <div style={{ display: 'grid', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto' }}>
            {allIds.map(id => (
              <div key={id} style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 600 }}>{getNome(id)}</span>
                <input type="number" min="0" max="20" placeholder="⚽ Gol" value={eventi[id]?.gol || ''}
                  onChange={(e) => setEvento(id, 'gol', e.target.value)}
                  style={{ width: '80px', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px', padding: '0.5rem', fontSize: '0.85rem', color: '#fff', outline: 'none', textAlign: 'center' }} />
                <input type="number" min="0" max="20" placeholder="🎯 Ass" value={eventi[id]?.assist || ''}
                  onChange={(e) => setEvento(id, 'assist', e.target.value)}
                  style={{ width: '80px', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px', padding: '0.5rem', fontSize: '0.85rem', color: '#fff', outline: 'none', textAlign: 'center' }} />
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={salvaRisultato} style={{ flex: 1, background: 'linear-gradient(135deg, #00d4ff, #0099ff)', border: 'none', borderRadius: '12px', padding: '1rem', color: '#0f1729', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 15px rgba(0, 212, 255, 0.4)', transition: 'all 0.2s' }}
            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'} onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}>
            SALVA E APRI VOTAZIONI
          </button>
          <button onClick={onClose} style={{ flex: 1, background: 'rgba(100, 116, 139, 0.3)', border: 'none', borderRadius: '12px', padding: '1rem', color: '#fff', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseOver={(e) => e.target.style.background = 'rgba(100, 116, 139, 0.5)'} onMouseOut={(e) => e.target.style.background = 'rgba(100, 116, 139, 0.3)'}>
            ANNULLA
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalScommessa({ partita, currentUser, onClose, onSaved }) {
  const [giocatori, setGiocatori] = useState([])
  const [creditiDisponibili, setCreditiDisponibili] = useState(500)
  const [tab, setTab] = useState('risultato')
  const [sceltaRisultato, setSceltaRisultato] = useState(null)
  const [sceltaMigliore, setSceltaMigliore] = useState(null)
  const [sceltaCapo, setSceltaCapo] = useState(null)
  const [importo, setImporto] = useState(10)
  const [loading, setLoading] = useState(true)
  const [scommesseEsistenti, setScommesseEsistenti] = useState([])

  useEffect(() => { caricaDati() }, [])

  async function caricaDati() {
    const allIds = [...partita.squadra_a, ...partita.squadra_b]
    const { data: giocatoriData } = await supabase.from('giocatori').select('*').in('id', allIds)
    const { data: giocatoreCorrente } = await supabase.from('giocatori').select('crediti').eq('id', currentUser.id).single()
    const { data: scommesseData } = await supabase.from('scommesse').select('*').eq('partita_id', partita.id).eq('giocatore_id', currentUser.id)

    if (giocatoriData) setGiocatori(giocatoriData)
    if (giocatoreCorrente) setCreditiDisponibili(giocatoreCorrente.crediti ?? 500)
    if (scommesseData) {
      setScommesseEsistenti(scommesseData)
      scommesseData.forEach(s => {
        if (s.tipo === 'risultato') setSceltaRisultato(s.scelta)
        if (s.tipo === 'migliore_in_campo') setSceltaMigliore(parseInt(s.scelta))
        if (s.tipo === 'capocannoniere') setSceltaCapo(parseInt(s.scelta))
      })
    }
    setLoading(false)
  }

  const allIds = [...partita.squadra_a, ...partita.squadra_b]
  const quoteRisultato = giocatori.length > 0 ? calcolaQuoteRisultato(giocatori, partita.squadra_a, partita.squadra_b) : { squadra_a: 2.00, pareggio: 3.00, squadra_b: 2.00 }
  const quoteMigliore = giocatori.length > 0 ? calcolaQuoteMiglioreInCampo(giocatori, allIds) : {}
  const quoteCapo = calcolaQuoteCapocannoniere(allIds)
  const importoValido = Math.max(5, Math.min(importo, creditiDisponibili - 1))

  async function salvaScommessa(tipo, scelta, quota) {
    if (!scelta) { alert('Seleziona una scelta!'); return }
    const esistente = scommesseEsistenti.find(s => s.tipo === tipo)

    if (esistente) {
      const { data: g } = await supabase.from('giocatori').select('crediti').eq('id', currentUser.id).single()
      const nuoviCrediti = (g.crediti || 500) + esistente.importo - importoValido
      await supabase.from('scommesse').update({ scelta: String(scelta), importo: importoValido, quota }).eq('id', esistente.id)
      await supabase.from('giocatori').update({ crediti: nuoviCrediti }).eq('id', currentUser.id)
    } else {
      if (importoValido > creditiDisponibili - 1) { alert('Crediti insufficienti!'); return }
      await supabase.from('scommesse').insert({ partita_id: partita.id, giocatore_id: currentUser.id, tipo, scelta: String(scelta), importo: importoValido, quota, esito: 'pending' })
      await supabase.from('giocatori').update({ crediti: creditiDisponibili - importoValido }).eq('id', currentUser.id)
      setCreditiDisponibili(prev => prev - importoValido)
    }

    alert(`✅ Scommessa piazzata! ${importoValido} crediti puntati a quota ${quota}x`)
    caricaDati()
  }

  if (loading) return null
  const getNome = (id) => giocatori.find(g => g.id === id)?.nome || `#${id}`

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50, backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ background: 'rgba(15, 23, 41, 0.98)', border: '1px solid rgba(255, 215, 0, 0.3)', borderRadius: '20px', padding: '2rem', maxWidth: '700px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 900 }}>🎰 Piazza Scommessa</h2>
          <div style={{ background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 165, 0, 0.1))', border: '1px solid rgba(255, 215, 0, 0.4)', borderRadius: '12px', padding: '0.5rem 1rem', fontSize: '1.2rem', fontWeight: 900, color: '#ffd700' }}>
            💰 {creditiDisponibili}
          </div>
        </div>

        <div style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '15px', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '0.75rem', fontWeight: 600 }}>IMPORTO SCOMMESSA</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <input type="number" min="5" max={creditiDisponibili - 1} value={importo}
              onChange={(e) => setImporto(Math.max(5, Math.min(parseInt(e.target.value) || 5, creditiDisponibili - 1)))}
              style={{ flex: 1, background: 'rgba(0, 0, 0, 0.4)', border: '1px solid rgba(255, 215, 0, 0.4)', borderRadius: '10px', padding: '0.75rem', color: '#ffd700', fontSize: '1.5rem', fontWeight: 900, textAlign: 'center', outline: 'none' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[10, 50, 100].map(v => (
                <button key={v} onClick={() => setImporto(Math.min(v, creditiDisponibili - 1))} style={{ background: 'rgba(255, 215, 0, 0.1)', border: '1px solid rgba(255, 215, 0, 0.3)', borderRadius: '8px', padding: '0.4rem 0.75rem', color: '#ffd700', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '12px', padding: '0.4rem' }}>
          {[{ key: 'risultato', label: '🏆 Risultato' }, { key: 'migliore', label: '⭐ MVP' }, { key: 'capocannoniere', label: '⚽ Gol' }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ flex: 1, padding: '0.6rem', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', background: tab === t.key ? 'linear-gradient(135deg, #ffd700, #ffa500)' : 'transparent', color: tab === t.key ? '#0f1729' : 'rgba(255, 255, 255, 0.5)', transition: 'all 0.2s' }}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'risultato' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            {[{ key: 'squadra_a', label: 'SQUADRA A', quota: quoteRisultato.squadra_a }, { key: 'pareggio', label: 'PAREGGIO', quota: quoteRisultato.pareggio }, { key: 'squadra_b', label: 'SQUADRA B', quota: quoteRisultato.squadra_b }].map(opt => (
              <div key={opt.key} onClick={() => setSceltaRisultato(opt.key)} style={{ background: sceltaRisultato === opt.key ? 'rgba(255, 215, 0, 0.2)' : 'rgba(0, 0, 0, 0.3)', border: `2px solid ${sceltaRisultato === opt.key ? '#ffd700' : 'rgba(255, 255, 255, 0.1)'}`, borderRadius: '15px', padding: '1.5rem', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '0.5rem', fontWeight: 600 }}>{opt.label}</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: sceltaRisultato === opt.key ? '#ffd700' : '#fff' }}>{opt.quota}</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)', marginTop: '0.5rem' }}>Vinci: {Math.floor(importoValido * opt.quota)} cr.</div>
              </div>
            ))}
          </div>
        )}

        {tab === 'migliore' && (
          <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem', maxHeight: '300px', overflowY: 'auto' }}>
            {allIds.map(id => (
              <div key={id} onClick={() => setSceltaMigliore(id)} style={{ background: sceltaMigliore === id ? 'rgba(255, 215, 0, 0.2)' : 'rgba(0, 0, 0, 0.3)', border: `2px solid ${sceltaMigliore === id ? '#ffd700' : 'rgba(255, 255, 255, 0.1)'}`, borderRadius: '12px', padding: '1rem 1.5rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{getNome(id)}</div>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.4)' }}>OVR: {giocatori.find(g => g.id === id)?.overall || '-'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: sceltaMigliore === id ? '#ffd700' : '#fff' }}>{quoteMigliore[id] || '-'}x</div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)' }}>Vinci: {Math.floor(importoValido * (quoteMigliore[id] || 0))} cr.</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'capocannoniere' && (
          <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem', maxHeight: '300px', overflowY: 'auto' }}>
            {allIds.map(id => (
              <div key={id} onClick={() => setSceltaCapo(id)} style={{ background: sceltaCapo === id ? 'rgba(255, 215, 0, 0.2)' : 'rgba(0, 0, 0, 0.3)', border: `2px solid ${sceltaCapo === id ? '#ffd700' : 'rgba(255, 255, 255, 0.1)'}`, borderRadius: '12px', padding: '1rem 1.5rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' }}>
                <div style={{ fontWeight: 700 }}>{getNome(id)}</div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: sceltaCapo === id ? '#ffd700' : '#fff' }}>{quoteCapo[id] || '-'}x</div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)' }}>Vinci: {Math.floor(importoValido * (quoteCapo[id] || 0))} cr.</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => {
              if (tab === 'risultato') salvaScommessa('risultato', sceltaRisultato, quoteRisultato[sceltaRisultato])
              if (tab === 'migliore') salvaScommessa('migliore_in_campo', sceltaMigliore, quoteMigliore[sceltaMigliore])
              if (tab === 'capocannoniere') salvaScommessa('capocannoniere', sceltaCapo, quoteCapo[sceltaCapo])
            }}
            style={{ flex: 1, background: 'linear-gradient(135deg, #ffd700, #ffa500)', border: 'none', borderRadius: '12px', padding: '1rem', color: '#0f1729', fontWeight: 700, cursor: 'pointer', fontSize: '1rem', boxShadow: '0 4px 15px rgba(255, 215, 0, 0.4)', transition: 'all 0.2s' }}
            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
          >
            🎰 PIAZZA SCOMMESSA
          </button>
          <button onClick={onClose} style={{ flex: 1, background: 'rgba(100, 116, 139, 0.3)', border: 'none', borderRadius: '12px', padding: '1rem', color: '#fff', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseOver={(e) => e.target.style.background = 'rgba(100, 116, 139, 0.5)'} onMouseOut={(e) => e.target.style.background = 'rgba(100, 116, 139, 0.3)'}>
            ANNULLA
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalVotazioni({ partita, currentUser, onClose, onSaved }) {
  const [giocatori, setGiocatori] = useState([])
  const [voti, setVoti] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => { caricaDati() }, [])

  async function caricaDati() {
    const allIds = [...partita.squadra_a, ...partita.squadra_b]
    const { data } = await supabase.from('giocatori').select('*').in('id', allIds)
    if (data) {
      setGiocatori(data)
      const votiInit = {}
      allIds.forEach(id => votiInit[id] = 6)
      const voterId = currentUser.role === 'admin' ? 'admin' : currentUser.id
      const votoEsistente = partita.votazioni?.find(v => v.voterId === voterId)
      if (votoEsistente) setVoti(votoEsistente.voti)
      else setVoti(votiInit)
    }
    setLoading(false)
  }

  function setVoto(playerId, voto) {
    setVoti(prev => ({ ...prev, [playerId]: Math.max(1, Math.min(10, parseFloat(voto) || 6)) }))
  }

  async function salvaVoti() {
    const voterId = currentUser.role === 'admin' ? 'admin' : currentUser.id
    const votazioniAggiornate = (partita.votazioni || []).filter(v => v.voterId !== voterId)
    votazioniAggiornate.push({ voterId, voterName: currentUser.nome, voti, timestamp: new Date().toISOString() })
    const { error } = await supabase.from('partite').update({ votazioni: votazioniAggiornate }).eq('id', partita.id)
    if (error) alert('Errore: ' + error.message)
    else onSaved()
  }

  if (loading) return null
  const allPlayers = [...partita.squadra_a, ...partita.squadra_b]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50, backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ background: 'rgba(15, 23, 41, 0.95)', border: '1px solid rgba(0, 212, 255, 0.2)', borderRadius: '20px', padding: '2rem', maxWidth: '700px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '1rem' }}>🗳️ Vota i Giocatori</h2>
        <div style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '2rem' }}>Vota tutti i giocatori (anche te stesso) da 1 a 10.</div>
        <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
          {allPlayers.map(pid => {
            const p = giocatori.find(g => g.id === pid)
            if (!p) return null
            const isMe = pid === currentUser?.id
            return (
              <div key={pid} style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(0, 212, 255, 0.2)', borderRadius: '15px', padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                      {p.nome} {isMe && <span style={{ color: '#00d4ff' }}>(tu)</span>}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                      {partita.eventi?.[pid]?.gol > 0 && `⚽ ${partita.eventi[pid].gol} `}
                      {partita.eventi?.[pid]?.assist > 0 && `🎯 ${partita.eventi[pid].assist}`}
                    </div>
                  </div>
                  <div style={{ flex: 1, textAlign: 'right' }}>
                    <div style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '0.5rem', color: '#00d4ff' }}>{voti[pid] || 6}</div>
                    <input type="range" min="2" max="20" step="1" value={(voti[pid] || 6) * 2}
                      onChange={(e) => setVoto(pid, e.target.value / 2)}
                      style={{ width: '100%', accentColor: '#00d4ff', cursor: 'pointer' }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={salvaVoti} style={{ flex: 1, background: 'linear-gradient(135deg, #00d4ff, #0099ff)', border: 'none', borderRadius: '12px', padding: '1rem', color: '#0f1729', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 15px rgba(0, 212, 255, 0.4)', transition: 'all 0.2s' }}
            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'} onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}>
            SALVA VOTI
          </button>
          <button onClick={onClose} style={{ flex: 1, background: 'rgba(100, 116, 139, 0.3)', border: 'none', borderRadius: '12px', padding: '1rem', color: '#fff', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseOver={(e) => e.target.style.background = 'rgba(100, 116, 139, 0.5)'} onMouseOut={(e) => e.target.style.background = 'rgba(100, 116, 139, 0.3)'}>
            ANNULLA
          </button>
        </div>
      </div>
    </div>
  )
}

export default Calendario