import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { caricaAspettoGiocatori, unisciAspetto } from './campionciniData'
import { nomeCampo, avatarGuest, GUEST_AVATARS } from './formazioni'
import Campioncino from '../components/Campioncino'
import { buttonStyle } from '../components/formazioniStyles'

const inputStyle = { width: '100%', boxSizing: 'border-box', padding: 10, borderRadius: 9, border: '1px solid #ffffff25', color: '#fff', background: '#101e32', font: '14px system-ui', minHeight: 44, colorScheme: 'dark' }

export default function CampionciniAdmin({ giocatori }) {
  const [appearance, setAppearance] = useState(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  useEffect(() => {
    let active = true
    caricaAspettoGiocatori().then(({ data, error: err }) => {
      if (!active) return
      if (err) setError('Per salvare nomi e campioncini va prima eseguita la migrazione 0003 su Supabase.')
      else setAppearance(data)
    }).catch(() => { if (active) setError('Connessione non disponibile. Riapri questa sezione per riprovare.') })
    return () => { active = false }
  }, [])
  const players = unisciAspetto(giocatori, appearance || []).filter(p => p.nome.toLocaleLowerCase('it').includes(search.toLocaleLowerCase('it')))
  return <section style={{ fontFamily: 'system-ui, sans-serif' }}>
    <h2 style={{ margin: '0 0 8px', fontSize: 22 }}>I vostri campioncini</h2>
    <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6 }}>Un nome breve sul campo e un personaggio per ciascuno. Le foto e i nomi dei profili restano separati. Gli ospiti hanno quattro robot leggeri, assegnati automaticamente.</p>
    <input aria-label="Cerca campioncino" placeholder="Cerca giocatore…" value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, marginBottom: 16 }} />
    {error && <p role="status" style={{ color: '#fcd890' }}>{error}</p>}
    {!appearance && !error && <p role="status">Carico i campioncini…</p>}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 270px), 1fr))', gap: 14 }}>
      {players.map(player => <EditorCampioncino key={player.id + JSON.stringify(appearance?.find(a => a.id === player.id) || {})} player={player} enabled={Boolean(appearance)} onSaved={value => setAppearance(prev => [...prev.filter(p => p.id !== value.id), value])} />)}
    </div>
  </section>
}

function EditorCampioncino({ player, enabled, onSaved }) {
  const [label, setLabel] = useState(player.nome_campo || '')
  const [robot, setRobot] = useState(player.avatar_guest || '')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const displayed = { ...player, nome_campo: label, avatar_guest: robot, ...(preview ? { campioncino_url: preview } : {}) }
  const suggested = nomeCampo({ ...player, nome_campo: null })

  function chooseFile(event) {
    const selected = event.target.files?.[0]
    if (!selected) return
    if (!['image/png', 'image/webp', 'image/jpeg'].includes(selected.type) || selected.size > 5 * 1024 * 1024) {
      setMessage('Scegli PNG, WebP o JPEG fino a 5 MB.'); event.target.value = ''; return
    }
    const reader = new FileReader()
    reader.onload = () => { setFile(selected); setPreview(reader.result); setMessage('Anteprima pronta. Premi Salva per caricarla.') }
    reader.readAsDataURL(selected)
  }

  async function save() {
    if (busy || !enabled) return
    setBusy(true); setMessage('')
    let uploadedPath = null
    try {
      let url = player.campioncino_url || null
      if (file) {
        // Resize once on upload, preserving alpha; the field never regenerates portraits.
        const img = new Image(); img.src = preview; await img.decode()
        const scale = Math.min(1, 512 / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas'); canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
        if (!blob) throw new Error('Immagine non leggibile.')
        const path = `campioncino_${player.id}_${crypto.randomUUID()}.png`
        const { error } = await supabase.storage.from('foto-giocatori').upload(path, blob, { contentType: 'image/png' })
        if (error) throw error
        uploadedPath = path
        url = supabase.storage.from('foto-giocatori').getPublicUrl(path).data.publicUrl
      }
      const value = { nome_campo: label.trim() || null, avatar_guest: robot || null, campioncino_url: url }
      const { error } = await supabase.from('giocatori').update(value).eq('id', player.id)
      if (error) throw error
      // Keep existing files intact: replacing a campioncino must not remove the profile photo.
      onSaved({ id: player.id, ...value })
      setFile(null); setMessage('Campioncino salvato.')
    } catch (error) {
      if (uploadedPath) await supabase.storage.from('foto-giocatori').remove([uploadedPath])
      setMessage(`Salvataggio non riuscito: ${error.message}`)
    } finally { setBusy(false) }
  }

  return <article style={{ padding: 16, background: '#0b1628', border: '1px solid #ffffff18', borderRadius: 16 }}>
    <div style={{ height: 130, marginBottom: 12 }}><Campioncino player={displayed} /></div>
    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>{player.nome}{player.is_guest ? ' · Ospite' : ''}</div>
    <label style={{ display: 'block', fontSize: 12, color: '#cbd5e1' }}>Nome sul campo
      <input aria-label={`Nome sul campo ${player.nome}`} maxLength={24} value={label} placeholder={suggested} onChange={e => setLabel(e.target.value)} style={{ ...inputStyle, margin: '6px 0 12px' }} />
    </label>
    {player.is_guest ? <label style={{ display: 'block', fontSize: 12 }}>Personaggio ospite
      <select aria-label={`Personaggio ${player.nome}`} value={robot} onChange={e => setRobot(e.target.value)} style={{ ...inputStyle, margin: '6px 0 12px' }}>
        <option value="">Automatico ({avatarGuest(player)})</option>{GUEST_AVATARS.map(name => <option key={name} value={name}>{name}</option>)}
      </select></label> : <label style={{ ...buttonStyle, display: 'block', marginBottom: 12, textAlign: 'center' }}>
        {file ? 'Cambia anteprima' : 'Scegli campioncino'}<input aria-label={`Immagine campioncino ${player.nome}`} type="file" accept="image/png,image/webp,image/jpeg" disabled={!enabled || busy} onChange={chooseFile} style={{ display: 'none' }} />
      </label>}
    <div style={{ color: '#64e1ff', fontWeight: 800, margin: '8px 0 12px' }}>{nomeCampo(displayed)}</div>
    <button style={{ ...buttonStyle, width: '100%', opacity: enabled ? 1 : 0.4 }} onClick={save} disabled={!enabled || busy}>{busy ? 'Salvataggio…' : 'Salva campioncino'}</button>
    {message && <p role="status" style={{ color: '#fcd890', fontSize: 12 }}>{message}</p>}
  </article>
}
