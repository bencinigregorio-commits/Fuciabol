import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

function Admin() {
  const [partite, setPartite] = useState([])
  const [giocatori, setGiocatori] = useState([])
  const [uploadingId, setUploadingId] = useState(null)
  const [showNuovoGiocatore, setShowNuovoGiocatore] = useState(false)
  const [editingGiocatore, setEditingGiocatore] = useState(null)

  useEffect(() => { caricaDati() }, [])

  async function caricaDati() {
    const { data: partiteData } = await supabase.from('partite').select('*').order('data', { ascending: false })
    const { data: giocatoriData } = await supabase.from('giocatori').select('*').order('nome')
    if (partiteData) setPartite(partiteData)
    if (giocatoriData) setGiocatori(giocatoriData)
  }

  async function uploadFoto(giocatoreId, file) {
    if (!file) return
    setUploadingId(giocatoreId)
    try {
      const giocatore = giocatori.find(g => g.id === giocatoreId)
      if (giocatore?.foto_url) {
        const oldPath = giocatore.foto_url.split('/').pop()
        await supabase.storage.from('foto-giocatori').remove([oldPath])
      }
      const ext = file.name.split('.').pop()
      const fileName = `giocatore_${giocatoreId}_${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('foto-giocatori').upload(fileName, file, { upsert: true })
      if (uploadError) { alert('Errore upload: ' + uploadError.message); return }
      const { data: urlData } = supabase.storage.from('foto-giocatori').getPublicUrl(fileName)
      await supabase.from('giocatori').update({ foto_url: urlData.publicUrl }).eq('id', giocatoreId)
      alert('✓ Foto caricata!')
      caricaDati()
    } catch (e) {
      alert('Errore: ' + e.message)
    } finally {
      setUploadingId(null)
    }
  }

  async function rimuoviFoto(giocatoreId) {
    if (!confirm('Rimuovere la foto di questo giocatore?')) return
    const giocatore = giocatori.find(g => g.id === giocatoreId)
    if (giocatore?.foto_url) {
      const fileName = giocatore.foto_url.split('/').pop()
      await supabase.storage.from('foto-giocatori').remove([fileName])
    }
    await supabase.from('giocatori').update({ foto_url: null }).eq('id', giocatoreId)
    alert('✓ Foto rimossa!')
    caricaDati()
  }

  async function eliminaPartita(partita) {
    if (!confirm(`Sei sicuro di voler eliminare la partita del ${new Date(partita.data).toLocaleDateString('it-IT')}?\n\nQuesta azione è irreversibile.`)) return
    if (!partita.votazioni_aperte && partita.voti_calcolati) {
      const allPlayers = [...partita.squadra_a, ...partita.squadra_b]
      for (const playerId of allPlayers) {
        const giocatore = giocatori.find(g => g.id === playerId)
        if (!giocatore) continue
        const votoCalc = partita.voti_calcolati.find(v => v.playerId === playerId)
        if (!votoCalc) continue
        const nuoviPuntiForma = giocatore.forma_punti - votoCalc.puntiForma
        const votiStorico = (giocatore.voti_storico || []).filter(v => v.matchId !== partita.id)
        await supabase.from('giocatori').update({ forma_punti: nuoviPuntiForma, voti_storico: votiStorico }).eq('id', playerId)
      }
    }
    const { error } = await supabase.from('partite').delete().eq('id', partita.id)
    if (error) alert('Errore: ' + error.message)
    else { alert('✓ Partita eliminata!'); caricaDati() }
  }

  async function riapriVotazioni(partita) {
    if (!confirm('Vuoi riaprire le votazioni per questa partita?')) return
    const { error } = await supabase.from('partite').update({ votazioni_aperte: true, stato: 'in_votazione' }).eq('id', partita.id)
    if (error) alert('Errore: ' + error.message)
    else { alert('✓ Votazioni riaperte!'); caricaDati() }
  }

  async function riapriLive(partita) {
    const haVotiApplicati = partita.voti_calcolati && partita.voti_calcolati.length > 0
    const msg = haVotiApplicati
      ? 'Vuoi riaprire questa partita in modalità Live?\n\n⚠️ Attenzione: i voti erano già stati calcolati e applicati agli overall dei giocatori.\nSe dopo le correzioni richiudi aprendo le votazioni, i punti verranno calcolati una seconda volta.\n\nProcedere?'
      : 'Vuoi riaprire questa partita in modalità Live per correggere gol/assist/tabellino?'
    if (!confirm(msg)) return
    const { error } = await supabase.from('partite').update({ stato: 'live' }).eq('id', partita.id)
    if (error) alert('Errore: ' + error.message)
    else { alert('✓ Partita riaperta in Live!'); caricaDati() }
  }

  async function riapriVotazioniDaChiusa(partita) {
    const haVotiApplicati = partita.voti_calcolati && partita.voti_calcolati.length > 0
    const msg = haVotiApplicati
      ? '⚠️ Attenzione!\n\nI voti di questa partita erano già stati calcolati e applicati agli overall dei giocatori.\n\nSe riapri le votazioni e le richiudi di nuovo, i punti verranno calcolati una seconda volta — causando un doppio aggiornamento degli overall.\n\nProcedere comunque?'
      : 'Vuoi riaprire le votazioni per questa partita?'
    if (!confirm(msg)) return
    const { error } = await supabase.from('partite').update({ votazioni_aperte: true, stato: 'in_votazione' }).eq('id', partita.id)
    if (error) alert('Errore: ' + error.message)
    else { alert('✓ Votazioni riaperte!'); caricaDati() }
  }

  async function resetTutto() {
    if (!confirm('⚠️ ATTENZIONE!\n\nQuesta azione eliminerà:\n- TUTTE le partite\n- Tutti gli overall torneranno a 65\n- Tutto lo storico voti\n\nSei SICURO?')) return
    if (!confirm('ULTIMA CONFERMA: questa azione è IRREVERSIBILE!')) return
    for (const g of giocatori) {
      await supabase.from('giocatori').update({ overall: 65, forma_punti: 0, voti_storico: [] }).eq('id', g.id)
    }
    await supabase.from('partite').delete().neq('id', 0)
    alert('✓ Sistema resettato completamente!')
    caricaDati()
  }

  async function eliminaGiocatore(giocatore) {
    if (!confirm(`Sei sicuro di voler eliminare ${giocatore.nome}?\n\nQuesta azione è irreversibile.`)) return
    const { error } = await supabase.from('giocatori').delete().eq('id', giocatore.id)
    if (error) alert('Errore: ' + error.message)
    else { alert('✓ Giocatore eliminato!'); caricaDati() }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: 0 }}>
        <div style={{
          width: '52px', height: '52px', borderRadius: '16px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(145deg, rgba(0,212,255,0.12), rgba(10,16,30,0.9))',
          border: '1px solid rgba(0,212,255,0.28)',
          boxShadow: '0 0 18px rgba(0,212,255,0.18), 0 4px 18px rgba(0,0,0,0.4)'
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07M8.46 8.46a5 5 0 0 0 0 7.07"/>
          </svg>
        </div>
        <div>
          <h1 style={{ margin: '0 0 0.3rem 0', fontSize: 'clamp(1.4rem, 5vw, 1.75rem)', fontWeight: 900, letterSpacing: '3px', lineHeight: 1, fontFamily: 'system-ui, -apple-system, sans-serif', textTransform: 'uppercase', background: 'linear-gradient(135deg, #fff 0%, #e0f8ff 55%, #00d4ff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Admin Room</h1>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.38)', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' }}>Gestione completa del sistema.</p>
        </div>
      </div>
      <div style={{ height: '1px', background: 'linear-gradient(90deg, rgba(0,212,255,0.55), rgba(0,212,255,0.1), transparent)', margin: '1.1rem 0 1.75rem' }} />

      {/* GESTIONE GIOCATORI */}
      <div style={{ background: 'rgba(15, 23, 41, 0.6)', border: '1px solid rgba(0, 212, 255, 0.2)', borderRadius: '15px', padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>👥 Gestione Giocatori ({giocatori.length})</h2>
          <button onClick={() => setShowNuovoGiocatore(true)} style={{ background: 'linear-gradient(135deg, #00d4ff, #0099ff)', border: 'none', borderRadius: '10px', padding: '0.6rem 1.2rem', color: '#0f1729', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
            + Nuovo Giocatore
          </button>
        </div>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {giocatori.map(g => (
            <div key={g.id} style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '12px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '45px', height: '45px', borderRadius: '50%', background: g.foto_url ? 'transparent' : 'linear-gradient(135deg, #00d4ff, #0099ff)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', border: '2px solid rgba(0, 212, 255, 0.3)' }}>
                  {g.foto_url ? <img src={g.foto_url} alt={g.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👤'}
                </div>
                <div>
                  <div style={{ fontWeight: 700 }}>{g.nome}</div>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)' }}>{g.ruolo} • OVR {g.overall} • PIN: {g.pin} • 💰 {g.crediti ?? 500}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => setEditingGiocatore(g)} style={{ background: 'rgba(0, 212, 255, 0.1)', border: '1px solid rgba(0, 212, 255, 0.3)', borderRadius: '8px', padding: '0.5rem 1rem', color: '#00d4ff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
                  ✏️ Modifica
                </button>
                <button onClick={() => eliminaGiocatore(g)} style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '0.5rem 1rem', color: '#ef4444', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FOTO GIOCATORI */}
      <div style={{ background: 'rgba(15, 23, 41, 0.6)', border: '1px solid rgba(0, 212, 255, 0.2)', borderRadius: '15px', padding: '1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1.5rem' }}>📸 Foto Giocatori</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          {giocatori.map(g => (
            <div key={g.id} style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '1rem', textAlign: 'center' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 0.75rem', overflow: 'hidden', background: g.foto_url ? 'transparent' : 'linear-gradient(135deg, #00d4ff, #0099ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', border: '2px solid rgba(0, 212, 255, 0.3)' }}>
                {g.foto_url ? <img src={g.foto_url} alt={g.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👤'}
              </div>
              <div style={{ fontWeight: 700, marginBottom: '0.25rem', fontSize: '0.9rem' }}>{g.nome}</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)', marginBottom: '0.75rem' }}>{g.ruolo}</div>
              <label style={{ display: 'block', background: 'rgba(0, 212, 255, 0.1)', border: '1px solid rgba(0, 212, 255, 0.3)', borderRadius: '8px', padding: '0.5rem', fontSize: '0.8rem', fontWeight: 700, color: '#00d4ff', cursor: 'pointer', marginBottom: '0.5rem' }}>
                {uploadingId === g.id ? '⏳ Caricando...' : g.foto_url ? '🔄 Cambia foto' : '📸 Carica foto'}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => e.target.files[0] && uploadFoto(g.id, e.target.files[0])} disabled={uploadingId !== null} />
              </label>
              {g.foto_url && (
                <button onClick={() => rimuoviFoto(g.id)} style={{ width: '100%', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '0.5rem', fontSize: '0.8rem', fontWeight: 700, color: '#ef4444', cursor: 'pointer' }}>
                  🗑️ Rimuovi
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Zona Pericolosa */}
      <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '15px', padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: '1.5rem' }}>⚠️</div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#ef4444' }}>Zona Pericolosa</h2>
        </div>
        <p style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '1rem' }}>Azioni irreversibili - usare con estrema cautela</p>
        <button onClick={resetTutto} style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.5)', borderRadius: '10px', padding: '0.75rem 1.5rem', color: '#ef4444', fontWeight: 700, cursor: 'pointer' }}>
          🗑️ Reset Completo Sistema
        </button>
      </div>

      {/* Gestione Partite */}
      <div style={{ background: 'rgba(15, 23, 41, 0.6)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '15px', padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1rem' }}>Gestione Partite ({partite.length})</h2>
        {partite.length === 0 ? (
          <p style={{ color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center', padding: '2rem' }}>Nessuna partita registrata</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {partite.map(p => (
              <div key={p.id} style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '12px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{new Date(p.data).toLocaleDateString('it-IT')}</div>
                  <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                    {p.stato === 'pre_partita' ? '🟡 In programma'
                      : p.stato === 'live' ? '🟢 Live'
                      : p.stato === 'in_votazione' ? `🔵 In votazione • ${p.votazioni?.length || 0} voti`
                      : `✅ Chiusa • ${p.punteggio_a}-${p.punteggio_b}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {p.stato === 'in_votazione' && (
                    <button onClick={() => riapriVotazioni(p)} style={{ background: 'rgba(0, 212, 255, 0.1)', border: '1px solid rgba(0, 212, 255, 0.3)', borderRadius: '8px', padding: '0.5rem 1rem', color: '#00d4ff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
                      🔓 Riapri
                    </button>
                  )}
                  {p.stato === 'chiusa' && (
                    <>
                      <button onClick={() => riapriLive(p)} style={{ background: 'rgba(0, 255, 136, 0.08)', border: '1px solid rgba(0, 255, 136, 0.3)', borderRadius: '8px', padding: '0.5rem 1rem', color: '#00ff88', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
                        ▶ Riapri Live
                      </button>
                      <button onClick={() => riapriVotazioniDaChiusa(p)} style={{ background: 'rgba(0, 212, 255, 0.08)', border: '1px solid rgba(0, 212, 255, 0.3)', borderRadius: '8px', padding: '0.5rem 1rem', color: '#00d4ff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
                        🗳️ Riapri Votazioni
                      </button>
                    </>
                  )}
                  <button onClick={() => eliminaPartita(p)} style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '0.5rem 1rem', color: '#ef4444', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
                    🗑️ Elimina
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showNuovoGiocatore && <ModalGiocatore onClose={() => setShowNuovoGiocatore(false)} onSaved={() => { setShowNuovoGiocatore(false); caricaDati() }} />}
      {editingGiocatore && <ModalGiocatore giocatore={editingGiocatore} onClose={() => setEditingGiocatore(null)} onSaved={() => { setEditingGiocatore(null); caricaDati() }} />}
    </div>
  )
}

function ModalGiocatore({ giocatore, onClose, onSaved }) {
  const [nome, setNome] = useState(giocatore?.nome || '')
  const [ruolo, setRuolo] = useState(giocatore?.ruolo || 'CC')
  const [pin, setPin] = useState(giocatore?.pin || '')
  const [overall, setOverall] = useState(giocatore?.overall || 65)
  const [crediti, setCrediti] = useState(giocatore?.crediti || 500)
  const [loading, setLoading] = useState(false)

  const ruoli = ['ATT', 'CC', 'DC', 'POR', 'CC/DC', 'ATT/CC', 'DC/CC', 'POR/CC', 'DC/ATT', 'ATT/POR']

  async function salva() {
    if (!nome.trim()) { alert('Inserisci il nome!'); return }
    if (!pin.trim()) { alert('Inserisci il PIN!'); return }
    if (pin === '1234') { alert("Il PIN 1234 è riservato all'admin!"); return }
    setLoading(true)
    try {
      if (giocatore) {
        const { error } = await supabase.from('giocatori').update({ nome, ruolo, pin, overall: parseInt(overall), crediti: parseInt(crediti) }).eq('id', giocatore.id)
        if (error) { alert('Errore: ' + error.message); return }
        alert('✓ Giocatore aggiornato!')
      } else {
        const { error } = await supabase.from('giocatori').insert([{ nome, ruolo, pin, overall: parseInt(overall), crediti: parseInt(crediti), forma_punti: 0, voti_storico: [] }])
        if (error) { alert('Errore: ' + error.message); return }
        alert('✓ Giocatore aggiunto!')
      }
      onSaved()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50, backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ background: 'rgba(15, 23, 41, 0.98)', border: '1px solid rgba(0, 212, 255, 0.3)', borderRadius: '20px', padding: '2rem', maxWidth: '500px', width: '100%' }} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '1.5rem' }}>
          {giocatore ? '✏️ Modifica Giocatore' : '➕ Nuovo Giocatore'}
        </h2>
        <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.4rem', fontWeight: 600 }}>Nome</label>
            <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Es. Mario Rossi" style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: '10px', padding: '0.75rem', color: '#fff', fontSize: '1rem' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.4rem', fontWeight: 600 }}>Ruolo</label>
            <select value={ruolo} onChange={e => setRuolo(e.target.value)} style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: '10px', padding: '0.75rem', color: '#fff', fontSize: '1rem' }}>
              {ruoli.map(r => <option key={r} value={r} style={{ background: '#0f1729' }}>{r}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.4rem', fontWeight: 600 }}>PIN</label>
            <input value={pin} onChange={e => setPin(e.target.value)} placeholder="Es. 5678" maxLength={6} style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: '10px', padding: '0.75rem', color: '#fff', fontSize: '1rem' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.4rem', fontWeight: 600 }}>Overall (55-99)</label>
              <input type="number" value={overall} onChange={e => setOverall(e.target.value)} min={55} max={99} style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: '10px', padding: '0.75rem', color: '#fff', fontSize: '1rem', textAlign: 'center' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.4rem', fontWeight: 600 }}>Crediti iniziali</label>
              <input type="number" value={crediti} onChange={e => setCrediti(e.target.value)} min={0} style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: '10px', padding: '0.75rem', color: '#fff', fontSize: '1rem', textAlign: 'center' }} />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={salva} disabled={loading} style={{ flex: 1, background: 'linear-gradient(135deg, #00d4ff, #0099ff)', border: 'none', borderRadius: '12px', padding: '1rem', color: '#0f1729', fontWeight: 700, cursor: 'pointer', fontSize: '1rem' }}>
            {loading ? '⏳ Salvando...' : giocatore ? '✓ SALVA MODIFICHE' : '✓ AGGIUNGI'}
          </button>
          <button onClick={onClose} style={{ flex: 1, background: 'rgba(100,116,139,0.3)', border: 'none', borderRadius: '12px', padding: '1rem', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
            ANNULLA
          </button>
        </div>
      </div>
    </div>
  )
}

export default Admin
