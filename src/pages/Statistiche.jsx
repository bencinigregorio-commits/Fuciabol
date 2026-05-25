import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

function Statistiche() {
  const [giocatori, setGiocatori] = useState([])
  const [partite, setPartite] = useState([])
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    caricaDati()
  }, [])

  async function caricaDati() {
    const { data: giocatoriData } = await supabase
      .from('giocatori')
      .select('*')
      .order('overall', { ascending: false })

    const { data: partiteData } = await supabase
      .from('partite')
      .select('*')
      .eq('stato', 'chiusa')

    if (giocatoriData) setGiocatori(giocatoriData)
    if (partiteData) setPartite(partiteData)
  }

  const giocatoriConStats = giocatori.map(g => {
    let gol = 0, assist = 0, partiteGiocate = 0
    let vittorie = 0, pareggi = 0, sconfitte = 0

    partite.forEach(p => {
      const allPlayers = [...p.squadra_a, ...p.squadra_b]
      if (!allPlayers.includes(g.id)) return
      partiteGiocate++
      const eventi = p.eventi?.[g.id] || {}
      gol += eventi.gol || 0
      assist += eventi.assist || 0
      const isSquadraA = p.squadra_a.includes(g.id)
      if (p.punteggio_a > p.punteggio_b) { if (isSquadraA) vittorie++; else sconfitte++ }
      else if (p.punteggio_a < p.punteggio_b) { if (isSquadraA) sconfitte++; else vittorie++ }
      else pareggi++
    })

    const votiStorico = g.voti_storico || []
    const mediaVoti = votiStorico.length > 0
      ? (votiStorico.reduce((sum, v) => sum + v.votoFinale, 0) / votiStorico.length).toFixed(2)
      : '-'

    const winRate = partiteGiocate > 0 ? ((vittorie / partiteGiocate) * 100).toFixed(0) : 0

    return { ...g, gol, assist, partiteGiocate, vittorie, pareggi, sconfitte, mediaVoti, winRate }
  })

  return (
    <div>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes cardGlow {
          0%, 100% { box-shadow: 0 4px 20px rgba(0, 212, 255, 0.1); }
          50% { box-shadow: 0 8px 40px rgba(0, 212, 255, 0.3); }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', animation: 'fadeInUp 0.4s ease' }}>
        <div style={{ fontSize: '3rem' }}>📊</div>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.25rem' }}>Statistiche</h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.95rem' }}>
            Numeri e prestazioni di ogni giocatore.
          </p>
        </div>
      </div>

      {/* Grid Giocatori */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '1.5rem'
      }}>
        {giocatoriConStats.map((g, i) => (
          <PlayerCard
            key={g.id}
            giocatore={g}
            index={i}
            isSelected={selected === g.id}
            onClick={() => setSelected(selected === g.id ? null : g.id)}
          />
        ))}
      </div>

      {/* Modal dettaglio */}
      {selected && (() => {
        const g = giocatoriConStats.find(x => x.id === selected)
        if (!g) return null
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(4px)' }} onClick={() => setSelected(null)}>
            <div style={{ background: 'rgba(15, 23, 41, 0.98)', border: '1px solid rgba(0, 212, 255, 0.3)', borderRadius: '20px', padding: '2rem', maxWidth: '500px', width: '90%', animation: 'fadeInUp 0.3s ease' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Foto */}
                <div style={{ width: '100px', height: '100px', borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg, #00d4ff, #0099ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '3px solid rgba(0, 212, 255, 0.4)' }}>
                  {g.foto_url
                    ? <img src={g.foto_url} alt={g.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: '2.5rem', fontWeight: 900, color: '#0f1729' }}>{g.overall}</span>
                  }
                </div>
                <div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '0.25rem' }}>{g.nome}</div>
                  <div style={{ color: '#00d4ff', fontWeight: 700, marginBottom: '0.5rem' }}>{g.ruolo}</div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <span style={{ background: 'rgba(0, 212, 255, 0.15)', border: '1px solid rgba(0, 212, 255, 0.3)', borderRadius: '20px', padding: '0.25rem 0.75rem', fontSize: '0.85rem', fontWeight: 700, color: '#00d4ff' }}>
                      OVR {g.overall}
                    </span>
                    <span style={{ background: 'rgba(255, 215, 0, 0.15)', border: '1px solid rgba(255, 215, 0, 0.3)', borderRadius: '20px', padding: '0.25rem 0.75rem', fontSize: '0.85rem', fontWeight: 700, color: '#ffd700' }}>
                      {g.winRate}% WR
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {[
                  { label: 'Partite', value: g.partiteGiocate, color: '#fff' },
                  { label: 'Vittorie', value: g.vittorie, color: '#00d4ff' },
                  { label: 'Pareggi', value: g.pareggi, color: '#ffd700' },
                  { label: 'Sconfitte', value: g.sconfitte, color: '#ef4444' },
                  { label: 'Gol', value: g.gol, color: '#00ff88' },
                  { label: 'Assist', value: g.assist, color: '#a78bfa' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '1rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.8rem', fontWeight: 900, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.25rem' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)' }}>Media Voti</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#ffd700' }}>{g.mediaVoti}</div>
              </div>

              <button onClick={() => setSelected(null)} style={{ width: '100%', marginTop: '1rem', background: 'rgba(100, 116, 139, 0.3)', border: 'none', borderRadius: '12px', padding: '0.75rem', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                Chiudi
              </button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

function PlayerCard({ giocatore, index, isSelected, onClick }) {
  const [isHovered, setIsHovered] = useState(false)

  const getOverallColor = (ovr) => {
    if (ovr >= 85) return { bg: 'linear-gradient(135deg, #ffd700, #ffa500)', text: '#0f1729' }
    if (ovr >= 75) return { bg: 'linear-gradient(135deg, #00d4ff, #0099ff)', text: '#0f1729' }
    if (ovr >= 70) return { bg: 'linear-gradient(135deg, #00ff88, #00d4ff)', text: '#0f1729' }
    return { bg: 'linear-gradient(135deg, #64748b, #475569)', text: '#fff' }
  }

  const ovrStyle = getOverallColor(giocatore.overall)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: 'rgba(15, 23, 41, 0.8)',
        border: `1px solid ${isHovered || isSelected ? 'rgba(0, 212, 255, 0.5)' : 'rgba(255, 255, 255, 0.05)'}`,
        borderRadius: '20px',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.3s',
        transform: isHovered ? 'translateY(-6px)' : 'translateY(0)',
        boxShadow: isHovered ? '0 12px 40px rgba(0, 212, 255, 0.25)' : '0 4px 15px rgba(0,0,0,0.2)',
        animation: `fadeInUp 0.4s ease ${index * 0.06}s both`
      }}
    >
      {/* Top Banner con foto */}
      <div style={{
        height: '120px',
        background: 'linear-gradient(135deg, #0f1729 0%, #1a2a4a 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Sfondo decorativo */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 70% 50%, rgba(0, 212, 255, 0.15), transparent 60%)`,
        }} />

        {/* Foto o placeholder */}
        <div style={{
          position: 'absolute',
          right: '1.5rem',
          bottom: '-20px',
          width: '90px',
          height: '90px',
          borderRadius: '50%',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #1a2a4a, #0f1729)',
          border: '3px solid rgba(0, 212, 255, 0.4)',
          boxShadow: '0 4px 20px rgba(0, 212, 255, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2.5rem'
        }}>
          {giocatore.foto_url
            ? <img src={giocatore.foto_url} alt={giocatore.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : '👤'
          }
        </div>

        {/* Overall badge */}
        <div style={{
          position: 'absolute',
          top: '1rem',
          left: '1rem',
          width: '55px',
          height: '55px',
          borderRadius: '12px',
          background: ovrStyle.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
          fontWeight: 900,
          color: ovrStyle.text,
          boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
        }}>
          {giocatore.overall}
        </div>

        {/* Ruolo badge */}
        <div style={{
          position: 'absolute',
          top: '1rem',
          left: '4.5rem',
          background: 'rgba(0,0,0,0.5)',
          borderRadius: '20px',
          padding: '0.3rem 0.75rem',
          fontSize: '0.75rem',
          fontWeight: 700,
          color: '#00d4ff',
          backdropFilter: 'blur(4px)'
        }}>
          {giocatore.ruolo}
        </div>
      </div>

      {/* Body card */}
      <div style={{ padding: '1.5rem 1.5rem 1rem', paddingTop: '2rem' }}>
        <div style={{ fontWeight: 900, fontSize: '1.3rem', marginBottom: '1rem' }}>
          {giocatore.nome}
        </div>

        {/* Stats principali */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
          {[
            { icon: '📅', value: giocatore.partiteGiocate, label: 'PG' },
            { icon: '⚽', value: giocatore.gol, label: 'GOL' },
            { icon: '🎯', value: giocatore.assist, label: 'ASS' },
            { icon: '⭐', value: giocatore.mediaVoti, label: 'MEDIA' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '10px',
              padding: '0.6rem 0.4rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.9rem', marginBottom: '0.15rem' }}>{s.icon}</div>
              <div style={{ fontSize: '1rem', fontWeight: 900, color: '#fff' }}>{s.value}</div>
              <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Win rate bar */}
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.35rem' }}>
            <span>Win Rate</span>
            <span style={{ color: '#00d4ff', fontWeight: 700 }}>{giocatore.winRate}%</span>
          </div>
          <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              width: `${giocatore.winRate}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #00d4ff, #00ff88)',
              borderRadius: '3px',
              transition: 'width 0.5s ease'
            }} />
          </div>
        </div>

        {/* V/P/S */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div style={{ flex: 1, background: 'rgba(0, 212, 255, 0.1)', borderRadius: '8px', padding: '0.4rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1rem', fontWeight: 900, color: '#00d4ff' }}>{giocatore.vittorie}</div>
            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>V</div>
          </div>
          <div style={{ flex: 1, background: 'rgba(255, 215, 0, 0.1)', borderRadius: '8px', padding: '0.4rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1rem', fontWeight: 900, color: '#ffd700' }}>{giocatore.pareggi}</div>
            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>P</div>
          </div>
          <div style={{ flex: 1, background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', padding: '0.4rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1rem', fontWeight: 900, color: '#ef4444' }}>{giocatore.sconfitte}</div>
            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>S</div>
          </div>
        </div>

        {/* Hint clicca */}
        <div style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)' }}>
          clicca per dettagli
        </div>
      </div>
    </div>
  )
}

export default Statistiche