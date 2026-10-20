import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('FUCIABOL crash:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1729', color: '#fff', padding: '1.5rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
          <div style={{ textAlign: 'center', maxWidth: '360px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
            <div style={{ fontWeight: 900, fontSize: '1.2rem', marginBottom: '0.5rem' }}>Qualcosa è andato storto</div>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Riprova a ricaricare la pagina. Se il problema persiste, contatta l'admin.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{ background: 'linear-gradient(135deg, #00d4ff, #0099ff)', border: 'none', borderRadius: '12px', padding: '0.85rem 1.75rem', color: '#0f1729', fontWeight: 800, cursor: 'pointer', fontSize: '0.95rem' }}
            >
              Ricarica
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
