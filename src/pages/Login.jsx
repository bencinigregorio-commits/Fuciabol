import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

function Login({ onLogin }) {
  const [mode, setMode] = useState('player')
  const [giocatori, setGiocatori] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    caricaGiocatori()
  }, [])

  async function caricaGiocatori() {
    const { data } = await supabase
      .from('giocatori')
      .select('id, nome')
      .order('nome')
    if (data) setGiocatori(data)
  }

  function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (mode === 'admin') {
      if (pin === '1234') {
        onLogin({ id: 'admin', nome: 'Admin', role: 'admin' })
      } else {
        setError('PIN errato')
      }
    } else {
      const giocatore = giocatori.find(g => g.id === parseInt(selectedId))
      if (giocatore) {
        onLogin({ ...giocatore, role: 'player' })
      } else {
        setError('Seleziona un giocatore')
      }
    }
  }

  const canSubmit = mode === 'admin' ? pin.length > 0 : selectedId !== ''

  return (
    <div className="login-screen">
      <style>{`
        .login-screen {
          --cyan: #00d4ff;
          min-height: 100vh;
          width: 100%;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.25rem;
          background: #0f1729;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          box-sizing: border-box;
        }

        .login-screen * { box-sizing: border-box; }

        .login-bg {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          background:
            radial-gradient(circle at 18% 20%, rgba(0,212,255,0.10) 0%, transparent 42%),
            radial-gradient(circle at 82% 82%, rgba(255,215,0,0.05) 0%, transparent 45%),
            radial-gradient(circle at 50% 120%, rgba(0,153,255,0.10) 0%, transparent 50%);
        }

        .login-orb {
          position: fixed;
          border-radius: 50%;
          filter: blur(60px);
          pointer-events: none;
          z-index: 0;
          opacity: 0.5;
        }
        .login-orb.a { top: -80px; left: -60px; width: 260px; height: 260px; background: rgba(0,212,255,0.22); animation: floatOrb 9s ease-in-out infinite; }
        .login-orb.b { bottom: -90px; right: -70px; width: 300px; height: 300px; background: rgba(0,153,255,0.18); animation: floatOrb 11s ease-in-out infinite reverse; }

        @keyframes floatOrb {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(24px, -20px) scale(1.08); }
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(22px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes logoGlow {
          0%, 100% { box-shadow: 0 0 24px rgba(0,212,255,0.30), 0 12px 34px rgba(0,0,0,0.5); }
          50% { box-shadow: 0 0 40px rgba(0,212,255,0.5), 0 12px 40px rgba(0,0,0,0.55); }
        }

        .login-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 400px;
          border-radius: 30px;
          border: 1px solid rgba(0,212,255,0.22);
          background:
            radial-gradient(circle at 80% 0%, rgba(0,212,255,0.14), transparent 40%),
            linear-gradient(160deg, rgba(15,23,41,0.94), rgba(6,11,24,0.92));
          backdrop-filter: blur(22px);
          box-shadow: 0 30px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05);
          padding: 2rem 1.6rem 1.8rem;
          animation: fadeInUp 0.5s ease both;
        }

        .login-logo-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 1.7rem;
        }

        .login-logo {
          width: 74px;
          height: 74px;
          border-radius: 22px;
          object-fit: contain;
          background: linear-gradient(135deg, rgba(0,212,255,0.18), rgba(10,16,30,0.9));
          border: 1px solid rgba(0,212,255,0.3);
          animation: logoGlow 3s ease-in-out infinite;
          margin-bottom: 0.9rem;
        }

        .login-logo-fallback {
          width: 74px;
          height: 74px;
          border-radius: 22px;
          display: none;
          align-items: center;
          justify-content: center;
          font-size: 2.2rem;
          background: linear-gradient(135deg, #00d4ff, #0099ff);
          animation: logoGlow 3s ease-in-out infinite;
          margin-bottom: 0.9rem;
        }

        .login-title {
          margin: 0;
          font-size: 1.85rem;
          font-weight: 950;
          letter-spacing: 3.5px;
          text-transform: uppercase;
          background: linear-gradient(135deg, #fff 0%, #e0f8ff 50%, #00d4ff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .login-subtitle {
          margin: 0.4rem 0 0;
          color: rgba(255,255,255,0.4);
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
        }

        .login-toggle {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem;
          padding: 0.35rem;
          border-radius: 16px;
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.06);
          margin-bottom: 1.5rem;
        }

        .login-toggle-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          border: 1px solid transparent;
          background: transparent;
          color: rgba(255,255,255,0.5);
          border-radius: 12px;
          padding: 0.7rem 0.5rem;
          cursor: pointer;
          font-family: inherit;
          font-weight: 850;
          font-size: 0.82rem;
          letter-spacing: 0.3px;
          transition: all 0.2s ease;
        }

        .login-toggle-btn.active {
          background: linear-gradient(135deg, rgba(0,212,255,0.2), rgba(0,153,255,0.08));
          border-color: rgba(0,212,255,0.4);
          color: #fff;
          box-shadow: 0 0 18px rgba(0,212,255,0.14), inset 0 1px 0 rgba(255,255,255,0.08);
        }

        .login-field { margin-bottom: 1.15rem; }

        .login-label {
          display: block;
          margin-bottom: 0.55rem;
          font-size: 0.72rem;
          font-weight: 850;
          letter-spacing: 0.6px;
          text-transform: uppercase;
          color: rgba(255,255,255,0.55);
        }

        .login-input,
        .login-select {
          width: 100%;
          border-radius: 15px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(0,0,0,0.32);
          color: #fff;
          padding: 0.9rem 1rem;
          font-family: inherit;
          font-size: 0.95rem;
          font-weight: 650;
          outline: none;
          transition: all 0.2s ease;
          appearance: none;
          -webkit-appearance: none;
        }

        .login-select {
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2300d4ff' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>");
          background-repeat: no-repeat;
          background-position: right 1rem center;
          padding-right: 2.6rem;
          cursor: pointer;
        }

        .login-select option { background: #0f1729; color: #fff; }

        .login-input:focus,
        .login-select:focus {
          border-color: rgba(0,212,255,0.5);
          background: rgba(0,212,255,0.06);
          box-shadow: 0 0 0 3px rgba(0,212,255,0.12);
        }

        .login-input::placeholder { color: rgba(255,255,255,0.28); letter-spacing: 4px; }

        .login-hint {
          margin: 0.5rem 0 0;
          font-size: 0.68rem;
          color: rgba(255,255,255,0.3);
          font-weight: 650;
        }

        .login-error {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1.1rem;
          border-radius: 13px;
          border: 1px solid rgba(239,68,68,0.28);
          background: rgba(239,68,68,0.1);
          color: #ff8080;
          padding: 0.7rem 0.85rem;
          font-size: 0.82rem;
          font-weight: 750;
          animation: fadeInUp 0.25s ease both;
        }

        .login-submit {
          width: 100%;
          border: none;
          border-radius: 16px;
          padding: 1rem;
          cursor: pointer;
          font-family: inherit;
          font-weight: 900;
          font-size: 0.95rem;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: #0f1729;
          background: linear-gradient(135deg, #00d4ff, #0099ff);
          box-shadow: 0 12px 30px rgba(0,212,255,0.28), inset 0 1px 0 rgba(255,255,255,0.25);
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .login-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 16px 38px rgba(0,212,255,0.4), inset 0 1px 0 rgba(255,255,255,0.3);
        }

        .login-submit:active:not(:disabled) { transform: translateY(0); }

        .login-submit:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          box-shadow: none;
        }

        @media (max-width: 420px) {
          .login-card { padding: 1.7rem 1.3rem 1.5rem; border-radius: 26px; }
          .login-title { font-size: 1.6rem; letter-spacing: 2.5px; }
          .login-logo, .login-logo-fallback { width: 66px; height: 66px; }
        }
      `}</style>

      <div className="login-bg" />
      <div className="login-orb a" />
      <div className="login-orb b" />

      <div className="login-card">
        <div className="login-logo-wrap">
          <img
            className="login-logo"
            src="/pwa-192x192.png"
            alt="FUCIABOL"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
              e.currentTarget.nextSibling.style.display = 'flex'
            }}
          />
          <div className="login-logo-fallback">⚽</div>
          <h1 className="login-title">FUCIABOL</h1>
          <p className="login-subtitle">Calcetto League</p>
        </div>

        <div className="login-toggle">
          <button
            type="button"
            onClick={() => { setMode('player'); setError('') }}
            className={`login-toggle-btn ${mode === 'player' ? 'active' : ''}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            Giocatore
          </button>
          <button
            type="button"
            onClick={() => { setMode('admin'); setError('') }}
            className={`login-toggle-btn ${mode === 'admin' ? 'active' : ''}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="15" r="4"/><path d="m10.85 12.15 6.65-6.65M18 4l2 2M15 7l2 2"/></svg>
            Admin
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'player' ? (
            <div className="login-field">
              <label className="login-label">Seleziona il tuo nome</label>
              <select
                className="login-select"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                <option value="">— Scegli —</option>
                {giocatori.map(g => (
                  <option key={g.id} value={g.id}>{g.nome}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="login-field">
              <label className="login-label">PIN Admin</label>
              <input
                className="login-input"
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
              />
              <p className="login-hint">PIN demo: 1234</p>
            </div>
          )}

          {error && (
            <div className="login-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
              {error}
            </div>
          )}

          <button type="submit" className="login-submit" disabled={!canSubmit}>
            Entra
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login
