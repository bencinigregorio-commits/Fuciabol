function Layout({ children, currentUser, onLogout }) {
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#0f1729',
      color: '#fff',
      position: 'relative'
    }}>
      {/* Background con effetto stelle */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(circle at 20% 50%, rgba(0, 212, 255, 0.03) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255, 215, 0, 0.03) 0%, transparent 50%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Header */}
      <nav style={{ 
        background: 'rgba(15, 23, 41, 0.8)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        padding: '1rem 2rem',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          maxWidth: '1400px',
          margin: '0 auto'
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #00d4ff, #0099ff)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem'
            }}>
              ⚽
            </div>
            <div style={{ 
              fontSize: '1.5rem', 
              fontWeight: 900,
              letterSpacing: '0.5px'
            }}>
              FUCIABOL
            </div>
          </div>

          {/* User Info + Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              background: 'rgba(0, 212, 255, 0.1)',
              border: '1px solid rgba(0, 212, 255, 0.3)',
              borderRadius: '25px',
              padding: '0.5rem 1.25rem'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #00d4ff, #0099ff)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem'
              }}>
                👤
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                {currentUser?.nome?.split(' ')[0] || 'Admin'}
              </div>
              {currentUser?.role === 'admin' && (
                <div style={{
                  background: 'linear-gradient(135deg, #ffd700, #ffa500)',
                  color: '#0f1729',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.25rem 0.5rem',
                  borderRadius: '10px'
                }}>
                  ⚡
                </div>
              )}
            </div>
            <button
              onClick={onLogout}
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '25px',
                padding: '0.5rem 1.25rem',
                color: '#ef4444',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.target.style.background = 'rgba(239, 68, 68, 0.2)'
                e.target.style.borderColor = 'rgba(239, 68, 68, 0.5)'
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'rgba(239, 68, 68, 0.1)'
                e.target.style.borderColor = 'rgba(239, 68, 68, 0.3)'
              }}
            >
              ESCI
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main style={{ 
        maxWidth: '1400px', 
        margin: '0 auto', 
        padding: '2rem',
        position: 'relative',
        zIndex: 1
      }}>
        {children}
      </main>
    </div>
  )
}

export default Layout
