import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

function getCardType(overall, isIF) {
  if (isIF) return 'if'
  if (overall >= 75) return 'gold'
  if (overall >= 65) return 'silver'
  return 'bronze'
}

const CARD_CONFIGS = {
  gold: {
    bg: 'linear-gradient(155deg, #7a4e08 0%, #c48a1a 18%, #f0c830 34%, #fde878 46%, #e8b820 58%, #c07010 74%, #7a4e08 100%)',
    pattern: 'repeating-linear-gradient(60deg, transparent, transparent 18px, rgba(255,240,120,0.06) 18px, rgba(255,240,120,0.06) 19px), repeating-linear-gradient(-60deg, transparent, transparent 18px, rgba(255,240,120,0.06) 18px, rgba(255,240,120,0.06) 19px)',
    foil: 'linear-gradient(130deg, rgba(255,255,200,0.55) 0%, transparent 38%, rgba(255,230,80,0.28) 58%, transparent 76%, rgba(255,255,200,0.4) 100%)',
    border: 'rgba(255,235,80,0.95)',
    innerBorder: 'rgba(255,220,60,0.35)',
    textDark: '#2a1800',
    statsGlass: 'rgba(0,0,0,0.38)',
    statsText: '#fff5cc',
    labelText: 'rgba(42,24,0,0.7)',
    glowColor: 'rgba(255,215,0,0.55)',
    label: 'ORO',
    labelBg: 'rgba(255,215,0,0.2)',
    labelColor: '#ffd700',
    dropShadow: 'drop-shadow(0 8px 20px rgba(0,0,0,0.9)) drop-shadow(0 2px 8px rgba(200,140,0,0.45))',
    nameLine: 'rgba(255,215,0,0.6)',
    sepColor: 'rgba(255,220,60,0.25)',
  },
  silver: {
    bg: 'linear-gradient(155deg, #4a4a4a 0%, #909090 18%, #d8d8d8 34%, #f2f2f2 46%, #b8b8b8 58%, #787878 74%, #4a4a4a 100%)',
    pattern: 'repeating-linear-gradient(60deg, transparent, transparent 18px, rgba(255,255,255,0.05) 18px, rgba(255,255,255,0.05) 19px), repeating-linear-gradient(-60deg, transparent, transparent 18px, rgba(255,255,255,0.05) 18px, rgba(255,255,255,0.05) 19px)',
    foil: 'linear-gradient(130deg, rgba(255,255,255,0.65) 0%, transparent 38%, rgba(220,220,220,0.35) 58%, transparent 76%, rgba(255,255,255,0.45) 100%)',
    border: 'rgba(235,235,235,0.95)',
    innerBorder: 'rgba(200,200,200,0.3)',
    textDark: '#1a1a1a',
    statsGlass: 'rgba(0,0,0,0.32)',
    statsText: '#f0f0f0',
    labelText: 'rgba(26,26,26,0.65)',
    glowColor: 'rgba(192,192,192,0.55)',
    label: 'ARGENTO',
    labelBg: 'rgba(192,192,192,0.2)',
    labelColor: '#d0d0d0',
    dropShadow: 'drop-shadow(0 8px 20px rgba(0,0,0,0.9)) drop-shadow(0 2px 8px rgba(100,100,100,0.5))',
    nameLine: 'rgba(210,210,210,0.6)',
    sepColor: 'rgba(200,200,200,0.2)',
  },
  bronze: {
    bg: 'linear-gradient(155deg, #3e1e08 0%, #8a4018 18%, #c87030 34%, #e89848 46%, #a05020 58%, #6a3010 74%, #3e1e08 100%)',
    pattern: 'repeating-linear-gradient(60deg, transparent, transparent 18px, rgba(255,180,80,0.06) 18px, rgba(255,180,80,0.06) 19px), repeating-linear-gradient(-60deg, transparent, transparent 18px, rgba(255,180,80,0.06) 18px, rgba(255,180,80,0.06) 19px)',
    foil: 'linear-gradient(130deg, rgba(255,210,140,0.55) 0%, transparent 38%, rgba(200,130,60,0.3) 58%, transparent 76%, rgba(255,200,120,0.4) 100%)',
    border: 'rgba(225,155,75,0.95)',
    innerBorder: 'rgba(190,120,50,0.3)',
    textDark: '#200e00',
    statsGlass: 'rgba(0,0,0,0.4)',
    statsText: '#ffe8c8',
    labelText: 'rgba(32,14,0,0.7)',
    glowColor: 'rgba(205,127,50,0.55)',
    label: 'BRONZO',
    labelBg: 'rgba(205,127,50,0.2)',
    labelColor: '#d4903a',
    dropShadow: 'drop-shadow(0 8px 20px rgba(0,0,0,0.9)) drop-shadow(0 2px 8px rgba(150,70,10,0.5))',
    nameLine: 'rgba(220,150,60,0.6)',
    sepColor: 'rgba(190,120,50,0.22)',
  },
  if: {
    bg: 'linear-gradient(155deg, #050508 0%, #0e0e20 18%, #141830 34%, #0a2248 46%, #101828 58%, #080810 74%, #050508 100%)',
    pattern: 'repeating-linear-gradient(60deg, transparent, transparent 18px, rgba(0,212,255,0.04) 18px, rgba(0,212,255,0.04) 19px), repeating-linear-gradient(-60deg, transparent, transparent 18px, rgba(0,212,255,0.04) 18px, rgba(0,212,255,0.04) 19px)',
    foil: 'linear-gradient(130deg, rgba(0,212,255,0.45) 0%, transparent 30%, rgba(120,0,255,0.28) 55%, transparent 75%, rgba(0,212,255,0.32) 100%)',
    border: 'rgba(0,212,255,0.92)',
    innerBorder: 'rgba(0,212,255,0.28)',
    textDark: '#00d4ff',
    statsGlass: 'rgba(0,0,0,0.62)',
    statsText: '#00d4ff',
    labelText: 'rgba(0,212,255,0.88)',
    glowColor: 'rgba(0,212,255,0.65)',
    label: 'IN FORM',
    labelBg: 'rgba(0,212,255,0.15)',
    labelColor: '#00d4ff',
    dropShadow: 'drop-shadow(0 8px 24px rgba(0,0,0,0.95)) drop-shadow(0 0 14px rgba(0,212,255,0.55))',
    nameLine: 'rgba(0,212,255,0.5)',
    sepColor: 'rgba(0,212,255,0.18)',
  },
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
          0% { transform: translateX(-120%) skewX(-12deg); }
          100% { transform: translateX(320%) skewX(-12deg); }
        }
        @keyframes floatIF {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-7px); }
        }
        @keyframes glowIF {
          0%, 100% { box-shadow: 0 0 18px rgba(0,212,255,0.5), 0 0 36px rgba(0,212,255,0.18), 0 14px 32px rgba(0,0,0,0.7); }
          50% { box-shadow: 0 0 36px rgba(0,212,255,0.8), 0 0 70px rgba(0,212,255,0.35), 0 14px 38px rgba(0,0,0,0.8); }
        }
        @keyframes glowGold {
          0%, 100% { box-shadow: 0 0 14px rgba(255,215,0,0.4), 0 10px 28px rgba(0,0,0,0.6); }
          50% { box-shadow: 0 0 28px rgba(255,215,0,0.65), 0 10px 34px rgba(0,0,0,0.7); }
        }
        @keyframes glowSilver {
          0%, 100% { box-shadow: 0 0 10px rgba(192,192,192,0.3), 0 10px 24px rgba(0,0,0,0.6); }
          50% { box-shadow: 0 0 22px rgba(192,192,192,0.5), 0 10px 30px rgba(0,0,0,0.7); }
        }
        @keyframes glowBronze {
          0%, 100% { box-shadow: 0 0 10px rgba(205,127,50,0.35), 0 10px 24px rgba(0,0,0,0.6); }
          50% { box-shadow: 0 0 22px rgba(205,127,50,0.55), 0 10px 30px rgba(0,0,0,0.7); }
        }
        @keyframes ifPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }

        .card-if  { animation: glowIF 2s ease-in-out infinite, floatIF 3.5s ease-in-out infinite; }
        .card-gold   { animation: glowGold 3s ease-in-out infinite; }
        .card-silver { animation: glowSilver 3.5s ease-in-out infinite; }
        .card-bronze { animation: glowBronze 4s ease-in-out infinite; }
        .stat-card { transition: transform 0.28s ease !important; }
        .stat-card:hover { transform: translateY(-9px) scale(1.03) !important; }

        /* Layer render giocatore — nessun frame, nessun clip */
        .player-render-layer {
          position: absolute;
          top: 8px;
          left: 50%;
          transform: translateX(-50%);
          width: 96%;
          height: 62%;
          z-index: 4;
          pointer-events: none;
        }
        .player-render-layer img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: bottom center;
          display: block;
        }
        .player-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          font-size: 4.5rem;
          padding-bottom: 2px;
          opacity: 0.5;
        }

        /* Modal */
        .modal-player-layer {
          width: 90px;
          height: 118px;
          flex-shrink: 0;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }
        .modal-player-layer img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: bottom center;
          display: block;
        }
        .modal-player-placeholder {
          font-size: 3rem;
          opacity: 0.55;
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', animation: 'fadeInUp 0.4s ease' }}>
        <div style={{ fontSize: '3rem' }}>📊</div>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.25rem' }}>Statistiche</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.95rem' }}>Numeri e prestazioni di ogni giocatore.</p>
        </div>
      </div>

      {/* Legenda */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap', animation: 'fadeInUp 0.4s ease 0.1s both' }}>
        {[
          { label: 'IN FORM', desc: 'MVP ultima partita', bg: CARD_CONFIGS.if.labelBg, color: CARD_CONFIGS.if.labelColor },
          { label: 'ORO', desc: 'OVR 75+', bg: CARD_CONFIGS.gold.labelBg, color: CARD_CONFIGS.gold.labelColor },
          { label: 'ARGENTO', desc: 'OVR 65–74', bg: CARD_CONFIGS.silver.labelBg, color: CARD_CONFIGS.silver.labelColor },
          { label: 'BRONZO', desc: 'OVR 64–', bg: CARD_CONFIGS.bronze.labelBg, color: CARD_CONFIGS.bronze.labelColor },
        ].map(t => (
          <div key={t.label} style={{ background: t.bg, border: `1px solid ${t.color}`, borderRadius: '8px', padding: '0.3rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: t.color }}>{t.label}</span>
            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>{t.desc}</span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(160px, 28vw), 1fr))',
        gap: '1.1rem',
        justifyItems: 'center',
      }}>
        {giocatoriOrdinati.map((g, i) => (
          <div key={g.id} style={{ animation: `fadeInUp 0.4s ease ${i * 0.05}s both`, width: '100%', maxWidth: '200px' }}>
            <FutStatCard giocatore={g} onClick={() => setSelected(selected === g.id ? null : g.id)} />
          </div>
        ))}
      </div>

      {/* Modal */}
      {selected && (() => {
        const g = giocatoriConStats.find(x => x.id === selected)
        if (!g) return null
        const cardType = getCardType(g.overall, g.isIF)
        const cfg = CARD_CONFIGS[cardType]
        return (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(6px)' }}
            onClick={() => setSelected(null)}
          >
            <div
              style={{ background: 'rgba(12,18,36,0.98)', border: `1px solid ${cfg.border}`, borderRadius: '22px', padding: '1.75rem', maxWidth: '500px', width: '90%', animation: 'fadeInUp 0.28s ease', boxShadow: `0 0 36px ${cfg.glowColor}, 0 20px 50px rgba(0,0,0,0.7)` }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', gap: '1.1rem', marginBottom: '1.5rem', alignItems: 'flex-end' }}>
                <div className="modal-player-layer" style={{ filter: cfg.dropShadow }}>
                  {g.foto_url
                    ? <img src={g.foto_url} alt={g.nome} />
                    : <span className="modal-player-placeholder" style={{ color: cfg.labelColor }}>👤</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ background: cfg.labelBg, border: `1px solid ${cfg.labelColor}`, borderRadius: '6px', padding: '0.2rem 0.5rem', fontSize: '0.7rem', fontWeight: 800, color: cfg.labelColor }}>{cfg.label}</span>
                    {g.isIF && <span style={{ animation: 'ifPulse 1.5s ease-in-out infinite', fontSize: '0.7rem', color: '#00d4ff' }}>⚡ MVP ultima partita</span>}
                  </div>
                  <div style={{ fontSize: 'clamp(1.2rem, 4vw, 1.75rem)', fontWeight: 900, marginBottom: '0.25rem' }}>{g.nome}</div>
                  <div style={{ color: cfg.labelColor, fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.6rem' }}>{g.ruolo}</div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ background: cfg.labelBg, border: `1px solid ${cfg.border}`, borderRadius: '20px', padding: '0.22rem 0.7rem', fontSize: '0.82rem', fontWeight: 700, color: cfg.labelColor }}>OVR {g.overall}</span>
                    <span style={{ background: 'rgba(255,215,0,0.14)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: '20px', padding: '0.22rem 0.7rem', fontSize: '0.82rem', fontWeight: 700, color: '#ffd700' }}>{g.winRate}% WR</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem', marginBottom: '1.25rem' }}>
                {[
                  { label: 'Partite', value: g.partiteGiocate, color: '#fff' },
                  { label: 'Vittorie', value: g.vittorie, color: '#00d4ff' },
                  { label: 'Pareggi', value: g.pareggi, color: '#ffd700' },
                  { label: 'Sconfitte', value: g.sconfitte, color: '#ef4444' },
                  { label: 'Gol', value: g.gol, color: '#00ff88' },
                  { label: 'Assist', value: g.assist, color: '#a78bfa' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '0.9rem 0.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.7rem', fontWeight: 900, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.38)', marginTop: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Media Voti</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#ffd700' }}>{g.mediaVoti}</div>
              </div>

              <button onClick={() => setSelected(null)} style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.75rem', color: 'rgba(255,255,255,0.7)', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', letterSpacing: '0.3px' }}>
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

  const statsData = [
    { val: giocatore.partiteGiocate, label: 'PG' },
    { val: giocatore.vittorie,       label: 'V'  },
    { val: giocatore.gol,            label: 'GOL'},
    { val: giocatore.overall,        label: 'OVR'},
    { val: giocatore.pareggi,        label: 'PAR'},
    { val: giocatore.assist,         label: 'ASS'},
  ]

  return (
    <div
      className={`stat-card card-${cardType}`}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        height: 'min(305px, 60vw)',
        borderRadius: '14px',
        background: cfg.bg,
        border: `2px solid ${cfg.border}`,
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
        transform: hovered ? 'translateY(-9px) scale(1.03)' : 'translateY(0) scale(1)',
      }}
    >
      {/* Pattern geometrico sottile */}
      <div style={{
        position: 'absolute', inset: 0,
        background: cfg.pattern,
        opacity: 0.9,
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Foil overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: cfg.foil,
        pointerEvents: 'none', zIndex: 1,
      }} />

      {/* Shimmer sweep */}
      <div style={{
        position: 'absolute', top: '-60%', left: '-25%',
        width: '30%', height: '220%',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)',
        animation: 'shimmerCard 4s ease-in-out infinite',
        pointerEvents: 'none', zIndex: 2,
      }} />

      {/* Bordo interno inciso */}
      <div style={{
        position: 'absolute', top: '5px', left: '5px', right: '5px', bottom: '5px',
        border: `1px solid ${cfg.innerBorder}`,
        borderRadius: '10px',
        pointerEvents: 'none', zIndex: 3,
      }} />

      {/* Overall + Ruolo */}
      <div style={{ position: 'absolute', top: '10px', left: '11px', zIndex: 6, lineHeight: 1 }}>
        <div style={{
          fontSize: '2.05rem', fontWeight: 900, color: cfg.textDark,
          textShadow: '0 1px 0 rgba(255,255,255,0.3)',
          lineHeight: 1,
        }}>
          {giocatore.overall}
        </div>
        <div style={{
          fontSize: '0.56rem', fontWeight: 800, color: cfg.labelText,
          letterSpacing: '0.6px', marginTop: '3px', textTransform: 'uppercase',
        }}>
          {giocatore.ruolo}
        </div>
      </div>

      {/* IF badge */}
      {giocatore.isIF && (
        <div style={{
          position: 'absolute', top: '8px', right: '8px', zIndex: 7,
          background: 'rgba(0,212,255,0.18)',
          border: '1px solid rgba(0,212,255,0.82)',
          borderRadius: '5px',
          padding: '2px 6px',
          fontSize: '0.52rem', fontWeight: 900, color: '#00d4ff',
          letterSpacing: '0.6px',
          animation: 'ifPulse 1.5s ease-in-out infinite',
        }}>
          IF ⚡
        </div>
      )}

      {/* Player render layer — nessun frame, nessun clip */}
      <div className="player-render-layer" style={{ filter: cfg.dropShadow }}>
        {giocatore.foto_url ? (
          <img src={giocatore.foto_url} alt={giocatore.nome} />
        ) : (
          <div className="player-placeholder" style={{ color: cfg.labelColor }}>👤</div>
        )}
      </div>

      {/* Nome — integrato come scritta sulla card, non badge */}
      <div style={{
        position: 'absolute',
        bottom: '66px',
        left: 0, right: 0,
        textAlign: 'center',
        zIndex: 6,
        padding: '0 10px',
      }}>
        <span style={{
          fontSize: '0.78rem',
          fontWeight: 900,
          color: cfg.textDark,
          letterSpacing: '2px',
          textTransform: 'uppercase',
          textShadow: '0 1px 3px rgba(0,0,0,0.35), 0 -1px 0 rgba(255,255,255,0.15)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: 'block',
          // linea accent sotto il nome
          borderBottom: `1px solid ${cfg.nameLine}`,
          paddingBottom: '3px',
        }}>
          {cognome}
        </span>
      </div>

      {/* Stats bar — glass/metal moderna */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '62px',
        background: `linear-gradient(180deg, rgba(0,0,0,0.0) 0%, ${cfg.statsGlass} 28%)`,
        backdropFilter: 'blur(6px)',
        borderTop: `1px solid ${cfg.sepColor}`,
        zIndex: 5,
        display: 'flex',
        alignItems: 'center',
        padding: '0 6px',
      }}>
        {statsData.map((s, i) => (
          <div key={i} style={{
            flex: 1,
            textAlign: 'center',
            borderRight: i < statsData.length - 1 ? `1px solid ${cfg.sepColor}` : 'none',
            padding: '4px 0',
          }}>
            <div style={{ fontSize: '0.84rem', fontWeight: 900, color: cfg.statsText, lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: '0.46rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.4px', textTransform: 'uppercase', marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Statistiche
