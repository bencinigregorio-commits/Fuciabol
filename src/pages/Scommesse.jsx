import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

const FRASI = [
  "Chi gioca può perdere. Chi non gioca ha già perso.",
  "Puoi perdere tutto quello che hai. Ma puoi guadagnare molto di più.",
  "Never give up. Soprattutto quando sei sotto di 400 crediti.",
  "Il momento migliore per scommettere era ieri. Il secondo momento migliore è adesso.",
  "Non è gioco d'azzardo. È analisi statistica avanzata.",
  "I crediti sono solo numeri. I rimpianti durano per sempre.",
  "Fidati dell'istinto. O almeno fidati delle quote.",
  "La fortuna aiuta gli audaci. E a volte anche i disperati.",
  "Il 99% dei giocatori smette prima della grande vincita.",
]

function Scommesse() {
  const [giocatori, setGiocatori] = useState([])
  const [scommesse, setScommesse] = useState([])
  const [loading, setLoading] = useState(true)
  const [frase, setFrase] = useState('')
  const [fraseVisible, setFraseVisible] = useState(false)

  useEffect(() => {
    caricaDati()
    // Frase random con animazione
    const f = FRASI[Math.floor(Math.random() * FRASI.length)]
    setFrase(f)
    setTimeout(() => setFraseVisible(true), 100)
  }, [])

  async function caricaDati() {
    const { data: giocatoriData } = await supabase
      .from('giocatori')
      .select('*')
      .order('crediti', { ascending: false })

    const { data: scommesseData } = await supabase
      .from('scommesse')
      .select('*')

    if (giocatoriData) setGiocatori(giocatoriData)
    if (scommesseData) setScommesse(scommesseData)
    setLoading(false)
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '4rem', color: 'rgba(255, 255, 255, 0.5)' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem', animation: 'spin 1s linear infinite' }}>🎰</div>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      <div>Caricamento...</div>
    </div>
  )

  // Calcola stats per ogni giocatore
  const giocatoriConStats = giocatori.map(g => {
    const mie = scommesse.filter(s => s.giocatore_id === g.id)
    const vinte = mie.filter(s => s.esito === 'vinta')
    const perse = mie.filter(s => s.esito === 'persa')
    const totaleSpeso = mie.reduce((sum, s) => sum + s.importo, 0)
    const totaleVinto = vinte.reduce((sum, s) => sum + s.vincita, 0)
    const maxPuntata = mie.length > 0 ? Math.max(...mie.map(s => s.importo)) : 0
    const maxPersa = perse.length > 0 ? Math.max(...perse.map(s => s.importo)) : 0
    const quotaMedia = mie.length > 0 ? mie.reduce((sum, s) => sum + parseFloat(s.quota), 0) / mie.length : 0
    const percVincite = mie.filter(s => s.esito !== 'pending').length > 0
      ? (vinte.length / mie.filter(s => s.esito !== 'pending').length) * 100
      : 0
    const roi = totaleSpeso > 0 ? ((totaleVinto - totaleSpeso) / totaleSpeso) * 100 : 0

    const oggi = new Date()
    const vinteDelMese = vinte.filter(s => {
      const d = new Date(s.created_at)
      return d.getMonth() === oggi.getMonth() && d.getFullYear() === oggi.getFullYear()
    })

    return {
      ...g,
      totScommesse: mie.length,
      totVinte: vinte.length,
      totPerse: perse.length,
      totaleSpeso,
      totaleVinto,
      maxPuntata,
      maxPersa,
      quotaMedia,
      percVincite: isNaN(percVincite) ? 0 : percVincite,
      roi: isNaN(roi) ? 0 : roi,
      vinteDelMese: vinteDelMese.length
    }
  })

  const conScommesse = giocatoriConStats.filter(g => g.totScommesse > 0)

  const getTitolo = (g) => {
    if (conScommesse.length === 0) return null

    const maxROI = Math.max(...conScommesse.map(x => x.roi))
    const maxPerc = Math.max(...conScommesse.map(x => x.percVincite))
    const maxVinteMese = Math.max(...conScommesse.map(x => x.vinteDelMese))
    const maxQuota = Math.max(...conScommesse.map(x => x.quotaMedia))
    const maxScommesse = Math.max(...conScommesse.map(x => x.totScommesse))
    const maxPerdita = Math.max(...conScommesse.map(x => x.maxPersa))
    const maxPuntata = Math.max(...conScommesse.map(x => x.maxPuntata))
    const minCrediti = Math.min(...conScommesse.map(x => x.crediti))

    if (g.roi === maxROI && g.roi > 0) return { emoji: '⚽', titolo: 'Max Allegri', desc: 'Guadagni alti spendendo poco' }
    if (g.percVincite === maxPerc && g.totScommesse >= 3) return { emoji: '🔮', titolo: "L'Oracolo", desc: 'Percentuale vincite più alta' }
    if (g.vinteDelMese === maxVinteMese && g.vinteDelMese > 0) return { emoji: '🏆', titolo: 'Scommettitore del Mese', desc: 'Più scommesse vinte questo mese' }
    if (g.quotaMedia === maxQuota && g.totScommesse >= 3) return { emoji: '💭', titolo: 'Il Sognatore', desc: 'Scommette sempre sulle quote più alte' }
    if (g.totScommesse === maxScommesse) return { emoji: '🃏', titolo: 'Il Fagioli', desc: 'Più scommesse piazzate in totale' }
    if (g.maxPersa === maxPerdita && g.maxPersa > 0) return { emoji: '🧤', titolo: 'Gigi Buffon', desc: 'Ha perso più crediti in una singola scommessa' }
    if (g.maxPuntata === maxPuntata && g.maxPuntata > 0) return { emoji: '💸', titolo: 'Tonali', desc: 'Ha scommesso più crediti in una singola scommessa' }
    if (g.crediti === minCrediti) return { emoji: '📉', titolo: "L'Infognato", desc: 'Meno crediti in assoluto' }

    return null
  }

  return (
    <div>
      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>

      {/* Header con frase random */}
      <div style={{ marginBottom: '2rem', animation: 'fadeInDown 0.5s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: 0 }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '16px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(145deg, rgba(0,212,255,0.12), rgba(10,16,30,0.9))',
            border: '1px solid rgba(0,212,255,0.28)',
            boxShadow: '0 0 18px rgba(0,212,255,0.18), 0 4px 18px rgba(0,0,0,0.4)'
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2"/>
              <path d="M8 21h8M12 17v4"/>
              <circle cx="12" cy="10" r="2"/>
              <path d="M7 10h1M16 10h1"/>
            </svg>
          </div>
          <div>
            <h1 style={{ margin: '0 0 0.3rem 0', fontSize: 'clamp(1.4rem, 5vw, 1.75rem)', fontWeight: 900, letterSpacing: '3px', lineHeight: 1, fontFamily: 'system-ui, -apple-system, sans-serif', textTransform: 'uppercase', background: 'linear-gradient(135deg, #fff 0%, #e0f8ff 55%, #00d4ff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Scommesse</h1>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.38)', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' }}>Piazza le tue scommesse, scala la classifica.</p>
          </div>
        </div>
        <div style={{ height: '1px', background: 'linear-gradient(90deg, rgba(0,212,255,0.55), rgba(0,212,255,0.1), transparent)', margin: '1.1rem 0 1.25rem' }} />

        {/* Frase random animata */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 165, 0, 0.05))',
          border: '1px solid rgba(255, 215, 0, 0.3)',
          borderRadius: '15px',
          padding: '1.25rem 1.5rem',
          opacity: fraseVisible ? 1 : 0,
          transform: fraseVisible ? 'translateY(0)' : 'translateY(10px)',
          transition: 'all 0.6s ease',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Effetto shimmer */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.05), transparent)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 3s infinite'
          }} />
          <div style={{
            fontSize: '1rem',
            fontWeight: 600,
            color: '#ffd700',
            fontStyle: 'italic',
            position: 'relative',
            zIndex: 1
          }}>
            💬 "{frase}"
          </div>
        </div>
      </div>

      {/* Hall of Fame */}
      {conScommesse.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1rem', color: 'rgba(255, 255, 255, 0.7)' }}>
            🏅 Hall of Fame (e of Shame)
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {giocatoriConStats.map((g, i) => {
              const titolo = getTitolo(g)
              if (!titolo) return null
              return (
                <div key={g.id} style={{
                  background: 'rgba(15, 23, 41, 0.6)',
                  border: '1px solid rgba(255, 215, 0, 0.2)',
                  borderRadius: '15px',
                  padding: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  animation: `fadeInDown 0.4s ease ${i * 0.08}s both`,
                  transition: 'all 0.2s'
                }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.border = '1px solid rgba(255, 215, 0, 0.5)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.border = '1px solid rgba(255, 215, 0, 0.2)'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <div style={{
                    fontSize: '2.5rem',
                    animation: 'pulse 2s infinite',
                    minWidth: '50px',
                    textAlign: 'center'
                  }}>
                    {titolo.emoji}
                  </div>
                  <div>
                    <div style={{ fontWeight: 900, color: '#ffd700', fontSize: '1rem', marginBottom: '0.25rem' }}>
                      {titolo.titolo}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                      {g.nome}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)' }}>
                      {titolo.desc}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Classifica Crediti */}
      <div style={{
        background: 'rgba(15, 23, 41, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '15px',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '60px 1fr 100px 80px 80px 80px 100px',
          padding: '1rem 1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          fontSize: '0.75rem',
          fontWeight: 700,
          color: 'rgba(255, 255, 255, 0.4)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          <div>POS.</div>
          <div>GIOCATORE</div>
          <div style={{ textAlign: 'center' }}>CREDITI</div>
          <div style={{ textAlign: 'center' }}>V/P</div>
          <div style={{ textAlign: 'center' }}>WIN%</div>
          <div style={{ textAlign: 'center' }}>TOT</div>
          <div style={{ textAlign: 'center' }}>ROI</div>
        </div>

        {giocatoriConStats.map((g, index) => {
          const titolo = getTitolo(g)
          return (
            <div
              key={g.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '60px 1fr 100px 80px 80px 80px 100px',
                padding: '1rem 1.5rem',
                alignItems: 'center',
                borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                transition: 'all 0.2s',
                animation: `fadeInDown 0.3s ease ${index * 0.05}s both`
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 215, 0, 0.03)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{
                width: '35px',
                height: '35px',
                borderRadius: '50%',
                background: index === 0
                  ? 'linear-gradient(135deg, #ffd700, #ffa500)'
                  : index === 1
                  ? 'linear-gradient(135deg, #c0c0c0, #a8a8a8)'
                  : index === 2
                  ? 'linear-gradient(135deg, #cd7f32, #b87333)'
                  : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${index < 3 ? 'transparent' : 'rgba(255, 255, 255, 0.1)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.9rem',
                fontWeight: 700,
                color: index < 3 ? '#0f1729' : 'rgba(255, 255, 255, 0.5)'
              }}>
                {index + 1}
              </div>

              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.2rem' }}>{g.nome}</div>
                {titolo && (
                  <div style={{ fontSize: '0.75rem', color: '#ffd700', fontWeight: 600 }}>
                    {titolo.emoji} {titolo.titolo}
                  </div>
                )}
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  background: 'rgba(255, 215, 0, 0.1)',
                  border: '1px solid rgba(255, 215, 0, 0.3)',
                  borderRadius: '20px',
                  padding: '0.25rem 0.75rem',
                  fontSize: '1rem',
                  fontWeight: 900,
                  color: '#ffd700'
                }}>
                  💰 {g.crediti ?? 500}
                </div>
              </div>

              <div style={{ textAlign: 'center', fontSize: '0.9rem' }}>
                <span style={{ color: '#00d4ff', fontWeight: 700 }}>{g.totVinte}</span>
                <span style={{ color: 'rgba(255, 255, 255, 0.3)' }}>/</span>
                <span style={{ color: '#ef4444', fontWeight: 700 }}>{g.totPerse}</span>
              </div>

              <div style={{ textAlign: 'center' }}>
                <span style={{
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: g.percVincite >= 50 ? '#00d4ff' : g.percVincite > 0 ? '#ffd700' : 'rgba(255, 255, 255, 0.3)'
                }}>
                  {g.totScommesse > 0 ? `${g.percVincite.toFixed(0)}%` : '-'}
                </span>
              </div>

              <div style={{ textAlign: 'center', fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 600 }}>
                {g.totScommesse}
              </div>

              <div style={{ textAlign: 'center' }}>
                <span style={{
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: g.roi > 0 ? '#00d4ff' : g.roi < 0 ? '#ef4444' : 'rgba(255, 255, 255, 0.3)'
                }}>
                  {g.totScommesse > 0 ? `${g.roi > 0 ? '+' : ''}${g.roi.toFixed(0)}%` : '-'}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Scommesse