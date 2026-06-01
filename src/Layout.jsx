import { useState } from 'react'

function Layout({ children, currentUser, onLogout, tabs = [], activeTab, onTabChange }) {
  const [menuOpen, setMenuOpen] = useState(false)

  const isAdmin = currentUser?.role === 'admin'
  const firstName = currentUser?.nome?.split(' ')[0] || 'Admin'
  const activeLabel = tabs.find(tab => tab.id === activeTab)?.label || 'Menu'

  function goToTab(tabId) {
    if (onTabChange) onTabChange(tabId)
    setMenuOpen(false)
  }

  function logout() {
    setMenuOpen(false)
    onLogout()
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f1729',
      color: '#fff',
      position: 'relative'
    }}>
      <style>{`
        @keyframes menuDrop {
          from { opacity: 0; transform: translateY(-8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes softGlow {
          0%, 100% { box-shadow: 0 0 18px rgba(0,212,255,0.18); }
          50% { box-shadow: 0 0 28px rgba(0,212,255,0.28); }
        }
        .fuciabol-menu-item:hover {
          background: rgba(0,212,255,0.10) !important;
          border-color: rgba(0,212,255,0.24) !important;
          transform: translateX(2px);
        }
        .fuciabol-menu-button:hover {
          background: rgba(0,212,255,0.15) !important;
          border-color: rgba(0,212,255,0.35) !important;
        }
        .fuciabol-logout:hover {
          background: rgba(239,68,68,0.16) !important;
          border-color: rgba(239,68,68,0.35) !important;
        }
        @media (max-width: 640px) {
          .fuciabol-title { font-size: 1.05rem !important; letter-spacing: 1.4px !important; }
          .fuciabol-logo { width: 32px !important; height: 32px !important; }
          .fuciabol-header-inner { padding: 0 0.2rem !important; }
          .fuciabol-user-pill { display: none !important; }
          .fuciabol-menu-panel {
            position: fixed !important;
            left: 0.75rem !important;
            right: 0.75rem !important;
            top: 4.25rem !important;
            width: auto !important;
          }
          .fuciabol-main { padding: 1.25rem 0.75rem 1.75rem !important; }
        }
      `}</style>

      {/* Background */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(circle at 20% 50%, rgba(0,212,255,0.03) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,215,0,0.03) 0%, transparent 50%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Header */}
      <nav style={{
        background: 'rgba(10, 16, 30, 0.94)',
        backdropFilter: 'blur(22px)',
        borderBottom: '1px solid rgba(0,212,255,0.12)',
        padding: '0.65rem 1.25rem',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 24px rgba(0,0,0,0.45)'
      }}>
        <div
          className="fuciabol-header-inner"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            maxWidth: '1400px',
            margin: '0 auto',
            gap: '0.75rem'
          }}
        >
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
            <img
              className="fuciabol-logo"
              src="/pwa-192x192.png"
              alt="FUCIABOL"
              style={{
                width: '38px',
                height: '38px',
                objectFit: 'contain',
                borderRadius: '10px',
                filter: 'drop-shadow(0 0 10px rgba(0,212,255,0.45))'
              }}
              onError={(e) => {
                e.target.style.display = 'none'
                e.target.nextSibling.style.display = 'flex'
              }}
            />
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #00d4ff, #0099ff)',
              display: 'none',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem'
            }}>⚽</div>
            <div
              className="fuciabol-title"
              style={{
                fontSize: '1.35rem',
                fontWeight: 900,
                letterSpacing: '2.4px',
                background: 'linear-gradient(135deg, #fff 0%, #00d4ff 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                whiteSpace: 'nowrap'
              }}
            >
              FUCIABOL
            </div>
          </div>

          {/* User + Menu */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', position: 'relative' }}>
            <div
              className="fuciabol-user-pill"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.55rem',
                background: 'linear-gradient(135deg, rgba(0,212,255,0.12), rgba(0,153,255,0.06))',
                border: '1px solid rgba(0,212,255,0.22)',
                borderRadius: '999px',
                padding: '0.38rem 0.75rem 0.38rem 0.42rem',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)'
              }}
            >
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: isAdmin
                  ? 'linear-gradient(135deg, #00d4ff, #0099ff)'
                  : 'linear-gradient(135deg, #6366f1, #00d4ff)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.78rem',
                fontWeight: 900,
                letterSpacing: '0',
                color: '#0f1729',
                flexShrink: 0,
                textTransform: 'uppercase'
              }}>
                {firstName[0] || '?'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
                <span style={{ fontWeight: 800, fontSize: '0.82rem', whiteSpace: 'nowrap' }}>{firstName}</span>
                <span style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.42)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  {isAdmin ? 'Gestione' : activeLabel}
                </span>
              </div>
              {isAdmin && (
                <div style={{
                  background: 'rgba(0,212,255,0.10)',
                  border: '1px solid rgba(0,212,255,0.45)',
                  color: '#00d4ff',
                  fontSize: '0.52rem',
                  fontWeight: 900,
                  padding: '0.14rem 0.38rem',
                  borderRadius: '4px',
                  letterSpacing: '1px',
                  textTransform: 'uppercase'
                }}>
                  ADM
                </div>
              )}
            </div>

            <button
              className="fuciabol-menu-button"
              onClick={() => setMenuOpen(prev => !prev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                background: menuOpen ? 'rgba(0,212,255,0.15)' : 'rgba(255,255,255,0.045)',
                border: menuOpen ? '1px solid rgba(0,212,255,0.38)' : '1px solid rgba(255,255,255,0.09)',
                color: '#fff',
                borderRadius: '999px',
                padding: '0.48rem 0.75rem',
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: '0.78rem',
                letterSpacing: '0.4px',
                transition: 'all 0.2s ease',
                boxShadow: menuOpen ? '0 0 18px rgba(0,212,255,0.18)' : 'none'
              }}
            >
              <span style={{ fontSize: '1rem', lineHeight: 1 }}>{menuOpen ? '×' : '☰'}</span>
              <span>Menu</span>
            </button>

            {menuOpen && (
              <>
                <div
                  onClick={() => setMenuOpen(false)}
                  style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'transparent' }}
                />

                <div
                  className="fuciabol-menu-panel"
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 0.7rem)',
                    width: '310px',
                    background: 'linear-gradient(180deg, rgba(15,23,41,0.98), rgba(8,13,26,0.98))',
                    backdropFilter: 'blur(24px)',
                    border: '1px solid rgba(0,212,255,0.16)',
                    borderRadius: '22px',
                    padding: '0.8rem',
                    boxShadow: '0 24px 70px rgba(0,0,0,0.62), inset 0 1px 0 rgba(255,255,255,0.05)',
                    zIndex: 160,
                    animation: 'menuDrop 0.18s ease both'
                  }}
                >
                  <div style={{
                    padding: '0.85rem',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, rgba(0,212,255,0.12), rgba(255,255,255,0.035))',
                    border: '1px solid rgba(0,212,255,0.12)',
                    marginBottom: '0.65rem',
                    animation: 'softGlow 3s ease-in-out infinite'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.7rem' }}>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: '1rem', marginBottom: '0.18rem' }}>
                          {firstName}
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.4px' }}>
                          {isAdmin ? 'Modalità amministratore' : `Sezione attiva: ${activeLabel}`}
                        </div>
                      </div>
                      {isAdmin && (
                        <div style={{
                          background: 'rgba(0,212,255,0.10)',
                          border: '1px solid rgba(0,212,255,0.45)',
                          color: '#00d4ff',
                          borderRadius: '4px',
                          padding: '0.2rem 0.5rem',
                          fontWeight: 900,
                          fontSize: '0.58rem',
                          letterSpacing: '1px',
                          textTransform: 'uppercase'
                        }}>ADM</div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {tabs.map(tab => {
                      const active = activeTab === tab.id
                      return (
                        <button
                          key={tab.id}
                          className="fuciabol-menu-item"
                          onClick={() => goToTab(tab.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.75rem',
                            width: '100%',
                            background: active ? 'rgba(0,212,255,0.14)' : 'rgba(255,255,255,0.035)',
                            border: active ? '1px solid rgba(0,212,255,0.32)' : '1px solid rgba(255,255,255,0.055)',
                            color: active ? '#00d4ff' : 'rgba(255,255,255,0.78)',
                            borderRadius: '15px',
                            padding: '0.78rem 0.85rem',
                            cursor: 'pointer',
                            transition: 'all 0.18s ease',
                            textAlign: 'left'
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                            <span style={{
                              width: '30px',
                              height: '30px',
                              borderRadius: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: active ? 'rgba(0,212,255,0.18)' : 'rgba(255,255,255,0.04)',
                              border: active ? '1px solid rgba(0,212,255,0.25)' : '1px solid transparent',
                              fontSize: '1rem'
                            }}>
                              {tab.icon}
                            </span>
                            <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>{tab.label}</span>
                          </span>
                          {active && <span style={{ fontSize: '0.7rem', fontWeight: 900 }}>ATTIVA</span>}
                        </button>
                      )
                    })}
                  </div>

                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', margin: '0.7rem 0' }} />

                  <button
                    className="fuciabol-logout"
                    onClick={logout}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      background: 'rgba(239,68,68,0.08)',
                      border: '1px solid rgba(239,68,68,0.22)',
                      color: '#ff6b6b',
                      borderRadius: '15px',
                      padding: '0.78rem 0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.18s ease',
                      fontWeight: 900,
                      fontSize: '0.9rem'
                    }}
                  >
                    <span>🚪 Esci</span>
                    <span>→</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main
        className="fuciabol-main"
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '1.5rem 1rem',
          position: 'relative',
          zIndex: 1
        }}
      >
        {children}
      </main>
    </div>
  )
}

export default Layout
