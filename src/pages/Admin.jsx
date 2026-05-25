import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

function Admin() {
  const [partite, setPartite] = useState([])
  const [giocatori, setGiocatori] = useState([])
  const [uploadingId, setUploadingId] = useState(null)

  useEffect(() => {
    caricaDati()
  }, [])

  async function caricaDati() {
    const { data: partiteData } = await supabase
      .from('partite')
      .select('*')
      .order('data', { ascending: false })
    
    const { data: giocatoriData } = await supabase
      .from('giocatori')
      .select('*')
      .order('nome')
    
    if (partiteData) setPartite(partiteData)
    if (giocatoriData) setGiocatori(giocatoriData)
  }

  async function uploadFoto(giocatoreId, file) {
    if (!file) return
    setUploadingId(giocatoreId)

    try {
      // Cancella foto precedente se esiste
      const giocatore = giocatori.find(g => g.id === giocatoreId)
      if (giocatore?.foto_url) {
        const oldPath = giocatore.foto_url.split('/').pop()
        await supabase.storage.from('foto-giocatori').remove([oldPath])
      }

      // Upload nuova foto
      const ext = file.name.split('.').pop()
      const fileName = `giocatore_${giocatoreId}_${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('foto-giocatori')
        .upload(fileName, file, { upsert: true })

      if (uploadError) { alert('Errore upload: ' + uploadError.message); return }

      // Ottieni URL pubblica
      const { data: urlData } = supabase.storage
        .from('foto-giocatori')
        .getPublicUrl(fileName)

      // Salva URL nel database
      await supabase
        .from('giocatori')
        .update({ foto_url: urlData.publicUrl })
        .eq('id', giocatoreId)

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

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ fontSize: '3rem' }}>⚙️</div>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.25rem' }}>Pannello Admin</h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.95rem' }}>Gestione completa del sistema.</p>
        </div>
      </div>

      {/* FOTO GIOCATORI */}
      <div style={{
        background: 'rgba(15, 23, 41, 0.6)',
        border: '1px solid rgba(0, 212, 255, 0.2)',
        borderRadius: '15px',
        padding: '1.5rem',
        marginBottom: '2rem'
      }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          📸 Foto Giocatori
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          {giocatori.map(g => (
            <div key={g.id} style={{
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '1rem',
              textAlign: 'center'
            }}>
              {/* Foto o placeholder */}
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                margin: '0 auto 0.75rem',
                overflow: 'hidden',
                background: g.foto_url ? 'transparent' : 'linear-gradient(135deg, #00d4ff, #0099ff)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                border: '2px solid rgba(0, 212, 255, 0.3)'
              }}>
                {g.foto_url ? (
                  <img src={g.foto_url} alt={g.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  '👤'
                )}
              </div>

              <div style={{ fontWeight: 700, marginBottom: '0.25rem', fontSize: '0.9rem' }}>{g.nome}</div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)', marginBottom: '0.75rem' }}>{g.ruolo}</div>

              {/* Upload button */}
              <label style={{
                display: 'block',
                background: uploadingId === g.id ? 'rgba(0, 212, 255, 0.05)' : 'rgba(0, 212, 255, 0.1)',
                border: '1px solid rgba(0, 212, 255, 0.3)',
                borderRadius: '8px',
                padding: '0.5rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#00d4ff',
                cursor: 'pointer',
                marginBottom: '0.5rem',
                transition: 'all 0.2s'
              }}>
                {uploadingId === g.id ? '⏳ Caricando...' : g.foto_url ? '🔄 Cambia foto' : '📸 Carica foto'}
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => e.target.files[0] && uploadFoto(g.id, e.target.files[0])}
                  disabled={uploadingId !== null}
                />
              </label>

              {/* Rimuovi foto */}
              {g.foto_url && (
                <button
                  onClick={() => rimuoviFoto(g.id)}
                  style={{
                    width: '100%',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    padding: '0.5rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#ef4444',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.2)'}
                  onMouseOut={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.1)'}
                >
                  🗑️ Rimuovi
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Zona Pericolosa */}
      <div style={{
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '15px',
        padding: '1.5rem',
        marginBottom: '2rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: '1.5rem' }}>⚠️</div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#ef4444' }}>Zona Pericolosa</h2>
        </div>
        <p style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '1rem' }}>
          Azioni irreversibili - usare con estrema cautela
        </p>
        <button
          onClick={resetTutto}
          style={{
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid rgba(239, 68, 68, 0.5)',
            borderRadius: '10px',
            padding: '0.75rem 1.5rem',
            color: '#ef4444',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => {
            e.target.style.background = 'rgba(239, 68, 68, 0.3)'
            e.target.style.borderColor = 'rgba(239, 68, 68, 0.7)'
          }}
          onMouseOut={(e) => {
            e.target.style.background = 'rgba(239, 68, 68, 0.2)'
            e.target.style.borderColor = 'rgba(239, 68, 68, 0.5)'
          }}
        >
          🗑️ Reset Completo Sistema
        </button>
      </div>

      {/* Gestione Partite */}
      <div style={{
        background: 'rgba(15, 23, 41, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '15px',
        padding: '1.5rem'
      }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1rem' }}>
          Gestione Partite ({partite.length})
        </h2>
        
        {partite.length === 0 ? (
          <p style={{ color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center', padding: '2rem' }}>
            Nessuna partita registrata
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {partite.map(p => (
              <div key={p.id} style={{
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>
                    {new Date(p.data).toLocaleDateString('it-IT')}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                    {p.stato === 'pre_partita' ? '🟡 In programma' : p.stato === 'in_votazione' ? `🔵 In votazione • ${p.votazioni?.length || 0} voti` : `✅ Chiusa • ${p.punteggio_a}-${p.punteggio_b}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {p.stato === 'in_votazione' && (
                    <button
                      onClick={() => riapriVotazioni(p)}
                      style={{
                        background: 'rgba(0, 212, 255, 0.1)',
                        border: '1px solid rgba(0, 212, 255, 0.3)',
                        borderRadius: '8px',
                        padding: '0.5rem 1rem',
                        color: '#00d4ff',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => e.target.style.background = 'rgba(0, 212, 255, 0.2)'}
                      onMouseOut={(e) => e.target.style.background = 'rgba(0, 212, 255, 0.1)'}
                    >
                      🔓 Riapri
                    </button>
                  )}
                  <button
                    onClick={() => eliminaPartita(p)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '8px',
                      padding: '0.5rem 1rem',
                      color: '#ef4444',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.2)'}
                    onMouseOut={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.1)'}
                  >
                    🗑️ Elimina
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Admin