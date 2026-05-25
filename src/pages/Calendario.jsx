import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { calcolaVotoFinale, votoToPuntiForma, aggiornaOverall } from './calcoli'
import { calcolaQuoteRisultato, calcolaQuoteMiglioreInCampo, calcolaQuoteCapocannoniere, verificaVincitaRisultato, verificaVincitaMiglioreInCampo, verificaVincitaCapocannoniere } from './scommesse'

function Calendario({ currentUser }) {
  const [partite, setPartite] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [showVoting, setShowVoting] = useState(null)
  const [showScommessa, setShowScommessa] = useState(null)
  const [showRisultato, setShowRisultato] = useState(null)

  useEffect(() => { caricaPartite() }, [])

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
    const { data } = await supabase.from('giocatori').select('id, nome').in('id', ids)
    if (data) setGiocatori(data)
  }

  async function caricaScommessa() {
    const { data } = await supabase
      .from('scommesse')
      .select('id')
      .eq('partita_id', partita.id)
      .eq('giocatore_id', currentUser.id)
      .limit(1)
    if (data && data.length > 0) setHasScommesso(true)
  }

  const getNome = (id) => giocatori.find(g => g.id === id)?.nome || `#${id}`

  const dataStr = new Date(partita.data).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })

  const stato = partita.stato || 'chiusa'
  const allPlayers = [...partita.squadra_a, ...partita.squadra_b]
  const isInSquadra = allPlayers.includes(currentUser?.id)
  const canVote = currentUser && (currentUser.role === 'admin' || isInSquadra)
  const canScommettere = currentUser?.role === 'player' && stato === 'pre_partita'
  const hasVoted = partita.votazioni?.some(v => v.voterId === (currentUser?.role === 'admin' ? 'admin' : currentUser?.id))
  const isVittoriaA = partita.punteggio_a > partita.punteggio_b
  const isVittoriaB = partita.punteggio_b > partita.punteggio_a

  // Colore bordo in base allo stato
  const borderColor = stato === 'pre_partita'
    ? 'rgba(255, 215, 0, 0.4)'
    : stato === 'in_votazione'
    ? 'rgba(0, 212, 255, 0.4)'
    : 'rgba(255, 255, 255, 0.05)'

  const borderHover = stato === 'pre_partita'
    ? 'rgba(255, 215, 0, 0.7)'
    : stato === 'in_votazione'
    ? 'rgba(0, 212, 255, 0.7)'
    : 'rgba(255, 255, 255, 0.1)'

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: 'rgba(15, 23, 41, 0.6)',
        border: `1px solid ${isHovered ? borderHover : borderColor}`,
        borderRadius: '20px',
        padding: '2rem',
        transition: 'all 0.3s',
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: isHovered ? '0 8px 30px rgba(0, 212, 255, 0.2)' : 'none'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.9rem', fontWeight: 600, letterSpacing: '0.5px' }}>
            {dataStr.toUpperCase()}
          </div>
          {/* Badge stato */}
          <span style={{
            padding: '0.25rem 0.75rem',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: 700,
            background: stato === 'pre_partita' ? 'rgba(255, 215, 0, 0.15)' : stato === 'in_votazione' ? 'rgba(0, 212, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            color: stato === 'pre_partita' ? '#ffd700' : stato === 'in_votazione' ? '#00d4ff' : 'rgba(255, 255, 255, 0.5)',
            border: `1px solid ${stato === 'pre_partita' ? 'rgba(255, 215, 0, 0.3)' : stato === 'in_votazione' ? 'rgba(0, 212, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`
          }}>
            {stato === 'pre_partita' ? '🟡 In programma' : stato === 'in_votazione' ? '🔵 Votazioni aperte' : '✅ Chiusa'}
          </span>
        </div>

        {/* Pulsanti azione */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>

          {/* PRE_PARTITA: Scommetti (giocatori) + Inserisci Risultato (admin) */}
          {stato === 'pre_partita' && (
            <>
              {canScommettere && (
                <button onClick={onScommessaClick} style={{
                  padding: '0.5rem 1rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700, border: 'none', cursor: 'pointer',
                  background: hasScommesso ? 'linear-gradient(135deg, #00d4ff, #0099ff)' : 'linear-gradient(135deg, #ffd700, #ffa500)',
                  color: '#0f1729',
                  boxShadow: hasScommesso ? '0 2px 10px rgba(0, 212, 255, 0.3)' : '0 2px 10px rgba(255, 215, 0, 0.3)',
                  transition: 'all 0.2s'
                }}
                  onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                  onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                >
                  {hasScommesso ? '✅ Scommesso' : '🎰 Scommetti'}
                </button>
              )}
              {currentUser?.role === 'admin' && (
                <button onClick={onRisultatoClick} style={{
                  padding: '0.5rem 1rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #00d4ff, #0099ff)',
                  color: '#0f1729',
                  boxShadow: '0 2px 10px rgba(0, 212, 255, 0.3)',
                  transition: 'all 0.2s'
                }}
                  onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                  onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                >
                  📝 Inserisci Risultato
                </button>
              )}
            </>
          )}

          {/* IN_VOTAZIONE: Vota + Chiudi (admin) */}
          {stato === 'in_votazione' && (
            <>
              {canVote && (
                <button onClick={onVoteClick} style={{
                  padding: '0.5rem 1rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700, border: 'none', cursor: 'pointer',
                  background: hasVoted ? 'linear-gradient(135deg, #ffd700, #ffa500)' : 'linear-gradient(135deg, #00d4ff, #0099ff)',
                  color: '#0f1729',
                  boxShadow: hasVoted ? '0 2px 10px rgba(255, 215, 0, 0.3)' : '0 2px 10px rgba(0, 212, 255, 0.3)',
                  transition: 'all 0.2s'
                }}
                  onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                  onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                >
                  {hasVoted ? '✏️ Modifica' : '🗳️ Vota'}
                </button>
              )}
              {currentUser?.role === 'admin' && partita.votazioni?.length > 0 && (
                <button onClick={onChiudiVoti} style={{
                  padding: '0.5rem 1rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #9333ea, #7c3aed)',
                  color: '#fff',
                  boxShadow: '0 2px 10px rgba(147, 51, 234, 0.3)',
                  transition: 'all 0.2s'
                }}
                  onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                  onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                >
                  🔒 Chiudi Votazioni
                </button>
              )}
            </>
          )}

          {/* CHIUSA */}
          {stato === 'chiusa' && (
            <span style={{
              padding: '0.5rem 1rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700,
              background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'rgba(255, 255, 255, 0.5)'
            }}>
              ✓ Chiusa
            </span>
          )}
        </div>
      </div>

      {/* Punteggio - mostrato solo se non pre_partita */}
      {stato === 'pre_partita' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '2rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', color: '#3b82f6' }}>SQUADRA A</div>
            <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.6 }}>
              {partita.squadra_a.map((id, i) => <div key={i}>{getNome(id)}</div>)}
            </div>
          </div>
          <div style={{ background: 'rgba(255, 215, 0, 0.1)', border: '1px solid rgba(255, 215, 0, 0.3)', borderRadius: '15px', padding: '1.5rem 2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ffd700' }}>DA GIOCARE</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', color: '#ef4444' }}>SQUADRA B</div>
            <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.6 }}>
              {partita.squadra_b.map((id, i) => <div key={i}>{getNome(id)}</div>)}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '2rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', color: isVittoriaA ? '#00d4ff' : 'rgba(255, 255, 255, 0.5)' }}>
              SQUADRA A {isVittoriaA && '👑'}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.6 }}>
              {partita.squadra_a.map((id, i) => (
                <div key={i} style={{ marginBottom: '0.25rem' }}>
                  {getNome(id)}
                  {partita.eventi?.[id]?.gol > 0 && ` ⚽${partita.eventi[id].gol}`}
                  {partita.eventi?.[id]?.assist > 0 && ` 🎯${partita.eventi[id].assist}`}
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(0, 212, 255, 0.2)', borderRadius: '15px', padding: '1.5rem 2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3.5rem', fontWeight: 900, lineHeight: 1 }}>
              <span style={{ color: isVittoriaA ? '#00d4ff' : '#fff' }}>{partita.punteggio_a}</span>
              <span style={{ color: 'rgba(255, 255, 255, 0.3)', margin: '0 0.5rem' }}>-</span>
              <span style={{ color: isVittoriaB ? '#00d4ff' : '#fff' }}>{partita.punteggio_b}</span>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', color: isVittoriaB ? '#00d4ff' : 'rgba(255, 255, 255, 0.5)' }}>
              SQUADRA B {isVittoriaB && '👑'}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)', lineHeight: 1.6 }}>
              {partita.squadra_b.map((id, i) => (
                <div key={i} style={{ marginBottom: '0.25rem' }}>
                  {getNome(id)}
                  {partita.eventi?.[id]?.gol > 0 && ` ⚽${partita.eventi[id].gol}`}
                  {partita.eventi?.[id]?.assist > 0 && ` 🎯${partita.eventi[id].assist}`}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {partita.votazioni?.length > 0 && stato !== 'pre_partita' && (
        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center' }}>
          {partita.votazioni.length} {partita.votazioni.length === 1 ? 'voto registrato' : 'voti registrati'}
        </div>
      )}
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