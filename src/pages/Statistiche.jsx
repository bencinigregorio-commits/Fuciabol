import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

// Determina il tipo di card in base a overall e se è IF
function getCardType(overall, isIF) {
  if (isIF) return 'if'
  if (overall >= 75) return 'gold'
  if (overall >= 65) return 'silver'
  return 'bronze'
}

const CARD_CONFIGS = {
  gold: {
    bg: 'linear-gradient(160deg, #b8800a 0%, #e8c040 20%, #f8e060 40%, #e0a820 55%, #f0c838 70%, #b8800a 100%)',
    foil: 'linear-gradient(135deg, rgba(255,255,220,0.5) 0%, transparent 40%, rgba(255,230,100,0.3) 60%, transparent 80%, rgba(255,255,200,0.4) 100%)',
    border: 'rgba(255,235,80,0.9)',
    innerBorder: 'rgba(255,220,50,0.5)',
    textDark: '#2a1800',
    statsBar: 'rgba(0,0,0,0.5)',
    statsText: '#fff5cc',
    labelText: 'rgba(42,24,0,0.6)',
    glowColor: 'rgba(255,215,0,0.5)',
    label: 'ORO',
    labelBg: 'rgba(255,215,0,0.2)',
    labelColor: '#ffd700',
  },
  silver: {
    bg: 'linear-gradient(160deg, #787878 0%, #c8c8c8 20%, #ebebeb 40%, #a0a0a0 55%, #d0d0d0 70%, #787878 100%)',
    foil: 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, transparent 40%, rgba(220,220,220,0.4) 60%, transparent 80%, rgba(255,255,255,0.5) 100%)',
    border: 'rgba(230,230,230,0.9)',
    innerBorder: 'rgba(200,200,200,0.5)',
    textDark: '#1a1a1a',
    statsBar: 'rgba(0,0,0,0.4)',
    statsText: '#f0f0f0',
    labelText: 'rgba(26,26,26,0.55)',
    glowColor: 'rgba(192,192,192,0.5)',
    label: 'ARGENTO',
    labelBg: 'rgba(192,192,192,0.2)',
    labelColor: '#c0c0c0',
  },
  bronze: {
    bg: 'linear-gradient(160deg, #6a3810 0%, #b86828 20%, #d88840 40%, #885018 55%, #c07030 70%, #6a3810 100%)',
    foil: 'linear-gradient(135deg, rgba(255,210,150,0.5) 0%, transparent 40%, rgba(200,140,80,0.3) 60%, transparent 80%, rgba(255,200,130,0.4) 100%)',
    border: 'rgba(220,150,70,0.9)',
    innerBorder: 'rgba(190,120,50,0.5)',
    textDark: '#200e00',
    statsBar: 'rgba(0,0,0,0.45)',
    statsText: '#ffe8c8',
    labelText: 'rgba(32,14,0,0.6)',
    glowColor: 'rgba(205,127,50,0.5)',
    label: 'BRONZO',
    labelBg: 'rgba(205,127,50,0.2)',
    labelColor: '#cd7f32',
  },
  if: {
    bg: 'linear-gradient(160deg, #0a0a0a 0%, #1a1a2e 20%, #16213e 40%, #0f3460 55%, #1a1a2e 70%, #0a0a0a 100%)',
    foil: 'linear-gradient(135deg, rgba(0,212,255,0.4) 0%, transparent 30%, rgba(120,0,255,0.3) 55%, transparent 75%, rgba(0,212,255,0.3) 100%)',
    border: 'rgba(0,212,255,0.9)',
    innerBorder: 'rgba(0,212,255,0.4)',
    textDark: '#00d4ff',
    statsBar: 'rgba(0,0,0,0.7)',
    statsText: '#00d4ff',
    labelText: 'rgba(0,212,255,0.8)',
    glowColor: 'rgba(0,212,255,0.6)',
    label: 'IN FORM',
    labelBg: 'rgba(0,212,255,0.15)',
    labelColor: '#00d4ff',
  }
}

function Statistiche() {
  const [giocatori, setGiocatori] = useState([])
  const [partite, setPartite] = useState([])
  const [selected, setSelected] = useState(null)

  useEffect(() => { caricaDati() }, [])

  async function caricaDati() {
    const { data: giocatoriData } = await supabase.from('giocatori').select('*').order('overall', { ascending: false })
    const { data: partiteData } = await supabase.from('partite').select('*').eq('stato', 'chiusa')
    if (giocatoriData) setGiocatori(giocatoriData)
    if (partiteData) setPartite(partiteData)
  }

  // Trova il miglior giocatore dell'ultima partita chiusa
  const ultimaPartita = partite.length > 0 ? partite[0] : null
  let miglioreUltimaPartita = null
  if (ultimaPartita?.voti_calcolati?.length > 0) {
    const maxVoto = Math.max(...ultimaPartita.voti_calcolati.map(v => v.votoFinale))
    const migliore = ultimaPartita.voti_calcolati.find(v => v.votoFinale === maxVoto)
    miglioreUltimaPartita = migliore?.playerId
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
    const isIF = g.id === miglioreUltimaPartita
    return { ...g, gol, assist, partiteGiocate, vittorie, pareggi, sconfitte, mediaVoti, winRate, isIF }
  })

  // Ordina: IF prima, poi per overall
  const giocatoriOrdinati = [...giocatoriConStats].sort((a, b) => {
    if (a.isIF && !b.isIF) return -1
    if (!a.isIF && b.isIF) return 1
    return b.overall - a.overall
  })

  return (
    <div>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(25px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmerCard {
          0% { transform: translateX(-100%) rotate(20deg); }
          100% { transform: translateX(300%) rotate(20deg); }
        }
        @keyframes floatIF {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes glowIF {
          0%, 100% { box-shadow: 0 0 20px rgba(0,212,255,0.5), 0 0 40px rgba(0,212,255,0.2), 0 15px 35px rgba(0,0,0,0.6); }
          50% { box-shadow: 0 0 40px rgba(0,212,255,0.8), 0 0 80px rgba(0,212,255,0.4), 0 15px 40px rgba(0,0,0,0.7); }
        }
        @keyframes glowGold {
          0%, 100% { box-shadow: 0 0 15px rgba(255,215,0,0.4), 0 12px 30px rgba(0,0,0,0.5); }
          50% { box-shadow: 0 0 30px rgba(255,215,0,0.6), 0 12px 35px rgba(0,0,0,0.6); }
        }
        @keyframes glowSilver {
          0%, 100% { box-shadow: 0 0 12px rgba(192,192,192,0.3), 0 10px 25px rgba(0,0,0,0.5); }
          50% { box-shadow: 0 0 25px rgba(192,192,192,0.5), 0 10px 30px rgba(0,0,0,0.6); }
        }
        @keyframes glowBronze {
          0%, 100% { box-shadow: 0 0 12px rgba(205,127,50,0.3), 0 10px 25px rgba(0,0,0,0.5); }
          50% { box-shadow: 0 0 25px rgba(205,127,50,0.5), 0 10px 30px rgba(0,0,0,0.6); }
        }
        @keyframes ifPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        .card-if { animation: glowIF 2s ease-in-out infinite, floatIF 3.5s ease-in-out infinite; }
        .card-gold { animation: glowGold 3s ease-in-out infinite; }
        .card-silver { animation: glowSilver 3.5s ease-in-out infinite; }
        .card-bronze { animation: glowBronze 4s ease-in-out infinite; }
        .stat-card:hover { transform: translateY(-8px) scale(1.02) !important; }
        .stat-card { transition: transform 0.3s ease !important; }

        .photo-frame {
          position: absolute;
          top: 34px;
          left: 50%;
          transform: translateX(-50%);
          width: min(112px, 58%);
          height: min(132px, 46%);
          z-index: 3;
          border-radius: 18px;
          overflow: hidden;
          background:
            radial-gradient(circle at 50% 15%, rgba(255,255,255,0.28), transparent 34%),
            linear-gradient(180deg, rgba(10,16,30,0.18), rgba(10,16,30,0.72));
          border: 1px solid rgba(255,255,255,0.22);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.22),
            inset 0 -28px 35px rgba(0,0,0,0.28),
            0 9px 18px rgba(0,0,0,0.36);
        }

        .photo-frame::before {
          content: '';
          position: absolute;
          inset: 0;
          z-index: 2;
          pointer-events: none;
          background:
            linear-gradient(180deg, transparent 48%, rgba(0,0,0,0.42) 100%),
            radial-gradient(circle at 50% 10%, rgba(255,255,255,0.18), transparent 36%);
        }

        .photo-frame::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 38%;
          z-index: 3;
          pointer-events: none;
          background: linear-gradient(180deg, transparent, rgba(0,0,0,0.45));
        }

        .photo-frame img {
          position: relative;
          z-index: 1;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top center;
          filter: saturate(1.08) contrast(1.04);
          transform: scale(1.04);
        }

        .photo-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3.2rem;
          color: rgba(255,255,255,0.68);
          background:
            radial-gradient(circle at 50% 20%, rgba(0,212,255,0.22), transparent 38%),
            rgba(0,0,0,0.2);
        }

        .modal-photo-frame {
          width: 86px;
          height: 112px;
          border-radius: 18px;
          overflow: hidden;
          background:
            radial-gradient(circle at 50% 12%, rgba(255,255,255,0.18), transparent 36%),
            rgba(0,0,0,0.34);
          border: 1px solid rgba(255,255,255,0.16);
          box-shadow: 0 12px 26px rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          position: relative;
        }

        .modal-photo-frame::after {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(180deg, transparent 52%, rgba(0,0,0,0.42));
        }

        .modal-photo-frame img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top center;
          transform: scale(1.03);
          filter: saturate(1.08) contrast(1.04);
        }

        .modal-photo-placeholder {
          font-size: 3rem;
          opacity: 0.75;
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', animation: 'fadeInUp 0.4s ease' }}>
        <div style={{ fontSize: '3rem' }}>📊</div>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.25rem' }}>Statistiche</h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.95rem' }}>Numeri e prestazioni di ogni giocatore.</p>
        </div>
      </div>

      {/* Legenda tipi card */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap', animation: 'fadeInUp 0.4s ease 0.1s both' }}>
        {[
          { label: 'IN FORM', desc: 'MVP ultima partita', bg: CARD_CONFIGS.if.labelBg, color: CARD_CONFIGS.if.labelColor },
          { label: 'ORO', desc: 'OVR 75+', bg: CARD_CONFIGS.gold.labelBg, color: CARD_CONFIGS.gold.labelColor },
          { label: 'ARGENTO', desc: 'OVR 65-74', bg: CARD_CONFIGS.silver.labelBg, color: CARD_CONFIGS.silver.labelColor },
          { label: 'BRONZO', desc: 'OVR 64-', bg: CARD_CONFIGS.bronze.labelBg, color: CARD_CONFIGS.bronze.labelColor },
        ].map(t => (
          <div key={t.label} style={{ background: t.bg, border: `1px solid ${t.color}`, borderRadius: '8px', padding: '0.3rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: t.color }}>{t.label}</span>
            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>{t.desc}</span>
          </div>
        ))}
      </div>

      {/* Grid card giocatori */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(160px, 28vw), 1fr))',
        gap: '1rem',
        justifyItems: 'center'
      }}>
        {giocatoriOrdinati.map((g, i) => (
          <div key={g.id} style={{ animation: `fadeInUp 0.4s ease ${i * 0.05}s both`, width: '100%', maxWidth: '200px' }}>
            <FutStatCard
              giocatore={g}
              onClick={() => setSelected(selected === g.id ? null : g.id)}
            />
          </div>
        ))}
      </div>

      {/* Modal dettaglio */}
      {selected && (() => {
        const g = giocatoriConStats.find(x => x.id === selected)
        if (!g) return null
        const cardType = getCardType(g.overall, g.isIF)
        const cfg = CARD_CONFIGS[cardType]
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(4px)' }} onClick={() => setSelected(null)}>
            <div style={{ background: 'rgba(15, 23, 41, 0.98)', border: `1px solid ${cfg.border}`, borderRadius: '20px', padding: '2rem', maxWidth: '500px', width: '90%', animation: 'fadeInUp 0.3s ease', boxShadow: `0 0 30px ${cfg.glowColor}` }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <div className="modal-photo-frame" style={{ border: `1px solid ${cfg.border}`, background: cfg.bg }}>
                  {g.foto_url
                    ? <img src={g.foto_url} alt={g.nome} />
                    : <span className="modal-photo-placeholder">👤</span>}
                </div>
                <div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ background: cfg.labelBg, border: `1px solid ${cfg.labelColor}`, borderRadius: '6px', padding: '0.2rem 0.5rem', fontSize: '0.7rem', fontWeight: 800, color: cfg.labelColor }}>
                      {cfg.label}
                    </span>
                    {g.isIF && <span style={{ animation: 'ifPulse 1.5s ease-in-out infinite', fontSize: '0.7rem', color: '#00d4ff' }}>⚡ MVP ultima partita</span>}
                  </div>
                  <div style={{ fontSize: 'clamp(1.2rem, 4vw, 1.8rem)', fontWeight: 900, marginBottom: '0.25rem' }}>{g.nome}</div>
                  <div style={{ color: cfg.labelColor, fontWeight: 700, marginBottom: '0.5rem' }}>{g.ruolo}</div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <span style={{ background: `${cfg.labelBg}`, border: `1px solid ${cfg.border}`, borderRadius: '20px', padding: '0.25rem 0.75rem', fontSize: '0.85rem', fontWeight: 700, color: cfg.labelColor }}>OVR {g.overall}</span>
                    <span style={{ background: 'rgba(255,215,0,0.15)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: '20px', padding: '0.25rem 0.75rem', fontSize: '0.85rem', fontWeight: 700, color: '#ffd700' }}>{g.winRate}% WR</span>
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

              <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)' }}>Media Voti</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#ffd700' }}>{g.mediaVoti}</div>
              </div>

              <button onClick={() => setSelected(null)} style={{ width: '100%', background: 'rgba(100,116,139,0.3)', border: 'none', borderRadius: '12px', padding: '0.75rem', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                Chiudi
              </button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

function FutStatCard({ giocatore, onClick }) {
  const [hovered, setHovered] = useState(false)
  const cardType = getCardType(giocatore.overall, giocatore.isIF)
  const cfg = CARD_CONFIGS[cardType]

  const nomeParti = giocatore.nome.replace(/\s*\(.*?\)/g, '').trim().split(' ')
  const cognome = nomeParti.length > 1 ? nomeParti[nomeParti.length - 1].toUpperCase() : giocatore.nome.toUpperCase()

  return (
    <div
      className={`stat-card card-${cardType}`}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        height: 'min(290px, 55vw)',
        borderRadius: '14px',
        background: cfg.bg,
        border: `2px solid ${cfg.border}`,
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        transform: hovered ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
      }}
    >
      {/* Bordo interno */}
      <div style={{
        position: 'absolute', top: '4px', left: '4px', right: '4px', bottom: '4px',
        border: `1px solid ${cfg.innerBorder}`,
        borderRadius: '11px', pointerEvents: 'none', zIndex: 3
      }} />

      {/* Foil overlay */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        background: cfg.foil, pointerEvents: 'none', zIndex: 1
      }} />

      {/* Shimmer */}
      <div style={{
        position: 'absolute', top: '-50%', left: '-20%',
        width: '35%', height: '200%',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
        animation: 'shimmerCard 3s ease-in-out infinite',
        pointerEvents: 'none', zIndex: 2
      }} />

      {/* IF badge speciale */}
      {giocatore.isIF && (
        <div style={{
          position: 'absolute', top: '8px', right: '8px', zIndex: 5,
          background: 'rgba(0,212,255,0.2)',
          border: '1px solid rgba(0,212,255,0.8)',
          borderRadius: '6px',
          padding: '2px 6px',
          fontSize: '0.55rem', fontWeight: 900, color: '#00d4ff',
          letterSpacing: '0.5px',
          animation: 'ifPulse 1.5s ease-in-out infinite'
        }}>
          IF ⚡
        </div>
      )}

      {/* Overall + Ruolo top-left */}
      <div style={{ position: 'absolute', top: '10px', left: '12px', zIndex: 4, lineHeight: 1 }}>
        <div style={{ fontSize: '1.9rem', fontWeight: 900, color: cfg.textDark, textShadow: '0 1px 0 rgba(255,255,255,0.3)', lineHeight: 1 }}>
          {giocatore.overall}
        </div>
        <div style={{ fontSize: '0.58rem', fontWeight: 800, color: cfg.labelText, letterSpacing: '0.5px', marginTop: '2px' }}>
          {giocatore.ruolo}
        </div>
      </div>

      {/* Foto integrata nella card */}
      <div className="photo-frame">
        {giocatore.foto_url ? (
          <img src={giocatore.foto_url} alt={giocatore.nome} />
        ) : (
          <div className="photo-placeholder">👤</div>
        )}
      </div>

      {/* Nome */}
      <div style={{
        position: 'absolute',
        bottom: '72px',
        left: 0, right: 0, textAlign: 'center', zIndex: 4, padding: '0 8px'
      }}>
        <div style={{
          fontSize: '0.82rem', fontWeight: 900, color: cfg.textDark,
          letterSpacing: '1.5px', textTransform: 'uppercase',
          textShadow: '0 1px 0 rgba(255,255,255,0.3)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
        }}>
          {cognome}
        </div>
      </div>

      {/* Stats bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: cfg.statsBar,
        borderTop: `1px solid ${cfg.innerBorder}`,
        padding: '7px 8px',
        zIndex: 4
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '3px' }}>
          {[
            { val: giocatore.partiteGiocate, label: 'PG' },
            { val: giocatore.vittorie, label: 'V' },
            { val: giocatore.gol, label: 'GOL' },
            { val: giocatore.overall, label: 'OVR' },
            { val: giocatore.pareggi, label: 'PAR' },
            { val: giocatore.assist, label: 'ASS' },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 900, color: cfg.statsText, lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: '0.5rem', fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.3px', textTransform: 'uppercase' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Statistiche
