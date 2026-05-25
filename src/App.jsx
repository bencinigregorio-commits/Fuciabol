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

  async function handleLogin() {
    if (pin === '1234') {
      const adminUser = { nome: 'Admin', role: 'admin' }
      setCurrentUser(adminUser)
      localStorage.setItem('currentUser', JSON.stringify(adminUser))
      setShowLogin(false)
      setActiveTab('calendario')
      setPin('')
      return
    }

    const { data } = await supabase.from('giocatori').select('*').eq('pin', pin).single()

    if (data) {
      const user = { id: data.id, nome: data.nome, role: 'player' }
      setCurrentUser(user)
      localStorage.setItem('currentUser', JSON.stringify(user))
      setShowLogin(false)
      setActiveTab('dashboard')
      setPin('')
    } else {
      alert('PIN non valido')
    }
  }

  function handleLogout() {
    setCurrentUser(null)
    localStorage.removeItem('currentUser')
    setShowLogin(true)
    setActiveTab('calendario')
  }

  if (showLogin) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0f1729',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        position: 'relative'
      }}>
        <div style={{
          position: 'fixed', inset: 0,
          background: 'radial-gradient(circle at 20% 50%, rgba(0,212,255,0.05) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,215,0,0.05) 0%, transparent 50%)',
          pointerEvents: 'none'
        }} />
        <div style={{
          background: 'rgba(15,23,41,0.8)',
          backdropFilter: 'blur(10px)',
          padding: '3rem',
          borderRadius: '20px',
          maxWidth: '400px',
          width: '90%',
          border: '1px solid rgba(0,212,255,0.2)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          position: 'relative',
          zIndex: 1
        }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              width: '80px', height: '80px',
              margin: '0 auto 1rem',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #00d4ff, #0099ff)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2.5rem',
              boxShadow: '0 8px 30px rgba(0,212,255,0.3)'
            }}>⚽</div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.5rem', letterSpacing: '0.5px' }}>FUCIABOL</h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>Sistema di valutazione dinamica</p>
          </div>

          <input
            type="password"
            placeholder="Inserisci PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            style={{
              width: '100%',
              background: 'rgba(0,0,0,0.3)',
              border: '2px solid rgba(0,212,255,0.3)',
              borderRadius: '12px',
              padding: '1rem',
              fontSize: '1.5rem',
              color: '#fff',
              textAlign: 'center',
              marginBottom: '1.5rem',
              outline: 'none',
              transition: 'all 0.3s',
              letterSpacing: '0.3rem'
            }}
            onFocus={(e) => e.target.style.borderColor = '#00d4ff'}
            onBlur={(e) => e.target.style.borderColor = 'rgba(0,212,255,0.3)'}
          />

          <button
            onClick={handleLogin}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #00d4ff, #0099ff)',
              border: 'none',
              borderRadius: '12px',
              padding: '1rem',
              fontSize: '1.1rem',
              fontWeight: 700,
              color: '#0f1729',
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(0,212,255,0.4)',
              transition: 'all 0.3s'
            }}
            onMouseOver={(e) => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 6px 30px rgba(0,212,255,0.6)' }}
            onMouseOut={(e) => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 20px rgba(0,212,255,0.4)' }}
          >
            ACCEDI
          </button>
        </div>
      </div>
    )
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
    <Layout currentUser={currentUser} onLogout={handleLogout}>
      {/* NAV BAR stile app */}
      <div style={{
        background: 'rgba(10, 16, 30, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: '20px',
        padding: '0.25rem 0.5rem',
        marginBottom: '2rem',
        display: 'flex',
        gap: '0.25rem',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        overflowX: 'auto',
        scrollbarWidth: 'none',
      }}>
        {tabs.map(tab => (
          <TabButton
            key={tab.id}
            active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            icon={tab.icon}
            label={tab.label}
          />
        ))}
      </div>

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
