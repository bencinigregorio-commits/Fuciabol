import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

function Classifica() {
  const [giocatori, setGiocatori] = useState([])
  const [partite, setPartite] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { caricaDati() }, [])

  async function caricaDati() {
    const { data: giocatoriData } = await supabase.from('giocatori').select('*')
    const { data: partiteData } = await supabase.from('partite').select('*').eq('stato', 'chiusa')
    if (giocatoriData) setGiocatori(giocatoriData)
    if (partiteData) setPartite(partiteData)
    setLoading(false)
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255, 255, 255, 0.5)' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏆</div>
      <div>Caricamento...</div>
    </div>
  )

  const giocatoriConPunti = giocatori.map(g => {
    let punti = 0, pg = 0, v = 0, p = 0, s = 0, gf = 0, gs = 0
    partite.forEach(partita => {
      const inA = partita.squadra_a.includes(g.id)
      const inB = partita.squadra_b.includes(g.id)
      if (!inA && !inB) return
      pg++
      gf += partita.eventi?.[g.id]?.gol || 0
      const isVittoriaA = partita.punteggio_a > partita.punteggio_b
      const isVittoriaB = partita.punteggio_b > partita.punteggio_a
      const isPareggio = partita.punteggio_a === partita.punteggio_b
      if (inA) {
        gs += partita.punteggio_b
        if (isVittoriaA) { punti += 3; v++ }
        else if (isPareggio) { punti += 1; p++ }
        else { s++ }
      } else {
        gs += partita.punteggio_a
        if (isVittoriaB) { punti += 3; v++ }
        else if (isPareggio) { punti += 1; p++ }
        else { s++ }
      }
    })
    return { ...g, punti, pg, v, p, s, gf, gs, dr: gf - gs }
  })

  const classifica = [...giocatoriConPunti].sort((a, b) => {
    if (b.punti !== a.punti) return b.punti - a.punti
    if (b.dr !== a.dr) return b.dr - a.dr
    return b.gf - a.gf
  })

  const top3 = classifica.slice(0, 3)

  return (
    <div>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%) rotate(25deg); }
          100% { transform: translateX(300%) rotate(25deg); }
        }
        @keyframes floatCard1 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes floatCard2 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes floatCard3 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes glowGold {
          0%, 100% { box-shadow: 0 0 25px rgba(255,215,0,0.5), 0 20px 40px rgba(0,0,0,0.5); }
          50% { box-shadow: 0 0 50px rgba(255,215,0,0.8), 0 20px 50px rgba(0,0,0,0.6); }
        }
        @keyframes glowSilver {
          0%, 100% { box-shadow: 0 0 20px rgba(192,192,192,0.4), 0 15px 35px rgba(0,0,0,0.5); }
          50% { box-shadow: 0 0 40px rgba(192,192,192,0.6), 0 15px 40px rgba(0,0,0,0.6); }
        }
        @keyframes glowBronze {
          0%, 100% { box-shadow: 0 0 20px rgba(205,127,50,0.4), 0 15px 35px rgba(0,0,0,0.5); }
          50% { box-shadow: 0 0 40px rgba(205,127,50,0.6), 0 15px 40px rgba(0,0,0,0.6); }
        }
        .rank-row { transition: all 0.2s ease; cursor: default; }
        .rank-row:hover { background: rgba(0, 212, 255, 0.05) !important; transform: translateX(3px); }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '3rem', animation: 'fadeInUp 0.4s ease' }}>
        <div style={{ fontSize: '3rem' }}>🏆</div>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.25rem' }}>Classifica</h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.95rem' }}>V = 3 punti • P = 1 punto • S = 0 punti</p>
        </div>
      </div>

      {/* PODIO FUT CARDS */}
      {top3.length >= 3 && (
        <div style={{ marginBottom: '3rem', padding: '1rem 0', overflowX: 'hidden' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-end',
            gap: '0.75rem',
            flexWrap: 'nowrap',
            maxWidth: '100%',
          }}>
            {/* 2° */}
            <div style={{ animation: 'fadeInUp 0.6s ease 0.2s both', flexShrink: 1 }}>
              <FutCard giocatore={top3[1]} position={2} />
            </div>
            {/* 1° - più in alto */}
            <div style={{ animation: 'fadeInUp 0.6s ease 0s both', marginBottom: '20px', flexShrink: 1 }}>
              <FutCard giocatore={top3[0]} position={1} />
            </div>
            {/* 3° */}
            <div style={{ animation: 'fadeInUp 0.6s ease 0.4s both', flexShrink: 1 }}>
              <FutCard giocatore={top3[2]} position={3} />
            </div>
          </div>
        </div>
      )}

      {/* TABELLA */}
      <div style={{
        background: 'rgba(15, 23, 41, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '20px',
        overflow: 'hidden',
        maxWidth: '1000px',
        margin: '0 auto',
        animation: 'fadeInUp 0.6s ease 0.3s both'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '44px 44px 1fr 36px 36px 36px 50px',
          padding: '0.75rem 0.75rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          fontSize: '0.65rem', fontWeight: 700,
          color: 'rgba(255, 255, 255, 0.35)',
          textTransform: 'uppercase', letterSpacing: '0.5px',
          gap: '0.25rem',
        }}>
          <div>POS.</div><div></div><div>GIOCATORE</div>
          <div style={{ textAlign: 'center' }}>V</div>
          <div style={{ textAlign: 'center' }}>S</div>
          <div style={{ textAlign: 'center' }}>GF</div>
          <div style={{ textAlign: 'center' }}>PTS</div>
        </div>
        {classifica.map((g, index) => (
          <RankRow key={g.id} giocatore={g} position={index + 1} index={index} />
        ))}
      </div>
    </div>
  )
}

function FutCard({ giocatore, position }) {
  const [hovered, setHovered] = useState(false)

  const cfg = {
    1: {
      glowAnim: 'glowGold 2s ease-in-out infinite',
      floatAnim: 'floatCard1 3.5s ease-in-out infinite',
      bg: 'linear-gradient(160deg, #b8800a 0%, #e8c040 20%, #f8e060 40%, #e0a820 55%, #f0c838 70%, #b8800a 100%)',
      foilOverlay: 'linear-gradient(135deg, rgba(255,255,220,0.5) 0%, transparent 40%, rgba(255,230,100,0.3) 60%, transparent 80%, rgba(255,255,200,0.4) 100%)',
      border: 'rgba(255,235,80,0.9)',
      innerBorder: 'rgba(255,220,50,0.6)',
      textDark: '#2a1800',
      statsBarBg: 'rgba(0,0,0,0.5)',
      statsText: '#fff5cc',
      labelText: 'rgba(42,24,0,0.65)',
      width: 'min(200px, 28vw)',
      height: 'min(310px, 43vw)',
      overallSize: 'clamp(1.4rem, 4vw, 2.4rem)',
      nameSize: 'clamp(0.6rem, 2vw, 0.9rem)',
      photoSize: 'clamp(70px, 15vw, 120px)',
      photoH: 'clamp(85px, 18vw, 140px)',
    },
    2: {
      glowAnim: 'glowSilver 2.5s ease-in-out infinite',
      floatAnim: 'floatCard2 4s ease-in-out infinite 0.5s',
      bg: 'linear-gradient(160deg, #787878 0%, #c8c8c8 20%, #ebebeb 40%, #a0a0a0 55%, #d0d0d0 70%, #787878 100%)',
      foilOverlay: 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, transparent 40%, rgba(220,220,220,0.4) 60%, transparent 80%, rgba(255,255,255,0.5) 100%)',
      border: 'rgba(230,230,230,0.9)',
      innerBorder: 'rgba(200,200,200,0.6)',
      textDark: '#1a1a1a',
      statsBarBg: 'rgba(0,0,0,0.4)',
      statsText: '#f0f0f0',
      width: 'min(175px, 25vw)',
      height: 'min(275px, 39vw)',
      overallSize: 'clamp(1.2rem, 3.5vw, 2rem)',
      nameSize: 'clamp(0.55rem, 1.8vw, 0.8rem)',
      photoSize: 'clamp(60px, 13vw, 100px)',
      photoH: 'clamp(75px, 16vw, 120px)',
      labelText: 'rgba(26,26,26,0.6)',
      width: '175px',
      height: '275px',
      overallSize: '2rem',
      nameSize: '0.8rem',
      photoSize: '100px',
      photoH: '120px',
    },
    3: {
      glowAnim: 'glowBronze 3s ease-in-out infinite',
      floatAnim: 'floatCard3 4.5s ease-in-out infinite 1s',
      bg: 'linear-gradient(160deg, #6a3810 0%, #b86828 20%, #d88840 40%, #885018 55%, #c07030 70%, #6a3810 100%)',
      foilOverlay: 'linear-gradient(135deg, rgba(255,210,150,0.5) 0%, transparent 40%, rgba(200,140,80,0.3) 60%, transparent 80%, rgba(255,200,130,0.4) 100%)',
      border: 'rgba(220,150,70,0.9)',
      innerBorder: 'rgba(190,120,50,0.6)',
      textDark: '#200e00',
      statsBarBg: 'rgba(0,0,0,0.45)',
      statsText: '#ffe8c8',
      labelText: 'rgba(32,14,0,0.65)',
      width: '160px',
      height: '250px',
      overallSize: '1.8rem',
      nameSize: '0.75rem',
      photoSize: '85px',
      photoH: '100px',
    }
  }

  const c = cfg[position]
  const nomeParti = giocatore.nome.replace(/\s*\(.*?\)/g, '').trim().split(' ')
  const cognome = nomeParti.length > 1 ? nomeParti[nomeParti.length - 1].toUpperCase() : giocatore.nome.toUpperCase()

  const medals = { 1: '🥇', 2: '🥈', 3: '🥉' }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: c.width,
        height: c.height,
        borderRadius: '14px',
        background: c.bg,
        border: `2px solid ${c.border}`,
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        animation: `${c.glowAnim}, ${c.floatAnim}`,
        transform: hovered ? 'scale(1.05) rotateY(5deg)' : 'scale(1)',
        transition: 'transform 0.3s ease',
      }}
    >
      {/* Bordo interno decorativo */}
      <div style={{
        position: 'absolute', top: '4px', left: '4px', right: '4px', bottom: '4px',
        border: `1px solid ${c.innerBorder}`,
        borderRadius: '11px', pointerEvents: 'none', zIndex: 3
      }} />

      {/* Effetto foil/lucido */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        background: c.foilOverlay,
        pointerEvents: 'none', zIndex: 1
      }} />

      {/* Shimmer animato */}
      <div style={{
        position: 'absolute', top: '-50%', left: '-20%',
        width: '40%', height: '200%',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
        animation: 'shimmer 3s ease-in-out infinite',
        pointerEvents: 'none', zIndex: 2
      }} />

      {/* Overall + Ruolo - top left */}
      <div style={{
        position: 'absolute', top: '10px', left: '12px', zIndex: 4, textAlign: 'center'
      }}>
        <div style={{ fontSize: c.overallSize, fontWeight: 900, color: c.textDark, lineHeight: 1, textShadow: '0 1px 0 rgba(255,255,255,0.4)' }}>
          {giocatore.overall}
        </div>
        <div style={{ fontSize: '0.6rem', fontWeight: 800, color: c.labelText, letterSpacing: '0.5px', marginTop: '1px' }}>
          {giocatore.ruolo}
        </div>
      </div>

      {/* Medaglia - top right */}
      <div style={{ position: 'absolute', top: '8px', right: '10px', zIndex: 4, fontSize: position === 1 ? '1.8rem' : '1.4rem' }}>
        {medals[position]}
      </div>

      {/* Foto o placeholder */}
      <div style={{
        position: 'absolute',
        top: '8px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: c.photoSize,
        height: c.photoH,
        zIndex: 3,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {giocatore.foto_url ? (
          <img src={giocatore.foto_url} alt={giocatore.nome} style={{
            width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top',
            filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.5))',
            borderRadius: '6px'
          }} />
        ) : (
          <div style={{ fontSize: position === 1 ? '5rem' : position === 2 ? '4rem' : '3.5rem', opacity: 0.6, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))' }}>
            👤
          </div>
        )}
      </div>

      {/* Nome */}
      <div style={{
        position: 'absolute',
        bottom: position === 1 ? '78px' : position === 2 ? '68px' : '60px',
        left: 0, right: 0, textAlign: 'center', zIndex: 4, padding: '0 8px'
      }}>
        <div style={{
          fontSize: c.nameSize, fontWeight: 900, color: c.textDark,
          letterSpacing: '2px', textTransform: 'uppercase',
          textShadow: '0 1px 0 rgba(255,255,255,0.3)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
        }}>
          {cognome}
        </div>
      </div>

      {/* Barra stats in basso */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: c.statsBarBg,
        borderTop: `1px solid ${c.innerBorder}`,
        padding: position === 1 ? '8px 10px' : '6px 8px',
        zIndex: 4
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '3px' }}>
          {[
            { val: giocatore.punti, label: 'PTS' },
            { val: giocatore.v || 0, label: 'V' },
            { val: giocatore.gf || 0, label: 'GOL' },
            { val: giocatore.pg || 0, label: 'PG' },
            { val: giocatore.p || 0, label: 'PAR' },
            { val: giocatore.s || 0, label: 'SCO' },
          ].map((stat, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: position === 1 ? '0.95rem' : '0.78rem', fontWeight: 900, color: c.statsText, lineHeight: 1 }}>
                {stat.val}
              </div>
              <div style={{ fontSize: '0.5rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function RankRow({ giocatore, position, index }) {
  const nomePulito = giocatore.nome.replace(/\s*\(.*?\)/g, '').trim()
  return (
    <div className="rank-row" style={{
      display: 'grid',
      gridTemplateColumns: '44px 44px 1fr 36px 36px 36px 50px',
      padding: '0.75rem 0.75rem', alignItems: 'center',
      borderBottom: '1px solid rgba(255,255,255,0.03)',
      background: position <= 3 ? 'rgba(255,215,0,0.02)' : 'transparent',
      animation: `fadeInUp 0.3s ease ${index * 0.04}s both`,
      gap: '0.25rem',
    }}>
      <div style={{
        width: '32px', height: '32px', borderRadius: '50%',
        background: position === 1 ? 'linear-gradient(135deg,#ffd700,#ffa500)' : position === 2 ? 'linear-gradient(135deg,#c0c0c0,#a0a0a0)' : position === 3 ? 'linear-gradient(135deg,#cd7f32,#a05a20)' : 'rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.8rem', fontWeight: 700,
        color: position <= 3 ? '#0f1729' : 'rgba(255,255,255,0.4)',
        flexShrink: 0,
      }}>{position}</div>

      <div style={{
        width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden',
        background: 'rgba(0,212,255,0.08)',
        border: position <= 3 ? '2px solid rgba(255,215,0,0.4)' : '2px solid rgba(0,212,255,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
        flexShrink: 0,
      }}>
        {giocatore.foto_url ? <img src={giocatore.foto_url} alt={giocatore.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👤'}
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nomePulito}</div>
        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>{giocatore.ruolo} • {giocatore.overall}</div>
      </div>

      <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#00d4ff', fontWeight: 700 }}>{giocatore.v}</div>
      <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#ef4444', fontWeight: 700 }}>{giocatore.s}</div>
      <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>{giocatore.gf}</div>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '38px', height: '38px', borderRadius: '50%',
          background: position <= 3 ? 'linear-gradient(135deg,#ffd700,#ffa500)' : 'linear-gradient(135deg,#00d4ff,#0099ff)',
          fontSize: '0.9rem', fontWeight: 900, color: '#0f1729',
        }}>{giocatore.punti}</div>
      </div>
    </div>
  )
}

export default Classifica
