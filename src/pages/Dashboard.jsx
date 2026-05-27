import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

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
    glowColor: 'rgba(255,215,0,0.35)',
    progressColor: 'linear-gradient(90deg, #ffd700, #ffa500)',
    progressGlow: 'rgba(255,215,0,0.55)',
    accentColor: '#ffd700',
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
    glowColor: 'rgba(192,192,192,0.3)',
    progressColor: 'linear-gradient(90deg, #c0c0c0, #a0a0a0)',
    progressGlow: 'rgba(192,192,192,0.42)',
    accentColor: '#c0c0c0',
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
    glowColor: 'rgba(205,127,50,0.32)',
    progressColor: 'linear-gradient(90deg, #cd7f32, #a05a20)',
    progressGlow: 'rgba(205,127,50,0.42)',
    accentColor: '#cd7f32',
  }
}

function getCardType(overall) {
  if (overall >= 75) return 'gold'
  if (overall >= 65) return 'silver'
  return 'bronze'
}

function getCleanName(nome = '') {
  return nome.replace(/\s*\(.*?\)/g, '').trim()
}

function formatDate(dateValue) {
  if (!dateValue) return 'Data da definire'
  const d = new Date(dateValue)
  if (Number.isNaN(d.getTime())) return 'Data da definire'
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
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
      setPartite(partiteData.filter(p => {
        const squadraA = p.squadra_a || []
        const squadraB = p.squadra_b || []
        return [...squadraA, ...squadraB].includes(currentUser.id)
      }))
    }

    setLoading(false)
  }

  if (loading || !giocatore) return (
    <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'rgba(255,255,255,0.5)' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚡</div>
      <div>Caricamento...</div>
    </div>
  )

  const cleanName = getCleanName(giocatore.nome)
  const nomeParti = cleanName.split(' ').filter(Boolean)
  const cognome = nomeParti.length > 1 ? nomeParti[nomeParti.length - 1].toUpperCase() : cleanName.toUpperCase()

  const cardType = getCardType(giocatore.overall)
  const cfg = CARD_CONFIGS[cardType]
  const currentOvr = giocatore.overall || 65

  let soglia
  if (currentOvr >= 95) soglia = 15
  else if (currentOvr >= 90) soglia = 10
  else if (currentOvr >= 85) soglia = 7
  else if (currentOvr >= 75) soglia = 5
  else if (currentOvr >= 65) soglia = 3
  else soglia = 2

  const puntiForma = giocatore.forma_punti || 0
  const progressoPercentuale = Math.min(100, Math.max(0, (puntiForma / soglia) * 100))
  const puntiMancanti = Math.max(0, soglia - puntiForma)

  const votiStorico = giocatore.voti_storico || []
  const ultimi5Voti = votiStorico.slice(-5).reverse().map(v => v.votoFinale).filter(v => typeof v === 'number')
  const mediaVoti = ultimi5Voti.length > 0
    ? (ultimi5Voti.reduce((s, v) => s + v, 0) / ultimi5Voti.length).toFixed(2)
    : '-'

  let golTotali = 0
  let assistTotali = 0
  let vittorie = 0
  let pareggi = 0
  let sconfitte = 0

  partite.forEach(p => {
    const squadraA = p.squadra_a || []
    const squadraB = p.squadra_b || []
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
    .reduce((sum, s) => sum + (s.vincita || 0), 0)

  const prossimaPartita = [...partite]
    .filter(p => p.stato !== 'chiusa')
    .sort((a, b) => new Date(a.data || 0) - new Date(b.data || 0))[0]

  const ultimePartite = [...partite]
    .filter(p => p.stato === 'chiusa' || (typeof p.punteggio_a === 'number' && typeof p.punteggio_b === 'number'))
    .sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0))
    .slice(0, 4)

  const formTrend = puntiForma > 0 ? 'In crescita' : puntiForma < 0 ? 'Da rilanciare' : 'Stabile'
  const formColor = puntiForma > 0 ? '#00ff88' : puntiForma < 0 ? '#ef4444' : '#ffd700'

  return (
    <div className="dashboard-page">
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(22px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes shimmerDash {
          0% { transform: translateX(-120%) rotate(20deg); }
          100% { transform: translateX(320%) rotate(20deg); }
        }

        @keyframes floatCard {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-7px); }
        }

        @keyframes glowCard {
          0%, 100% { box-shadow: 0 0 20px ${cfg.glowColor}, 0 22px 44px rgba(0,0,0,0.55); }
          50% { box-shadow: 0 0 36px ${cfg.glowColor}, 0 26px 56px rgba(0,0,0,0.68); }
        }

        @keyframes progressBar {
          from { width: 0%; }
          to { width: ${progressoPercentuale}%; }
        }

        .dashboard-page {
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
          padding-bottom: 1rem;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .dash-hero {
          position: relative;
          overflow: hidden;
          border-radius: 20px;
          border: 1px solid rgba(0,212,255,0.16);
          background:
            radial-gradient(circle at 86% 12%, rgba(0,212,255,0.19), transparent 28%),
            radial-gradient(circle at 16% 90%, rgba(255,215,0,0.10), transparent 30%),
            linear-gradient(135deg, rgba(15,23,41,0.86), rgba(5,10,23,0.72));
          box-shadow: 0 26px 70px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.06);
          padding: 1rem;
          margin-bottom: 0.9rem;
          animation: fadeInUp 0.45s ease both;
        }

        .dash-hero::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(90deg, transparent, rgba(0,212,255,0.055), transparent),
            radial-gradient(circle at 75% 20%, rgba(0,212,255,0.12), transparent 22%);
          pointer-events: none;
        }

        .dash-hero-content {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 155px minmax(0, 1fr);
          gap: 1rem;
          align-items: center;
        }

        .dash-greeting {
          margin-bottom: 1rem;
        }

        .dash-kicker {
          color: rgba(255,255,255,0.52);
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.55px;
          margin-bottom: 0.2rem;
        }

        .dash-title {
          margin: 0;
          font-size: clamp(1.7rem, 6vw, 2.6rem);
          line-height: 1;
          letter-spacing: -0.8px;
          font-weight: 950;
        }

        .dash-title span {
          background: linear-gradient(135deg, #ffffff 0%, #dff8ff 40%, #00d4ff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .dash-subtitle {
          margin: 0.45rem 0 0 0;
          color: rgba(255,255,255,0.58);
          font-size: clamp(0.82rem, 3vw, 0.95rem);
          font-weight: 600;
        }

        .dash-main-grid {
          display: grid;
          grid-template-columns: 1.05fr 0.95fr;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .dash-card {
          position: relative;
          overflow: hidden;
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,0.075);
          background:
            radial-gradient(circle at 0% 0%, rgba(0,212,255,0.10), transparent 30%),
            linear-gradient(135deg, rgba(255,255,255,0.055), rgba(255,255,255,0.02)),
            rgba(5, 10, 23, 0.36);
          box-shadow: 0 18px 48px rgba(0,0,0,0.20);
          padding: 0.85rem;
          animation: fadeInUp 0.5s ease both;
        }

        .dash-card-title {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          margin-bottom: 0.85rem;
          color: rgba(255,255,255,0.84);
          font-size: 0.82rem;
          font-weight: 850;
          text-transform: uppercase;
          letter-spacing: 0.35px;
        }

        .metric-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.48rem;
        }

        .metric-tile {
          min-width: 0;
          border-radius: 15px;
          padding: 0.68rem 0.45rem;
          text-align: center;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.035);
        }

        .metric-value {
          font-size: clamp(1rem, 4.5vw, 1.55rem);
          font-weight: 950;
          line-height: 0.95;
        }

        .metric-label {
          margin-top: 0.32rem;
          font-size: 0.56rem;
          color: rgba(255,255,255,0.46);
          font-weight: 800;
          letter-spacing: 0.25px;
          text-transform: uppercase;
        }

        .fut-card {
          width: 150px;
          height: 216px;
          border-radius: 14px;
          background: ${cfg.bg};
          border: 2px solid ${cfg.border};
          position: relative;
          overflow: hidden;
          flex-shrink: 0;
          margin: 0 auto;
          animation: glowCard 2.6s ease-in-out infinite, floatCard 4s ease-in-out infinite;
        }

        .fut-inner-border {
          position: absolute;
          top: 4px;
          left: 4px;
          right: 4px;
          bottom: 4px;
          border: 1px solid ${cfg.innerBorder};
          border-radius: 12px;
          pointer-events: none;
          z-index: 4;
        }

        .fut-foil {
          position: absolute;
          inset: 0;
          background: ${cfg.foil};
          pointer-events: none;
          z-index: 1;
        }

        .fut-shimmer {
          position: absolute;
          top: -55%;
          left: -22%;
          width: 40%;
          height: 215%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent);
          animation: shimmerDash 3.6s ease-in-out infinite;
          pointer-events: none;
          z-index: 2;
        }

        .fut-top-left {
          position: absolute;
          top: 10px;
          left: 12px;
          z-index: 5;
          line-height: 1;
        }

        .fut-overall {
          font-size: 1.62rem;
          font-weight: 950;
          color: ${cfg.textDark};
          line-height: 1;
        }

        .fut-role {
          font-size: 0.5rem;
          font-weight: 850;
          color: ${cfg.labelText};
          letter-spacing: 0.5px;
          margin-top: 2px;
        }

        .fut-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          z-index: 5;
          background: rgba(0,0,0,0.32);
          border-radius: 8px;
          padding: 3px 6px;
          font-size: 0.58rem;
          font-weight: 900;
          color: ${cfg.statsText};
        }

        .fut-photo {
          position: absolute;
          top: 8px;
          left: 50%;
          transform: translateX(-50%);
          width: 80px;
          height: 96px;
          z-index: 3;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          overflow: hidden;
          border-radius: 10px;
          background:
            linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0.20)),
            rgba(255,255,255,0.08);
        }

        .fut-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top center;
          filter: drop-shadow(0 8px 12px rgba(0,0,0,0.5));
        }

        .fut-name {
          position: absolute;
          bottom: 54px;
          left: 0;
          right: 0;
          text-align: center;
          z-index: 5;
          padding: 0 8px;
        }

        .fut-name div {
          font-size: 0.66rem;
          font-weight: 900;
          color: ${cfg.textDark};
          letter-spacing: 0.7px;
          text-transform: uppercase;
          text-shadow: 0 1px 0 rgba(255,255,255,0.32);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .fut-stats {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: ${cfg.statsBar};
          border-top: 1px solid ${cfg.innerBorder};
          padding: 5px 6px;
          z-index: 5;
        }

        .fut-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 2px;
        }

        .fut-stat {
          text-align: center;
          min-width: 0;
        }

        .fut-stat-value {
          font-size: 0.68rem;
          font-weight: 950;
          color: ${cfg.statsText};
          line-height: 1;
        }

        .fut-stat-label {
          font-size: 0.38rem;
          font-weight: 800;
          color: rgba(255,255,255,0.46);
          text-transform: uppercase;
          margin-top: 1px;
        }

        .progress-track {
          width: 100%;
          height: 16px;
          background: rgba(0,0,0,0.36);
          border-radius: 999px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.08);
          position: relative;
        }

        .progress-fill {
          width: ${progressoPercentuale}%;
          height: 100%;
          background: ${cfg.progressColor};
          border-radius: 999px;
          box-shadow: 0 0 14px ${cfg.progressGlow};
          animation: progressBar 1s ease-out;
          position: relative;
          overflow: hidden;
        }

        .progress-fill::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(255,255,255,0.25), transparent);
        }

        .list-row {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          gap: 0.75rem;
          align-items: center;
          border-radius: 16px;
          background: rgba(255,255,255,0.035);
          border: 1px solid rgba(255,255,255,0.055);
          padding: 0.75rem;
        }

        .status-pill {
          width: 32px;
          height: 32px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 950;
          font-size: 0.76rem;
        }

        @media (max-width: 780px) {
          .dash-hero {
            padding: 0.85rem;
            border-radius: 22px;
          }

          .dash-hero-content {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .fut-card {
            width: min(158px, 46vw);
            height: calc(min(158px, 46vw) * 1.44);
          }

          .dash-main-grid {
            grid-template-columns: 1fr;
          }

          .metric-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 420px) {
          .dash-hero {
            padding: 0.85rem;
          }

          .dash-card {
            border-radius: 21px;
            padding: 0.85rem;
          }

          .metric-grid {
            gap: 0.42rem;
          }

          .metric-tile {
            border-radius: 16px;
            padding: 0.75rem 0.45rem;
          }

          .list-row {
            gap: 0.55rem;
            padding: 0.68rem;
          }
        }
      `}</style>

      <section className="dash-hero">
        <div className="dash-hero-content">
          <PlayerCard
            giocatore={giocatore}
            cfg={cfg}
            cardType={cardType}
            cognome={cognome}
            partite={partite}
            golTotali={golTotali}
            assistTotali={assistTotali}
            mediaVoti={mediaVoti}
          />

          <div>
            <div className="dash-greeting">
              <div className="dash-kicker">Dashboard giocatore</div>
              <h1 className="dash-title">Ciao, <span>{nomeParti[0] || cleanName}!</span></h1>
              <p className="dash-subtitle">Pronto a conquistare la vetta?</p>
            </div>

            <div className="dash-card" style={{ marginBottom: '0.65rem', animationDelay: '0.05s' }}>
              <div className="dash-card-title">💰 Crediti disponibili</div>
              <div className="metric-grid">
                <MetricTile label="Crediti" value={giocatore.crediti ?? 500} color="#ffd700" />
                <MetricTile label="Vinte" value={scommesseVinte} color="#00d4ff" />
                <MetricTile label="Guadagnati" value={`+${guadagniTotali}`} color="#00ff88" />
              </div>
            </div>

            <ProgressCard
              cfg={cfg}
              currentOvr={currentOvr}
              puntiForma={puntiForma}
              puntiMancanti={puntiMancanti}
              formTrend={formTrend}
              formColor={formColor}
            />
          </div>
        </div>
      </section>

      <div className="dash-main-grid">
        <section className="dash-card" style={{ animationDelay: '0.08s' }}>
          <div className="dash-card-title">📊 Riepilogo stagione</div>
          <div className="metric-grid">
            <MetricTile label="Partite" value={partite.length} color="#00d4ff" />
            <MetricTile label="Gol" value={golTotali} color="#00ff88" />
            <MetricTile label="Assist" value={assistTotali} color="#a78bfa" />
            <MetricTile label="Vittorie" value={vittorie} color="#00d4ff" />
            <MetricTile label="Pareggi" value={pareggi} color="#ffd700" />
            <MetricTile label="Sconfitte" value={sconfitte} color="#ef4444" />
          </div>
        </section>

        <section className="dash-card" style={{ animationDelay: '0.12s' }}>
          <div className="dash-card-title">⭐ Ultime prestazioni</div>
          {ultimi5Voti.length > 0 ? (
            <div style={{ display: 'flex', gap: '0.55rem', overflowX: 'auto', paddingBottom: '0.15rem' }}>
              {ultimi5Voti.map((voto, i) => {
                const color = voto >= 7.5 ? '#00d4ff' : voto >= 6 ? '#ffd700' : '#ef4444'
                return (
                  <div key={i} style={{
                    minWidth: '70px',
                    borderRadius: '18px',
                    padding: '0.85rem 0.55rem',
                    textAlign: 'center',
                    background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${color}`,
                  }}>
                    <div style={{ fontSize: '1.45rem', fontWeight: 950, color, lineHeight: 1 }}>{voto.toFixed(1)}</div>
                    <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.38)', marginTop: '0.35rem', fontWeight: 800 }}>
                      P.{ultimi5Voti.length - i}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState text="Nessuna prestazione registrata." />
          )}
        </section>
      </div>

      <div className="dash-main-grid">
        <section className="dash-card" style={{ animationDelay: '0.16s' }}>
          <div className="dash-card-title">⚽ Prossima partita</div>
          {prossimaPartita ? (
            <div className="list-row">
              <div style={{ fontSize: '2rem' }}>📅</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 950, fontSize: '1rem', marginBottom: '0.2rem' }}>
                  {formatDate(prossimaPartita.data)}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.48)', fontSize: '0.82rem', fontWeight: 650 }}>
                  {prossimaPartita.stato === 'pre_partita' ? 'In programma' : (prossimaPartita.stato || 'In programma')}
                </div>
              </div>
              <div style={{ color: '#00d4ff', fontSize: '1.6rem', fontWeight: 950 }}>›</div>
            </div>
          ) : (
            <EmptyState text="Nessuna prossima partita trovata." />
          )}
        </section>

        <section className="dash-card" style={{ animationDelay: '0.20s' }}>
          <div className="dash-card-title">🎰 Ultime scommesse</div>
          {scommesse.length > 0 ? (
            <div style={{ display: 'grid', gap: '0.55rem' }}>
              {scommesse.slice(0, 4).map(s => (
                <BetRow key={s.id} bet={s} />
              ))}
            </div>
          ) : (
            <EmptyState text="Non hai ancora piazzato scommesse." />
          )}
        </section>
      </div>

      <section className="dash-card" style={{ animationDelay: '0.24s' }}>
        <div className="dash-card-title">📅 Ultime partite</div>
        {ultimePartite.length > 0 ? (
          <div style={{ display: 'grid', gap: '0.55rem' }}>
            {ultimePartite.map(p => (
              <MatchRow key={p.id} partita={p} currentUser={currentUser} />
            ))}
          </div>
        ) : (
          <EmptyState text="Nessuna partita chiusa ancora disponibile." />
        )}
      </section>
    </div>
  )
}

function PlayerCard({ giocatore, cfg, cardType, cognome, partite, golTotali, assistTotali, mediaVoti }) {
  return (
    <div className="fut-card">
      <div className="fut-inner-border" />
      <div className="fut-foil" />
      <div className="fut-shimmer" />

      <div className="fut-top-left">
        <div className="fut-overall">{giocatore.overall}</div>
        <div className="fut-role">{giocatore.ruolo}</div>
      </div>

      <div className="fut-badge">
        {cardType === 'gold' ? '🥇' : cardType === 'silver' ? '🥈' : '🥉'}
      </div>

      <div className="fut-photo">
        {giocatore.foto_url ? (
          <img src={giocatore.foto_url} alt={giocatore.nome} />
        ) : (
          <div style={{ fontSize: '4rem', opacity: 0.55, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))' }}>👤</div>
        )}
      </div>

      <div className="fut-name">
        <div>{cognome}</div>
      </div>

      <div className="fut-stats">
        <div className="fut-stats-grid">
          {[
            { val: partite.length, label: 'PG' },
            { val: golTotali, label: 'GOL' },
            { val: assistTotali, label: 'ASS' },
            { val: giocatore.overall, label: 'OVR' },
            { val: mediaVoti, label: 'MEDIA' },
            { val: giocatore.crediti ?? 500, label: 'CR' },
          ].map((s, i) => (
            <div key={i} className="fut-stat">
              <div className="fut-stat-value">{s.val}</div>
              <div className="fut-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ProgressCard({ cfg, currentOvr, puntiForma, puntiMancanti, formTrend, formColor }) {
  return (
    <div className="dash-card" style={{ animationDelay: '0.08s' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.9rem' }}>
        <div>
          <div className="dash-card-title" style={{ marginBottom: '0.2rem' }}>📈 Missione OVR {currentOvr + 1}</div>
          <div style={{ color: formColor, fontSize: '0.78rem', fontWeight: 800 }}>Forma attuale: {puntiForma >= 0 ? '+' : ''}{puntiForma}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ fontSize: '1.55rem', fontWeight: 950, color: cfg.accentColor }}>{currentOvr}</div>
          <div style={{ color: 'rgba(255,255,255,0.35)' }}>→</div>
          <div style={{ fontSize: '1.55rem', fontWeight: 950, color: '#00d4ff' }}>{currentOvr + 1}</div>
        </div>
      </div>

      <div className="progress-track">
        <div className="progress-fill" />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginTop: '0.58rem', fontSize: '0.76rem', fontWeight: 750 }}>
        <span style={{ color: formColor }}>{formTrend}</span>
        <span style={{ color: 'rgba(255,255,255,0.45)' }}>{puntiMancanti} punti mancanti</span>
      </div>
    </div>
  )
}

function MetricTile({ label, value, color }) {
  return (
    <div className="metric-tile">
      <div className="metric-value" style={{ color }}>{value}</div>
      <div className="metric-label">{label}</div>
    </div>
  )
}

function BetRow({ bet }) {
  const isWin = bet.esito === 'vinta'
  const isLoss = bet.esito === 'persa'
  const color = isWin ? '#00ff88' : isLoss ? '#ef4444' : '#ffd700'
  const label = bet.tipo === 'risultato' ? 'Risultato' : bet.tipo === 'migliore_in_campo' ? 'MVP' : 'Capocannoniere'

  return (
    <div className="list-row">
      <div className="status-pill" style={{
        background: isWin ? 'rgba(0,255,136,0.12)' : isLoss ? 'rgba(239,68,68,0.12)' : 'rgba(255,215,0,0.12)',
        color,
        border: `1px solid ${color}`,
      }}>
        {isWin ? 'V' : isLoss ? 'P' : '…'}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 900, fontSize: '0.88rem' }}>{label}</div>
        <div style={{ color: 'rgba(255,255,255,0.42)', fontSize: '0.74rem', fontWeight: 650 }}>
          {bet.importo} cr • quota {bet.quota}x
        </div>
      </div>
      <div style={{ color, fontWeight: 950, whiteSpace: 'nowrap' }}>
        {isWin ? `+${bet.vincita}` : isLoss ? `-${bet.importo}` : 'Attesa'}
      </div>
    </div>
  )
}

function MatchRow({ partita, currentUser }) {
  const squadraA = partita.squadra_a || []
  const squadraB = partita.squadra_b || []
  const inA = squadraA.includes(currentUser.id)
  const inB = squadraB.includes(currentUser.id)

  let result = '—'
  let resultColor = 'rgba(255,255,255,0.55)'

  if (typeof partita.punteggio_a === 'number' && typeof partita.punteggio_b === 'number') {
    const won = (inA && partita.punteggio_a > partita.punteggio_b) || (inB && partita.punteggio_b > partita.punteggio_a)
    const draw = partita.punteggio_a === partita.punteggio_b
    result = draw ? 'P' : won ? 'V' : 'S'
    resultColor = draw ? '#ffd700' : won ? '#00ff88' : '#ef4444'
  }

  return (
    <div className="list-row">
      <div className="status-pill" style={{
        background: result === 'V' ? 'rgba(0,255,136,0.12)' : result === 'S' ? 'rgba(239,68,68,0.12)' : 'rgba(255,215,0,0.12)',
        color: resultColor,
        border: `1px solid ${resultColor}`,
      }}>
        {result}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 900, fontSize: '0.88rem' }}>
          {typeof partita.punteggio_a === 'number' && typeof partita.punteggio_b === 'number'
            ? `${partita.punteggio_a} - ${partita.punteggio_b}`
            : 'Risultato non disponibile'}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.42)', fontSize: '0.74rem', fontWeight: 650 }}>
          {formatDate(partita.data)}
        </div>
      </div>
      <div style={{ color: '#00d4ff', fontWeight: 950 }}>›</div>
    </div>
  )
}

function EmptyState({ text }) {
  return (
    <div style={{
      borderRadius: '18px',
      padding: '1rem',
      border: '1px dashed rgba(255,255,255,0.12)',
      color: 'rgba(255,255,255,0.42)',
      fontWeight: 700,
      fontSize: '0.86rem',
      textAlign: 'center',
      background: 'rgba(255,255,255,0.025)',
    }}>
      {text}
    </div>
  )
}

export default Dashboard
