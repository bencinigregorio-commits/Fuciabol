import { useState, useEffect } from 'react'
import Layout from './Layout'
import Dashboard from './pages/Dashboard'
import Calendario from './pages/Calendario'
import Statistiche from './pages/Statistiche'
import Classifica from './pages/Classifica'
import Scommesse from './pages/Scommesse'
import Admin from './pages/Admin'
import { supabase } from './supabase'

function TabButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.3rem',
        padding: '0.6rem 0.25rem',
        border: 'none',
        cursor: 'pointer',
        background: 'transparent',
        position: 'relative',
        transition: 'all 0.2s',
        minWidth: '60px',
      }}
    >
      {/* Indicatore attivo - pillola sopra */}
      {active && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '32px',
          height: '3px',
          borderRadius: '0 0 4px 4px',
          background: 'linear-gradient(90deg, #00d4ff, #0099ff)',
          boxShadow: '0 0 8px rgba(0,212,255,0.6)',
        }} />
      )}

      {/* Cerchio glow dietro icona quando attivo */}
      <div style={{
        width: '42px',
        height: '42px',
        borderRadius: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.3rem',
        background: active
          ? 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(0,153,255,0.15))'
          : 'transparent',
        border: active
          ? '1px solid rgba(0,212,255,0.3)'
          : '1px solid transparent',
        boxShadow: active ? '0 4px 15px rgba(0,212,255,0.2)' : 'none',
        transition: 'all 0.2s',
        transform: active ? 'scale(1.05)' : 'scale(1)',
      }}>
        {icon}
      </div>

      {/* Label */}
      <span style={{
        fontSize: '0.65rem',
        fontWeight: active ? 700 : 500,
        color: active ? '#00d4ff' : 'rgba(255,255,255,0.45)',
        letterSpacing: '0.3px',
        transition: 'all 0.2s',
        whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
    </button>
  )
}


function LoginScreen({ pin, setPin, handleLogin }) {
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleKey(val) {
    if (val === 'del') {
      setPin(prev => prev.slice(0, -1))
      setError(false)
      return
    }
    if (pin.length >= 6) return
    const newPin = pin + val
    setPin(newPin)
    setError(false)
    if (newPin.length >= 4) {
      setLoading(true)
      try {
        await handleLogin(newPin)
      } catch(e) {
        setError(true)
        setTimeout(() => { setPin(''); setError(false) }, 800)
      }
      setLoading(false)
    }
  }

  const keys = [['1','2','3'],['4','5','6'],['7','8','9'],['','0','del']]

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0f1e',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes bgPulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        @keyframes fadeInLogin {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes glowLogo {
          0%, 100% { filter: drop-shadow(0 0 20px rgba(0,212,255,0.6)) drop-shadow(0 0 40px rgba(0,212,255,0.3)); }
          50% { filter: drop-shadow(0 0 40px rgba(0,212,255,0.9)) drop-shadow(0 0 80px rgba(0,212,255,0.5)); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
        @keyframes dotPop {
          0% { transform: scale(0.8); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
        .key-btn:active { transform: scale(0.92) !important; }
      `}</style>

      {/* Sfondo animato */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '10%', left: '15%', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(0,212,255,0.06)', animation: 'bgPulse 4s ease-in-out infinite', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', bottom: '15%', right: '10%', width: '250px', height: '250px', borderRadius: '50%', background: 'rgba(255,215,0,0.05)', animation: 'bgPulse 5s ease-in-out infinite 1s', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '500px', height: '500px', borderRadius: '50%', background: 'rgba(0,212,255,0.03)', animation: 'bgPulse 6s ease-in-out infinite 0.5s', filter: 'blur(60px)' }} />
      </div>

      {/* Card login */}
      <div style={{
        width: '100%',
        maxWidth: '380px',
        padding: '2rem 1.5rem',
        position: 'relative',
        zIndex: 1,
        animation: 'fadeInLogin 0.6s ease',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2rem',
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center' }}>
          <img
            src="/pwa-192x192.png"
            alt="FUCIABOL"
            style={{
              width: '120px',
              height: '120px',
              objectFit: 'contain',
              animation: 'glowLogo 3s ease-in-out infinite',
              marginBottom: '1rem',
            }}
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <div style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '3px', color: '#fff', textShadow: '0 0 20px rgba(0,212,255,0.5)' }}>FUCIABOL</div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '2px', marginTop: '0.25rem' }}>INSERISCI IL TUO PIN</div>
        </div>

        {/* Dots PIN */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          animation: error ? 'shake 0.5s ease' : 'none',
        }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: pin.length > i
                ? (error ? '#ef4444' : '#00d4ff')
                : 'rgba(255,255,255,0.15)',
              border: `2px solid ${pin.length > i ? (error ? '#ef4444' : '#00d4ff') : 'rgba(255,255,255,0.2)'}`,
              boxShadow: pin.length > i ? `0 0 12px ${error ? 'rgba(239,68,68,0.6)' : 'rgba(0,212,255,0.6)'}` : 'none',
              transition: 'all 0.2s',
              animation: pin.length === i + 1 ? 'dotPop 0.2s ease' : 'none',
            }} />
          ))}
        </div>

        {/* Tastierino */}
        <div style={{
          background: 'rgba(15,23,41,0.8)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(0,212,255,0.15)',
          borderRadius: '24px',
          padding: '1.5rem',
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
            {keys.flat().map((k, i) => (
              <button
                key={i}
                className="key-btn"
                onClick={() => k && handleKey(k)}
                disabled={loading}
                style={{
                  height: '64px',
                  borderRadius: '16px',
                  border: 'none',
                  cursor: k ? 'pointer' : 'default',
                  background: k === 'del'
                    ? 'rgba(239,68,68,0.15)'
                    : k === ''
                    ? 'transparent'
                    : 'rgba(255,255,255,0.06)',
                  color: k === 'del' ? '#ef4444' : '#fff',
                  fontSize: k === 'del' ? '1.3rem' : '1.6rem',
                  fontWeight: 700,
                  transition: 'all 0.15s',
                  boxShadow: k && k !== 'del' ? 'inset 0 1px 0 rgba(255,255,255,0.08)' : 'none',
                  outline: 'none',
                }}
                onMouseOver={(e) => { if (k && k !== '') e.target.style.background = k === 'del' ? 'rgba(239,68,68,0.25)' : 'rgba(0,212,255,0.15)' }}
                onMouseOut={(e) => { if (k && k !== '') e.target.style.background = k === 'del' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)' }}
              >
                {k === 'del' ? '⌫' : k}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div style={{ fontSize: '0.85rem', color: 'rgba(0,212,255,0.7)', letterSpacing: '1px' }}>
            ACCESSO IN CORSO...
          </div>
        )}
        {error && (
          <div style={{ fontSize: '0.85rem', color: '#ef4444', letterSpacing: '1px' }}>
            PIN NON VALIDO
          </div>
        )}
      </div>
    </div>
  )
}

function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [activeTab, setActiveTab] = useState('calendario')
  const [pin, setPin] = useState('')
  const [showLogin, setShowLogin] = useState(true)

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser')
    if (savedUser) {
      const user = JSON.parse(savedUser)
      setCurrentUser(user)
      setShowLogin(false)
      setActiveTab(user.role === 'player' ? 'dashboard' : 'calendario')
    }
  }, [])

  async function handleLogin(pinValue) {
    const pinToCheck = pinValue || pin
    if (pinToCheck === '1234') {
      const adminUser = { nome: 'Admin', role: 'admin' }
      setCurrentUser(adminUser)
      localStorage.setItem('currentUser', JSON.stringify(adminUser))
      setShowLogin(false)
      setActiveTab('calendario')
      setPin('')
      return
    }

    const { data } = await supabase.from('giocatori').select('*').eq('pin', pinToCheck).single()

    if (data) {
      const user = { id: data.id, nome: data.nome, role: 'player' }
      setCurrentUser(user)
      localStorage.setItem('currentUser', JSON.stringify(user))
      setShowLogin(false)
      setActiveTab('dashboard')
      setPin('')
    } else {
      throw new Error('PIN non valido')
    }
  }

  function handleLogout() {
    setCurrentUser(null)
    localStorage.removeItem('currentUser')
    setShowLogin(true)
    setActiveTab('calendario')
  }

  if (showLogin) {
    return <LoginScreen pin={pin} setPin={setPin} handleLogin={handleLogin} />
  }

  const tabs = [
    ...(currentUser?.role === 'player' ? [{ id: 'dashboard', icon: '🏠', label: 'Dashboard' }] : []),
    { id: 'calendario', icon: '📅', label: 'Calendario' },
    { id: 'statistiche', icon: '📊', label: 'Stats' },
    { id: 'classifica', icon: '🏆', label: 'Classifica' },
    { id: 'scommesse', icon: '🎰', label: 'Scommesse' },
    ...(currentUser?.role === 'admin' ? [{ id: 'admin', icon: '⚙️', label: 'Admin' }] : []),
  ]

  return (
    <Layout
      currentUser={currentUser}
      onLogout={handleLogout}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {activeTab === 'dashboard' && <Dashboard currentUser={currentUser} />}
      {activeTab === 'calendario' && <Calendario currentUser={currentUser} />}
      {activeTab === 'statistiche' && <Statistiche />}
      {activeTab === 'classifica' && <Classifica />}
      {activeTab === 'scommesse' && <Scommesse />}
      {activeTab === 'admin' && <Admin />}
    </Layout>
  )
}

export default App
