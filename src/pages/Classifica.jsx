import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const FILTERS = [
  { id: 'punti', label: 'Punti', short: 'PTS', desc: 'Punti totali' },
  { id: 'winrate', label: 'Win rate', short: 'WR', desc: 'Vittorie / partite' },
  { id: 'mediagol', label: 'Media gol', short: 'G/P', desc: 'Gol per partita' },
  { id: 'gol', label: 'Gol totali', short: 'GOL', desc: 'Classifica bomber' },
]

function Classifica() {
  const [giocatori, setGiocatori] = useState([])
  const [partite, setPartite] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('punti')

  useEffect(() => { caricaDati() }, [])

  async function caricaDati() {
    const { data: giocatoriData } = await supabase.from('giocatori').select('*')
    const { data: partiteData } = await supabase.from('partite').select('*').eq('stato', 'chiusa')

    if (giocatoriData) setGiocatori(giocatoriData)
    if (partiteData) setPartite(partiteData)
    setLoading(false)
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'rgba(255,255,255,0.5)' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏆</div>
      <div>Caricamento...</div>
    </div>
  )

  const giocatoriConStats = giocatori.map(g => {
    let punti = 0, pg = 0, v = 0, p = 0, s = 0, gf = 0, gs = 0

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
        if (isVittoriaA) { punti += 3; v++ }
        else if (isPareggio) { punti += 1; p++ }
        else { s++ }
      } else {
        gs += partita.punteggio_a || 0
        if (isVittoriaB) { punti += 3; v++ }
        else if (isPareggio) { punti += 1; p++ }
        else { s++ }
      }
    })

    const winRate = pg > 0 ? (v / pg) * 100 : 0
    const mediaGol = pg > 0 ? gf / pg : 0

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
      winRate,
      mediaGol,
    }
  })

  const classifica = [...giocatoriConStats].sort((a, b) => sortPlayers(a, b, activeFilter))
  const top3 = classifica.slice(0, 3)
  const active = FILTERS.find(f => f.id === activeFilter)

  return (
    <div className="classifica-page">
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(22px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .classifica-page {
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
          padding-bottom: 1.5rem;
        }

        .classifica-hero {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
          animation: fadeInUp 0.35s ease both;
        }

        @keyframes iconGlow {
          0%, 100% { box-shadow: 0 0 14px rgba(0,212,255,0.18), 0 4px 18px rgba(0,0,0,0.4); }
          50% { box-shadow: 0 0 26px rgba(0,212,255,0.32), 0 4px 22px rgba(0,0,0,0.45); }
        }

        .classifica-icon {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(145deg, rgba(0,212,255,0.12), rgba(10,16,30,0.9));
          border: 1px solid rgba(0,212,255,0.28);
          animation: iconGlow 3s ease-in-out infinite;
          flex-shrink: 0;
        }

        .classifica-title {
          margin: 0 0 0.22rem 0;
          font-size: clamp(1.5rem, 6vw, 2rem);
          font-weight: 900;
          letter-spacing: -0.5px;
          line-height: 1;
          font-family: system-ui, -apple-system, sans-serif;
          color: #fff;
        }

        .classifica-subtitle {
          margin: 0;
          color: rgba(255,255,255,0.42);
          font-size: clamp(0.72rem, 2.8vw, 0.82rem);
          font-weight: 500;
          letter-spacing: 0.2px;
        }

        .filter-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.7rem;
          margin-bottom: 1.35rem;
        }

        .filter-button {
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.035);
          color: rgba(255,255,255,0.64);
          border-radius: 18px;
          padding: 0.9rem 0.55rem;
          cursor: pointer;
          transition: all 0.18s ease;
          font-family: inherit;
          min-width: 0;
        }

        .filter-button.active {
          background: linear-gradient(135deg, rgba(0,212,255,0.18), rgba(0,153,255,0.08));
          border-color: rgba(0,212,255,0.42);
          box-shadow: 0 0 24px rgba(0,212,255,0.14), inset 0 1px 0 rgba(255,255,255,0.08);
          color: #fff;
        }

        .filter-label {
          display: block;
          font-size: 0.9rem;
          font-weight: 900;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .filter-short {
          display: block;
          margin-top: 0.28rem;
          font-size: 0.64rem;
          font-weight: 950;
          color: #00d4ff;
          letter-spacing: 2px;
        }

        .podio-section, .ranking-section {
          border-radius: 26px;
          background:
            radial-gradient(circle at 5% 0%, rgba(0,212,255,0.13), transparent 30%),
            linear-gradient(180deg, rgba(15,23,41,0.78), rgba(15,23,41,0.45));
          border: 1px solid rgba(255,255,255,0.07);
          box-shadow: 0 20px 55px rgba(0,0,0,0.24);
          overflow: hidden;
          animation: fadeInUp 0.45s ease both;
        }

        .podio-section {
          padding: 1rem;
          margin-bottom: 1.45rem;
          background:
            radial-gradient(circle at 50% 0%, rgba(255,215,0,0.13), transparent 34%),
            linear-gradient(180deg, rgba(15,23,41,0.78), rgba(15,23,41,0.42));
        }

        .section-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 0.95rem;
        }

        .section-header h2 {
          margin: 0;
          font-size: 1.05rem;
          font-weight: 950;
          letter-spacing: -0.2px;
        }

        .section-header p {
          margin: 0.2rem 0 0 0;
          color: rgba(255,255,255,0.43);
          font-size: 0.76rem;
          font-weight: 650;
        }

        .section-pill {
          flex-shrink: 0;
          border-radius: 999px;
          padding: 0.42rem 0.7rem;
          font-size: 0.72rem;
          font-weight: 950;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.09);
          color: rgba(255,255,255,0.7);
        }

        .podio-list {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.75rem;
        }

        .podio-card {
          min-width: 0;
          border-radius: 22px;
          padding: 0.9rem;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(5,10,23,0.34);
          position: relative;
          overflow: hidden;
        }

        .podio-card.gold {
          border-color: rgba(255,215,0,0.34);
          background:
            radial-gradient(circle at 0% 0%, rgba(255,215,0,0.22), transparent 42%),
            rgba(5,10,23,0.42);
        }

        .podio-card.silver {
          border-color: rgba(220,230,240,0.22);
          background:
            radial-gradient(circle at 0% 0%, rgba(220,230,240,0.16), transparent 42%),
            rgba(5,10,23,0.40);
        }

        .podio-card.bronze {
          border-color: rgba(205,127,50,0.24);
          background:
            radial-gradient(circle at 0% 0%, rgba(205,127,50,0.16), transparent 42%),
            rgba(5,10,23,0.40);
        }

        .podio-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.6rem;
          margin-bottom: 0.75rem;
        }

        .podio-medal {
          width: 42px;
          height: 42px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.35rem;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
        }

        .podio-value {
          text-align: right;
          min-width: 0;
        }

        .podio-value strong {
          display: block;
          font-size: 1.3rem;
          line-height: 1;
          color: #00d4ff;
          font-weight: 950;
        }

        .podio-value span {
          display: block;
          margin-top: 0.18rem;
          color: rgba(255,255,255,0.4);
          font-size: 0.58rem;
          font-weight: 950;
          letter-spacing: 1.5px;
        }

        .podio-avatar {
          width: 56px;
          height: 56px;
          border-radius: 20px;
          overflow: hidden;
          background: rgba(0,212,255,0.08);
          border: 1px solid rgba(0,212,255,0.18);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          margin-bottom: 0.65rem;
        }

        .podio-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top;
        }

        .podio-name {
          font-size: 0.95rem;
          font-weight: 950;
          color: rgba(255,255,255,0.94);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .podio-meta {
          margin-top: 0.24rem;
          color: rgba(255,255,255,0.42);
          font-size: 0.72rem;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ranking-section {
          padding: 1rem;
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
            rgba(5,10,23,0.34);
          padding: 0.76rem;
          animation: fadeInUp 0.32s ease both;
        }

        .rank-card.gold {
          border-color: rgba(255,215,0,0.28);
          background:
            radial-gradient(circle at 0% 0%, rgba(255,215,0,0.18), transparent 32%),
            rgba(5,10,23,0.43);
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

        .rank-position.gold, .rank-position.silver, .rank-position.bronze {
          color: #0f1729;
          border: none;
        }

        .rank-position.gold { background: linear-gradient(135deg, #ffd700, #ffa500); }
        .rank-position.silver { background: linear-gradient(135deg, #f3f4f6, #9ca3af); }
        .rank-position.bronze { background: linear-gradient(135deg, #cd7f32, #8b4a18); }

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

        .rank-identity { min-width: 0; }

        .rank-name {
          font-size: clamp(0.9rem, 3.7vw, 1rem);
          font-weight: 950;
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

        .rank-main-value {
          min-width: 58px;
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

        .rank-card.gold .rank-main-value {
          background: linear-gradient(135deg, #ffd700, #ffa500);
          box-shadow: 0 0 24px rgba(255,215,0,0.24);
        }

        .rank-value-number {
          font-size: 1rem;
          font-weight: 950;
          line-height: 0.95;
        }

        .rank-value-label {
          margin-top: 0.14rem;
          font-size: 0.5rem;
          font-weight: 950;
          letter-spacing: 0.45px;
        }

        .rank-note {
          margin-top: 0.5rem;
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.66rem;
          font-weight: 800;
          color: #ffd166;
          background: rgba(255,209,102,0.08);
          border: 1px solid rgba(255,209,102,0.15);
          padding: 0.28rem 0.5rem;
          border-radius: 999px;
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

        .win .rank-stat-value { color: #00d4ff; }
        .draw .rank-stat-value { color: #ffd166; }
        .loss .rank-stat-value { color: #ef4444; }

        @media (max-width: 640px) {
          .classifica-hero {
            align-items: flex-start;
            margin-bottom: 1.2rem;
          }

          .classifica-icon {
            width: 50px;
            height: 50px;
            border-radius: 17px;
            font-size: 1.65rem;
          }

          .filter-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 0.62rem;
          }

          .filter-button {
            padding: 0.8rem 0.45rem;
            border-radius: 17px;
          }

          .podio-section, .ranking-section {
            border-radius: 22px;
            padding: 0.82rem;
          }

          .podio-list {
            grid-template-columns: 1fr;
            gap: 0.65rem;
          }

          .podio-card {
            display: grid;
            grid-template-columns: auto auto minmax(0, 1fr) auto;
            align-items: center;
            gap: 0.65rem;
            padding: 0.75rem;
            border-radius: 19px;
          }

          .podio-top {
            display: contents;
          }

          .podio-medal {
            width: 38px;
            height: 38px;
            border-radius: 14px;
            font-size: 1.15rem;
            margin: 0;
          }

          .podio-avatar {
            width: 44px;
            height: 44px;
            border-radius: 16px;
            margin: 0;
          }

          .podio-text-wrap {
            min-width: 0;
          }

          .podio-value {
            min-width: 62px;
          }

          .podio-value strong {
            font-size: 1.05rem;
          }

          .rank-main {
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

          .rank-main-value {
            min-width: 50px;
            height: 44px;
            border-radius: 16px;
          }

          .rank-stats {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 0.36rem;
          }
        }
      `}</style>

      <div className="classifica-hero">
        <div className="classifica-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 21h8M12 17v4M17 3H7l-2 7c0 2.2 3.1 4 7 4s7-1.8 7-4L17 3z"/>
            <path d="M5 10c-2 0-3 1-3 2.5S3 15 5 15M19 10c2 0 3 1 3 2.5S21 15 19 15"/>
          </svg>
        </div>
        <div style={{ minWidth: 0 }}>
          <h1 className="classifica-title">Classifica</h1>
          <p className="classifica-subtitle">Vittoria 3 punti · Pareggio 1 · Sconfitta 0</p>
        </div>
      </div>
      <div style={{ height: '2px', background: 'linear-gradient(90deg, rgba(0,212,255,0.5), rgba(0,212,255,0.08), transparent)', borderRadius: '2px', marginBottom: '1.5rem' }} />

      <div className="filter-grid">
        {FILTERS.map(filter => (
          <button
            key={filter.id}
            className={`filter-button ${activeFilter === filter.id ? 'active' : ''}`}
            onClick={() => setActiveFilter(filter.id)}
          >
            <span className="filter-label">{filter.label}</span>
            <span className="filter-short">{filter.short}</span>
          </button>
        ))}
      </div>

      {top3.length > 0 && (
        <section className="podio-section">
          <div className="section-header">
            <div>
              <h2>Podio Fuciabol</h2>
              <p>{active?.desc || 'Classifica attiva'}</p>
            </div>
            <div className="section-pill">{active?.short || 'TOP'}</div>
          </div>

          <div className="podio-list">
            {top3.map((g, index) => (
              <PodioCard
                key={g.id}
                giocatore={g}
                position={index + 1}
                filter={activeFilter}
              />
            ))}
          </div>
        </section>
      )}

      <section className="ranking-section">
        <div className="section-header">
          <div>
            <h2>{getRankingTitle(activeFilter)}</h2>
            <p>{getRankingSubtitle(activeFilter)}</p>
          </div>
          <div className="section-pill">{classifica.length} giocatori</div>
        </div>

        <div className="rank-list">
          {classifica.map((g, index) => (
            <RankCard
              key={g.id}
              giocatore={g}
              position={index + 1}
              index={index}
              filter={activeFilter}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

function PodioCard({ giocatore, position, filter }) {
  const rankClass = getRankClass(position)
  const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : '🥉'
  const main = getMainValue(giocatore, filter)
  const cleanName = getCleanName(giocatore.nome)

  return (
    <article className={`podio-card ${rankClass}`}>
      <div className="podio-top">
        <div className="podio-medal">{medal}</div>
        <div className="podio-value">
          <strong>{main.value}</strong>
          <span>{main.label}</span>
        </div>
      </div>

      <div className="podio-avatar">
        {giocatore.foto_url ? <img src={giocatore.foto_url} alt={giocatore.nome} /> : '👤'}
      </div>

      <div className="podio-text-wrap">
        <div className="podio-name">{cleanName}</div>
        <div className="podio-meta">{giocatore.ruolo || '—'} • OVR {giocatore.overall || 65}</div>
      </div>
    </article>
  )
}

function RankCard({ giocatore, position, index, filter }) {
  const cleanName = getCleanName(giocatore.nome)
  const rankClass = getRankClass(position)
  const main = getMainValue(giocatore, filter)
  const lowSample = filter === 'winrate' && giocatore.pg > 0 && giocatore.pg < 2

  return (
    <article className={`rank-card ${rankClass}`} style={{ animationDelay: `${index * 0.03}s` }}>
      <div className="rank-main">
        <div className={`rank-position ${rankClass}`}>{position}</div>

        <div className="rank-avatar">
          {giocatore.foto_url ? <img src={giocatore.foto_url} alt={giocatore.nome} /> : '👤'}
        </div>

        <div className="rank-identity">
          <div className="rank-name">{cleanName}</div>
          <div className="rank-meta">{giocatore.ruolo || '—'} • OVR {giocatore.overall || 65}</div>
        </div>

        <div className="rank-main-value">
          <div className="rank-value-number">{main.value}</div>
          <div className="rank-value-label">{main.label}</div>
        </div>
      </div>

      {lowSample && <div className="rank-note">⚠️ dato poco significativo</div>}

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

function sortPlayers(a, b, filter) {
  if (filter === 'winrate') {
    if (b.winRate !== a.winRate) return b.winRate - a.winRate
    if (b.pg !== a.pg) return b.pg - a.pg
    if (b.punti !== a.punti) return b.punti - a.punti
    return b.gf - a.gf
  }

  if (filter === 'mediagol') {
    if (b.mediaGol !== a.mediaGol) return b.mediaGol - a.mediaGol
    if (b.gf !== a.gf) return b.gf - a.gf
    if (b.pg !== a.pg) return b.pg - a.pg
    return b.punti - a.punti
  }

  if (filter === 'gol') {
    if (b.gf !== a.gf) return b.gf - a.gf
    if (b.mediaGol !== a.mediaGol) return b.mediaGol - a.mediaGol
    if (b.punti !== a.punti) return b.punti - a.punti
    return b.dr - a.dr
  }

  if (b.punti !== a.punti) return b.punti - a.punti
  if (b.dr !== a.dr) return b.dr - a.dr
  return b.gf - a.gf
}

function getMainValue(giocatore, filter) {
  if (filter === 'winrate') {
    return { value: `${Math.round(giocatore.winRate || 0)}%`, label: 'WR' }
  }

  if (filter === 'mediagol') {
    return { value: (giocatore.mediaGol || 0).toFixed(2), label: 'G/P' }
  }

  if (filter === 'gol') {
    return { value: giocatore.gf || 0, label: 'GOL' }
  }

  return { value: giocatore.punti || 0, label: 'PTS' }
}

function getRankingTitle(filter) {
  if (filter === 'winrate') return 'Classifica win rate'
  if (filter === 'mediagol') return 'Classifica media gol'
  if (filter === 'gol') return 'Classifica bomber'
  return 'Ranking generale'
}

function getRankingSubtitle(filter) {
  if (filter === 'winrate') return 'Ordinata per percentuale vittorie e partite giocate'
  if (filter === 'mediagol') return 'Ordinata per gol segnati in media a partita'
  if (filter === 'gol') return 'Ordinata per gol totali e media realizzativa'
  return 'Ordinata per punti, differenza reti e gol fatti'
}

function getRankClass(position) {
  if (position === 1) return 'gold'
  if (position === 2) return 'silver'
  if (position === 3) return 'bronze'
  return ''
}

function getCleanName(nome = '') {
  return nome.replace(/\s*\(.*?\)/g, '').trim()
}

export default Classifica
