function Layout({ children, currentUser, onLogout }) {
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#0f1729',
      color: '#fff',
      position: 'relative'
    }}>
      {/* Background */}
      <div style={{
        position: 'fixed', inset: 0,
        background: 'radial-gradient(circle at 20% 50%, rgba(0,212,255,0.03) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,215,0,0.03) 0%, transparent 50%)',
        pointerEvents: 'none', zIndex: 0
      }} />

      {/* Header */}
      <nav style={{ 
        background: 'rgba(10, 16, 30, 0.92)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,212,255,0.1)',
        padding: '0.6rem 1.25rem',
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 2px 20px rgba(0,0,0,0.4)'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          maxWidth: '1400px',
          margin: '0 auto'
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <img
              src="/pwa-192x192.png"
              alt="FUCIABOL"
              style={{
                width: '36px', height: '36px',
                objectFit: 'contain',
                borderRadius: '8px',
                filter: 'drop-shadow(0 0 8px rgba(0,212,255,0.4))'
              }}
              onError={(e) => {
                e.target.style.display = 'none'
                e.target.nextSibling.style.display = 'flex'
              }}
            />
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #00d4ff, #0099ff)',
              display: 'none', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.2rem'
            }}>⚽</div>
            <div style={{ 
              fontSize: '1.3rem', fontWeight: 900, letterSpacing: '2px',
              background: 'linear-gradient(135deg, #fff 0%, #00d4ff 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              FUCIABOL
            </div>
          </div>

          {/* User + Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {/* User pill */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: 'rgba(0,212,255,0.08)',
              border: '1px solid rgba(0,212,255,0.2)',
              borderRadius: '20px',
              padding: '0.35rem 0.85rem 0.35rem 0.4rem'
            }}>
              <div style={{
                width: '26px', height: '26px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #00d4ff, #0099ff)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.8rem', flexShrink: 0
              }}>
                {currentUser?.role === 'admin' ? '⚡' : '👤'}
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                {currentUser?.nome?.split(' ')[0] || 'Admin'}
              </div>
              {currentUser?.role === 'admin' && (
                <div style={{
                  background: 'linear-gradient(135deg, #ffd700, #ffa500)',
                  color: '#0f1729', fontSize: '0.6rem', fontWeight: 800,
                  padding: '0.15rem 0.4rem', borderRadius: '6px', letterSpacing: '0.5px'
                }}>
                  ADMIN
                </div>
              )}
            </div>

            {/* Logout */}
            <button
              onClick={onLogout}
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: '20px',
                padding: '0.35rem 0.85rem',
                color: '#ef4444',
                fontWeight: 700, fontSize: '0.8rem',
                cursor: 'pointer', transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(239,68,68,0.18)'
                e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(239,68,68,0.08)'
                e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)'
              }}
            >
              ESCI
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main style={{ 
        maxWidth: '1400px', margin: '0 auto', padding: '1.5rem 1rem',
        position: 'relative', zIndex: 1
      }}>
        {children}
      </main>
    </div>
  )
}

export default Layout
