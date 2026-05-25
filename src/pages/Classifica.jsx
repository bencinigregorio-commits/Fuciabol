import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

function Classifica() {
  const [giocatori, setGiocatori] = useState([])
  const [partite, setPartite] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    caricaDati()
  }, [])

  async function caricaDati() {
    const { data: giocatoriData } = await supabase
      .from('giocatori')
      .select('*')

    const { data: partiteData } = await supabase
      .from('partite')
      .select('*')
      .eq('stato', 'chiusa')

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
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 8px 30px rgba(255, 215, 0, 0.3); }
          50% { box-shadow: 0 12px 50px rgba(255, 215, 0, 0.7); }
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '3rem', animation: 'fadeInUp 0.4s ease' }}>
        <div style={{ fontSize: '3rem' }}>🏆</div>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.25rem' }}>Classifica</h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.95rem' }}>
            V = 3 punti • P = 1 punto • S = 0 punti
          </p>
        </div>
      </div>

      {/* PODIO TOP 3 */}
      {top3.length >= 3 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '1.5rem',
          alignItems: 'end',
          maxWidth: '900px',
          margin: '0 auto 3rem'
        }}>
          <PodioCard giocatore={top3[1]} position={2} />
          <PodioCard giocatore={top3[0]} position={1} />
          <PodioCard giocatore={top3[2]} position={3} />
        </div>
      )}

      {/* TABELLA CLASSIFICA - tutti */}
      <div style={{
        background: 'rgba(15, 23, 41, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '15px',
        overflow: 'hidden',
        maxWidth: '1000px',
        margin: '0 auto'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '60px 60px 1fr 50px 50px 50px 50px 60px 60px 80px',
          padding: '1rem 1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          fontSize: '0.75rem',
          fontWeight: 700,
          color: 'rgba(255, 255, 255, 0.4)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          <div>POS.</div>
          <div></div>
          <div>GIOCATORE</div>
          <div style={{ textAlign: 'center' }}>PG</div>
          <div style={{ textAlign: 'center' }}>V</div>
          <div style={{ textAlign: 'center' }}>P</div>
          <div style={{ textAlign: 'center' }}>S</div>
          <div style={{ textAlign: 'center' }}>GF</div>
          <div style={{ textAlign: 'center' }}>DR</div>
          <div style={{ textAlign: 'center' }}>PTS</div>
        </div>

        {classifica.map((g, index) => (
          <RankRow key={g.id} giocatore={g} position={index + 1} index={index} />
        ))}
      </div>
    </div>
  )
}

function PodioCard({ giocatore, position }) {
  const colors = {
    1: {
      bg: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 50%, #ffd700 100%)',
      border: '#ffa500',
      shadow: 'rgba(255, 215, 0, 0.5)',
      height: '340px',
      badgeBg: 'linear-gradient(135deg, #ffd700, #ffa500)'
    },
    2: {
      bg: 'linear-gradient(135deg, #c0c0c0 0%, #e8e8e8 50%, #c0c0c0 100%)',
      border: '#a8a8a8',
      shadow: 'rgba(192, 192, 192, 0.4)',
      height: '290px',
      badgeBg: 'linear-gradient(135deg, #c0c0c0, #a8a8a8)'
    },
    3: {
      bg: 'linear-gradient(135deg, #cd7f32 0%, #e9a76a 50%, #cd7f32 100%)',
      border: '#b87333',
      shadow: 'rgba(205, 127, 50, 0.4)',
      height: '250px',
      badgeBg: 'linear-gradient(135deg, #cd7f32, #b87333)'
    }
  }

  const config = colors[position]

  return (
    <div style={{
      background: config.bg,
      border: `3px solid ${config.border}`,
      borderRadius: '20px',
      padding: '2rem 1.5rem 1.5rem',
      height: config.height,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: `0 8px 30px ${config.shadow}`,
      position: 'relative',
      animation: position === 1 ? 'glow 2s ease-in-out infinite' : `fadeInUp 0.5s ease ${position * 0.1}s both`
    }}>
      {/* Badge Posizione */}
      <div style={{
        position: 'absolute',
        top: '-25px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '60px',
        height: '70px',
        background: config.badgeBg,
        borderRadius: '10px 10px 50% 50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '2rem',
        fontWeight: 900,
        color: '#fff',
        boxShadow: `0 4px 15px ${config.shadow}`,
        border: '3px solid #0f1729',
        textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
      }}>
        {position}
      </div>

      {/* Foto o emoji */}
      <div style={{
        width: '90px',
        height: '90px',
        borderRadius: '50%',
        overflow: 'hidden',
        background: 'rgba(15, 23, 41, 0.8)',
        border: '3px solid #0f1729',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '2.5rem',
        marginTop: '1rem',
        boxShadow: `0 4px 20px ${config.shadow}`
      }}>
        {giocatore.foto_url
          ? <img src={giocatore.foto_url} alt={giocatore.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : position === 1 ? '👑' : position === 2 ? '🦅' : '🐂'
        }
      </div>

      {/* Nome e Ruolo */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 900, fontSize: '1.3rem', marginBottom: '0.25rem', color: '#0f1729' }}>
          {giocatore.nome.split(' ')[0]}
        </div>
        <div style={{ fontSize: '0.85rem', color: 'rgba(15, 23, 41, 0.7)', fontWeight: 600 }}>
          {giocatore.ruolo}
        </div>
      </div>

      {/* Punti Badge */}
      <div style={{
        background: 'rgba(15, 23, 41, 0.8)',
        borderRadius: '12px',
        padding: '0.5rem 1.25rem',
        border: '2px solid #0f1729',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '2rem', fontWeight: 900, color: '#ffd700', lineHeight: 1 }}>
          {giocatore.punti}
        </div>
        <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 600 }}>
          PUNTI
        </div>
      </div>
    </div>
  )
}

function RankRow({ giocatore, position, index }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '60px 60px 1fr 50px 50px 50px 50px 60px 60px 80px',
        padding: '0.85rem 1.5rem',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
        background: isHovered
          ? 'rgba(0, 212, 255, 0.05)'
          : position <= 3 ? 'rgba(255, 215, 0, 0.03)' : 'transparent',
        transition: 'all 0.2s',
        animation: `fadeInUp 0.3s ease ${index * 0.04}s both`
      }}
    >
      {/* Posizione */}
      <div style={{
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        background: position === 1
          ? 'linear-gradient(135deg, #ffd700, #ffa500)'
          : position === 2
          ? 'linear-gradient(135deg, #c0c0c0, #a8a8a8)'
          : position === 3
          ? 'linear-gradient(135deg, #cd7f32, #b87333)'
          : 'rgba(255, 255, 255, 0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.9rem',
        fontWeight: 700,
        color: position <= 3 ? '#0f1729' : 'rgba(255, 255, 255, 0.5)'
      }}>
        {position}
      </div>

      {/* Foto */}
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        overflow: 'hidden',
        background: 'rgba(0, 212, 255, 0.1)',
        border: '2px solid rgba(0, 212, 255, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.2rem'
      }}>
        {giocatore.foto_url
          ? <img src={giocatore.foto_url} alt={giocatore.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : '👤'
        }
      </div>

      {/* Nome + Ruolo */}
      <div>
        <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.1rem' }}>{giocatore.nome}</div>
        <div style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.4)' }}>{giocatore.ruolo}</div>
      </div>

      {/* PG */}
      <div style={{ textAlign: 'center', fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 600 }}>
        {giocatore.pg}
      </div>

      {/* V */}
      <div style={{ textAlign: 'center', fontSize: '0.9rem', color: '#00d4ff', fontWeight: 700 }}>
        {giocatore.v}
      </div>

      {/* P */}
      <div style={{ textAlign: 'center', fontSize: '0.9rem', color: '#ffd700', fontWeight: 700 }}>
        {giocatore.p}
      </div>

      {/* S */}
      <div style={{ textAlign: 'center', fontSize: '0.9rem', color: '#ef4444', fontWeight: 700 }}>
        {giocatore.s}
      </div>

      {/* GF */}
      <div style={{ textAlign: 'center', fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 600 }}>
        {giocatore.gf}
      </div>

      {/* DR */}
      <div style={{ textAlign: 'center', fontSize: '0.9rem', fontWeight: 700, color: giocatore.dr > 0 ? '#00d4ff' : giocatore.dr < 0 ? '#ef4444' : 'rgba(255, 255, 255, 0.4)' }}>
        {giocatore.dr > 0 ? `+${giocatore.dr}` : giocatore.dr}
      </div>

      {/* PUNTI */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: position <= 3
            ? 'linear-gradient(135deg, #ffd700, #ffa500)'
            : 'linear-gradient(135deg, #00d4ff, #0099ff)',
          fontSize: '1.1rem',
          fontWeight: 900,
          color: '#0f1729',
          boxShadow: position <= 3
            ? '0 2px 10px rgba(255, 215, 0, 0.3)'
            : '0 2px 10px rgba(0, 212, 255, 0.3)'
        }}>
          {giocatore.punti}
        </div>
      </div>
    </div>
  )
}

export default Classifica