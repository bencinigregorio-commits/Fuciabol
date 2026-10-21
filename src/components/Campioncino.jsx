import { useState } from 'react'
import { immagineCampo, nomeCampo } from '../pages/formazioni'

export default function Campioncino({ player, style = {} }) {
  const [failed, setFailed] = useState(null)
  const src = immagineCampo(player)
  const fallback = '/campioncini/guest-robot.svg'
  return <img src={failed === src ? fallback : src} alt={nomeCampo(player)} loading="lazy" decoding="async"
    onError={() => setFailed(src)} style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'bottom', ...style }} />
}
