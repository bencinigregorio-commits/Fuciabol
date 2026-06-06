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

  async function avviaLive(partita) {
    const { error } = await supabase.from('partite').update({
      stato: 'live',
      punteggio_a: 0,
      punteggio_b: 0,
      eventi: partita.eventi || {}
    }).eq('id', partita.id)
    if (error) alert('Errore: ' + error.message)
    else caricaPartite()
  }

  async function chiudiLive(partita, apriVotazioni = false) {
    const update = apriVotazioni
      ? { stato: 'in_votazione', votazioni_aperte: true }
      : { stato: 'chiusa', votazioni_aperte: false }
    const { error } = await supabase.from('partite').update(update).eq('id', partita.id)
    if (error) alert('Errore: ' + error.message)
    else caricaPartite()
  }

  const isAdmin = currentUser?.role === 'admin'

  return (
    <div>
      <style>{`
        @keyframes iconGlowCal {
          0%, 100% { box-shadow: 0 0 14px rgba(0,212,255,0.18), 0 4px 18px rgba(0,0,0,0.4); }
          50% { box-shadow: 0 0 26px rgba(0,212,255,0.32), 0 4px 22px rgba(0,0,0,0.45); }
        }
        @keyframes livePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
        @keyframes liveCardGlow {
          0%, 100% { box-shadow: 0 0 10px rgba(0,255,136,0.25), 0 4px 20px rgba(0,0,0,0.4); }
          50% { box-shadow: 0 0 28px rgba(0,255,136,0.5), 0 4px 25px rgba(0,0,0,0.5); }
        }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '16px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(145deg, rgba(0,212,255,0.12), rgba(10,16,30,0.9))',
            border: '1px solid rgba(0,212,255,0.28)',
            animation: 'iconGlowCal 3s ease-in-out infinite'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="3"/>
              <path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
          </div>
          <div>
            <h1 style={{ margin: '0 0 0.3rem 0', fontSize: 'clamp(1.4rem, 5vw, 1.75rem)', fontWeight: 900, letterSpacing: '3px', lineHeight: 1, fontFamily: 'system-ui, -apple-system, sans-serif', textTransform: 'uppercase', background: 'linear-gradient(135deg, #fff 0%, #e0f8ff 55%, #00d4ff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Calendario</h1>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.38)', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' }}>Partite giocate e in programma.</p>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            style={{ background: 'linear-gradient(135deg, #00d4ff, #0099ff)', border: 'none', borderRadius: '12px', padding: '0.7rem 1.3rem', color: '#0f1729', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,212,255,0.4)', transition: 'all 0.2s', fontSize: '0.9rem' }}
            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
          >
            + Nuova Partita
          </button>
        )}
      </div>
      <div style={{ height: '1px', background: 'linear-gradient(90deg, rgba(0,212,255,0.55), rgba(0,212,255,0.1), transparent)', margin: '1.1rem 0 1.5rem' }} />

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
              onAvviaLive={() => avviaLive(partita)}
              onChiudiLive={(apriVotazioni) => chiudiLive(partita, apriVotazioni)}
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
    // Solo l'ultima partita chiusa (partite[0] è già ordinato per data DESC)
    const ultimaPartita = partite[0]
    if (!ultimaPartita) return
    const allIds = [...ultimaPartita.squadra_a, ...ultimaPartita.squadra_b]
    const ranked = allIds
      .map(id => {
        const votoCalc = ultimaPartita.voti_calcolati?.find(v => v.playerId === id)
        const gol = ultimaPartita.eventi?.[id]?.gol || 0
        const assist = ultimaPartita.eventi?.[id]?.assist || 0
        const giocatore = giocatori.find(g => g.id === id)
        return { id, media: votoCalc?.votoFinale || 0, gol, assist, giocatore }
      })
      .filter(x => x.giocatore)
      .sort((a, b) => b.media - a.media || b.gol - a.gol || b.assist - a.assist)
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

function PartitaCard({ partita, currentUser, onVoteClick, onChiudiVoti, onScommessaClick, onRisultatoClick, onAvviaLive, onChiudiLive }) {
  const [giocatori, setGiocatori] = useState([])
  const [isHovered, setIsHovered] = useState(false)
  const [hasScommesso, setHasScommesso] = useState(false)
  const [liveEventi, setLiveEventi] = useState(partita.eventi || {})
  const [liveSaving, setLiveSaving] = useState(false)
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [showCorreggi, setShowCorreggi] = useState(false)
  const [disponibilita, setDisponibilita] = useState(partita.disponibilita || {})

  useEffect(() => {
    caricaNomi()
    if (currentUser?.id) caricaScommessa()
  }, [])

  useEffect(() => {
    setLiveEventi(partita.eventi || {})
  }, [partita.id, partita.stato])

  useEffect(() => {
    setDisponibilita(partita.disponibilita || {})
  }, [partita.id])

  async function caricaNomi() {
    const ids = [...partita.squadra_a, ...partita.squadra_b]
    const { data } = await supabase.from('giocatori').select('id, nome, foto_url, overall, is_guest').in('id', ids)
    if (data) setGiocatori(data)
  }

  async function salvaDisponibilita(nuovoStato) {
    if (!currentUser?.id) return
    const playerId = currentUser.id
    const { data: partitaFresca, error: fetchErr } = await supabase
      .from('partite').select('disponibilita').eq('id', partita.id).single()
    if (fetchErr) { alert('Errore: ' + fetchErr.message); return }
    const nuovaDisp = {
      ...(partitaFresca.disponibilita || {}),
      [playerId]: { stato: nuovoStato, updatedAt: new Date().toISOString() }
    }
    const { error } = await supabase.from('partite').update({ disponibilita: nuovaDisp }).eq('id', partita.id)
    if (error) { alert('Errore: ' + error.message); return }
    setDisponibilita(nuovaDisp)
  }

  async function caricaScommessa() {
    const { data } = await supabase.from('scommesse').select('id').eq('partita_id', partita.id).eq('giocatore_id', currentUser.id).limit(1)
    if (data && data.length > 0) setHasScommesso(true)
  }

  async function aggiornaEventoLive(playerId, field, delta) {
    if (liveSaving) return
    setLiveSaving(true)
    const currentVal = liveEventi[playerId]?.[field] || 0
    const newVal = Math.max(0, currentVal + delta)
    const nuoviEventi = { ...liveEventi, [playerId]: { ...(liveEventi[playerId] || {}), [field]: newVal } }
    const nuovoPunteggioA = partita.squadra_a.reduce((sum, id) => sum + (nuoviEventi[id]?.gol || 0), 0)
    const nuovoPunteggioB = partita.squadra_b.reduce((sum, id) => sum + (nuoviEventi[id]?.gol || 0), 0)
    setLiveEventi(nuoviEventi)
    const { error } = await supabase.from('partite').update({ eventi: nuoviEventi, punteggio_a: nuovoPunteggioA, punteggio_b: nuovoPunteggioB }).eq('id', partita.id)
    if (error) { setLiveEventi(partita.eventi || {}); alert('Errore: ' + error.message) }
    setLiveSaving(false)
  }

  async function registraGol(scorerId, assistId) {
    const nuoviEventi = { ...liveEventi }
    nuoviEventi[scorerId] = { ...(nuoviEventi[scorerId] || {}), gol: (nuoviEventi[scorerId]?.gol || 0) + 1 }
    if (assistId) {
      nuoviEventi[assistId] = { ...(nuoviEventi[assistId] || {}), assist: (nuoviEventi[assistId]?.assist || 0) + 1 }
    }
    const nuovoPunteggioA = partita.squadra_a.reduce((sum, id) => sum + (nuoviEventi[id]?.gol || 0), 0)
    const nuovoPunteggioB = partita.squadra_b.reduce((sum, id) => sum + (nuoviEventi[id]?.gol || 0), 0)
    setLiveEventi(nuoviEventi)
    const { error } = await supabase.from('partite').update({ eventi: nuoviEventi, punteggio_a: nuovoPunteggioA, punteggio_b: nuovoPunteggioB }).eq('id', partita.id)
    if (error) { setLiveEventi(partita.eventi || {}); alert('Errore: ' + error.message) }
  }

  const getNome = (id) => (giocatori.find(g => g.id === id)?.nome || `#${id}`).replace(/\s*\(.*?\)/g, '').trim()
  const getFoto = (id) => giocatori.find(g => g.id === id)?.foto_url || null

  const dataStr = new Date(partita.data).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
  const stato = partita.stato || 'chiusa'
  const allPlayers = [...partita.squadra_a, ...partita.squadra_b]
  const isInSquadra = allPlayers.includes(currentUser?.id)
  const canVote = currentUser && (currentUser.role === 'admin' || isInSquadra)
  const canScommettere = currentUser?.role === 'player' && stato === 'pre_partita'
  const hasVoted = partita.votazioni?.some(v => v.voterId === (currentUser?.role === 'admin' ? 'admin' : currentUser?.id))

  const displayPunteggioA = stato === 'live'
    ? partita.squadra_a.reduce((sum, id) => sum + (liveEventi[id]?.gol || 0), 0)
    : (partita.punteggio_a ?? 0)
  const displayPunteggioB = stato === 'live'
    ? partita.squadra_b.reduce((sum, id) => sum + (liveEventi[id]?.gol || 0), 0)
    : (partita.punteggio_b ?? 0)

  const isVittoriaA = displayPunteggioA > displayPunteggioB
  const isVittoriaB = displayPunteggioB > displayPunteggioA
  const isPareggio = stato !== 'pre_partita' && stato !== 'live' && displayPunteggioA === displayPunteggioB

  const mvp = partita.voti_calcolati?.length > 0
    ? partita.voti_calcolati.reduce((best, v) => v.votoFinale > (best?.votoFinale || 0) ? v : best, null)
    : null

  const marcatori = allPlayers.filter(id => (liveEventi[id]?.gol || 0) > 0)
  const assistman = allPlayers.filter(id => (liveEventi[id]?.assist || 0) > 0)

  const statoCfg = {
    pre_partita: { color: '#ffd700', bg: 'rgba(255,215,0,0.08)', border: 'rgba(255,215,0,0.3)', label: '🟡 IN PROGRAMMA' },
    live: { color: '#00ff88', bg: 'rgba(0,255,136,0.08)', border: 'rgba(0,255,136,0.35)', label: '● LIVE' },
    in_votazione: { color: '#00d4ff', bg: 'rgba(0,212,255,0.08)', border: 'rgba(0,212,255,0.3)', label: '🗳️ VOTAZIONI APERTE' },
    chiusa: { color: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.08)', label: '✅ CHIUSA' },
  }
  const sc = statoCfg[stato] || statoCfg.chiusa

  return (
    <>
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          width: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
          borderRadius: '20px',
          overflow: 'hidden',
          transition: 'all 0.3s',
          transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
          boxShadow: stato === 'live'
            ? '0 0 0 1.5px rgba(0,255,136,0.5), 0 0 24px rgba(0,255,136,0.2), 0 4px 20px rgba(0,0,0,0.4)'
            : isHovered ? `0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px ${sc.border}` : `0 4px 20px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)`,
          animation: stato === 'live' ? 'liveCardGlow 2s ease-in-out infinite' : 'none',
        }}
      >
        {/* HEADER BAND */}
        <div style={{ background: 'linear-gradient(135deg, rgba(10,16,30,0.98), rgba(15,23,41,0.98))', borderBottom: `1px solid ${sc.border}`, padding: '0.65rem 0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>📅 {dataStr.toUpperCase()}</div>
            <div style={{ padding: '0.2rem 0.7rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 800, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, animation: stato === 'live' ? 'livePulse 1.4s ease-in-out infinite' : 'none' }}>
              {sc.label}
            </div>
            {partita.votazioni?.length > 0 && stato === 'chiusa' && (
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>{partita.votazioni.length} voti</div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {stato === 'pre_partita' && (
              <>
                {canScommettere && (
                  <button onClick={onScommessaClick} style={{ padding: '0.45rem 1rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', background: hasScommesso ? 'rgba(0,212,255,0.15)' : 'linear-gradient(135deg, #ffd700, #ffa500)', color: hasScommesso ? '#00d4ff' : '#0f1729', border: hasScommesso ? '1px solid rgba(0,212,255,0.4)' : 'none' }}>
                    {hasScommesso ? '✅ Scommesso' : '🎰 Scommetti'}
                  </button>
                )}
                {currentUser?.role === 'admin' && (
                  <>
                    <button onClick={onAvviaLive} style={{ padding: '0.45rem 1rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #00ff88, #00cc66)', color: '#0a1a0f' }}>▶ Avvia Live</button>
                    <button onClick={onRisultatoClick} style={{ padding: '0.45rem 1rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #00d4ff, #0099ff)', color: '#0f1729' }}>📝 Risultato</button>
                  </>
                )}
              </>
            )}
            {stato === 'in_votazione' && (
              <>
                {canVote && (
                  <button onClick={onVoteClick} style={{ padding: '0.45rem 1rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, border: 'none', cursor: 'pointer', background: hasVoted ? 'linear-gradient(135deg, #ffd700, #ffa500)' : 'linear-gradient(135deg, #00d4ff, #0099ff)', color: '#0f1729' }}>
                    {hasVoted ? '✏️ Modifica voto' : '🗳️ Vota ora'}
                  </button>
                )}
                {currentUser?.role === 'admin' && partita.votazioni?.length > 0 && (
                  <button onClick={onChiudiVoti} style={{ padding: '0.45rem 1rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #9333ea, #7c3aed)', color: '#fff' }}>🔒 Chiudi</button>
                )}
              </>
            )}
          </div>
        </div>

        {/* INFO RIGA: ora / luogo / note */}
        {(partita.ora || partita.luogo || partita.note) && (
          <div style={{ background: 'rgba(0,0,0,0.25)', borderBottom: `1px solid ${sc.border}`, padding: '0.45rem 0.85rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
            {partita.ora && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.65)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.18rem 0.55rem' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.7 }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {partita.ora}
              </span>
            )}
            {partita.luogo && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.65)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.18rem 0.55rem' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.7 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {partita.luogo}
              </span>
            )}
            {partita.note && (
              <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.38)', fontStyle: 'italic', letterSpacing: '0.2px' }}>{partita.note}</span>
            )}
          </div>
        )}

        {/* CORPO CARD */}
        <div style={{ background: 'linear-gradient(135deg, rgba(15,23,41,0.97) 0%, rgba(10,16,30,0.98) 50%, rgba(15,23,41,0.97) 100%)', padding: '0.85rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, rgba(0,212,255,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />

          {/* PUNTEGGIO */}
          <div style={{ textAlign: 'center', marginBottom: '0.85rem' }}>
            {stato === 'pre_partita' ? (
              <div style={{ display: 'inline-block', background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: '12px', padding: '0.5rem 1.5rem' }}>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#ffd700', letterSpacing: '2px' }}>VS</div>
                <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '1px' }}>DA GIOCARE</div>
              </div>
            ) : (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', background: stato === 'live' ? 'rgba(0,255,136,0.06)' : 'rgba(0,0,0,0.4)', border: stato === 'live' ? '2px solid rgba(0,255,136,0.4)' : `2px solid ${isPareggio ? 'rgba(255,215,0,0.3)' : 'rgba(0,212,255,0.2)'}`, borderRadius: '14px', padding: '0.5rem 1.25rem' }}>
                <span style={{ fontSize: 'clamp(2rem, 8vw, 2.8rem)', fontWeight: 900, color: stato === 'live' ? '#00ff88' : isVittoriaA ? '#00d4ff' : isPareggio ? '#ffd700' : 'rgba(255,255,255,0.5)' }}>{displayPunteggioA}</span>
                <span style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.2)', fontWeight: 300 }}>—</span>
                <span style={{ fontSize: 'clamp(2rem, 8vw, 2.8rem)', fontWeight: 900, color: stato === 'live' ? '#00ff88' : isVittoriaB ? '#00d4ff' : isPareggio ? '#ffd700' : 'rgba(255,255,255,0.5)' }}>{displayPunteggioB}</span>
              </div>
            )}
            {stato === 'live' && <div style={{ fontSize: '0.65rem', color: '#00ff88', marginTop: '0.25rem', letterSpacing: '1px', fontWeight: 700, animation: 'livePulse 1.4s ease-in-out infinite' }}>IN CORSO</div>}
            {stato !== 'pre_partita' && stato !== 'live' && <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', marginTop: '0.25rem' }}>{isVittoriaA ? 'VINCE A' : isVittoriaB ? 'VINCE B' : 'PAREGGIO'}</div>}
          </div>

          {/* LIVE MODE */}
          {stato === 'live' ? (
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>

              {/* Events feed */}
              <div>
                {marcatori.length > 0 || assistman.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {marcatori.map(id => (
                      <div key={`g${id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.65rem', background: 'rgba(0,255,136,0.07)', borderRadius: '8px' }}>
                        <span style={{ color: '#00ff88', fontSize: '0.9rem', flexShrink: 0 }}>⚽</span>
                        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff', flex: 1 }}>{getNome(id)}</span>
                        {(liveEventi[id]?.gol || 0) > 1 && <span style={{ fontSize: '0.78rem', color: '#00ff88', fontWeight: 800 }}>×{liveEventi[id].gol}</span>}
                        <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', padding: '0.1rem 0.3rem' }}>{partita.squadra_a.includes(id) ? 'A' : 'B'}</span>
                      </div>
                    ))}
                    {assistman.map(id => (
                      <div key={`a${id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.65rem', background: 'rgba(0,212,255,0.05)', borderRadius: '8px' }}>
                        <span style={{ color: '#00d4ff', fontSize: '0.9rem', flexShrink: 0 }}>🎯</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)', flex: 1 }}>{getNome(id)}</span>
                        {(liveEventi[id]?.assist || 0) > 1 && <span style={{ fontSize: '0.78rem', color: '#00d4ff', fontWeight: 800 }}>×{liveEventi[id].assist}</span>}
                        <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', padding: '0.1rem 0.3rem' }}>{partita.squadra_a.includes(id) ? 'A' : 'B'}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.22)', fontSize: '0.8rem', fontStyle: 'italic', padding: '0.5rem 0' }}>Nessun evento ancora</div>
                )}
              </div>

              {/* Squadre — verticali, visibili a tutti */}
              {[{ label: 'Squadra A', ids: partita.squadra_a, accent: '#00d4ff', accentBg: 'rgba(0,212,255,0.08)', accentBorder: 'rgba(0,212,255,0.18)' }, { label: 'Squadra B', ids: partita.squadra_b, accent: '#ef4444', accentBg: 'rgba(239,68,68,0.08)', accentBorder: 'rgba(239,68,68,0.18)' }].map(({ label, ids, accent, accentBg, accentBorder }) => (
                <div key={label} style={{ background: accentBg, border: `1px solid ${accentBorder}`, borderRadius: '12px', padding: '0.65rem 0.75rem' }}>
                  <div style={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', color: accent, marginBottom: '0.5rem' }}>{label}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {ids.map(id => (
                      <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '26px', height: '26px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: accentBg, border: `1px solid ${accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem' }}>
                          {getFoto(id) ? <img src={getFoto(id)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} /> : '👤'}
                        </div>
                        <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getNome(id)}</span>
                        {(liveEventi[id]?.gol > 0 || liveEventi[id]?.assist > 0) && (
                          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', flexShrink: 0 }}>
                            {liveEventi[id]?.gol > 0 && `⚽${liveEventi[id].gol}`}{liveEventi[id]?.gol > 0 && liveEventi[id]?.assist > 0 && ' '}{liveEventi[id]?.assist > 0 && `🎯${liveEventi[id].assist}`}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* ADMIN: Controlli Live */}
              {currentUser?.role === 'admin' && (
                <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(0,255,136,0.14)', borderRadius: '14px', padding: '0.85rem 0.85rem 0.75rem' }}>
                  <div style={{ fontSize: '0.58rem', fontWeight: 800, color: 'rgba(0,255,136,0.5)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '0.7rem' }}>Controlli Live</div>

                  <button onClick={() => setShowGoalModal(true)} style={{ width: '100%', padding: '0.9rem', borderRadius: '12px', fontSize: '1rem', fontWeight: 900, border: 'none', cursor: 'pointer', marginBottom: '0.5rem', minHeight: '50px', background: 'linear-gradient(135deg, #00ff88, #00cc66)', color: '#0a1a0f', letterSpacing: '0.5px', boxShadow: '0 4px 14px rgba(0,255,136,0.3)' }}>
                    ⚽ + Gol
                  </button>
                  <button onClick={() => setShowCorreggi(!showCorreggi)} style={{ width: '100%', padding: '0.6rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', marginBottom: '0.5rem', minHeight: '42px', background: showCorreggi ? 'rgba(255,255,255,0.07)' : 'transparent', color: 'rgba(255,255,255,0.5)', transition: 'all 0.2s' }}>
                    ✏️ {showCorreggi ? 'Chiudi correzione' : 'Correggi eventi'}
                  </button>

                  {showCorreggi && (
                    <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '0.75rem', marginBottom: '0.75rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ fontSize: '0.58rem', fontWeight: 800, color: 'rgba(255,255,255,0.25)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '0.6rem' }}>CORREZIONE MANUALE</div>
                      {['A', 'B'].map(team => {
                        const squadra = team === 'A' ? partita.squadra_a : partita.squadra_b
                        return (
                          <div key={team} style={{ marginBottom: team === 'A' ? '0.7rem' : 0 }}>
                            <div style={{ fontSize: '0.58rem', fontWeight: 700, color: team === 'A' ? 'rgba(0,212,255,0.55)' : 'rgba(239,68,68,0.55)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Squadra {team}</div>
                            {squadra.map(id => (
                              <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.28rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                <span style={{ flex: 1, fontSize: '0.75rem', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getNome(id)}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', flexShrink: 0 }}>
                                  <span style={{ fontSize: '0.65rem', color: '#00ff88', minWidth: '24px', textAlign: 'center' }}>⚽{liveEventi[id]?.gol || 0}</span>
                                  {[{ d: 1, c: '#00ff88' }, { d: -1, c: '#ff6b6b', dis: !(liveEventi[id]?.gol > 0) }].map((b, i) => (
                                    <button key={i} onClick={() => aggiornaEventoLive(id, 'gol', b.d)} disabled={b.dis || liveSaving} style={{ minWidth: '28px', minHeight: '28px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, border: 'none', cursor: b.dis ? 'default' : 'pointer', background: b.dis ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)', color: b.dis ? 'rgba(255,255,255,0.12)' : b.c }}>{b.d > 0 ? '+' : '−'}</button>
                                  ))}
                                  <span style={{ fontSize: '0.65rem', color: '#00d4ff', minWidth: '24px', textAlign: 'center' }}>🎯{liveEventi[id]?.assist || 0}</span>
                                  {[{ d: 1, c: '#00d4ff' }, { d: -1, c: 'rgba(255,255,255,0.38)', dis: !(liveEventi[id]?.assist > 0) }].map((b, i) => (
                                    <button key={i} onClick={() => aggiornaEventoLive(id, 'assist', b.d)} disabled={b.dis || liveSaving} style={{ minWidth: '28px', minHeight: '28px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, border: 'none', cursor: b.dis ? 'default' : 'pointer', background: b.dis ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)', color: b.dis ? 'rgba(255,255,255,0.12)' : b.c }}>{b.d > 0 ? '+' : '−'}</button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.6rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(0,255,136,0.12)' }}>
                    <button onClick={() => onChiudiLive(true)} style={{ flex: 1, padding: '0.65rem', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 700, border: '1px solid rgba(0,212,255,0.35)', cursor: 'pointer', background: 'rgba(0,212,255,0.08)', color: '#00d4ff', minHeight: '44px' }}>🗳️ Apri Votazioni</button>
                    <button onClick={() => onChiudiLive(false)} style={{ flex: 1, padding: '0.65rem', borderRadius: '10px', fontSize: '0.82rem', fontWeight: 700, border: '1px solid rgba(255,107,107,0.35)', cursor: 'pointer', background: 'rgba(255,107,107,0.07)', color: '#ff6b6b', minHeight: '44px' }}>■ Chiudi Partita</button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* NON-LIVE: two-column grid + sezione votazioni */
            <>
              {/* STATO VOTAZIONI — solo in_votazione */}
              {stato === 'in_votazione' && (() => {
                const allIds = [...partita.squadra_a, ...partita.squadra_b]
                const voterId = currentUser?.role === 'admin' ? 'admin' : currentUser?.id
                const hannoVotato = (partita.votazioni || []).filter(v => allIds.some(id => String(id) === String(v.voterId)) || v.voterId === 'admin')
                const idHannoVotato = hannoVotato.map(v => String(v.voterId))
                const mancano = allIds.filter(id => !idHannoVotato.includes(String(id)))
                const hoVotatoIo = voterId != null && idHannoVotato.includes(String(voterId))
                const totale = allIds.length
                return (
                  <div style={{ marginBottom: '0.85rem', background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.12)', borderRadius: '12px', padding: '0.75rem 0.85rem' }}>
                    {/* Header contatore */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                      <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(0,212,255,0.6)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Stato votazioni</div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 900, color: hannoVotato.length === totale ? '#00ff88' : '#00d4ff' }}>
                        {hannoVotato.length}/{totale}
                      </div>
                    </div>
                    {/* Barra progresso */}
                    <div style={{ height: '3px', background: 'rgba(255,255,255,0.07)', borderRadius: '2px', marginBottom: '0.65rem', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${totale > 0 ? (hannoVotato.length / totale) * 100 : 0}%`, background: 'linear-gradient(90deg, #00d4ff, #00ff88)', borderRadius: '2px', transition: 'width 0.4s' }} />
                    </div>
                    {/* Hanno votato */}
                    {hannoVotato.length > 0 && (
                      <div style={{ marginBottom: mancano.length > 0 ? '0.55rem' : 0 }}>
                        <div style={{ fontSize: '0.58rem', fontWeight: 700, color: 'rgba(0,255,136,0.55)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '0.3rem' }}>✅ Hanno votato</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                          {hannoVotato.map(v => {
                            const ts = v.timestamp ? new Date(v.timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : null
                            const nome = v.voterName || (v.voterId === 'admin' ? 'Admin' : `#${v.voterId}`)
                            const isMe = String(v.voterId) === String(voterId)
                            return (
                              <span key={String(v.voterId)} style={{ fontSize: '0.7rem', fontWeight: isMe ? 800 : 600, color: isMe ? '#00ff88' : 'rgba(255,255,255,0.75)', background: isMe ? 'rgba(0,255,136,0.08)' : 'rgba(255,255,255,0.05)', border: `1px solid ${isMe ? 'rgba(0,255,136,0.25)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '6px', padding: '0.15rem 0.5rem' }}>
                                {nome}{ts ? <span style={{ opacity: 0.5, fontSize: '0.6rem', marginLeft: '0.25rem' }}>{ts}</span> : null}{isMe ? ' ✓' : ''}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    {/* Mancano */}
                    {mancano.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.58rem', fontWeight: 700, color: 'rgba(255,107,107,0.55)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '0.3rem' }}>⏳ Mancano</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                          {mancano.map(id => {
                            const isMe = String(id) === String(voterId)
                            return (
                              <span key={id} style={{ fontSize: '0.7rem', fontWeight: isMe ? 800 : 500, color: isMe ? '#ff6b6b' : 'rgba(255,255,255,0.38)', background: isMe ? 'rgba(255,107,107,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${isMe ? 'rgba(255,107,107,0.25)' : 'rgba(255,255,255,0.05)'}`, borderRadius: '6px', padding: '0.15rem 0.5rem' }}>
                                {getNome(id)}{isMe ? ' (tu)' : ''}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    {/* Messaggio stato personale */}
                    {hoVotatoIo && (
                      <div style={{ marginTop: '0.55rem', fontSize: '0.68rem', color: 'rgba(0,255,136,0.6)', fontStyle: 'italic' }}>Hai già inviato la tua votazione — puoi modificarla con il bottone qui sopra.</div>
                    )}
                  </div>
                )
              })()}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', position: 'relative', minWidth: 0 }}>
                {/* SQUADRA A */}
                <div style={{ borderRight: '1px solid rgba(255,255,255,0.06)', paddingRight: '0.75rem', minWidth: 0 }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: stato === 'chiusa' && isVittoriaA ? '#00d4ff' : 'rgba(255,255,255,0.4)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    {stato === 'chiusa' && isVittoriaA && <span style={{ color: '#ffd700' }}>👑</span>}Squadra A
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {partita.squadra_a.map((id) => (
                      <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem' }}>
                          {getFoto(id) ? <img src={getFoto(id)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} /> : '👤'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {getNome(id)}{mvp?.playerId === id && <span style={{ marginLeft: '0.2rem', fontSize: '0.65rem', color: '#ffd700' }}>⭐</span>}
                          </div>
                          {(liveEventi[id]?.gol > 0 || liveEventi[id]?.assist > 0) && (
                            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)' }}>
                              {liveEventi[id]?.gol > 0 && `⚽${liveEventi[id].gol} `}{liveEventi[id]?.assist > 0 && `🎯${liveEventi[id].assist}`}
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
                <div style={{ paddingLeft: '0.75rem', minWidth: 0 }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: stato === 'chiusa' && isVittoriaB ? '#00d4ff' : 'rgba(255,255,255,0.4)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.3rem' }}>
                    Squadra B{stato === 'chiusa' && isVittoriaB && <span style={{ color: '#ffd700' }}>👑</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {partita.squadra_b.map((id) => (
                      <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexDirection: 'row-reverse' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem' }}>
                          {getFoto(id) ? <img src={getFoto(id)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} /> : '👤'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {mvp?.playerId === id && <span style={{ marginRight: '0.2rem', fontSize: '0.65rem', color: '#ffd700' }}>⭐</span>}{getNome(id)}
                          </div>
                          {(liveEventi[id]?.gol > 0 || liveEventi[id]?.assist > 0) && (
                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
                              {liveEventi[id]?.gol > 0 && `⚽${liveEventi[id].gol} `}{liveEventi[id]?.assist > 0 && `🎯${liveEventi[id].assist}`}
                            </div>
                          )}
                        </div>
                        {partita.voti_calcolati?.find(v => v.playerId === id) && (
                          <div style={{ fontSize: '0.75rem', fontWeight: 900, color: partita.voti_calcolati.find(v => v.playerId === id).votoFinale >= 7 ? '#00d4ff' : partita.voti_calcolati.find(v => v.playerId === id).votoFinale >= 6 ? '#ffd700' : '#ef4444', minWidth: '28px', textAlign: 'left' }}>
                            {partita.voti_calcolati.find(v => v.playerId === id).votoFinale.toFixed(1)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* CHIUSA: tabellino */}
              {stato === 'chiusa' && (marcatori.length > 0 || assistman.length > 0 || mvp) && (
                <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  {marcatori.length > 0 && (
                    <div style={{ marginBottom: '0.6rem' }}>
                      <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Marcatori</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {marcatori.map(id => (
                          <span key={id} style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', padding: '0.15rem 0.5rem' }}>
                            {getNome(id)} {'⚽'.repeat(Math.min(liveEventi[id]?.gol || 0, 5))}{(liveEventi[id]?.gol || 0) > 5 ? ` ×${liveEventi[id].gol}` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {assistman.length > 0 && (
                    <div style={{ marginBottom: '0.6rem' }}>
                      <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Assist</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {assistman.map(id => (
                          <span key={id} style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', padding: '0.15rem 0.5rem' }}>
                            {getNome(id)} {'🎯'.repeat(Math.min(liveEventi[id]?.assist || 0, 5))}{(liveEventi[id]?.assist || 0) > 5 ? ` ×${liveEventi[id].assist}` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {mvp && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.15)', borderRadius: '8px', padding: '0.4rem 0.75rem' }}>
                      <span style={{ fontSize: '0.7rem', color: '#ffd700' }}>⭐</span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#ffd700' }}>MVP</span>
                      <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)' }}>{getNome(mvp.playerId)}</span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#ffd700', marginLeft: 'auto' }}>{mvp.votoFinale.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* DISPONIBILITÀ — solo pre_partita */}
              {stato === 'pre_partita' && (() => {
                const fissiInSquadra = [...partita.squadra_a, ...partita.squadra_b].filter(id => {
                  const g = giocatori.find(x => x.id === id)
                  return g && !g.is_guest
                })
                if (fissiInSquadra.length === 0) return null
                const presenti = fissiInSquadra.filter(id => disponibilita[id]?.stato === 'presente')
                const forse = fissiInSquadra.filter(id => disponibilita[id]?.stato === 'forse')
                const assenti = fissiInSquadra.filter(id => disponibilita[id]?.stato === 'assente')
                const nonRisposto = fissiInSquadra.filter(id => !disponibilita[id]?.stato)
                const isPlayerFisso = currentUser && !currentUser.is_guest && fissiInSquadra.some(id => String(id) === String(currentUser.id))
                const miaDisp = currentUser ? disponibilita[currentUser.id]?.stato : null
                return (
                  <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '0.65rem' }}>Disponibilità</div>

                    {/* Counter chips riepilogo */}
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.65rem' }}>
                      {[
                        { label: 'Presenti', count: presenti.length, color: '#00ff88', bg: 'rgba(0,255,136,0.08)', border: 'rgba(0,255,136,0.2)' },
                        { label: 'In forse', count: forse.length, color: '#ffd700', bg: 'rgba(255,215,0,0.08)', border: 'rgba(255,215,0,0.2)' },
                        { label: 'Assenti', count: assenti.length, color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
                        { label: 'Non risposto', count: nonRisposto.length, color: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)' },
                      ].map(s => (
                        <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: s.bg, border: `1px solid ${s.border}`, borderRadius: '8px', padding: '0.18rem 0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 900, color: s.color }}>{s.count}</span>
                          <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>{s.label}</span>
                        </div>
                      ))}
                    </div>

                    {/* Lista nomi per gruppo */}
                    {[
                      { ids: presenti, color: '#00ff88', icon: '✓' },
                      { ids: forse, color: '#ffd700', icon: '?' },
                      { ids: assenti, color: '#ef4444', icon: '✗' },
                      { ids: nonRisposto, color: 'rgba(255,255,255,0.25)', icon: '—' },
                    ].filter(gr => gr.ids.length > 0).map((gr, gi) => (
                      <div key={gi} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.3rem' }}>
                        {gr.ids.map(id => {
                          const isMe = String(id) === String(currentUser?.id)
                          return (
                            <span key={id} style={{ fontSize: '0.7rem', fontWeight: isMe ? 800 : 500, color: isMe ? gr.color : 'rgba(255,255,255,0.5)', background: isMe ? `${gr.color}18` : 'rgba(255,255,255,0.04)', border: `1px solid ${isMe ? gr.color + '40' : 'rgba(255,255,255,0.06)'}`, borderRadius: '6px', padding: '0.15rem 0.5rem' }}>
                              {gr.icon} {getNome(id)}{isMe ? ' (tu)' : ''}
                            </span>
                          )
                        })}
                      </div>
                    ))}

                    {/* Bottoni azione — solo player fisso in squadra */}
                    {isPlayerFisso && (
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                        {[
                          { val: 'presente', label: 'Ci sono', color: '#00ff88', rgb: '0,255,136' },
                          { val: 'forse', label: 'In forse', color: '#ffd700', rgb: '255,215,0' },
                          { val: 'assente', label: 'Non ci sono', color: '#ef4444', rgb: '239,68,68' },
                        ].map(btn => {
                          const isActive = miaDisp === btn.val
                          return (
                            <button key={btn.val} onClick={() => salvaDisponibilita(btn.val)}
                              style={{ flex: 1, padding: '0.6rem 0.3rem', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 700, border: `1px solid ${isActive ? btn.color : `rgba(${btn.rgb},0.2)`}`, cursor: 'pointer', minHeight: '44px', background: isActive ? `rgba(${btn.rgb},0.18)` : `rgba(${btn.rgb},0.05)`, color: isActive ? btn.color : `rgba(${btn.rgb},0.5)`, transition: 'all 0.15s' }}>
                              {btn.label}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })()}
            </>
          )}
        </div>
      </div>

      {/* GOAL MODAL — fuori dalla card per evitare clipping */}
      {showGoalModal && (
        <ModalGoalInput
          partita={partita}
          giocatori={giocatori}
          liveEventi={liveEventi}
          onConfirm={registraGol}
          onClose={() => setShowGoalModal(false)}
        />
      )}
    </>
  )
}

function ModalGoalInput({ partita, giocatori, liveEventi, onConfirm, onClose }) {
  const [step, setStep] = useState(1)
  const [team, setTeam] = useState(null)
  const [scorerId, setScorerId] = useState(null)
  const [assistId, setAssistId] = useState(null)
  const [saving, setSaving] = useState(false)

  const getNome = (id) => (giocatori.find(g => g.id === id)?.nome || `#${id}`).replace(/\s*\(.*?\)/g, '').trim()
  const squadra = team === 'A' ? partita.squadra_a : team === 'B' ? partita.squadra_b : []

  async function conferma() {
    setSaving(true)
    await onConfirm(scorerId, assistId === 'nessuno' ? null : assistId)
    setSaving(false)
    onClose()
  }

  const titoli = { 1: 'CHI HA SEGNATO?', 2: 'SCEGLI MARCATORE', 3: 'ASSIST DI?', 4: 'CONFERMA GOL' }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ width: '100%', maxWidth: '480px', background: 'linear-gradient(180deg, rgba(12,18,35,0.99), rgba(8,13,28,1))', border: '1px solid rgba(0,255,136,0.22)', borderBottom: 'none', borderRadius: '22px 22px 0 0', padding: '1.25rem 1.25rem 2.5rem', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>

        {/* Handle */}
        <div style={{ width: '36px', height: '4px', background: 'rgba(255,255,255,0.13)', borderRadius: '2px', margin: '0 auto 1.1rem' }} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#00ff88', letterSpacing: '1.5px', textTransform: 'uppercase' }}>⚽ {titoli[step]}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1, padding: '0.2rem 0.4rem' }}>×</button>
        </div>

        {/* Step bar */}
        <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '1.25rem' }}>
          {[1, 2, 3, 4].map(s => (
            <div key={s} style={{ flex: 1, height: '3px', borderRadius: '2px', background: s <= step ? '#00ff88' : 'rgba(255,255,255,0.08)', transition: 'background 0.3s' }} />
          ))}
        </div>

        {/* Step 1: team */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[{ k: 'A', label: 'Squadra A', color: '#00d4ff', rgb: '0,212,255' }, { k: 'B', label: 'Squadra B', color: '#ef4444', rgb: '239,68,68' }].map(sq => (
              <button key={sq.k} onClick={() => { setTeam(sq.k); setStep(2) }} style={{ padding: '1.1rem', borderRadius: '14px', fontSize: '1rem', fontWeight: 800, border: `2px solid ${sq.color}`, cursor: 'pointer', minHeight: '60px', background: `rgba(${sq.rgb},0.08)`, color: sq.color, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                {sq.label}
              </button>
            ))}
          </div>
        )}

        {/* Step 2: scorer */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {squadra.map(id => (
              <button key={id} onClick={() => { setScorerId(id); setStep(3) }} style={{ padding: '0.9rem 1rem', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 700, border: '1px solid rgba(255,255,255,0.09)', cursor: 'pointer', minHeight: '54px', background: 'rgba(255,255,255,0.04)', color: '#fff', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.1rem' }}>⚽</span>
                <span style={{ flex: 1 }}>{getNome(id)}</span>
                {(liveEventi[id]?.gol || 0) > 0 && <span style={{ fontSize: '0.72rem', color: '#00ff88', fontWeight: 800, background: 'rgba(0,255,136,0.1)', borderRadius: '5px', padding: '0.12rem 0.4rem' }}>{liveEventi[id].gol} gol</span>}
              </button>
            ))}
            <button onClick={() => { setStep(1); setTeam(null) }} style={{ marginTop: '0.5rem', padding: '0.5rem', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.28)', cursor: 'pointer', fontSize: '0.82rem' }}>← Cambia squadra</button>
          </div>
        )}

        {/* Step 3: assist */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button onClick={() => { setAssistId('nessuno'); setStep(4) }} style={{ padding: '0.9rem 1rem', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 700, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', minHeight: '54px', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.38)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ opacity: 0.4, fontSize: '1.1rem' }}>—</span><span>Nessuno</span>
            </button>
            {squadra.filter(id => id !== scorerId).map(id => (
              <button key={id} onClick={() => { setAssistId(id); setStep(4) }} style={{ padding: '0.9rem 1rem', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 700, border: '1px solid rgba(0,212,255,0.12)', cursor: 'pointer', minHeight: '54px', background: 'rgba(0,212,255,0.04)', color: '#fff', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.1rem' }}>🎯</span>
                <span style={{ flex: 1 }}>{getNome(id)}</span>
                {(liveEventi[id]?.assist || 0) > 0 && <span style={{ fontSize: '0.72rem', color: '#00d4ff', fontWeight: 800, background: 'rgba(0,212,255,0.1)', borderRadius: '5px', padding: '0.12rem 0.4rem' }}>{liveEventi[id].assist} ast</span>}
              </button>
            ))}
            <button onClick={() => { setStep(2); setScorerId(null) }} style={{ marginTop: '0.5rem', padding: '0.5rem', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.28)', cursor: 'pointer', fontSize: '0.82rem' }}>← Cambia marcatore</button>
          </div>
        )}

        {/* Step 4: confirm */}
        {step === 4 && (
          <div>
            <div style={{ background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.16)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.25rem' }}>
              <div style={{ marginBottom: '0.9rem' }}>
                <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.28)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Marcatore</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#00ff88' }}>⚽ {getNome(scorerId)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.28)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Assist</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: assistId === 'nessuno' ? 'rgba(255,255,255,0.3)' : '#00d4ff' }}>
                  {assistId === 'nessuno' ? '— Nessuno' : `🎯 ${getNome(assistId)}`}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={conferma} disabled={saving} style={{ flex: 2, padding: '1rem', borderRadius: '14px', fontSize: '1rem', fontWeight: 900, border: 'none', cursor: saving ? 'default' : 'pointer', minHeight: '56px', background: saving ? 'rgba(0,255,136,0.18)' : 'linear-gradient(135deg, #00ff88, #00cc66)', color: '#0a1a0f', boxShadow: saving ? 'none' : '0 4px 14px rgba(0,255,136,0.3)' }}>
                {saving ? '...' : '✓ Conferma Gol'}
              </button>
              <button onClick={() => { setStep(3); setAssistId(null) }} style={{ flex: 1, padding: '1rem', borderRadius: '14px', fontSize: '0.88rem', fontWeight: 700, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', minHeight: '56px', background: 'transparent', color: 'rgba(255,255,255,0.38)' }}>← Indietro</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ModalNuovaPartita({ onClose, onSaved }) {
  const [giocatori, setGiocatori] = useState([])
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [ora, setOra] = useState('')
  const [luogo, setLuogo] = useState('')
  const [note, setNote] = useState('')
  const [formato, setFormato] = useState('5v5')
  const [squadraA, setSquadraA] = useState([])
  const [squadraB, setSquadraB] = useState([])

  useEffect(() => { caricaGiocatori() }, [])

  async function caricaGiocatori() {
    const { data } = await supabase.from('giocatori').select('id, nome, is_guest').order('nome')
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
    const { error } = await supabase.from('partite').insert({
      data,
      ora: ora || null,
      luogo: luogo || null,
      note: note || null,
      formato,
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
          Puoi creare la partita con squadre vuote — i giocatori si iscriveranno autonomamente.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.7)' }}>Data</label>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)}
              style={{ width: '100%', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(0, 212, 255, 0.3)', borderRadius: '12px', padding: '0.75rem', color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.7)' }}>Ora</label>
            <input type="time" value={ora} onChange={(e) => setOra(e.target.value)}
              style={{ width: '100%', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(0, 212, 255, 0.3)', borderRadius: '12px', padding: '0.75rem', color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.7)' }}>Luogo</label>
          <input type="text" value={luogo} onChange={(e) => setLuogo(e.target.value)} placeholder="Es. Campo Sintex, Via Roma…"
            style={{ width: '100%', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(0, 212, 255, 0.3)', borderRadius: '12px', padding: '0.75rem', color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.7)' }}>Note</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Info aggiuntive, variazioni, avvisi…" rows={2}
            style={{ width: '100%', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(0, 212, 255, 0.3)', borderRadius: '12px', padding: '0.75rem', color: '#fff', outline: 'none', resize: 'vertical', fontFamily: 'inherit', fontSize: '0.9rem', boxSizing: 'border-box' }} />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.7)' }}>Formato</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['5v5', '7v7', '8v8', '11v11'].map(f => (
              <button key={f} type="button" onClick={() => setFormato(f)}
                style={{ flex: 1, padding: '0.7rem 0.5rem', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 800, border: `2px solid ${formato === f ? '#00d4ff' : 'rgba(0,212,255,0.2)'}`, cursor: 'pointer', background: formato === f ? 'rgba(0,212,255,0.18)' : 'rgba(0,0,0,0.3)', color: formato === f ? '#00d4ff' : 'rgba(255,255,255,0.4)', transition: 'all 0.15s', letterSpacing: '0.5px' }}>
                {f}
              </button>
            ))}
          </div>
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
                <div key={g.id} style={{ background: 'rgba(0, 0, 0, 0.3)', border: `1px solid ${g.is_guest ? 'rgba(255,165,0,0.18)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '10px', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ flex: 1, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.nome}</span>
                    {g.is_guest && <span style={{ flexShrink: 0, fontSize: '0.6rem', fontWeight: 800, color: '#ffa500', background: 'rgba(255,165,0,0.12)', border: '1px solid rgba(255,165,0,0.35)', borderRadius: '4px', padding: '0.08rem 0.32rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>G</span>}
                  </span>
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
      const votoEsistente = partita.votazioni?.find(v => String(v.voterId) === String(voterId))
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

    // Fetch fresco dal DB per non sovrascrivere voti di altri voter
    const { data: partitaFresca, error: fetchErr } = await supabase
      .from('partite')
      .select('votazioni')
      .eq('id', partita.id)
      .single()
    if (fetchErr) { alert('Errore nel recupero dati: ' + fetchErr.message); return }

    // String() su entrambi i lati per evitare mismatch numero/stringa
    const votazioniFresche = (partitaFresca.votazioni || []).filter(v => String(v.voterId) !== String(voterId))
    votazioniFresche.push({ voterId, voterName: currentUser.nome, voti, timestamp: new Date().toISOString() })

    const { error } = await supabase.from('partite').update({ votazioni: votazioniFresche }).eq('id', partita.id)
    if (error) { alert('Errore: ' + error.message); return }
    alert('✓ Voti salvati!')
    onSaved()
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