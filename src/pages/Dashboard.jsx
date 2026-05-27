import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const CARD_CONFIGS = {
  gold: {
    bg: 'linear-gradient(155deg, #9f6b05 0%, #d59b18 22%, #ffe26c 42%, #d59b18 62%, #8a5d04 100%)',
    border: 'rgba(255, 215, 0, 0.85)',
    accent: '#ffd700',
    text: '#211500',
    muted: 'rgba(33,21,0,0.62)',
    glow: 'rgba(255,215,0,0.28)'
  },
  silver: {
    bg: 'linear-gradient(155deg, #747474 0%, #c9c9c9 24%, #f2f2f2 45%, #a4a4a4 64%, #777 100%)',
    border: 'rgba(230, 230, 230, 0.8)',
    accent: '#d8d8d8',
    text: '#171717',
    muted: 'rgba(23,23,23,0.6)',
    glow: 'rgba(210,220,230,0.22)'
  },
  bronze: {
    bg: 'linear-gradient(155deg, #5d2e08 0%, #a95f22 24%, #dc9149 44%, #7a3f10 64%, #5d2e08 100%)',
    border: 'rgba(220, 150, 70, 0.8)',
    accent: '#cd7f32',
    text: '#1f0d00',
    muted: 'rgba(31,13,0,0.62)',
    glow: 'rgba(205,127,50,0.24)'
  }
}

function getCardType(overall) {
  if (overall >= 75) return 'gold'
  if (overall >= 65) return 'silver'
  return 'bronze'
}

function Dashboard({ currentUser }) {
  const [giocatore, setGiocatore] = useState(null)
  const [partite, setPartite] = useState([])
  const [scommesse, setScommesse] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (currentUser?.id) caricaDati()
  }, [currentUser])

  async function caricaDati() {
    setLoading(true)

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
      setPartite(
        partiteData.filter(p => {
          const squadraA = Array.isArray(p.squadra_a) ? p.squadra_a : []
          const squadraB = Array.isArray(p.squadra_b) ? p.squadra_b : []
          return [...squadraA, ...squadraB].includes(currentUser.id)
        })
      )
    }

    setLoading(false)
  }

  if (loading || !giocatore) return (
    <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'rgba(255,255,255,0.5)' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚡</div>
      <div>Caricamento...</div>
    </div>
  )

  const cardType = getCardType(giocatore.overall || 65)
  const cfg = CARD_CONFIGS[cardType]
  const nomePulito = cleanName(giocatore.nome)
  const nome = nomePulito.split(' ')[0] || nomePulito || 'Giocatore'
  const cognome = getSurname(nomePulito)
  const currentOvr = giocatore.overall || 65
  const nextOvr = currentOvr + 1
  const soglia = getSoglia(currentOvr)
  const puntiForma = Number(giocatore.forma_punti || 0)
  const progressoPercentuale = Math.min(100, Math.max(0, (puntiForma / soglia) * 100))
  const puntiMancanti = Math.max(0, soglia - puntiForma)

  const partiteOrdinate = [...partite].sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0))
  const partiteChiuse = partiteOrdinate.filter(p => p.stato === 'chiusa' || typeof p.punteggio_a === 'number')
  const prossimaPartita = [...partite]
    .filter(p => p.stato !== 'chiusa')
    .sort((a, b) => new Date(a.data || 0) - new Date(b.data || 0))[0]
    || [...partite].sort((a, b) => new Date(a.data || 0) - new Date(b.data || 0))[0]

  const ultimi5Voti = (giocatore.voti_storico || [])
    .slice(-5)
    .reverse()
    .map(v => Number(v.votoFinale))
    .filter(v => !Number.isNaN(v))

  const mediaVoti = ultimi5Voti.length > 0
    ? (ultimi5Voti.reduce((s, v) => s + v, 0) / ultimi5Voti.length).toFixed(2)
    : '-'

  let golTotali = 0
  let assistTotali = 0
  let vittorie = 0
  let pareggi = 0
  let sconfitte = 0

  partite.forEach(p => {
    const squadraA = Array.isArray(p.squadra_a) ? p.squadra_a : []
    const squadraB = Array.isArray(p.squadra_b) ? p.squadra_b : []
    const inA = squadraA.includes(currentUser.id)
    const inB = squadraB.includes(currentUser.id)
    const e = p.eventi?.[currentUser.id] || {}

    golTotali += e.gol || 0
    assistTotali += e.assist || 0

    if (typeof p.punteggio_a === 'number' && typeof p.punteggio_b === 'number') {
      if (p.punteggio_a === p.punteggio_b) pareggi++
      else if ((inA && p.punteggio_a > p.punteggio_b) || (inB && p.punteggio_b > p.punteggio_a)) vittorie++
      else sconfitte++
    }
  })

  const scommesseVinte = scommesse.filter(s => s.esito === 'vinta').length
  const scommessePerse = scommesse.filter(s => s.esito === 'persa').length
  const guadagniTotali = scommesse
    .filter(s => s.esito === 'vinta')
    .reduce((sum, s) => sum + Number(s.vincita || 0), 0)

  return (
    <div className="dash-app">
      <style>{`
        .dash-app {
          --cyan: #00d4ff;
          --cyan-soft: rgba(0, 212, 255, 0.14);
          --border: rgba(255,255,255,0.08);
          --panel: rgba(8, 14, 28, 0.72);
          --panel-2: rgba(15, 23, 41, 0.58);
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
          padding-bottom: 1.25rem;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .dash-app * { box-sizing: border-box; }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes cardGlow {
          0%, 100% { box-shadow: 0 0 24px ${cfg.glow}, 0 22px 50px rgba(0,0,0,0.34); }
          50% { box-shadow: 0 0 36px ${cfg.glow}, 0 26px 60px rgba(0,0,0,0.44); }
        }

        .hero-panel {
          position: relative;
          overflow: hidden;
          border-radius: 30px;
          border: 1px solid rgba(0,212,255,0.26);
          background:
            radial-gradient(circle at 82% 18%, rgba(0,212,255,0.18), transparent 28%),
            radial-gradient(circle at 10% 0%, rgba(0,212,255,0.12), transparent 34%),
            linear-gradient(145deg, rgba(15,23,41,0.88), rgba(6,11,24,0.72));
          box-shadow: 0 24px 70px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.04);
          padding: 0.88rem;
          animation: fadeInUp 0.42s ease both;
        }

        .hero-grid {
          display: grid;
          grid-template-columns: 106px minmax(0, 1fr);
          gap: 1rem;
          align-items: center;
        }

        .mini-card {
          width: 106px;
          height: 148px;
          border-radius: 22px;
          position: relative;
          overflow: hidden;
          border: 2px solid ${cfg.border};
          background: ${cfg.bg};
          animation: cardGlow 3s ease-in-out infinite;
          flex-shrink: 0;
        }

        .mini-card::after {
          content: '';
          position: absolute;
          inset: 5px;
          border-radius: 17px;
          border: 1px solid rgba(255,255,255,0.28);
          pointer-events: none;
          z-index: 4;
        }

        .mini-card-top {
          position: absolute;
          top: 10px;
          left: 10px;
          z-index: 5;
          color: ${cfg.text};
          line-height: 1;
        }

        .mini-ovr {
          font-size: 1.75rem;
          font-weight: 950;
          letter-spacing: -1px;
        }

        .mini-role {
          margin-top: 0.22rem;
          font-size: 0.57rem;
          font-weight: 850;
          color: ${cfg.muted};
          letter-spacing: 0.4px;
        }

        .mini-photo {
          position: absolute;
          top: 20px;
          left: 39px;
          right: 8px;
          height: 72px;
          z-index: 3;
          overflow: hidden;
          border-radius: 11px;
          background: rgba(255,255,255,0.18);
        }

        .mini-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top center;
        }

        .mini-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(0,0,0,0.38);
          font-size: 2rem;
        }

        .mini-name {
          position: absolute;
          left: 8px;
          right: 8px;
          bottom: 38px;
          text-align: center;
          z-index: 5;
          color: ${cfg.text};
          font-size: 0.66rem;
          font-weight: 950;
          letter-spacing: 0.7px;
          text-transform: uppercase;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .mini-stats {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 5;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          background: rgba(0,0,0,0.45);
          padding: 0.38rem 0.25rem;
          color: #fff;
        }

        .mini-stat {
          text-align: center;
          min-width: 0;
        }

        .mini-stat strong {
          display: block;
          font-size: 0.72rem;
          line-height: 1;
        }

        .mini-stat span {
          display: block;
          margin-top: 0.1rem;
          font-size: 0.43rem;
          color: rgba(255,255,255,0.5);
          font-weight: 800;
          letter-spacing: 0.3px;
        }

        .hero-copy { min-width: 0; }

        .eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          color: rgba(255,255,255,0.48);
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          margin-bottom: 0.36rem;
        }

        .hero-title {
          margin: 0;
          font-size: clamp(1.75rem, 8vw, 2.7rem);
          font-weight: 950;
          line-height: 0.96;
          letter-spacing: -1.2px;
        }

        .hero-title span {
          color: var(--cyan);
          text-shadow: 0 0 18px rgba(0,212,255,0.34);
        }

        .hero-subtitle {
          margin: 0.55rem 0 0 0;
          color: rgba(255,255,255,0.62);
          font-size: 0.92rem;
          font-weight: 620;
          line-height: 1.35;
        }

        .hero-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
          margin-top: 0.9rem;
        }

        .meta-chip {
          border: 1px solid rgba(0,212,255,0.18);
          background: rgba(0,212,255,0.08);
          color: rgba(255,255,255,0.82);
          border-radius: 999px;
          padding: 0.35rem 0.55rem;
          font-size: 0.72rem;
          font-weight: 760;
        }

        .card-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.85rem;
          margin-top: 0.9rem;
        }

        .panel-card {
          border-radius: 22px;
          border: 1px solid var(--border);
          background:
            radial-gradient(circle at 15% 0%, rgba(0,212,255,0.1), transparent 35%),
            linear-gradient(145deg, rgba(15,23,41,0.76), rgba(8,13,26,0.66));
          box-shadow: 0 18px 46px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.035);
          padding: 0.95rem;
          animation: fadeInUp 0.42s ease both;
        }

        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          margin-bottom: 0.8rem;
        }

        .panel-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0;
          font-size: 0.88rem;
          font-weight: 880;
          color: rgba(255,255,255,0.9);
          letter-spacing: 0.1px;
        }

        .panel-title .icon {
          width: 32px;
          height: 32px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0,212,255,0.1);
          border: 1px solid rgba(0,212,255,0.18);
        }

        .credits-card {
          grid-column: span 1;
        }

        .mission-card {
          grid-column: span 1;
        }

        .big-number {
          font-size: clamp(2rem, 10vw, 3rem);
          font-weight: 950;
          line-height: 0.95;
          letter-spacing: -1.6px;
        }

        .credits-row {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr 0.8fr;
          gap: 0.55rem;
          align-items: stretch;
        }

        .mini-metric {
          border-radius: 16px;
          padding: 0.68rem 0.48rem;
          text-align: center;
          background: rgba(255,255,255,0.045);
          border: 1px solid rgba(255,255,255,0.055);
        }

        .mini-metric strong {
          display: block;
          font-size: 1.15rem;
          font-weight: 950;
          line-height: 1;
        }

        .mini-metric span {
          display: block;
          margin-top: 0.25rem;
          color: rgba(255,255,255,0.42);
          font-size: 0.62rem;
          font-weight: 780;
        }

        .progress-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
        }

        .ovr-next {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 1.65rem;
          font-weight: 950;
          line-height: 1;
        }

        .ovr-next .current { color: rgba(255,255,255,0.62); }
        .ovr-next .next { color: var(--cyan); text-shadow: 0 0 18px rgba(0,212,255,0.34); }
        .ovr-next .arrow { color: rgba(255,255,255,0.25); font-size: 1rem; }

        .form-label {
          margin-top: 0.35rem;
          font-size: 0.78rem;
          font-weight: 850;
          color: ${puntiForma < 0 ? '#ef4444' : '#00ff88'};
        }

        .progress-track {
          width: 100%;
          height: 12px;
          margin: 0.85rem 0 0.45rem 0;
          background: rgba(0,0,0,0.46);
          border-radius: 999px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.08);
        }

        .progress-fill {
          width: ${progressoPercentuale}%;
          min-width: ${progressoPercentuale > 0 ? '10px' : '0'};
          height: 100%;
          background: linear-gradient(90deg, #00d4ff, #00f0ff);
          box-shadow: 0 0 18px rgba(0,212,255,0.45);
          border-radius: 999px;
          transition: width 0.5s ease;
        }

        .progress-footer {
          display: flex;
          justify-content: space-between;
          gap: 0.75rem;
          color: rgba(255,255,255,0.52);
          font-size: 0.72rem;
          font-weight: 720;
        }

        .season-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 0.48rem;
        }

        .season-stat {
          border-radius: 15px;
          background: rgba(255,255,255,0.045);
          border: 1px solid rgba(255,255,255,0.055);
          padding: 0.62rem 0.3rem;
          text-align: center;
        }

        .season-stat strong {
          display: block;
          font-size: 1.15rem;
          font-weight: 950;
          line-height: 1;
        }

        .season-stat span {
          display: block;
          margin-top: 0.24rem;
          color: rgba(255,255,255,0.42);
          font-size: 0.54rem;
          font-weight: 830;
          text-transform: uppercase;
          letter-spacing: 0.35px;
        }

        .wide-card { grid-column: 1 / -1; }

        .match-card {
          position: relative;
          overflow: hidden;
          min-height: 172px;
        }

        .match-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 50% 100%, rgba(0,212,255,0.12), transparent 45%),
            linear-gradient(180deg, transparent, rgba(0,0,0,0.18));
          pointer-events: none;
        }

        .match-content { position: relative; z-index: 1; }

        .match-vs {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 0.7rem;
          align-items: center;
          margin-top: 0.6rem;
        }

        .team-box {
          min-width: 0;
          text-align: center;
        }

        .team-logo {
          width: 54px;
          height: 54px;
          margin: 0 auto 0.38rem auto;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(0,212,255,0.22), rgba(0,0,0,0.55));
          border: 1px solid rgba(0,212,255,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 22px rgba(0,212,255,0.16);
          overflow: hidden;
        }

        .team-logo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .team-name {
          color: rgba(255,255,255,0.9);
          font-weight: 850;
          font-size: 0.82rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .team-sub {
          margin-top: 0.14rem;
          color: rgba(255,255,255,0.46);
          font-size: 0.68rem;
          font-weight: 700;
        }

        .vs-label {
          font-size: 1.55rem;
          font-weight: 950;
          color: var(--cyan);
          text-shadow: 0 0 18px rgba(0,212,255,0.42);
        }

        .match-date {
          margin-top: 0.75rem;
          text-align: center;
          color: rgba(255,255,255,0.68);
          font-weight: 760;
          font-size: 0.84rem;
        }

        .horizontal-list {
          display: flex;
          gap: 0.62rem;
          overflow-x: auto;
          padding-bottom: 0.2rem;
          scrollbar-width: none;
        }
        .horizontal-list::-webkit-scrollbar { display: none; }

        .performance-chip {
          min-width: 76px;
          border-radius: 17px;
          padding: 0.72rem 0.58rem;
          text-align: center;
          border: 1px solid rgba(0,212,255,0.28);
          background: rgba(0,212,255,0.08);
        }

        .performance-chip strong {
          display: block;
          color: var(--cyan);
          font-size: 1.35rem;
          font-weight: 950;
          line-height: 1;
        }

        .performance-chip span {
          display: block;
          margin-top: 0.25rem;
          color: rgba(255,255,255,0.42);
          font-size: 0.62rem;
          font-weight: 760;
        }

        .list-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          border-radius: 17px;
          padding: 0.78rem;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.055);
        }

        .list-main {
          min-width: 0;
        }

        .list-title {
          font-size: 0.92rem;
          font-weight: 850;
          color: rgba(255,255,255,0.92);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .list-subtitle {
          margin-top: 0.16rem;
          font-size: 0.72rem;
          color: rgba(255,255,255,0.44);
          font-weight: 690;
        }

        .status-pill {
          flex-shrink: 0;
          min-width: 44px;
          height: 36px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 950;
          border: 1px solid rgba(255,255,255,0.08);
        }

        .empty-box {
          border: 1px dashed rgba(255,255,255,0.13);
          background: rgba(255,255,255,0.025);
          border-radius: 18px;
          padding: 1rem;
          text-align: center;
          color: rgba(255,255,255,0.38);
          font-weight: 750;
          font-size: 0.88rem;
        }

        @media (max-width: 760px) {
          .dash-app {
            padding-bottom: 1rem;
          }

          .hero-panel {
            border-radius: 24px;
            padding: 0.82rem;
          }

          .hero-grid {
            grid-template-columns: 96px minmax(0, 1fr);
            gap: 0.74rem;
          }

          .mini-card {
            width: 96px;
            height: 134px;
            border-radius: 19px;
          }

          .mini-card::after {
            border-radius: 15px;
          }

          .mini-ovr { font-size: 1.55rem; }
          .mini-role { font-size: 0.5rem; }
          .mini-photo { top: 17px; left: 35px; right: 7px; height: 64px; }
          .mini-name { bottom: 34px; font-size: 0.58rem; letter-spacing: 0.45px; }
          .mini-stat strong { font-size: 0.65rem; }
          .mini-stat span { font-size: 0.38rem; }

          .hero-subtitle {
            font-size: 0.84rem;
          }

          .hero-meta {
            margin-top: 0.7rem;
          }

          .meta-chip {
            font-size: 0.66rem;
            padding: 0.3rem 0.46rem;
          }

          .card-grid {
            grid-template-columns: 1fr;
            gap: 0.72rem;
            margin-top: 0.72rem;
          }

          .credits-row {
            grid-template-columns: repeat(3, 1fr);
          }

          .panel-card {
            border-radius: 20px;
            padding: 0.78rem;
          }

          .panel-header {
            margin-bottom: 0.65rem;
          }

          .panel-title {
            font-size: 0.83rem;
          }

          .panel-title .icon {
            width: 29px;
            height: 29px;
            border-radius: 11px;
          }

          .season-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 0.42rem;
          }

          .season-stat {
            border-radius: 13px;
            padding: 0.58rem 0.25rem;
          }

          .match-vs {
            gap: 0.45rem;
          }

          .team-logo {
            width: 48px;
            height: 48px;
          }
        }

        @media (max-width: 380px) {
          .hero-grid {
            grid-template-columns: 88px minmax(0, 1fr);
            gap: 0.62rem;
          }

          .mini-card {
            width: 88px;
            height: 124px;
          }

          .mini-ovr { font-size: 1.35rem; }
          .mini-photo { left: 32px; height: 56px; }
          .mini-name { bottom: 31px; font-size: 0.52rem; }

          .hero-title {
            font-size: 1.55rem;
          }

          .hero-subtitle {
            font-size: 0.78rem;
          }
        }
      `}</style>

      <section className="hero-panel">
        <div className="hero-grid">
          <MiniPlayerCard
            giocatore={giocatore}
            cfg={cfg}
            cognome={cognome}
            partiteCount={partite.length}
            golTotali={golTotali}
            mediaVoti={mediaVoti}
          />

          <div className="hero-copy">
            <div className="eyebrow">Dashboard giocatore</div>
            <h1 className="hero-title">Ciao,<br /><span>{nome}!</span></h1>
            <p className="hero-subtitle">Pronto a conquistare la vetta?</p>
            <div className="hero-meta">
              <span className="meta-chip">{giocatore.ruolo || 'Ruolo'} · OVR {currentOvr}</span>
              <span className="meta-chip">Media {mediaVoti}</span>
              <span className="meta-chip">{giocatore.crediti ?? 500} crediti</span>
            </div>
          </div>
        </div>
      </section>

      <div className="card-grid">
        <section className="panel-card credits-card" style={{ animationDelay: '0.05s' }}>
          <div className="panel-header">
            <h2 className="panel-title"><span className="icon">💰</span>Crediti disponibili</h2>
          </div>
          <div className="credits-row">
            <div className="mini-metric">
              <strong style={{ color: '#ffd700' }}>{giocatore.crediti ?? 500}</strong>
              <span>Crediti</span>
            </div>
            <div className="mini-metric">
              <strong style={{ color: '#00d4ff' }}>{scommesseVinte}</strong>
              <span>Vinte</span>
            </div>
            <div className="mini-metric">
              <strong style={{ color: '#00ff88' }}>+{guadagniTotali}</strong>
              <span>Guadagnati</span>
            </div>
          </div>
        </section>

        <section className="panel-card mission-card" style={{ animationDelay: '0.1s' }}>
          <div className="progress-top">
            <div>
              <h2 className="panel-title"><span className="icon">📈</span>Missione OVR {nextOvr}</h2>
              <div className="form-label">Forma attuale: {puntiForma >= 0 ? '+' : ''}{puntiForma}</div>
            </div>
            <div className="ovr-next">
              <span className="current">{currentOvr}</span>
              <span className="arrow">→</span>
              <span className="next">{nextOvr}</span>
            </div>
          </div>
          <div className="progress-track"><div className="progress-fill" /></div>
          <div className="progress-footer">
            <span>{getFormaLabel(puntiForma)}</span>
            <span>{puntiMancanti} punti mancanti</span>
          </div>
        </section>

        <section className="panel-card wide-card" style={{ animationDelay: '0.15s' }}>
          <div className="panel-header">
            <h2 className="panel-title"><span className="icon">📊</span>Riepilogo stagione</h2>
          </div>
          <div className="season-grid">
            <SeasonStat label="Partite" value={partite.length} color="#00d4ff" />
            <SeasonStat label="Gol" value={golTotali} color="#00ff88" />
            <SeasonStat label="Assist" value={assistTotali} color="#a78bfa" />
            <SeasonStat label="Vittorie" value={vittorie} color="#00d4ff" />
            <SeasonStat label="Pareggi" value={pareggi} color="#ffd700" />
            <SeasonStat label="Sconfitte" value={sconfitte} color="#ef4444" />
          </div>
        </section>

        <section className="panel-card wide-card match-card" style={{ animationDelay: '0.2s' }}>
          <div className="match-content">
            <div className="panel-header">
              <h2 className="panel-title"><span className="icon">📅</span>Prossima partita</h2>
              {prossimaPartita && <span className="meta-chip">{formatStatus(prossimaPartita.stato)}</span>}
            </div>
            {prossimaPartita ? (
              <>
                <div className="match-vs">
                  <TeamBox name="Fuciabol A" sub={getTeamSub(prossimaPartita, 'a')} />
                  <div className="vs-label">VS</div>
                  <TeamBox name="Fuciabol B" sub={getTeamSub(prossimaPartita, 'b')} />
                </div>
                <div className="match-date">📅 {formatDate(prossimaPartita.data)} {prossimaPartita.ora ? `· ${prossimaPartita.ora}` : ''}</div>
              </>
            ) : (
              <div className="empty-box">Nessuna partita in programma.</div>
            )}
          </div>
        </section>

        <section className="panel-card wide-card" style={{ animationDelay: '0.25s' }}>
          <div className="panel-header">
            <h2 className="panel-title"><span className="icon">⭐</span>Ultime prestazioni</h2>
          </div>
          {ultimi5Voti.length > 0 ? (
            <div className="horizontal-list">
              {ultimi5Voti.map((voto, index) => (
                <div className="performance-chip" key={`${voto}-${index}`}>
                  <strong>{voto.toFixed(1)}</strong>
                  <span>P.{ultimi5Voti.length - index}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-box">Non ci sono ancora voti registrati.</div>
          )}
        </section>

        <section className="panel-card wide-card" style={{ animationDelay: '0.3s' }}>
          <div className="panel-header">
            <h2 className="panel-title"><span className="icon">🎰</span>Ultime scommesse</h2>
          </div>
          {scommesse.length > 0 ? (
            <div style={{ display: 'grid', gap: '0.52rem' }}>
              {scommesse.slice(0, 4).map(s => (
                <BetRow key={s.id} scommessa={s} />
              ))}
            </div>
          ) : (
            <div className="empty-box">Non hai ancora piazzato scommesse.</div>
          )}
        </section>

        <section className="panel-card wide-card" style={{ animationDelay: '0.35s' }}>
          <div className="panel-header">
            <h2 className="panel-title"><span className="icon">📅</span>Ultime partite</h2>
          </div>
          {partiteChiuse.length > 0 ? (
            <div style={{ display: 'grid', gap: '0.52rem' }}>
              {partiteChiuse.slice(0, 4).map(p => (
                <MatchRow key={p.id} partita={p} currentUserId={currentUser.id} />
              ))}
            </div>
          ) : (
            <div className="empty-box">Nessuna partita chiusa al momento.</div>
          )}
        </section>
      </div>
    </div>
  )
}

function MiniPlayerCard({ giocatore, cfg, cognome, partiteCount, golTotali, mediaVoti }) {
  return (
    <div className="mini-card">
      <div className="mini-card-top">
        <div className="mini-ovr">{giocatore.overall || 65}</div>
        <div className="mini-role">{giocatore.ruolo || 'RUOLO'}</div>
      </div>

      <div className="mini-photo">
        {giocatore.foto_url ? (
          <img src={giocatore.foto_url} alt={giocatore.nome} />
        ) : (
          <div className="mini-placeholder">👤</div>
        )}
      </div>


      <div className="mini-name">{cognome}</div>

      <div className="mini-stats">
        <div className="mini-stat"><strong>{partiteCount}</strong><span>PG</span></div>
        <div className="mini-stat"><strong>{golTotali}</strong><span>GOL</span></div>
        <div className="mini-stat"><strong>{mediaVoti}</strong><span>MED</span></div>
      </div>
    </div>
  )
}

function SeasonStat({ label, value, color }) {
  return (
    <div className="season-stat">
      <strong style={{ color }}>{value ?? 0}</strong>
      <span>{label}</span>
    </div>
  )
}

function TeamBox({ name, sub }) {
  return (
    <div className="team-box">
      <div className="team-logo">
        <img src="/pwa-192x192.png" alt="FUCIABOL" onError={(e) => { e.currentTarget.style.display = 'none' }} />
      </div>
      <div className="team-name">{name}</div>
      <div className="team-sub">{sub}</div>
    </div>
  )
}

function BetRow({ scommessa }) {
  const isWin = scommessa.esito === 'vinta'
  const isLost = scommessa.esito === 'persa'
  const color = isWin ? '#00ff88' : isLost ? '#ef4444' : '#ffd700'
  const label = scommessa.tipo === 'risultato'
    ? 'Risultato'
    : scommessa.tipo === 'migliore_in_campo'
    ? 'MVP'
    : 'Capocannoniere'

  return (
    <div className="list-row">
      <div className="list-main">
        <div className="list-title">{label}</div>
        <div className="list-subtitle">{scommessa.importo} crediti · quota {scommessa.quota}x</div>
      </div>
      <div className="status-pill" style={{ color, background: `${hexToRgba(color, 0.1)}`, borderColor: `${hexToRgba(color, 0.26)}` }}>
        {isWin ? `+${scommessa.vincita}` : isLost ? `-${scommessa.importo}` : '⏳'}
      </div>
    </div>
  )
}

function MatchRow({ partita, currentUserId }) {
  const squadraA = Array.isArray(partita.squadra_a) ? partita.squadra_a : []
  const squadraB = Array.isArray(partita.squadra_b) ? partita.squadra_b : []
  const inA = squadraA.includes(currentUserId)
  const risultato = typeof partita.punteggio_a === 'number' && typeof partita.punteggio_b === 'number'
    ? `${partita.punteggio_a} - ${partita.punteggio_b}`
    : '—'

  let esito = 'P'
  if (typeof partita.punteggio_a === 'number' && typeof partita.punteggio_b === 'number') {
    if (partita.punteggio_a === partita.punteggio_b) esito = 'P'
    else if ((inA && partita.punteggio_a > partita.punteggio_b) || (!inA && partita.punteggio_b > partita.punteggio_a)) esito = 'V'
    else esito = 'S'
  }

  const color = esito === 'V' ? '#00ff88' : esito === 'S' ? '#ef4444' : '#ffd700'

  return (
    <div className="list-row">
      <div className="status-pill" style={{ color, borderColor: hexToRgba(color, 0.35), background: hexToRgba(color, 0.08) }}>{esito}</div>
      <div className="list-main" style={{ flex: 1 }}>
        <div className="list-title">{risultato}</div>
        <div className="list-subtitle">{formatDate(partita.data)}</div>
      </div>
      <div style={{ color: '#00d4ff', fontWeight: 950 }}>›</div>
    </div>
  )
}

function getSoglia(overall) {
  if (overall >= 95) return 15
  if (overall >= 90) return 10
  if (overall >= 85) return 7
  if (overall >= 75) return 5
  if (overall >= 65) return 3
  return 2
}

function getFormaLabel(puntiForma) {
  if (puntiForma >= 5) return 'In grande crescita'
  if (puntiForma >= 1) return 'In crescita'
  if (puntiForma === 0) return 'Stabile'
  if (puntiForma <= -10) return 'Da rilanciare'
  return 'Momento complicato'
}

function cleanName(nome = '') {
  return nome.replace(/\s*\(.*?\)/g, '').trim()
}

function getSurname(nome = '') {
  const parts = cleanName(nome).split(' ').filter(Boolean)
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : cleanName(nome).toUpperCase()
}

function formatDate(dateString) {
  if (!dateString) return 'Data da definire'
  const d = new Date(dateString)
  if (Number.isNaN(d.getTime())) return dateString
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatStatus(status) {
  if (!status) return 'In programma'
  return String(status).replaceAll('_', ' ')
}

function getTeamSub(partita, side) {
  const squadra = side === 'a' ? partita.squadra_a : partita.squadra_b
  const count = Array.isArray(squadra) ? squadra.length : 0
  return count > 0 ? `${count} giocatori` : 'Da definire'
}

function hexToRgba(hex, alpha) {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export default Dashboard
