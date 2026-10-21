export const ROLE_LABELS = { POR: 'Portiere', DC: 'Difensore', CC: 'Centrocampista', ATT: 'Attaccante' }
export const GUEST_AVATARS = ['robot', 'androide', 'cyborg', 'replicante']

export function nomeCampo(player = {}) {
  if (player.nome_campo?.trim()) return player.nome_campo.trim()
  const clean = (player.nome || '').replace(/\s*\([^)]*\)/g, '').trim().replace(/\s+/g, ' ')
  if (!clean) return 'Giocatore'
  if (player.is_guest) return clean
  const quoted = clean.match(/["“]([^"”]+)["”]/)
  if (quoted) return quoted[1]
  const withoutTitle = clean.replace(/^(?:(?:il|lo|la|don)\s+|l[’'])/i, '')
  const parts = withoutTitle.split(' ')
  if (parts.length === 1) return parts[0]
  // Preserve common compound surnames; admin can override every label.
  const penultimate = parts.at(-2)
  return /^(de|di|del|della|delle|dello|da|dal|lo|la)$/i.test(penultimate)
    ? parts.slice(-2).join(' ') : parts.at(-1)
}

export function avatarGuest(player = {}) {
  if (GUEST_AVATARS.includes(player.avatar_guest)) return player.avatar_guest
  const seed = String(player.id ?? player.nome ?? 'guest')
  const hash = [...seed].reduce((sum, c) => (sum * 31 + c.charCodeAt(0)) >>> 0, 0)
  return GUEST_AVATARS[hash % GUEST_AVATARS.length]
}

export function immagineCampo(player = {}) {
  if (player.is_guest) return `/campioncini/guest-${avatarGuest(player)}.svg`
  if (player.campioncino_url) return player.campioncino_url
  if (/\bbencini\b/i.test(player.nome || '')) return '/campioncini/bencini.png'
  return player.foto_url || '/campioncini/guest-robot.svg'
}

export function ruoliGiocatore(player = {}) {
  const roles = String(player.ruolo || '').toUpperCase().split(/[\s/,;-]+/).filter(r => ROLE_LABELS[r])
  return roles.length ? [...new Set(roles)] : ['CC']
}

export function capienza(formato) {
  return ({ '5v5': 5, '7v7': 7, '8v8': 8, '11v11': 11 })[formato] || 5
}

// Pure and shared by the on-screen pitch and exported poster. Never invent players.
export function disponiSquadra(ids = [], players = [], overrides = {}, size = 5) {
  const unique = [...new Map(ids.map(id => [String(id), id])).values()]
  const roster = unique.map(id => players.find(p => String(p.id) === String(id)) || { id, nome: `#${id}` })
  const assigned = []
  const counts = { POR: 0, DC: 0, CC: 0, ATT: 0 }
  // Fixed choices and single roles first; flexible players fill the less crowded line.
  const ordered = [...roster].sort((a, b) => {
    const rank = p => overrides[p.id] ? -2 : ruoliGiocatore(p).length === 1 ? -1 : 0
    return rank(a) - rank(b)
  })
  for (const player of ordered) {
    const fixed = ROLE_LABELS[overrides[player.id]] ? overrides[player.id] : null
    const roles = fixed ? [fixed] : ruoliGiocatore(player)
    let role
    if (roles.includes('POR') && counts.POR === 0) role = 'POR'
    else {
      const outfield = roles.filter(r => r !== 'POR')
      const choices = outfield.length ? outfield : ['DC', 'CC', 'ATT']
      role = choices.reduce((best, r) => counts[r] < counts[best] ? r : best, choices[0])
    }
    counts[role]++
    assigned.push({ player, role })
  }
  const hasKeeper = counts.POR > 0
  const rows = []
  const perRow = size <= 5 ? 2 : 3
  for (const role of ['DC', 'CC', 'ATT']) {
    const group = assigned.filter(item => item.role === role)
    for (let i = 0; i < group.length; i += perRow) rows.push(group.slice(i, i + perRow))
  }
  const positioned = assigned.filter(item => item.role === 'POR').map(item => ({ ...item, x: 0.5, y: 0.08 }))
  const startY = hasKeeper ? (rows.length === 1 ? 0.66 : rows.length === 2 ? 0.42 : 0.34) : (rows.length === 1 ? 0.56 : rows.length === 2 ? 0.32 : rows.length === 3 ? 0.22 : 0.13)
  rows.forEach((row, ri) => row.forEach((item, i) => {
    const y = rows.length === 1 ? startY : startY + (0.88 - startY) * ri / (rows.length - 1)
    positioned.push({ ...item, x: (i + 1) / (row.length + 1), y })
  }))
  // Empty slots remain explicit, rather than displaying a fake guest or goalkeeper.
  const vacancies = Math.max(0, size - unique.length)
  return { players: positioned, vacancies, hasKeeper, count: unique.length, size }
}

export function creaFormazione(partita, players, overrides = partita.formazione || {}) {
  const size = capienza(partita.formato)
  return {
    A: disponiSquadra(partita.squadra_a, players, overrides, size),
    B: disponiSquadra(partita.squadra_b, players, overrides, size),
  }
}

export function coordinateCampo(item, team) {
  return { x: team === 'A' ? item.x : 1 - item.x, y: team === 'A' ? 0.96 - item.y * 0.43 : 0.04 + item.y * 0.43 }
}

export function bilanciaPerOverall(players, size = 5) {
  if (players.length > size * 2) throw new Error('Troppi giocatori per il formato')
  const A = [], B = []
  let sumA = 0, sumB = 0
  for (const player of [...players].sort((a, b) => b.overall - a.overall)) {
    const chooseA = B.length >= size || (A.length < size && (A.length < B.length || (A.length === B.length && sumA <= sumB)))
    if (chooseA) { A.push(player.id); sumA += player.overall }
    else { B.push(player.id); sumB += player.overall }
  }
  return { A, B }
}
