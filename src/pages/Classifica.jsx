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
    <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'rgba(255, 255, 255, 0.5)' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏆</div>
      <div>Caricamento...</div>
    </div>
  )

  const giocatoriConPunti = giocatori.map(g => {
    let punti = 0
    let pg = 0
    let v = 0
    let p = 0
    let s = 0
    let gf = 0
    let gs = 0

    partite.forEach(partita => {
      const inA = partita.squadra_a?.includes(g.id)
      const inB = partita.squadra_b?.includes(g.id)

      if (!inA && !inB) return

      pg++
      gf += partita.eventi?.[g.id]?.gol || 0

      const isVittoriaA = partita.punteggio_a > partita.punteggio_b
      const isVittoriaB = partita.punteggio_b > partita.punteggio_a
      const isPareggio = partita.punteggio_a === partita.punteggio_b

      if (inA) {
        gs += partita.punteggio_b || 0

        if (isVittoriaA) {
          punti += 3
          v++
        } else if (isPareggio) {
          punti += 1
          p++
        } else {
          s++
        }
      } else {
        gs += partita.punteggio_a || 0

        if (isVittoriaB) {
          punti += 3
          v++
        } else if (isPareggio) {
          punti += 1
          p++
        } else {
          s++
        }
      }
    })

    return {
      ...g,
      punti,
      pg,
      v,
      p,
      s,
      gf,
      gs,
      dr: gf - gs,
    }
  })

  const classifica = [...giocatoriConPunti].sort((a, b) => {
    if (b.punti !== a.punti) return b.punti - a.punti
    if (b.dr !== a.dr) return b.dr - a.dr
    return b.gf - a.gf
  })

  const top3 = classifica.slice(0, 3)

  return (
    <div className="classifica-page">
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes shimmer {
          0% { transform: translateX(-130%) rotate(24deg); }
          100% { transform: translateX(330%) rotate(24deg); }
        }

        @keyframes softPulseGold {
          0%, 100% { box-shadow: 0 0 22px rgba(255, 215, 0, 0.35), 0 18px 34px rgba(0,0,0,0.45); }
          50% { box-shadow: 0 0 38px rgba(255, 215, 0, 0.6), 0 20px 42px rgba(0,0,0,0.55); }
        }

        @keyframes softPulseSilver {
          0%, 100% { box-shadow: 0 0 18px rgba(210, 220, 230, 0.28), 0 14px 30px rgba(0,0,0,0.42); }
          50% { box-shadow: 0 0 30px rgba(210, 220, 230, 0.48), 0 18px 38px rgba(0,0,0,0.52); }
        }

        @keyframes softPulseBronze {
          0%, 100% { box-shadow: 0 0 18px rgba(205, 127, 50, 0.28), 0 14px 30px rgba(0,0,0,0.42); }
          50% { box-shadow: 0 0 30px rgba(205, 127, 50, 0.48), 0 18px 38px rgba(0,0,0,0.52); }
        }

        .classifica-page {
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
          padding-bottom: 1rem;
        }

        .classifica-hero {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2rem;
          animation: fadeInUp 0.4s ease both;
        }

        .classifica-icon {
          width: 58px;
          height: 58px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          background: radial-gradient(circle at 35% 25%, rgba(255,215,0,0.34), rgba(0,212,255,0.12) 42%, rgba(15,23,41,0.75) 100%);
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow: 0 18px 38px rgba(0,0,0,0.32);
          flex-shrink: 0;
        }

        .classifica-title {
          font-size: clamp(2rem, 7vw, 2.8rem);
          font-weight: 950;
          margin: 0 0 0.2rem 0;
          line-height: 0.95;
          letter-spacing: -1.2px;
          background: linear-gradient(135deg, #ffffff 0%, #dff8ff 42%, #00d4ff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .classifica-subtitle {
          margin: 0;
          color: rgba(255,255,255,0.48);
          font-size: clamp(0.78rem, 3vw, 0.95rem);
          font-weight: 600;
        }

        .podio-section {
          margin-bottom: 2rem;
          padding: 1rem;
          border-radius: 26px;
          background:
            radial-gradient(circle at 50% 0%, rgba(255,215,0,0.13), transparent 32%),
            linear-gradient(180deg, rgba(15,23,41,0.72), rgba(15,23,41,0.34));
          border: 1px solid rgba(255,255,255,0.07);
          box-shadow: 0 20px 55px rgba(0,0,0,0.22);
          overflow: hidden;
          animation: fadeInUp 0.5s ease 0.08s both;
        }

        .podio-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1.1rem;
        }

        .podio-label h2 {
          margin: 0;
          font-size: 1rem;
          text-transform: uppercase;
          letter-spacing: 1.4px;
          color: rgba(255,255,255,0.82);
        }

        .podio-label span {
          font-size: 0.75rem;
          font-weight: 800;
          color: #0f1729;
          background: linear-gradient(135deg, #ffd700, #ffa500);
          padding: 0.38rem 0.68rem;
          border-radius: 999px;
          white-space: nowrap;
        }

        .podio-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          align-items: end;
          gap: 0.75rem;
          width: 100%;
          max-width: 650px;
          margin: 0 auto;
        }

        .podio-slot {
          min-width: 0;
          display: flex;
          justify-content: center;
          animation: fadeInUp 0.55s ease both;
        }

        .podio-slot.first {
          transform: translateY(-12px);
          animation-delay: 0.02s;
        }

        .podio-slot.second {
          animation-delay: 0.12s;
        }

        .podio-slot.third {
          animation-delay: 0.2s;
        }

        .fut-card {
          width: 100%;
          max-width: 198px;
          aspect-ratio: 0.64;
          border-radius: 18px;
          position: relative;
          overflow: hidden;
          cursor: default;
          display: flex;
          flex-direction: column;
          isolation: isolate;
          transition: transform 0.22s ease, filter 0.22s ease;
        }

        .fut-card.first {
          max-width: 218px;
          animation: softPulseGold 2.4s ease-in-out infinite;
        }

        .fut-card.second {
          max-width: 188px;
          animation: softPulseSilver 2.8s ease-in-out infinite;
        }

        .fut-card.third {
          max-width: 188px;
          animation: softPulseBronze 3s ease-in-out infinite;
        }

        .fut-card:hover {
          transform: translateY(-4px) scale(1.02);
          filter: saturate(1.08);
        }

        .fut-inner-border {
          position: absolute;
          inset: 5px;
          border-radius: 14px;
          pointer-events: none;
          z-index: 4;
        }

        .fut-foil {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 1;
        }

        .fut-shimmer {
          position: absolute;
          top: -55%;
          left: -25%;
          width: 44%;
          height: 220%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
          animation: shimmer 3.8s ease-in-out infinite;
          pointer-events: none;
          z-index: 2;
        }

        .fut-top-left {
          position: absolute;
          top: clamp(7px, 2.1vw, 14px);
          left: clamp(7px, 2.1vw, 14px);
          z-index: 5;
          text-align: center;
        }

        .fut-overall {
          font-size: clamp(1.05rem, 5vw, 2.35rem);
          font-weight: 950;
          line-height: 0.9;
          text-shadow: 0 1px 0 rgba(255,255,255,0.42);
        }

        .fut-role {
          margin-top: 0.18rem;
          font-size: clamp(0.42rem, 1.7vw, 0.66rem);
          font-weight: 900;
          letter-spacing: 0.5px;
        }

        .fut-medal {
          position: absolute;
          top: clamp(6px, 1.9vw, 12px);
          right: clamp(6px, 1.9vw, 12px);
          z-index: 5;
          font-size: clamp(1rem, 4.5vw, 1.8rem);
          filter: drop-shadow(0 3px 8px rgba(0,0,0,0.35));
        }

        .fut-photo {
          position: absolute;
          top: 15%;
          left: 50%;
          transform: translateX(-50%);
          width: 55%;
          height: 39%;
          z-index: 3;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .fut-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top;
          border-radius: 10px;
          filter: drop-shadow(0 8px 12px rgba(0,0,0,0.48));
        }

        .fut-placeholder {
          font-size: clamp(2.2rem, 10vw, 5rem);
          opacity: 0.62;
          filter: drop-shadow(0 6px 12px rgba(0,0,0,0.42));
        }

        .fut-name {
          position: absolute;
          left: 6px;
          right: 6px;
          bottom: 30%;
          z-index: 5;
          text-align: center;
        }

        .fut-name-text {
          font-size: clamp(0.5rem, 2.5vw, 0.9rem);
          font-weight: 950;
          letter-spacing: clamp(0.7px, 0.5vw, 2px);
          text-transform: uppercase;
          text-shadow: 0 1px 0 rgba(255,255,255,0.32);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .fut-stats {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 5;
          padding: clamp(0.34rem, 1.8vw, 0.62rem);
          border-top: 1px solid rgba(255,255,255,0.18);
        }

        .fut-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: clamp(2px, 1vw, 5px);
        }

        .fut-stat {
          min-width: 0;
          text-align: center;
        }

        .fut-stat-value {
          font-size: clamp(0.62rem, 2.5vw, 0.95rem);
          font-weight: 950;
          line-height: 1;
        }

        .fut-stat-label {
          margin-top: 1px;
          font-size: clamp(0.35rem, 1.4vw, 0.52rem);
          font-weight: 850;
          color: rgba(255,255,255,0.55);
          letter-spacing: 0.2px;
          text-transform: uppercase;
        }

        .ranking-section {
          border-radius: 26px;
          padding: 1rem;
          background:
            radial-gradient(circle at 5% 0%, rgba(0,212,255,0.12), transparent 30%),
            linear-gradient(180deg, rgba(15,23,41,0.74), rgba(15,23,41,0.44));
          border: 1px solid rgba(255,255,255,0.07);
          box-shadow: 0 20px 55px rgba(0,0,0,0.22);
          animation: fadeInUp 0.55s ease 0.16s both;
        }

        .ranking-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 0.9rem;
        }

        .ranking-header h2 {
          margin: 0;
          font-size: 1.05rem;
          letter-spacing: -0.2px;
        }

        .ranking-header p {
          margin: 0.18rem 0 0 0;
          color: rgba(255,255,255,0.43);
          font-size: 0.76rem;
          font-weight: 600;
        }

        .ranking-total {
          flex-shrink: 0;
          font-size: 0.72rem;
          font-weight: 900;
          color: rgba(255,255,255,0.68);
          border: 1px solid rgba(255,255,255,0.09);
          background: rgba(255,255,255,0.04);
          padding: 0.42rem 0.62rem;
          border-radius: 999px;
        }

        .rank-list {
          display: flex;
          flex-direction: column;
          gap: 0.72rem;
        }

        .rank-card {
          position: relative;
          overflow: hidden;
          border-radius: 21px;
          border: 1px solid rgba(255,255,255,0.075);
          background:
            linear-gradient(135deg, rgba(255,255,255,0.055), rgba(255,255,255,0.02)),
            rgba(5, 10, 23, 0.34);
          padding: 0.76rem;
          animation: fadeInUp 0.35s ease both;
          transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
        }

        .rank-card:hover {
          transform: translateY(-2px);
          border-color: rgba(0,212,255,0.22);
          background:
            linear-gradient(135deg, rgba(0,212,255,0.075), rgba(255,255,255,0.02)),
            rgba(5, 10, 23, 0.42);
        }

        .rank-card.gold {
          border-color: rgba(255,215,0,0.26);
          background:
            radial-gradient(circle at 0% 0%, rgba(255,215,0,0.18), transparent 30%),
            linear-gradient(135deg, rgba(255,215,0,0.08), rgba(255,255,255,0.02)),
            rgba(5, 10, 23, 0.42);
        }

        .rank-card.silver {
          border-color: rgba(215,225,235,0.20);
          background:
            radial-gradient(circle at 0% 0%, rgba(215,225,235,0.14), transparent 30%),
            linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02)),
            rgba(5, 10, 23, 0.4);
        }

        .rank-card.bronze {
          border-color: rgba(205,127,50,0.22);
          background:
            radial-gradient(circle at 0% 0%, rgba(205,127,50,0.14), transparent 30%),
            linear-gradient(135deg, rgba(205,127,50,0.06), rgba(255,255,255,0.02)),
            rgba(5, 10, 23, 0.4);
        }

        .rank-main {
          display: grid;
          grid-template-columns: auto auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 0.65rem;
        }

        .rank-position {
          width: 34px;
          height: 34px;
          border-radius: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.82rem;
          font-weight: 950;
          color: rgba(255,255,255,0.58);
          background: rgba(255,255,255,0.055);
          border: 1px solid rgba(255,255,255,0.07);
          flex-shrink: 0;
        }

        .rank-position.gold,
        .rank-position.silver,
        .rank-position.bronze {
          color: #0f1729;
          border: none;
        }

        .rank-position.gold {
          background: linear-gradient(135deg, #ffd700, #ffa500);
          box-shadow: 0 0 20px rgba(255,215,0,0.28);
        }

        .rank-position.silver {
          background: linear-gradient(135deg, #f3f4f6, #9ca3af);
        }

        .rank-position.bronze {
          background: linear-gradient(135deg, #cd7f32, #8b4a18);
        }

        .rank-avatar {
          width: 46px;
          height: 46px;
          border-radius: 17px;
          overflow: hidden;
          background: rgba(0,212,255,0.08);
          border: 1px solid rgba(0,212,255,0.18);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          flex-shrink: 0;
        }

        .rank-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top;
        }

        .rank-identity {
          min-width: 0;
        }

        .rank-name {
          font-size: clamp(0.9rem, 3.7vw, 1rem);
          font-weight: 900;
          line-height: 1.08;
          color: rgba(255,255,255,0.94);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .rank-meta {
          margin-top: 0.22rem;
          font-size: 0.72rem;
          color: rgba(255,255,255,0.43);
          font-weight: 720;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .rank-points {
          min-width: 54px;
          height: 48px;
          border-radius: 18px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #0f1729;
          background: linear-gradient(135deg, #00d4ff, #0099ff);
          box-shadow: 0 0 22px rgba(0,212,255,0.2);
          flex-shrink: 0;
        }

        .rank-card.gold .rank-points {
          background: linear-gradient(135deg, #ffd700, #ffa500);
          box-shadow: 0 0 24px rgba(255,215,0,0.24);
        }

        .rank-points-value {
          font-size: 1rem;
          font-weight: 950;
          line-height: 0.95;
        }

        .rank-points-label {
          margin-top: 0.12rem;
          font-size: 0.52rem;
          font-weight: 950;
          letter-spacing: 0.45px;
        }

        .rank-stats {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 0.38rem;
          margin-top: 0.72rem;
        }

        .rank-stat-chip {
          min-width: 0;
          border-radius: 13px;
          padding: 0.38rem 0.2rem;
          text-align: center;
          background: rgba(255,255,255,0.045);
          border: 1px solid rgba(255,255,255,0.055);
        }

        .rank-stat-value {
          display: block;
          font-size: 0.78rem;
          font-weight: 950;
          line-height: 1;
          color: rgba(255,255,255,0.82);
        }

        .rank-stat-label {
          display: block;
          margin-top: 0.18rem;
          font-size: 0.5rem;
          font-weight: 900;
          letter-spacing: 0.35px;
          text-transform: uppercase;
          color: rgba(255,255,255,0.36);
        }

        .rank-stat-chip.win .rank-stat-value { color: #00d4ff; }
        .rank-stat-chip.draw .rank-stat-value { color: #ffd166; }
        .rank-stat-chip.loss .rank-stat-value { color: #ef4444; }

        @media (max-width: 620px) {
          .classifica-hero {
            align-items: flex-start;
            margin-bottom: 1.5rem;
          }

          .classifica-icon {
            width: 50px;
            height: 50px;
            border-radius: 17px;
            font-size: 1.65rem;
          }

          .podio-section,
          .ranking-section {
            border-radius: 22px;
            padding: 0.82rem;
          }

          .podio-label {
            margin-bottom: 0.85rem;
          }

          .podio-label h2 {
            font-size: 0.82rem;
            letter-spacing: 1px;
          }

          .podio-label span {
            font-size: 0.64rem;
            padding: 0.32rem 0.5rem;
          }

          .podio-grid {
            gap: 0.42rem;
          }

          .podio-slot.first {
            transform: translateY(-7px);
          }

          .fut-card {
            max-width: none;
            border-radius: 14px;
            aspect-ratio: 0.62;
          }

          .fut-inner-border {
            inset: 4px;
            border-radius: 11px;
          }

          .fut-stats-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .rank-main {
            grid-template-columns: auto auto minmax(0, 1fr) auto;
            gap: 0.52rem;
          }

          .rank-card {
            border-radius: 19px;
            padding: 0.68rem;
          }

          .rank-position {
            width: 31px;
            height: 31px;
            border-radius: 12px;
            font-size: 0.76rem;
          }

          .rank-avatar {
            width: 42px;
            height: 42px;
            border-radius: 15px;
          }

          .rank-points {
            min-width: 48px;
            height: 44px;
            border-radius: 16px;
          }

          .rank-stats {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 0.36rem;
          }

          .rank-stat-chip {
            padding: 0.36rem 0.18rem;
          }
        }

        @media (max-width: 360px) {
          .podio-section {
            padding-left: 0.64rem;
            padding-right: 0.64rem;
          }

          .podio-grid {
            gap: 0.3rem;
          }

          .rank-card {
            padding: 0.62rem;
          }

          .rank-main {
            gap: 0.42rem;
          }

          .rank-position {
            width: 29px;
            height: 29px;
          }

          .rank-avatar {
            width: 39px;
            height: 39px;
          }

          .rank-points {
            min-width: 44px;
            height: 41px;
          }
        }
      `}</style>

      <div className="classifica-hero">
        <div className="classifica-icon">🏆</div>
        <div style={{ minWidth: 0 }}>
          <h1 className="classifica-title">Classifica</h1>
          <p className="classifica-subtitle">Vittoria 3 punti • Pareggio 1 • Sconfitta 0</p>
        </div>
      </div>

      {top3.length >= 3 && (
        <section className="podio-section">
          <div className="podio-label">
            <h2>Podio Fuciabol</h2>
            <span>Top 3</span>
          </div>

          <div className="podio-grid">
            <div className="podio-slot second">
              <FutCard giocatore={top3[1]} position={2} />
            </div>

            <div className="podio-slot first">
              <FutCard giocatore={top3[0]} position={1} />
            </div>

            <div className="podio-slot third">
              <FutCard giocatore={top3[2]} position={3} />
            </div>
          </div>
        </section>
      )}

      <section className="ranking-section">
        <div className="ranking-header">
          <div>
            <h2>Ranking generale</h2>
            <p>Ordinata per punti, differenza reti e gol fatti</p>
          </div>
          <div className="ranking-total">{classifica.length} giocatori</div>
        </div>

        <div className="rank-list">
          {classifica.map((g, index) => (
            <RankCard key={g.id} giocatore={g} position={index + 1} index={index} />
          ))}
        </div>
      </section>
    </div>
  )
}

function FutCard({ giocatore, position }) {
  const cleanName = getCleanName(giocatore.nome)
  const parts = cleanName.split(' ').filter(Boolean)
  const displayName = parts.length > 1 ? parts[parts.length - 1].toUpperCase() : cleanName.toUpperCase()

  const cfg = {
    1: {
      className: 'first',
      medal: '🥇',
      bg: 'linear-gradient(160deg, #9f6b05 0%, #d59b18 18%, #ffe26c 38%, #d59b18 58%, #f4c145 76%, #8a5d04 100%)',
      border: 'rgba(255,235,80,0.95)',
      innerBorder: 'rgba(255,235,80,0.5)',
      foil: 'linear-gradient(135deg, rgba(255,255,220,0.52) 0%, transparent 38%, rgba(255,230,100,0.28) 60%, transparent 78%, rgba(255,255,220,0.42) 100%)',
      text: '#241500',
      muted: 'rgba(36,21,0,0.68)',
      statsBg: 'rgba(0,0,0,0.52)',
      statsText: '#fff5cc',
    },
    2: {
      className: 'second',
      medal: '🥈',
      bg: 'linear-gradient(160deg, #6b7280 0%, #cfd6df 22%, #f7f7f7 42%, #9ca3af 58%, #dbe2ea 76%, #6b7280 100%)',
      border: 'rgba(235,240,245,0.9)',
      innerBorder: 'rgba(235,240,245,0.45)',
      foil: 'linear-gradient(135deg, rgba(255,255,255,0.58) 0%, transparent 40%, rgba(230,235,240,0.35) 62%, transparent 80%, rgba(255,255,255,0.45) 100%)',
      text: '#151515',
      muted: 'rgba(21,21,21,0.62)',
      statsBg: 'rgba(0,0,0,0.46)',
      statsText: '#f5f7fa',
    },
    3: {
      className: 'third',
      medal: '🥉',
      bg: 'linear-gradient(160deg, #5d2e08 0%, #a95f22 22%, #dc9149 42%, #7a3f10 58%, #c87832 76%, #5d2e08 100%)',
      border: 'rgba(220,150,70,0.9)',
      innerBorder: 'rgba(220,150,70,0.42)',
      foil: 'linear-gradient(135deg, rgba(255,210,150,0.48) 0%, transparent 40%, rgba(210,145,80,0.28) 62%, transparent 80%, rgba(255,205,140,0.38) 100%)',
      text: '#1f0d00',
      muted: 'rgba(31,13,0,0.62)',
      statsBg: 'rgba(0,0,0,0.48)',
      statsText: '#ffe8c8',
    },
  }[position]

  return (
    <div
      className={`fut-card ${cfg.className}`}
      style={{
        background: cfg.bg,
        border: `2px solid ${cfg.border}`,
      }}
    >
      <div className="fut-inner-border" style={{ border: `1px solid ${cfg.innerBorder}` }} />
      <div className="fut-foil" style={{ background: cfg.foil }} />
      <div className="fut-shimmer" />

      <div className="fut-top-left">
        <div className="fut-overall" style={{ color: cfg.text }}>{giocatore.overall}</div>
        <div className="fut-role" style={{ color: cfg.muted }}>{giocatore.ruolo}</div>
      </div>

      <div className="fut-medal">{cfg.medal}</div>

      <div className="fut-photo">
        {giocatore.foto_url ? (
          <img src={giocatore.foto_url} alt={giocatore.nome} />
        ) : (
          <div className="fut-placeholder">👤</div>
        )}
      </div>

      <div className="fut-name">
        <div className="fut-name-text" style={{ color: cfg.text }}>{displayName}</div>
      </div>

      <div className="fut-stats" style={{ background: cfg.statsBg }}>
        <div className="fut-stats-grid">
          {[
            { value: giocatore.punti, label: 'PTS' },
            { value: giocatore.v || 0, label: 'V' },
            { value: giocatore.gf || 0, label: 'GOL' },
            { value: giocatore.pg || 0, label: 'PG' },
            { value: giocatore.dr || 0, label: 'DR' },
            { value: giocatore.s || 0, label: 'S' },
          ].map((stat, index) => (
            <div className="fut-stat" key={`${stat.label}-${index}`}>
              <div className="fut-stat-value" style={{ color: cfg.statsText }}>{stat.value}</div>
              <div className="fut-stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function RankCard({ giocatore, position, index }) {
  const cleanName = getCleanName(giocatore.nome)

  const rankClass =
    position === 1 ? 'gold' :
    position === 2 ? 'silver' :
    position === 3 ? 'bronze' :
    ''

  const positionLabel =
    position === 1 ? '1' :
    position === 2 ? '2' :
    position === 3 ? '3' :
    position

  return (
    <article
      className={`rank-card ${rankClass}`}
      style={{ animationDelay: `${index * 0.035}s` }}
    >
      <div className="rank-main">
        <div className={`rank-position ${rankClass}`}>{positionLabel}</div>

        <div className="rank-avatar">
          {giocatore.foto_url ? (
            <img src={giocatore.foto_url} alt={giocatore.nome} />
          ) : (
            '👤'
          )}
        </div>

        <div className="rank-identity">
          <div className="rank-name">{cleanName}</div>
          <div className="rank-meta">
            {giocatore.ruolo || '—'} • OVR {giocatore.overall || 65}
          </div>
        </div>

        <div className="rank-points">
          <div className="rank-points-value">{giocatore.punti}</div>
          <div className="rank-points-label">PTS</div>
        </div>
      </div>

      <div className="rank-stats">
        <StatChip label="PG" value={giocatore.pg} />
        <StatChip label="V" value={giocatore.v} type="win" />
        <StatChip label="P" value={giocatore.p} type="draw" />
        <StatChip label="S" value={giocatore.s} type="loss" />
        <StatChip label="GF" value={giocatore.gf} />
        <StatChip label="DR" value={giocatore.dr} />
      </div>
    </article>
  )
}

function StatChip({ label, value, type = '' }) {
  return (
    <div className={`rank-stat-chip ${type}`}>
      <span className="rank-stat-value">{value ?? 0}</span>
      <span className="rank-stat-label">{label}</span>
    </div>
  )
}

function getCleanName(nome = '') {
  return nome.replace(/\s*\(.*?\)/g, '').trim()
}

export default Classifica
