import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

function Dashboard({ currentUser }) {
  const [giocatore, setGiocatore] = useState(null)
  const [partite, setPartite] = useState([])
  const [scommesse, setScommesse] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (currentUser?.id) {
      caricaDati()
    }
  }, [currentUser])

  async function caricaDati() {
    const { data: giocatoreData } = await supabase
      .from('giocatori')
      .select('*')
      .eq('id', currentUser.id)
      .single()

    const { data: partiteData } = await supabase
      .from('partite')
      .select('*')
      .eq('votazioni_aperte', false)

    const { data: scommesseData } = await supabase
      .from('scommesse')
      .select('*')
      .eq('giocatore_id', currentUser.id)
      .order('created_at', { ascending: false })

    if (giocatoreData) setGiocatore(giocatoreData)
    if (scommesseData) setScommesse(scommesseData)
    if (partiteData) {
      const miePartite = partiteData.filter(p => 
        [...p.squadra_a, ...p.squadra_b].includes(currentUser.id)
      )
      setPartite(miePartite)
    }
    setLoading(false)
  }

  if (loading || !giocatore) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255, 255, 255, 0.5)' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚡</div>
        <div>Caricamento...</div>
      </div>
    )
  }

  const currentOvr = giocatore.overall
  let soglia
  if (currentOvr >= 95) soglia = 15
  else if (currentOvr >= 90) soglia = 10
  else if (currentOvr >= 85) soglia = 7
  else if (currentOvr >= 75) soglia = 5
  else if (currentOvr >= 65) soglia = 3
  else soglia = 2

  const puntiForma = giocatore.forma_punti || 0
  const progressoPercentuale = Math.min(100, (Math.abs(puntiForma) / soglia) * 100)
  const puntiMancanti = puntiForma >= 0 ? soglia - puntiForma : soglia + puntiForma

  const ultimi5Voti = (giocatore.voti_storico || [])
    .slice(-5)
    .reverse()
    .map(v => v.votoFinale)

  const mediaVoti = ultimi5Voti.length > 0
    ? (ultimi5Voti.reduce((sum, v) => sum + v, 0) / ultimi5Voti.length).toFixed(2)
    : '-'

  let golTotali = 0
  let assistTotali = 0
  partite.forEach(p => {
    const eventi = p.eventi?.[currentUser.id] || {}
    golTotali += eventi.gol || 0
    assistTotali += eventi.assist || 0
  })

  // Stats scommesse
  const scommesseVinte = scommesse.filter(s => s.esito === 'vinta').length
  const scommessePerse = scommesse.filter(s => s.esito === 'persa').length
  const guadagniTotali = scommesse
    .filter(s => s.esito === 'vinta')
    .reduce((sum, s) => sum + s.vincita, 0)

  return (
    <div>
      {/* Header Giocatore */}
      <div style={{
        background: 'rgba(15, 23, 41, 0.6)',
        border: '1px solid rgba(0, 212, 255, 0.2)',
        borderRadius: '20px',
        padding: '2rem',
        marginBottom: '2rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '300px',
          height: '100%',
          background: 'radial-gradient(circle at center, rgba(0, 212, 255, 0.1), transparent)',
          pointerEvents: 'none'
        }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', position: 'relative', zIndex: 1 }}>
          <div style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #00d4ff, #0099ff)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '3rem',
            fontWeight: 900,
            color: '#0f1729',
            boxShadow: '0 8px 30px rgba(0, 212, 255, 0.4)',
            border: '3px solid rgba(15, 23, 41, 0.8)'
          }}>
            {giocatore.overall}
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.5rem' }}>
              {giocatore.nome}
            </h1>
            <div style={{ fontSize: '1.2rem', color: '#00d4ff', fontWeight: 700 }}>
              {giocatore.ruolo}
            </div>
          </div>
        </div>
      </div>

      {/* CREDITI */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(255, 165, 0, 0.1))',
        border: '1px solid rgba(255, 215, 0, 0.4)',
        borderRadius: '20px',
        padding: '1.5rem 2rem',
        marginBottom: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ fontSize: '0.85rem', color: 'rgba(255, 215, 0, 0.7)', fontWeight: 600, marginBottom: '0.25rem', letterSpacing: '0.5px' }}>
            💰 I TUOI CREDITI
          </div>
          <div style={{ fontSize: '3rem', fontWeight: 900, color: '#ffd700', lineHeight: 1 }}>
            {giocatore.crediti ?? 500}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#00d4ff' }}>{scommesseVinte}</div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>Vinte</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ef4444' }}>{scommessePerse}</div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>Perse</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ffd700' }}>+{guadagniTotali}</div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>Guadagnati</div>
          </div>
        </div>
      </div>

      {/* Barra Progresso Overall */}
      <div style={{
        background: 'rgba(15, 23, 41, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '20px',
        padding: '2rem',
        marginBottom: '2rem'
      }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>📊</span> Progresso Overall
        </h2>

        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '2rem', fontWeight: 900, color: puntiForma >= 0 ? '#00d4ff' : '#ef4444' }}>
              {puntiForma >= 0 ? '+' : ''}{puntiForma}
            </span>
            <span style={{ color: 'rgba(255, 255, 255, 0.5)', marginLeft: '0.5rem' }}>punti forma</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.5)' }}>
              {puntiForma >= 0 ? 'Mancano' : 'Devi risalire'}
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
              {Math.abs(puntiMancanti)} punti
            </div>
          </div>
        </div>

        <div style={{
          width: '100%',
          height: '30px',
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '15px',
          overflow: 'hidden',
          position: 'relative',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          <div style={{
            width: `${progressoPercentuale}%`,
            height: '100%',
            background: puntiForma >= 0 
              ? 'linear-gradient(90deg, #00d4ff, #0099ff)'
              : 'linear-gradient(90deg, #ef4444, #dc2626)',
            borderRadius: '15px',
            transition: 'all 0.5s',
            boxShadow: puntiForma >= 0
              ? '0 0 20px rgba(0, 212, 255, 0.5)'
              : '0 0 20px rgba(239, 68, 68, 0.5)'
          }} />
        </div>

        <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.5)' }}>
          {puntiForma >= 0 
            ? `🔥 ${progressoPercentuale.toFixed(0)}% verso ${currentOvr + 1} OVR`
            : `⚠️ ${progressoPercentuale.toFixed(0)}% vicino a ${currentOvr - 1} OVR`
          }
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard icon="⚽" label="Gol Totali" value={golTotali} color="#00d4ff" />
        <StatCard icon="🎯" label="Assist Totali" value={assistTotali} color="#0099ff" />
        <StatCard icon="📅" label="Partite Giocate" value={partite.length} color="#00d4ff" />
        <StatCard icon="📊" label="Media Ultimi 5" value={mediaVoti} color="#0099ff" />
      </div>

      {/* Ultimi Voti */}
      {ultimi5Voti.length > 0 && (
        <div style={{
          background: 'rgba(15, 23, 41, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '20px',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>📈</span> Ultime Prestazioni
          </h2>
          <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto' }}>
            {ultimi5Voti.map((voto, i) => (
              <div key={i} style={{
                minWidth: '80px',
                padding: '1rem',
                background: voto >= 7 ? 'rgba(0, 212, 255, 0.1)' : voto >= 6 ? 'rgba(0, 153, 255, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `2px solid ${voto >= 7 ? '#00d4ff' : voto >= 6 ? '#0099ff' : '#ef4444'}`,
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: voto >= 7 ? '#00d4ff' : voto >= 6 ? '#0099ff' : '#ef4444' }}>
                  {voto.toFixed(1)}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '0.5rem' }}>
                  Partita {ultimi5Voti.length - i}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ultime Scommesse */}
      {scommesse.length > 0 && (
        <div style={{
          background: 'rgba(15, 23, 41, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '20px',
          padding: '2rem'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🎰</span> Ultime Scommesse
          </h2>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {scommesse.slice(0, 5).map(s => (
              <div key={s.id} style={{
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                border: `1px solid ${s.esito === 'vinta' ? 'rgba(0, 212, 255, 0.3)' : s.esito === 'persa' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.05)'}`
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                    {s.tipo === 'risultato' ? '🏆 Risultato' : s.tipo === 'migliore_in_campo' ? '⭐ Migliore in campo' : '⚽ Capocannoniere'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                    Puntata: {s.importo} • Quota: {s.quota}x
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ 
                    fontWeight: 900, 
                    fontSize: '1.1rem',
                    color: s.esito === 'vinta' ? '#00d4ff' : s.esito === 'persa' ? '#ef4444' : '#ffd700'
                  }}>
                    {s.esito === 'vinta' ? `+${s.vincita}` : s.esito === 'persa' ? `-${s.importo}` : '⏳'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                    {s.esito === 'pending' ? 'In attesa' : s.esito}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, color }) {
  return (
    <div style={{
      background: 'rgba(15, 23, 41, 0.6)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '15px',
      padding: '1.5rem',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{icon}</div>
      <div style={{ fontSize: '2rem', fontWeight: 900, color, marginBottom: '0.25rem' }}>
        {value}
      </div>
      <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.5)' }}>{label}</div>
    </div>
  )
}

export default Dashboard