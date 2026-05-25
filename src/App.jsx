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
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        padding: '0.75rem 1.5rem',
        borderRadius: '12px',
        border: 'none',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '0.95rem',
        transition: 'all 0.2s',
        background: active 
          ? 'linear-gradient(135deg, #00d4ff, #0099ff)'
          : 'transparent',
        color: active ? '#0f1729' : 'rgba(255, 255, 255, 0.7)',
        boxShadow: active ? '0 4px 15px rgba(0, 212, 255, 0.3)' : 'none'
      }}
      onMouseOver={(e) => {
        if (!active) {
          e.target.style.background = 'rgba(255, 255, 255, 0.05)'
          e.target.style.color = '#fff'
        }
      }}
      onMouseOut={(e) => {
        if (!active) {
          e.target.style.background = 'transparent'
          e.target.style.color = 'rgba(255, 255, 255, 0.7)'
        }
      }}
    >
      <span style={{ fontSize: '1.1rem' }}>{icon}</span>
      <span>{label}</span>
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

    const { data } = await supabase
      .from('giocatori')
      .select('*')
      .eq('pin', pin)
      .single()

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
          position: 'fixed',
          inset: 0,
          background: 'radial-gradient(circle at 20% 50%, rgba(0, 212, 255, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255, 215, 0, 0.05) 0%, transparent 50%)',
          pointerEvents: 'none'
        }} />
        <div style={{
          background: 'rgba(15, 23, 41, 0.8)',
          backdropFilter: 'blur(10px)',
          padding: '3rem',
          borderRadius: '20px',
          maxWidth: '400px',
          width: '90%',
          border: '1px solid rgba(0, 212, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          position: 'relative',
          zIndex: 1
        }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 1rem',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #00d4ff, #0099ff)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
              boxShadow: '0 8px 30px rgba(0, 212, 255, 0.3)'
            }}>
              ⚽
            </div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.5rem', letterSpacing: '0.5px' }}>
              FUCIABOL
            </h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.9rem' }}>
              Sistema di valutazione dinamica
            </p>
          </div>
          
          <input
            type="password"
            placeholder="Inserisci PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            style={{
              width: '100%',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '2px solid rgba(0, 212, 255, 0.3)',
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
            onBlur={(e) => e.target.style.borderColor = 'rgba(0, 212, 255, 0.3)'}
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
              boxShadow: '0 4px 20px rgba(0, 212, 255, 0.4)',
              transition: 'all 0.3s'
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'translateY(-2px)'
              e.target.style.boxShadow = '0 6px 30px rgba(0, 212, 255, 0.6)'
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)'
              e.target.style.boxShadow = '0 4px 20px rgba(0, 212, 255, 0.4)'
            }}
          >
            ACCEDI
          </button>
        </div>
      </div>
    )
  }

  return (
    <Layout currentUser={currentUser} onLogout={handleLogout}>
      <div style={{ 
        background: 'rgba(15, 23, 41, 0.6)',
        borderRadius: '15px',
        padding: '0.5rem',
        marginBottom: '2rem',
        display: 'flex',
        gap: '0.5rem',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        overflowX: 'auto'
      }}>
        {currentUser?.role === 'player' && (
          <TabButton
            active={activeTab === 'dashboard'}
            onClick={() => setActiveTab('dashboard')}
            icon="🏠"
            label="Dashboard"
          />
        )}
        <TabButton
          active={activeTab === 'calendario'}
          onClick={() => setActiveTab('calendario')}
          icon="📅"
          label="Calendario"
        />
        <TabButton
          active={activeTab === 'statistiche'}
          onClick={() => setActiveTab('statistiche')}
          icon="📊"
          label="Statistiche"
        />
        <TabButton
          active={activeTab === 'classifica'}
          onClick={() => setActiveTab('classifica')}
          icon="🏆"
          label="Classifica"
        />
        <TabButton
          active={activeTab === 'scommesse'}
          onClick={() => setActiveTab('scommesse')}
          icon="🎰"
          label="Scommesse"
        />
        {currentUser?.role === 'admin' && (
          <TabButton
            active={activeTab === 'admin'}
            onClick={() => setActiveTab('admin')}
            icon="⚙️"
            label="Admin"
          />
        )}
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