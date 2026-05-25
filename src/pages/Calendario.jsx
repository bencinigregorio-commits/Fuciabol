import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { calcolaVotoFinale, votoToPuntiForma, aggiornaOverall } from './calcoli.js'
import { calcolaQuoteRisultato, calcolaQuoteMiglioreInCampo, calcolaQuoteCapocannoniere, verificaVincitaRisultato, verificaVincitaMiglioreInCampo, verificaVincitaCapocannoniere } from './scommesse.jsx'

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

      {showVoting && <ModalVotazioni partita={showVoting} currentUser={currentUser} onClose={() => setShowVoting(null)} onSaved={() => { setShowVoting(null); caricaPartite() }} />}
      {showScommessa && <ModalScommessa partita={showScommessa} currentUser={currentUser} onClose={() => setShowScommessa(null)} onSaved={() => { setShowScommessa(null); caricaPartite() }} />}
      {showRisultato && <ModalRisultato partita={showRisultato} onClose={() => setShowRisultato(null)} onSaved={() => { setShowRisultato(null); caricaPartite() }} />}
    </div>
  )
}

function PartitaCard({ partita, currentUser, onVoteClick, onChiudiVoti, onScommessaClick, onRisultatoClick }) {
  const [giocatori, setGiocatori] = useState([])
  const [scommesse, setScommesse] = useState([])

  useEffect(() => { caricaDati() }, [partita])

  async function caricaDati() {
    const allPlayers = [...partita.squadra_a, ...partita.squadra_b]
    const { data: g } = await supabase.from('giocatori').select('*').in('id', allPlayers)
    if (g) setGiocatori(g)

    if (currentUser && currentUser.role !== 'admin') {
      const { data: s } = await supabase.from('scommesse').select('*').eq('partita_id', partita.id).eq('giocatore_id', currentUser.id)
      if (s) setScommesse(s)
    }
  }

  const getNome = (id) => giocatori.find(g => g.id === id)?.nome || '???'
  const getOverall = (id) => giocatori.find(g => g.id === id)?.overall || 65

  const ovrA = partita.squadra_a.reduce((sum, id) => sum + getOverall(id), 0) / partita.squadra_a.length
  const ovrB = partita.squadra_b.reduce((sum, id) => sum + getOverall(id), 0) / partita.squadra_b.length

  const isAdmin = currentUser?.role === 'admin'
  const hasVoted = partita.votazioni?.some(v => v.voterId === (isAdmin ? 'admin' : currentUser?.id))

  const { punteggio_a = 0, punteggio_b = 0, stato = 'pre_partita', votazioni_aperte = false, voti_calcolati = [] } = partita

  const canVote = stato === 'in_votazione' && votazioni_aperte && !hasVoted
  const canBet = stato === 'pre_partita' && currentUser?.role !== 'admin'

  const dataPartita = new Date(partita.data).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })

  const riassuntoScommesse = scommesse.map(s => `${s.tipo} (${s.importo} cr) — ${s.esito === 'pending' ? '⏳' : s.esito === 'vinta' ? '✅ +' + s.vincita : '❌'}`).join(' • ')

  return (
    <div style={{ background: 'rgba(15, 23, 41, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '20px', padding: '1.5rem', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 600 }}>{dataPartita}</span>
          {stato === 'pre_partita' && <span style={{ background: 'rgba(100, 116, 139, 0.3)', padding: '0.25rem 0.75rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255, 255, 255, 0.7)' }}>IN ATTESA</span>}
          {stato === 'in_votazione' && <span style={{ background: 'rgba(0, 212, 255, 0.2)', padding: '0.25rem 0.75rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, color: '#00d4ff' }}>VOTAZIONE</span>}
          {stato === 'chiusa' && <span style={{ background: 'rgba(34, 197, 94, 0.2)', padding: '0.25rem 0.75rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, color: '#22c55e' }}>CHIUSA</span>}
        </div>
        {isAdmin && stato === 'pre_partita' && (
          <button onClick={onRisultatoClick} style={{ background: 'linear-gradient(135deg, #00d4ff, #0099ff)', border: 'none', borderRadius: '10px', padding: '0.5rem 1rem', color: '#0f1729', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', boxShadow: '0 4px 12px rgba(0, 212, 255, 0.3)' }}>
            📝 Inserisci Risultato
          </button>
        )}
        {isAdmin && stato === 'in_votazione' && votazioni_aperte && (
          <button onClick={() => onChiudiVoti(partita)} style={{ background: 'linear-gradient(135deg, #ffd700, #ffa500)', border: 'none', borderRadius: '10px', padding: '0.5rem 1rem', color: '#0f1729', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', boxShadow: '0 4px 12px rgba(255, 215, 0, 0.3)' }}>
            🔒 Chiudi Votazioni
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1.5rem', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)', marginBottom: '0.5rem', fontWeight: 600 }}>SQUADRA A • OVR {ovrA.toFixed(0)}</div>
          {partita.squadra_a.map(id => (
            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{getNome(id)}</span>
              {partita.eventi?.[id]?.gol > 0 && <span style={{ fontSize: '0.75rem' }}>⚽ {partita.eventi[id].gol}</span>}
              {partita.eventi?.[id]?.assist > 0 && <span style={{ fontSize: '0.75rem' }}>🎯 {partita.eventi[id].assist}</span>}
              {voti_calcolati.find(v => v.playerId === id) && <span style={{ fontSize: '0.75rem', color: '#ffd700', marginLeft: 'auto' }}>★ {voti_calcolati.find(v => v.playerId === id).votoFinale.toFixed(1)}</span>}
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', fontSize: '3rem', fontWeight: 900, color: '#00d4ff', minWidth: '80px' }}>
          {stato === 'pre_partita' ? 'VS' : `${punteggio_a} - ${punteggio_b}`}
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)', marginBottom: '0.5rem', fontWeight: 600 }}>SQUADRA B • OVR {ovrB.toFixed(0)}</div>
          {partita.squadra_b.map(id => (
            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{getNome(id)}</span>
              {partita.eventi?.[id]?.gol > 0 && <span style={{ fontSize: '0.75rem' }}>⚽ {partita.eventi[id].gol}</span>}
              {partita.eventi?.[id]?.assist > 0 && <span style={{ fontSize: '0.75rem' }}>🎯 {partita.eventi[id].assist}</span>}
              {voti_calcolati.find(v => v.playerId === id) && <span style={{ fontSize: '0.75rem', color: '#ffd700', marginLeft: 'auto' }}>★ {voti_calcolati.find(v => v.playerId === id).votoFinale.toFixed(1)}</span>}
            </div>
          ))}
        </div>
      </div>

      {canBet && (
        <div style={{ marginBottom: '1rem' }}>
          <button onClick={onScommessaClick} style={{ width: '100%', background: 'linear-gradient(135deg, #ffd700, #ffa500)', border: 'none', borderRadius: '12px', padding: '0.75rem', color: '#0f1729', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem', boxShadow: '0 4px 15px rgba(255, 215, 0, 0.3)', transition: 'all 0.2s' }}
            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}>
            🎰 SCOMMETTI
          </button>
        </div>
      )}

      {scommesse.length > 0 && (
        <div style={{ background: 'rgba(0, 0, 0, 0.3)', borderRadius: '10px', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.7)' }}>
          <strong>Le tue scommesse:</strong> {riassuntoScommesse || 'Nessuna'}
        </div>
      )}

      {canVote && (
        <div style={{ marginTop: '1rem' }}>
          <button onClick={onVoteClick} style={{ width: '100%', background: 'linear-gradient(135deg, #00d4ff, #0099ff)', border: 'none', borderRadius: '12px', padding: '0.75rem', color: '#0f1729', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem', boxShadow: '0 4px 15px rgba(0, 212, 255, 0.3)', transition: 'all 0.2s' }}
            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}>
            {hasVoted ? '✓ HAI VOTATO' : '🗳️ VOTA ORA'}
          </button>
        </div>
      )}

      {stato === 'chiusa' && voti_calcolati.length > 0 && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(0, 212, 255, 0.1)', borderRadius: '12px', border: '1px solid rgba(0, 212, 255, 0.2)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#00d4ff', marginBottom: '0.5rem' }}>📊 Voti Finali</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.5rem' }}>
            {voti_calcolati.map(v => (
              <div key={v.playerId} style={{ fontSize: '0.75rem' }}>
                {getNome(v.playerId)}: <span style={{ color: '#ffd700', fontWeight: 700 }}>{v.votoFinale.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ModalNuovaPartita({ onClose, onSaved }) {
  const [giocatori, setGiocatori] = useState([])
  const [squadraA, setSquadraA] = useState([])
  const [squadraB, setSquadraB] = useState([])
  const [data, setData] = useState(new Date().toISOString().slice(0, 10))

  useEffect(() => { caricaGiocatori() }, [])

  async function caricaGiocatori() {
    const { data } = await supabase.from('giocatori').select('*').order('nome')
    if (data) setGiocatori(data)
  }

  function toggleSquadra(gid, squadra) {
    if (squadra === 'A') {
      if (squadraA.includes(gid)) setSquadraA(squadraA.filter(x => x !== gid))
      else { setSquadraA([...squadraA, gid]); setSquadraB(squadraB.filter(x => x !== gid)) }
    } else {
      if (squadraB.includes(gid)) setSquadraB(squadraB.filter(x => x !== gid))
      else { setSquadraB([...squadraB, gid]); setSquadraA(squadraA.filter(x => x !== gid)) }
    }
  }

  async function salva() {
    if (squadraA.length === 0 || squadraB.length === 0) {
      alert('Entrambe le squadre devono avere almeno 1 giocatore')
      return
    }
    const { error } = await supabase.from('partite').insert([{ data, squadra_a: squadraA, squadra_b: squadraB, stato: 'pre_partita' }])
    if (error) alert('Errore: ' + error.message)
    else onSaved()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50, backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ background: 'rgba(15, 23, 41, 0.95)', border: '1px solid rgba(0, 212, 255, 0.2)', borderRadius: '20px', padding: '2rem', maxWidth: '900px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem' }}>⚽ Nuova Partita</h2>
        <div style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '1.5rem' }}>Seleziona i giocatori per ciascuna squadra.</div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.7)' }}>Data Partita</label>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} style={{ width: '100%', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(0, 212, 255, 0.3)', borderRadius: '10px', padding: '0.75rem', color: '#fff', fontSize: '1rem' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem', color: '#00d4ff' }}>SQUADRA A ({squadraA.length})</div>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {giocatori.map(g => (
                <div key={g.id} onClick={() => toggleSquadra(g.id, 'A')} style={{ background: squadraA.includes(g.id) ? 'rgba(0, 212, 255, 0.2)' : 'rgba(0, 0, 0, 0.3)', border: `2px solid ${squadraA.includes(g.id) ? '#00d4ff' : 'rgba(255, 255, 255, 0.1)'}`, borderRadius: '10px', padding: '0.75rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' }}>
                  <span style={{ fontWeight: 600 }}>{g.nome}</span>
                  <span style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)' }}>OVR {g.overall}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem', color: '#ffa500' }}>SQUADRA B ({squadraB.length})</div>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {giocatori.map(g => (
                <div key={g.id} onClick={() => toggleSquadra(g.id, 'B')} style={{ background: squadraB.includes(g.id) ? 'rgba(255, 165, 0, 0.2)' : 'rgba(0, 0, 0, 0.3)', border: `2px solid ${squadraB.includes(g.id) ? '#ffa500' : 'rgba(255, 255, 255, 0.1)'}`, borderRadius: '10px', padding: '0.75rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' }}>
                  <span style={{ fontWeight: 600 }}>{g.nome}</span>
                  <span style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)' }}>OVR {g.overall}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={salva} style={{ flex: 1, background: 'linear-gradient(135deg, #00d4ff, #0099ff)', border: 'none', borderRadius: '12px', padding: '1rem', color: '#0f1729', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 15px rgba(0, 212, 255, 0.4)', transition: 'all 0.2s' }}
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

function ModalRisultato({ partita, onClose, onSaved }) {
  const [giocatori, setGiocatori] = useState([])
  const [punteggio_a, setPunteggio_a] = useState(partita.punteggio_a || 0)
  const [punteggio_b, setPunteggio_b] = useState(partita.punteggio_b || 0)
  const [eventi, setEventi] = useState(partita.eventi || {})

  useEffect(() => { caricaDati() }, [])

  async function caricaDati() {
    const allIds = [...partita.squadra_a, ...partita.squadra_b]
    const { data } = await supabase.from('giocatori').select('*').in('id', allIds)
    if (data) setGiocatori(data)
  }

  function updateEvento(playerId, field, value) {
    setEventi(prev => ({ ...prev, [playerId]: { ...prev[playerId], [field]: Math.max(0, parseInt(value) || 0) } }))
  }

  async function salvaRisultato() {
    const { error } = await supabase
      .from('partite')
      .update({ punteggio_a, punteggio_b, eventi, stato: 'in_votazione', votazioni_aperte: true })
      .eq('id', partita.id)

    if (error) alert('Errore: ' + error.message)
    else onSaved()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50, backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ background: 'rgba(15, 23, 41, 0.95)', border: '1px solid rgba(0, 212, 255, 0.2)', borderRadius: '20px', padding: '2rem', maxWidth: '900px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem' }}>📝 Inserisci Risultato</h2>
        <div style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '1.5rem' }}>Inserisci punteggio, gol e assist.</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: '#00d4ff' }}>Punteggio Squadra A</label>
            <input type="number" value={punteggio_a} onChange={(e) => setPunteggio_a(parseInt(e.target.value) || 0)} style={{ width: '100%', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(0, 212, 255, 0.3)', borderRadius: '10px', padding: '0.75rem', color: '#fff', fontSize: '1.5rem', textAlign: 'center', fontWeight: 700 }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: '#ffa500' }}>Punteggio Squadra B</label>
            <input type="number" value={punteggio_b} onChange={(e) => setPunteggio_b(parseInt(e.target.value) || 0)} style={{ width: '100%', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 165, 0, 0.3)', borderRadius: '10px', padding: '0.75rem', color: '#fff', fontSize: '1.5rem', textAlign: 'center', fontWeight: 700 }} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem', color: '#00d4ff' }}>SQUADRA A</div>
            {partita.squadra_a.map(id => {
              const g = giocatori.find(x => x.id === id)
              return (
                <div key={id} style={{ background: 'rgba(0, 0, 0, 0.3)', borderRadius: '10px', padding: '1rem', marginBottom: '0.75rem' }}>
                  <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>{g?.nome || id}</div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>Gol</label>
                      <input type="number" value={eventi[id]?.gol || 0} onChange={(e) => updateEvento(id, 'gol', e.target.value)} style={{ width: '100%', background: 'rgba(0, 212, 255, 0.1)', border: '1px solid rgba(0, 212, 255, 0.3)', borderRadius: '8px', padding: '0.5rem', color: '#fff', textAlign: 'center' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>Assist</label>
                      <input type="number" value={eventi[id]?.assist || 0} onChange={(e) => updateEvento(id, 'assist', e.target.value)} style={{ width: '100%', background: 'rgba(0, 212, 255, 0.1)', border: '1px solid rgba(0, 212, 255, 0.3)', borderRadius: '8px', padding: '0.5rem', color: '#fff', textAlign: 'center' }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem', color: '#ffa500' }}>SQUADRA B</div>
            {partita.squadra_b.map(id => {
              const g = giocatori.find(x => x.id === id)
              return (
                <div key={id} style={{ background: 'rgba(0, 0, 0, 0.3)', borderRadius: '10px', padding: '1rem', marginBottom: '0.75rem' }}>
                  <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>{g?.nome || id}</div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>Gol</label>
                      <input type="number" value={eventi[id]?.gol || 0} onChange={(e) => updateEvento(id, 'gol', e.target.value)} style={{ width: '100%', background: 'rgba(255, 165, 0, 0.1)', border: '1px solid rgba(255, 165, 0, 0.3)', borderRadius: '8px', padding: '0.5rem', color: '#fff', textAlign: 'center' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>Assist</label>
                      <input type="number" value={eventi[id]?.assist || 0} onChange={(e) => updateEvento(id, 'assist', e.target.value)} style={{ width: '100%', background: 'rgba(255, 165, 0, 0.1)', border: '1px solid rgba(255, 165, 0, 0.3)', borderRadius: '8px', padding: '0.5rem', color: '#fff', textAlign: 'center' }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={salvaRisultato} style={{ flex: 1, background: 'linear-gradient(135deg, #00d4ff, #0099ff)', border: 'none', borderRadius: '12px', padding: '1rem', color: '#0f1729', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 15px rgba(0, 212, 255, 0.4)', transition: 'all 0.2s' }}
            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'} onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}>
            SALVA & APRI VOTAZIONI
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
  const [tab, setTab] = useState('risultato')
  const [importo, setImporto] = useState(10)
  const [sceltaRisultato, setSceltaRisultato] = useState(null)
  const [sceltaMigliore, setSceltaMigliore] = useState(null)
  const [sceltaCapo, setSceltaCapo] = useState(null)
  const [quoteRisultato, setQuoteRisultato] = useState({})
  const [quoteMigliore, setQuoteMigliore] = useState({})
  const [quoteCapo, setQuoteCapo] = useState({})

  useEffect(() => { caricaDati() }, [])

  async function caricaDati() {
    const allIds = [...partita.squadra_a, ...partita.squadra_b]
    const { data: g } = await supabase.from('giocatori').select('*').in('id', allIds)
    if (g) {
      setGiocatori(g)
      const qr = calcolaQuoteRisultato(partita, g)
      const qm = calcolaQuoteMiglioreInCampo(partita, g)
      const qc = calcolaQuoteCapocannoniere(partita, g)
      setQuoteRisultato(qr)
      setQuoteMigliore(qm)
      setQuoteCapo(qc)
    }
  }

  async function salvaScommessa(tipo, scelta, quota) {
    if (!scelta) { alert('Seleziona una scelta'); return }
    if (importo < 5 || importo > (currentUser.crediti - 1)) { alert('Importo non valido'); return }

    const { error: errCrediti } = await supabase.from('giocatori').update({ crediti: currentUser.crediti - importo }).eq('id', currentUser.id)
    if (errCrediti) { alert('Errore: ' + errCrediti.message); return }

    const { error } = await supabase.from('scommesse').insert([{ partita_id: partita.id, giocatore_id: currentUser.id, tipo, scelta: scelta.toString(), importo, quota }])
    if (error) alert('Errore: ' + error.message)
    else onSaved()
  }

  const getNome = (id) => giocatori.find(g => g.id === id)?.nome || '???'
  const allIds = [...partita.squadra_a, ...partita.squadra_b]
  const importoValido = Math.max(5, Math.min(importo, currentUser.crediti - 1))

  const opzioniRisultato = [
    { key: 'squadra_a', label: 'SQUADRA A', quota: quoteRisultato.squadra_a || 0 },
    { key: 'pareggio', label: 'PAREGGIO', quota: quoteRisultato.pareggio || 0 },
    { key: 'squadra_b', label: 'SQUADRA B', quota: quoteRisultato.squadra_b || 0 }
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50, backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ background: 'rgba(15, 23, 41, 0.95)', border: '1px solid rgba(255, 215, 0, 0.3)', borderRadius: '20px', padding: '2rem', maxWidth: '700px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem' }}>🎰 Piazza Scommessa</h2>
        <div style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '1.5rem' }}>Crediti disponibili: {currentUser.crediti || 500}</div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.7)' }}>Importo (min 5, max {currentUser.crediti - 1})</label>
          <input type="number" value={importo} onChange={(e) => setImporto(parseInt(e.target.value) || 5)} min={5} max={currentUser.crediti - 1} style={{ width: '100%', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 215, 0, 0.3)', borderRadius: '10px', padding: '0.75rem', color: '#fff', fontSize: '1.5rem', textAlign: 'center', fontWeight: 700 }} />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {['risultato', 'migliore', 'capocannoniere'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, background: tab === t ? 'rgba(255, 215, 0, 0.2)' : 'rgba(0, 0, 0, 0.3)', border: `2px solid ${tab === t ? '#ffd700' : 'rgba(255, 255, 255, 0.1)'}`, borderRadius: '10px', padding: '0.75rem', color: tab === t ? '#ffd700' : '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', textTransform: 'uppercase', transition: 'all 0.2s' }}>
              {t === 'risultato' ? '1X2' : t === 'migliore' ? 'MVP' : 'TOP SCORER'}
            </button>
          ))}
        </div>

        {tab === 'risultato' && (
          <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {opzioniRisultato.map(opt => (
              <div key={opt.key} onClick={() => setSceltaRisultato(opt.key)} style={{ background: sceltaRisultato === opt.key ? 'rgba(255, 215, 0, 0.2)' : 'rgba(0, 0, 0, 0.3)', border: `2px solid ${sceltaRisultato === opt.key ? '#ffd700' : 'rgba(255, 255, 255, 0.1)'}`, borderRadius: '12px', padding: '1rem 1.5rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' }}>
                <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{opt.label}</div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: sceltaRisultato === opt.key ? '#ffd700' : '#fff' }}>{opt.quota}</div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)', marginTop: '0.5rem' }}>Vinci: {Math.floor(importoValido * opt.quota)} cr.</div>
                </div>
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
