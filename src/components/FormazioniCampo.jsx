import { useState } from 'react'
import Campioncino from './Campioncino'
import { creaFormazione, coordinateCampo, nomeCampo, ROLE_LABELS } from '../pages/formazioni'

import { buttonStyle } from './formazioniStyles'

export default function FormazioniCampo({ partita, giocatori, isAdmin = false, onSave }) {
  const [overrides, setOverrides] = useState(partita.formazione || {})
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(false)
  const [poster, setPoster] = useState(null)
  const [message, setMessage] = useState('')
  const formation = creaFormazione(partita, giocatori, overrides)
  const rosterReady = [...(partita.squadra_a || []), ...(partita.squadra_b || [])].every(id => giocatori.some(p => String(p.id) === String(id)))
  const signature = JSON.stringify([partita, giocatori, overrides])
  const currentPoster = poster?.signature === signature ? poster : null

  function changeRole(id, role) {
    setOverrides(prev => { const next = { ...prev }; if (role) next[id] = role; else delete next[id]; return next })
    setMessage('')
  }

  async function save() {
    setSaving(true)
    try {
      await onSave(overrides)
      setMessage('Disposizione salvata per questa partita.')
      setEditing(false)
    } catch (error) { setMessage(error.message) }
    finally { setSaving(false) }
  }

  async function preparePoster() {
    setBusy(true); setMessage('')
    try {
      const { generaLocandina } = await import('../pages/formazioneCard')
      const blob = await generaLocandina(partita, giocatori, overrides)
      const file = new File([blob], `fuciabol-formazioni-${partita.data}.png`, { type: 'image/png' })
      const reader = new FileReader()
      const dataUrl = await new Promise((resolve, reject) => { reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob) })
      setPoster({ file, dataUrl, signature })
    } catch { setMessage('Non riesco a preparare la locandina. Riprova.') }
    finally { setBusy(false) }
  }

  async function share() {
    try { await navigator.share({ files: [currentPoster.file], title: 'FUCIABOL · Le formazioni', text: 'Le formazioni ufficiali ⚽' }) }
    catch (error) { if (error.name !== 'AbortError') setMessage('Condivisione non disponibile: scarica la locandina e allegala su WhatsApp.') }
  }

  const hasDraft = JSON.stringify(overrides) !== JSON.stringify(partita.formazione || {})
  return <section aria-label="Formazioni sul campo" style={{ marginTop: 16, fontFamily: 'system-ui, sans-serif' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
      <div><h3 style={{ margin: 0, fontSize: 17, color: '#fff' }}>Le formazioni</h3><p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>I vostri campioncini, ognuno al suo posto.</p></div>
      {isAdmin && <button style={buttonStyle} onClick={() => setEditing(!editing)} aria-expanded={editing}>{editing ? 'Chiudi ruoli' : 'Disponi giocatori'}</button>}
    </div>
    <div style={{ maxWidth: 480, margin: '0 auto', border: '1px solid #ffffff20', borderRadius: 20, padding: 10, background: '#09172a', boxShadow: '0 16px 40px #0004' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 8px 12px', fontSize: 12, fontWeight: 800 }}>
        <span style={{ color: '#ff9a76' }}>SQUADRA B · {formation.B.count}/{formation.B.size}</span>
        <span style={{ color: '#60ddff' }}>SQUADRA A · {formation.A.count}/{formation.A.size}</span>
      </div>
      <div style={{ position: 'relative', width: '100%', boxSizing: 'border-box', aspectRatio: formation.A.size > 5 ? '0.43' : '0.54', minHeight: formation.A.size > 5 ? 1000 : 620, borderRadius: 12, overflow: 'hidden', background: 'repeating-linear-gradient(0deg, #154c3d 0%, #154c3d 10%, #185441 10%, #185441 20%)' }}>
        <svg aria-hidden="true" viewBox="0 0 100 185" preserveAspectRatio="none" style={{ position: 'absolute', inset: '2%', width: '96%', height: '96%', fill: 'none', stroke: '#d8fff370', strokeWidth: 0.55 }}>
          <rect x="1" y="1" width="98" height="183" rx="1"/><path d="M1 92.5h98"/><circle cx="50" cy="92.5" r="13"/><circle cx="50" cy="92.5" r=".7" fill="#d8fff3"/>
          <path d="M23 1v26h54V1M36 1v10h28V1M23 184v-26h54v26M36 184v-10h28v10"/><path d="M40 1V0h20v1M40 184v1h20v-1" strokeWidth="2"/>
        </svg>
        {['B', 'A'].flatMap(team => formation[team].players.map(item => {
          const position = coordinateCampo(item, team)
          const color = team === 'A' ? '#60ddff' : '#ff9a76'
          return <div key={`${team}-${item.player.id}`} data-player-id={item.player.id} data-team={team} style={{ position: 'absolute', left: `${position.x * 100}%`, top: `${position.y * 100}%`, transform: 'translate(-50%, -50%)', width: '27%', maxWidth: 112, textAlign: 'center' }}>
            <div style={{ height: 'clamp(42px, 11vw, 64px)', filter: 'drop-shadow(0 4px 3px #0008)' }}><Campioncino player={item.player} /></div>
            <div title={nomeCampo(item.player)} style={{ background: '#071322ed', border: `1px solid ${color}99`, borderRadius: 7, color: '#fff', fontSize: 'clamp(10px, 2.7vw, 12px)', fontWeight: 800, lineHeight: '20px', padding: '0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nomeCampo(item.player)}</div>
            <div style={{ position: 'absolute', top: 0, right: '8%', color, background: '#071322dd', borderRadius: 4, padding: '1px 3px', fontSize: 8, fontWeight: 800, lineHeight: '12px' }}>{item.role}</div>
          </div>
        }))}
      </div>
      {['B', 'A'].map(team => <div key={team} style={{ color: team === 'A' ? '#60ddff' : '#ff9a76', fontSize: 11, padding: '8px 4px 0' }}>
        Squadra {team}: {formation[team].count}/{formation[team].size}{formation[team].vacancies ? ` · ${formation[team].vacancies} posti liberi` : ''}{!formation[team].hasKeeper && formation[team].count > 0 ? ' · Portiere a turno' : ''}
      </div>)}
    </div>
    {editing && <div style={{ marginTop: 12, padding: 14, borderRadius: 14, background: '#ffffff06', border: '1px solid #ffffff15' }}>
      <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 0 }}>Scegli il ruolo per questa partita. Automatico considera anche i doppi ruoli; al massimo un portiere per squadra.</p>
      {['A', 'B'].map(team => <fieldset key={team} style={{ border: 0, padding: 0, margin: '12px 0' }}><legend style={{ fontSize: 12, fontWeight: 800, color: team === 'A' ? '#60ddff' : '#ff9a76' }}>Squadra {team}</legend>
        {formation[team].players.map(({ player }) => <label key={player.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '6px 0', fontSize: 13, color: '#fff' }}>
          {nomeCampo(player)}<select aria-label={`Ruolo ${nomeCampo(player)}`} value={overrides[player.id] || ''} onChange={e => changeRole(player.id, e.target.value)} style={{ ...buttonStyle, maxWidth: 180, background: '#101e32', colorScheme: 'dark' }}>
            <option value="">Automatico ({player.ruolo || 'CC'})</option>{Object.entries(ROLE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select></label>)}
      </fieldset>)}
      <button style={buttonStyle} disabled={saving || !hasDraft} onClick={save}>{saving ? 'Salvataggio…' : 'Salva disposizione'}</button>
      <button style={{ ...buttonStyle, marginLeft: 8 }} onClick={() => { setOverrides(partita.formazione || {}); setMessage('') }}>Annulla modifiche</button>
    </div>}
    {hasDraft && <p style={{ color: '#fbbf24', fontSize: 12 }}>Anteprima delle modifiche: salva la disposizione per renderla visibile agli altri.</p>}
    <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <button style={{ ...buttonStyle, flex: 1, color: '#76efad', borderColor: '#25d36660', background: '#25d36615' }} disabled={busy || !rosterReady} onClick={preparePoster}>{!rosterReady ? 'Carico i giocatori…' : busy ? 'Preparo la locandina…' : currentPoster ? 'Aggiorna locandina' : 'Prepara locandina WhatsApp'}</button>
    </div>
    {currentPoster && <div style={{ marginTop: 12 }}>
      <img src={currentPoster.dataUrl} alt="Anteprima della locandina con le formazioni" style={{ width: '100%', maxWidth: 360, borderRadius: 12, display: 'block', margin: '0 auto 12px' }} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {navigator.canShare?.({ files: [currentPoster.file] }) && <button style={buttonStyle} onClick={share}>Condividi immagine</button>}
        <a href={currentPoster.dataUrl} download={currentPoster.file.name} style={{ ...buttonStyle, textDecoration: 'none', boxSizing: 'border-box' }}>Scarica locandina</a>
      </div><p style={{ fontSize: 12, color: '#94a3b8' }}>Sul telefono scegli WhatsApp dal menu di condivisione, oppure allega l’immagine scaricata.</p>
    </div>}
    {message && <p role="status" style={{ color: '#fcd890', fontSize: 13 }}>{message}</p>}
  </section>
}
