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
    glowColor: 'rgba(255,215,0,0.5)',
    progressColor: 'linear-gradient(90deg, #ffd700, #ffa500)',
    progressGlow: 'rgba(255,215,0,0.6)',
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
    glowColor: 'rgba(192,192,192,0.5)',
    progressColor: 'linear-gradient(90deg, #c0c0c0, #a0a0a0)',
    progressGlow: 'rgba(192,192,192,0.5)',
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
    glowColor: 'rgba(205,127,50,0.5)',
    progressColor: 'linear-gradient(90deg, #cd7f32, #a05a20)',
    progressGlow: 'rgba(205,127,50,0.5)',
    accentColor: '#cd7f32',
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
    const { data: giocatoreData } = await supabase.from('giocatori').select('*').eq('id', currentUser.id).single()
    const { data: partiteData } = await supabase.from('partite').select('*').eq('votazioni_aperte', false)
    const { data: scommesseData } = await supabase.from('scommesse').select('*').eq('giocatore_id', currentUser.id).order('created_at', { ascending: false })
    if (giocatoreData) setGiocatore(giocatoreData)
    if (scommesseData) setScommesse(scommesseData)
    if (partiteData) {
      setPartite(partiteData.filter(p => [...p.squadra_a, ...p.squadra_b].includes(currentUser.id)))
    }
    setLoading(false)
  }

  if (loading || !giocatore) return (
    <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255,255,255,0.5)' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚡</div>
      <div>Caricamento...</div>
    </div>
  )

  const cardType = getCardType(giocatore.overall)
  const cfg = CARD_CONFIGS[cardType]
  const currentOvr = giocatore.overall
  let soglia
  if (currentOvr >= 95) soglia = 15
  else if (currentOvr >= 90) soglia = 10
  else if (currentOvr >= 85) soglia = 7
  else if (currentOvr >= 75) soglia = 5
  else if (currentOvr >= 65) soglia = 3
  else soglia = 2

  const puntiForma = giocatore.forma_punti || 0
  const progressoPercentuale = Math.min(100, Math.max(0, (puntiForma / soglia) * 100))
  const puntiMancanti = soglia - puntiForma

  const ultimi5Voti = (giocatore.voti_storico || []).slice(-5).reverse().map(v => v.votoFinale)
  const mediaVoti = ultimi5Voti.length > 0
    ? (ultimi5Voti.reduce((s, v) => s + v, 0) / ultimi5Voti.length).toFixed(2)
    : '-'

  let golTotali = 0, assistTotali = 0
  partite.forEach(p => {
    const e = p.eventi?.[currentUser.id] || {}
    golTotali += e.gol || 0
    assistTotali += e.assist || 0
  })

  const scommesseVinte = scommesse.filter(s => s.esito === 'vinta').length
  const scommessePerse = scommesse.filter(s => s.esito === 'persa').length
  const guadagniTotali = scommesse.filter(s => s.esito === 'vinta').reduce((sum, s) => sum + s.vincita, 0)

  const nomeParti = giocatore.nome.split(' ')
  const cognome = nomeParti.length > 1 ? nomeParti[nomeParti.length - 1].toUpperCase() : giocatore.nome.toUpperCase()

  return (
    <div>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(25px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmerDash {
          0% { transform: translateX(-100%) rotate(20deg); }
          100% { transform: translateX(300%) rotate(20deg); }
        }
        @keyframes floatCard {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes glowCard {
          0%, 100% { box-shadow: 0 0 20px ${cfg.glowColor}, 0 20px 40px rgba(0,0,0,0.6); }
          50% { box-shadow: 0 0 40px ${cfg.glowColor}, 0 20px 50px rgba(0,0,0,0.7); }
        }
        @keyframes progressBar {
          from { width: 0%; }
          to { width: ${progressoPercentuale}%; }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>

      {/* TOP SECTION: Card FUT + Info */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        gap: '2rem',
        marginBottom: '2rem',
        animation: 'fadeInUp 0.5s ease'
      }}>

        {/* CARD FUT del giocatore */}
        <div style={{
          width: '180px',
          height: '260px',
          borderRadius: '14px',
          background: cfg.bg,
          border: `2px solid ${cfg.border}`,
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
          animation: 'glowCard 2.5s ease-in-out infinite, floatCard 4s ease-in-out infinite',
        }}>
          {/* Bordo interno */}
          <div style={{ position: 'absolute', top: '4px', left: '4px', right: '4px', bottom: '4px', border: `1px solid ${cfg.innerBorder}`, borderRadius: '11px', pointerEvents: 'none', zIndex: 3 }} />
          {/* Foil */}
          <div style={{ position: 'absolute', inset: 0, background: cfg.foil, pointerEvents: 'none', zIndex: 1 }} />
          {/* Shimmer */}
          <div style={{ position: 'absolute', top: '-50%', left: '-20%', width: '35%', height: '200%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)', animation: 'shimmerDash 3s ease-in-out infinite', pointerEvents: 'none', zIndex: 2 }} />

          {/* Overall + Ruolo */}
          <div style={{ position: 'absolute', top: '10px', left: '12px', zIndex: 4, lineHeight: 1 }}>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: cfg.textDark, lineHeight: 1 }}>{giocatore.overall}</div>
            <div style={{ fontSize: '0.58rem', fontWeight: 800, color: cfg.labelText, letterSpacing: '0.5px', marginTop: '2px' }}>{giocatore.ruolo}</div>
          </div>

          {/* Tipo card badge */}
          <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 4, background: 'rgba(0,0,0,0.3)', borderRadius: '5px', padding: '2px 5px', fontSize: '0.5rem', fontWeight: 800, color: cfg.statsText, letterSpacing: '0.5px' }}>
            {cardType === 'gold' ? '🥇' : cardType === 'silver' ? '🥈' : '🥉'}
          </div>

          {/* Foto */}
          <div style={{ position: 'absolute', top: '8px', left: '50%', transform: 'translateX(-50%)', width: '85px', height: '110px', zIndex: 3, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden' }}>
            {giocatore.foto_url ? (
              <img src={giocatore.foto_url} alt={giocatore.nome} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.5))' }} />
            ) : (
              <div style={{ fontSize: '4rem', opacity: 0.55, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))' }}>👤</div>
            )}
          </div>

          {/* Nome */}
          <div style={{ position: 'absolute', bottom: '65px', left: 0, right: 0, textAlign: 'center', zIndex: 4, padding: '0 8px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 900, color: cfg.textDark, letterSpacing: '1.5px', textTransform: 'uppercase', textShadow: '0 1px 0 rgba(255,255,255,0.3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {cognome}
            </div>
          </div>

          {/* Stats bar */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: cfg.statsBar, borderTop: `1px solid ${cfg.innerBorder}`, padding: '6px 8px', zIndex: 4 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px' }}>
              {[
                { val: partite.length, label: 'PG' },
                { val: golTotali, label: 'GOL' },
                { val: assistTotali, label: 'ASS' },
                { val: giocatore.overall, label: 'OVR' },
                { val: mediaVoti, label: 'MEDIA' },
                { val: giocatore.crediti ?? 500, label: 'CR' },
              ].map((s, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 900, color: cfg.statsText, lineHeight: 1 }}>{s.val}</div>
                  <div style={{ fontSize: '0.45rem', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Info destra */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'center' }}>
          <div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 900, marginBottom: '0.25rem', lineHeight: 1.1 }}>{giocatore.nome}</h1>
            <div style={{ fontSize: '1rem', color: cfg.accentColor, fontWeight: 700, marginBottom: '1rem' }}>{giocatore.ruolo}</div>
          </div>

          {/* Crediti */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(255,215,0,0.12), rgba(255,165,0,0.08))',
            border: '1px solid rgba(255,215,0,0.35)',
            borderRadius: '14px',
            padding: '1rem 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,215,0,0.7)', fontWeight: 600, marginBottom: '0.15rem', letterSpacing: '0.5px' }}>💰 CREDITI</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#ffd700', lineHeight: 1 }}>{giocatore.crediti ?? 500}</div>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#00d4ff' }}>{scommesseVinte}</div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>Vinte</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#ef4444' }}>{scommessePerse}</div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>Perse</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#ffd700' }}>+{guadagniTotali}</div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>Guadagnati</div>
              </div>
            </div>
          </div>

          {/* Progresso Overall */}
          <div style={{
            background: 'rgba(15,23,41,0.7)',
            border: `1px solid ${cfg.border}`,
            borderRadius: '14px',
            padding: '1rem 1.5rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.5px' }}>
                📊 PROGRESSO OVERALL
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: cfg.accentColor }}>{currentOvr}</div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>→</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'rgba(255,255,255,0.5)' }}>{currentOvr + 1}</div>
              </div>
            </div>

            {/* Barra */}
            <div style={{ width: '100%', height: '16px', background: 'rgba(0,0,0,0.4)', borderRadius: '8px', overflow: 'hidden', border: `1px solid ${cfg.innerBorder}`, position: 'relative', marginBottom: '0.5rem' }}>
              <div style={{
                width: `${progressoPercentuale}%`,
                height: '100%',
                background: cfg.progressColor,
                borderRadius: '8px',
                boxShadow: `0 0 12px ${cfg.progressGlow}`,
                animation: 'progressBar 1s ease-out',
                transition: 'width 0.5s ease',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Shine sulla barra */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', background: 'rgba(255,255,255,0.2)', borderRadius: '8px 8px 0 0' }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
              <span style={{ color: puntiForma >= 0 ? cfg.accentColor : '#ef4444', fontWeight: 700 }}>
                {puntiForma >= 0 ? '+' : ''}{puntiForma} punti forma
              </span>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>
                mancano {Math.max(0, puntiMancanti)} punti
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* STATS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem', animation: 'fadeInUp 0.5s ease 0.1s both' }}>
        {[
          { icon: '⚽', label: 'Gol Totali', value: golTotali, color: '#00d4ff', bg: 'rgba(0,212,255,0.08)', border: 'rgba(0,212,255,0.2)' },
          { icon: '🎯', label: 'Assist Totali', value: assistTotali, color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)' },
          { icon: '📅', label: 'Partite', value: partite.length, color: '#00ff88', bg: 'rgba(0,255,136,0.08)', border: 'rgba(0,255,136,0.2)' },
          { icon: '⭐', label: 'Media Ultimi 5', value: mediaVoti, color: '#ffd700', bg: 'rgba(255,215,0,0.08)', border: 'rgba(255,215,0,0.2)' },
        ].map((s, i) => (
          <div key={i} style={{
            background: s.bg,
            border: `1px solid ${s.border}`,
            borderRadius: '14px',
            padding: '1.25rem',
            textAlign: 'center',
            transition: 'all 0.2s',
            cursor: 'default',
            animation: `fadeInUp 0.4s ease ${0.1 + i * 0.05}s both`
          }}
            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{s.icon}</div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: s.color, lineHeight: 1, marginBottom: '0.25rem' }}>{s.value}</div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ULTIMI VOTI */}
      {ultimi5Voti.length > 0 && (
        <div style={{ background: 'rgba(15,23,41,0.6)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: '1.5rem 2rem', marginBottom: '2rem', animation: 'fadeInUp 0.5s ease 0.2s both' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📈 Ultime Prestazioni
          </h2>
          <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto' }}>
            {ultimi5Voti.map((voto, i) => {
              const isTop = voto >= 7.5
              const isMid = voto >= 6
              const color = isTop ? '#00d4ff' : isMid ? '#ffd700' : '#ef4444'
              const bg = isTop ? 'rgba(0,212,255,0.1)' : isMid ? 'rgba(255,215,0,0.1)' : 'rgba(239,68,68,0.1)'
              return (
                <div key={i} style={{ minWidth: '75px', padding: '1rem 0.75rem', background: bg, border: `2px solid ${color}`, borderRadius: '12px', textAlign: 'center', transition: 'all 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                  onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color, lineHeight: 1 }}>{voto.toFixed(1)}</div>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.4rem' }}>P.{ultimi5Voti.length - i}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ULTIME SCOMMESSE */}
      {scommesse.length > 0 && (
        <div style={{ background: 'rgba(15,23,41,0.6)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: '1.5rem 2rem', animation: 'fadeInUp 0.5s ease 0.3s both' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🎰 Ultime Scommesse
          </h2>
          <div style={{ display: 'grid', gap: '0.6rem' }}>
            {scommesse.slice(0, 5).map(s => (
              <div key={s.id} style={{
                background: 'rgba(0,0,0,0.25)',
                borderRadius: '12px',
                padding: '0.85rem 1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                border: `1px solid ${s.esito === 'vinta' ? 'rgba(0,212,255,0.25)' : s.esito === 'persa' ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.05)'}`
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.2rem' }}>
                    {s.tipo === 'risultato' ? '🏆 Risultato' : s.tipo === 'migliore_in_campo' ? '⭐ MVP' : '⚽ Capocannoniere'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                    {s.importo} cr • quota {s.quota}x
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 900, fontSize: '1rem', color: s.esito === 'vinta' ? '#00d4ff' : s.esito === 'persa' ? '#ef4444' : '#ffd700' }}>
                    {s.esito === 'vinta' ? `+${s.vincita}` : s.esito === 'persa' ? `-${s.importo}` : '⏳'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
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

export default Dashboard
