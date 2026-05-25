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

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold mb-6 text-center">⚽ Calcetto League</h1>
        
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMode('player')}
            className={`flex-1 py-2 px-4 rounded ${mode === 'player' ? 'bg-blue-500' : 'bg-gray-700'}`}
          >
            👤 Giocatore
          </button>
          <button
            onClick={() => setMode('admin')}
            className={`flex-1 py-2 px-4 rounded ${mode === 'admin' ? 'bg-blue-500' : 'bg-gray-700'}`}
          >
            🔑 Admin
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'player' ? (
            <div className="mb-4">
              <label className="block text-sm mb-2">Seleziona il tuo nome</label>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full bg-gray-700 rounded px-3 py-2"
              >
                <option value="">— Scegli —</option>
                {giocatori.map(g => (
                  <option key={g.id} value={g.id}>{g.nome}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="mb-4">
              <label className="block text-sm mb-2">PIN Admin</label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                className="w-full bg-gray-700 rounded px-3 py-2"
              />
              <p className="text-xs text-gray-500 mt-1">PIN demo: 1234</p>
            </div>
          )}

          {error && <div className="text-red-400 text-sm mb-4">{error}</div>}

          <button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-600 py-2 px-4 rounded font-bold"
          >
            ENTRA
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login