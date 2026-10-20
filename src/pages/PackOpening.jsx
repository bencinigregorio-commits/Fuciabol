import { useMemo, useState } from 'react'

// Overlay "apertura busta" stile FUT, mostrato quando l'overall di un
// giocatore sale rispetto all'ultima visita registrata (vedi Dashboard.jsx).
function PackOpening({ cfg, cardType, nome, cognome, ruolo, fotoUrl, fromOverall, toOverall, onClose }) {
  const [stage, setStage] = useState('sealed') // sealed -> bursting -> revealed

  const particelle = useMemo(() => (
    Array.from({ length: 26 }, (_, i) => ({
      id: i,
      angle: (360 / 26) * i + Math.random() * 10,
      distance: 120 + Math.random() * 180,
      delay: Math.random() * 0.25,
      size: 4 + Math.random() * 7,
      isGold: Math.random() > 0.4
    }))
  ), [])

  function apri() {
    if (stage !== 'sealed') return
    setStage('bursting')
    setTimeout(() => setStage('revealed'), 420)
  }

  const delta = toOverall - fromOverall

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'radial-gradient(circle at 50% 40%, rgba(15,23,41,0.97), rgba(4,7,15,0.99))', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <style>{`
        @keyframes poFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes poPulse { 0%, 100% { transform: scale(1); box-shadow: 0 0 40px rgba(0,212,255,0.4), 0 0 80px rgba(0,212,255,0.15); } 50% { transform: scale(1.04); box-shadow: 0 0 60px rgba(0,212,255,0.6), 0 0 110px rgba(0,212,255,0.25); } }
        @keyframes poFlash { 0% { opacity: 0; } 15% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes poPackOut { to { transform: scale(0.3); opacity: 0; } }
        @keyframes poCardIn { from { opacity: 0; transform: perspective(1200px) rotateY(-100deg) scale(0.7); } to { opacity: 1; transform: perspective(1200px) rotateY(0deg) scale(1); } }
        @keyframes poGlowCard { 0%, 100% { box-shadow: 0 0 40px ${cfg.glow}, 0 25px 60px rgba(0,0,0,0.6); } 50% { box-shadow: 0 0 70px ${cfg.glow}, 0 25px 70px rgba(0,0,0,0.7); } }
        @keyframes poPop { 0% { transform: scale(0); opacity: 0; } 60% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes poParticle { from { transform: translate(0,0) scale(1); opacity: 1; } to { transform: translate(var(--px), var(--py)) scale(0); opacity: 0; } }
        @keyframes poShine { 0% { transform: translateX(-120%) rotate(18deg); } 100% { transform: translateX(220%) rotate(18deg); } }
        .po-sealed { animation: poFadeIn 0.3s ease both; }
        .po-pack { animation: poPulse 2.2s ease-in-out infinite; }
        .po-pack.bursting { animation: poPackOut 0.4s ease forwards; }
        .po-flash { animation: poFlash 0.45s ease both; }
        .po-card { animation: poCardIn 0.55s cubic-bezier(0.2, 0.9, 0.3, 1.1) both, poGlowCard 2.6s ease-in-out infinite 0.6s; }
        .po-badge { animation: poPop 0.5s cubic-bezier(0.3, 1.4, 0.5, 1) 0.5s both; }
      `}</style>

      {stage === 'bursting' && <div className="po-flash" style={{ position: 'absolute', inset: 0, background: '#fff', zIndex: 10 }} />}

      {stage !== 'revealed' && (
        <div
          onClick={apri}
          className={`po-pack ${stage === 'bursting' ? 'bursting' : ''}`}
          style={{
            width: '180px', height: '250px', borderRadius: '20px', cursor: stage === 'sealed' ? 'pointer' : 'default',
            background: 'linear-gradient(155deg, #0a1628, #0f2847, #0a1628)',
            border: '2px solid rgba(0,212,255,0.5)', position: 'relative', overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '0.6rem'
          }}
        >
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)' }} />
          <div style={{ fontSize: '2.4rem' }}>⚽</div>
          <div style={{ fontWeight: 950, fontSize: '0.9rem', letterSpacing: '2px', color: '#00d4ff' }}>FUCIABOL</div>
          <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '1px', marginTop: '0.4rem' }}>TOCCA PER APRIRE</div>
        </div>
      )}

      {stage === 'revealed' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.3rem', padding: '1rem', position: 'relative' }}>
          {particelle.map(p => {
            const rad = (p.angle * Math.PI) / 180
            const px = Math.cos(rad) * p.distance
            const py = Math.sin(rad) * p.distance
            return (
              <div key={p.id} style={{
                position: 'absolute', top: '38%', left: '50%', width: `${p.size}px`, height: `${p.size}px`,
                borderRadius: '50%', background: p.isGold ? '#ffd700' : '#00d4ff',
                boxShadow: `0 0 8px ${p.isGold ? '#ffd700' : '#00d4ff'}`,
                animation: `poParticle 1.1s ease-out ${p.delay}s both`,
                '--px': `${px}px`, '--py': `${py}px`, pointerEvents: 'none'
              }} />
            )
          })}

          <div className="po-card" style={{
            width: '230px', height: '320px', borderRadius: '22px', position: 'relative', overflow: 'hidden',
            background: cfg.bg, border: `2.5px solid ${cfg.border}`,
          }}>
            <div style={{ position: 'absolute', top: '-60%', left: '-30%', width: '45%', height: '220%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)', animation: 'poShine 1.8s ease-in-out 0.7s' }} />
            <div style={{ position: 'absolute', top: '4px', left: '4px', right: '4px', bottom: '4px', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '18px', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: '14px', left: '16px', lineHeight: 1 }}>
              <div style={{ fontSize: '2.1rem', fontWeight: 950, color: cfg.text }}>{toOverall}</div>
              <div style={{ fontSize: '0.6rem', fontWeight: 800, color: cfg.muted, marginTop: '2px', letterSpacing: '0.5px' }}>{ruolo || '—'}</div>
            </div>
            <div style={{ position: 'absolute', top: '18px', left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: '82px', height: '100px', borderRadius: '14px', overflow: 'hidden', background: 'rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {fotoUrl ? <img src={fotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} /> : <span style={{ fontSize: '2.4rem', opacity: 0.4 }}>👤</span>}
              </div>
            </div>
            <div style={{ position: 'absolute', bottom: '18px', left: 0, right: 0, textAlign: 'center' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 950, color: cfg.text, letterSpacing: '1.5px', textTransform: 'uppercase' }}>{cognome}</div>
            </div>
          </div>

          <div className="po-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.4)', borderRadius: '999px', padding: '0.5rem 1.1rem' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 800, fontSize: '0.95rem', textDecoration: 'line-through' }}>{fromOverall}</span>
            <span style={{ color: '#00ff88', fontWeight: 950 }}>→</span>
            <span style={{ color: '#00ff88', fontWeight: 950, fontSize: '1.3rem' }}>{toOverall}</span>
            <span style={{ color: '#00ff88', fontWeight: 800, fontSize: '0.78rem' }}>+{delta}</span>
          </div>

          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.82rem', fontWeight: 650, textAlign: 'center' }}>
            {nome}, la tua crescita continua! ⚡
          </div>

          <button
            onClick={onClose}
            style={{ marginTop: '0.3rem', background: 'linear-gradient(135deg, #00d4ff, #0099ff)', border: 'none', borderRadius: '14px', padding: '0.8rem 2.2rem', color: '#0f1729', fontWeight: 900, fontSize: '0.9rem', letterSpacing: '0.5px', cursor: 'pointer', boxShadow: '0 10px 28px rgba(0,212,255,0.35)' }}
          >
            Continua
          </button>
        </div>
      )}
    </div>
  )
}

export default PackOpening
