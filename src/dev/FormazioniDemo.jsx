import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import FormazioniCampo from '../components/FormazioniCampo'

const players = [
  { id: 1, nome: 'Gregorio Bencini', ruolo: 'DC/ATT' },
  { id: 2, nome: 'Il Maestro', ruolo: 'CC' },
  { id: 3, nome: 'Jack', ruolo: 'DC' },
  { id: 4, nome: 'Pietro Matteoni', ruolo: 'POR/CC' },
  { id: 5, nome: 'Mattia Lovino', ruolo: 'ATT' },
  ...Array.from({ length: 5 }, (_, i) => ({ id: i + 6, nome: `Ospite ${i + 1}`, ruolo: ['POR', 'DC', 'DC', 'ATT', 'ATT'][i], is_guest: true })),
]
function Demo() {
  const [formation, setFormation] = useState({})
  const [noKeeper, setNoKeeper] = useState(false)
  const [incomplete, setIncomplete] = useState(false)
  const partita = { id: 'demo', data: '2026-10-29', ora: '22:00', luogo: 'Spes Artiglio', formato: '5v5', squadra_a: [1,2,3,4,5], squadra_b: incomplete ? [6,7,8] : [6,7,8,9,10], formazione: formation }
  return <main style={{ maxWidth: 650, padding: '24px 12px', margin: 'auto', color: '#fff', fontFamily: 'system-ui' }}>
    <div style={{ fontWeight: 900, color: '#64e1ff', letterSpacing: 3 }}>FUCIABOL</div>
    <h1 style={{ fontSize: 24 }}>Anteprima delle formazioni</h1><p style={{ color: '#94a3b8', fontSize: 13 }}>Dati dimostrativi. Nessuna modifica al database.</p>
    <label style={{ display: 'block', padding: 8 }}><input type="checkbox" checked={noKeeper} onChange={e => setNoKeeper(e.target.checked)} /> Prova senza portiere</label>
    <label style={{ display: 'block', padding: 8 }}><input type="checkbox" checked={incomplete} onChange={e => setIncomplete(e.target.checked)} /> Prova squadra incompleta</label>
    <FormazioniCampo partita={partita} giocatori={noKeeper ? players.map(p => ({ ...p, ruolo: p.ruolo.replace(/POR/g, 'CC') })) : players} isAdmin onSave={async value => setFormation(value)} />
  </main>
}
createRoot(document.getElementById('root')).render(<Demo />)
