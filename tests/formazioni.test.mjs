import test from 'node:test'
import assert from 'node:assert/strict'
import { nomeCampo, avatarGuest, immagineCampo, disponiSquadra, creaFormazione, coordinateCampo } from '../src/pages/formazioni.js'

const players = [
  { id: 1, nome: 'Gregorio Bencini', ruolo: 'DC/ATT' },
  { id: 2, nome: 'Il Maestro', ruolo: 'CC' },
  { id: 3, nome: 'Jack', ruolo: 'CC' },
  { id: 4, nome: 'Pietro Matteoni', ruolo: 'POR/CC' },
  { id: 5, nome: 'Mattia Lovino', ruolo: 'ATT' },
  ...Array.from({ length: 5 }, (_, i) => ({ id: i + 6, nome: `amico ${i + 1}`, ruolo: 'CC', is_guest: true })),
]

test('labels use surname or nickname without modifying profile names', () => {
  for (const [name, expected] of [['Gregorio Bencini', 'Bencini'], ['Il Maestro', 'Maestro'], ['Don Beppe Zola', 'Zola'], ['Davide Il Sergente Dianese', 'Dianese'], ['Mario "la suerte" Diana', 'la suerte'], ['Ilaria', 'Ilaria'], ['Laura', 'Laura'], ['Gino De Rossi', 'De Rossi']]) assert.equal(nomeCampo({ nome: name }), expected)
  assert.equal(nomeCampo({ nome: 'Il Maestro', nome_campo: 'Prof' }), 'Prof')
  assert.equal(nomeCampo({ nome: 'amico 1', is_guest: true }), 'amico 1')
  assert.equal(players[0].nome, 'Gregorio Bencini')
})

test('five per side, ten distinct participants, each in its own half', () => {
  const f = creaFormazione({ squadra_a: [1,2,3,4,5], squadra_b: [6,7,8,9,10], formato: '5v5' }, players)
  assert.equal(f.A.players.length, 5); assert.equal(f.B.players.length, 5)
  assert.equal(f.A.vacancies + f.B.vacancies, 0)
  for (const team of ['A', 'B']) for (const p of f[team].players) {
    const point = coordinateCampo(p, team)
    assert.ok(point.x > 0 && point.x < 1)
    assert.ok(team === 'A' ? point.y > 0.5 && point.y < 1 : point.y > 0 && point.y < 0.5)
  }
})

test('one keeper, flexible player fills defence, no invented keeper when absent', () => {
  const f = disponiSquadra([1,2,3,4,5], players)
  assert.equal(f.players.filter(p => p.role === 'POR').length, 1)
  assert.equal(f.players.find(p => p.player.id === 1).role, 'DC')
  const guests = disponiSquadra([6,7,8,9,10], players)
  assert.equal(guests.players.length, 5); assert.equal(guests.hasKeeper, false)
})

test('incomplete squads retain real people and explicitly count vacancies', () => {
  const f = disponiSquadra(['1', 1, 2, 999], players)
  assert.equal(f.count, 3); assert.equal(f.vacancies, 2)
  assert.equal(f.players.find(p => p.player.id === 999).player.nome, '#999')
  assert.equal(disponiSquadra([], []).players.length, 0)
})

test('per-match overrides do not alter profile roles; at most one keeper', () => {
  const f = disponiSquadra([1,2,3,4,5], players, { 1: 'ATT', 2: 'POR', 4: 'POR' })
  assert.equal(f.players.find(p => p.player.id === 1).role, 'ATT')
  assert.equal(f.players.filter(p => p.role === 'POR').length, 1)
  assert.equal(players[0].ruolo, 'DC/ATT')
})

test('guest artwork is stable, shared and ignores personal photos', () => {
  assert.equal(avatarGuest({ id: 42 }), avatarGuest({ id: '42' }))
  assert.equal(avatarGuest({ id: 42, avatar_guest: 'cyborg' }), 'cyborg')
  assert.match(immagineCampo({ id: 42, is_guest: true, foto_url: 'private-photo.png' }), /^\/campioncini\/guest-/)
  assert.equal(immagineCampo(players[0]), '/campioncini/bencini.png')
})

test('all standard five-a-side role combinations preserve five people and bounded positions', () => {
  const roles = ['POR', 'DC', 'CC', 'ATT', 'DC/ATT', 'POR/CC']
  for (let n = 0; n < 6 ** 5; n++) {
    let code = n
    const roster = Array.from({ length: 5 }, (_, id) => { const role = roles[code % 6]; code = Math.floor(code / 6); return { id, nome: `p${id}`, ruolo: role } })
    const f = disponiSquadra(roster.map(p => p.id), roster)
    assert.equal(f.players.length, 5)
    assert.ok(f.players.filter(p => p.role === 'POR').length <= 1)
    for (const p of f.players) assert.ok(p.x > 0 && p.x < 1 && p.y >= 0 && p.y <= 1)
    assert.equal(new Set(f.players.map(p => `${p.x},${p.y}`)).size, 5)
  }
})

test('balancing never produces six against four even with uneven overall ratings', async () => {
  const { bilanciaPerOverall } = await import('../src/pages/formazioni.js')
  const roster = Array.from({ length: 10 }, (_, id) => ({ id, overall: id === 0 ? 99 : 40 }))
  const { A, B } = bilanciaPerOverall(roster)
  assert.equal(A.length, 5); assert.equal(B.length, 5)
  assert.equal(new Set([...A, ...B]).size, 10)
  assert.throws(() => bilanciaPerOverall([...roster, { id: 10, overall: 60 }]))
})

test('all five-player role combinations have room for labels on a 320px phone', () => {
  const roles = ['POR', 'DC', 'CC', 'ATT', 'DC/ATT', 'POR/CC']
  for (let n = 0; n < 6 ** 5; n++) {
    let code = n
    const roster = Array.from({ length: 5 }, (_, id) => { const role = roles[code % 6]; code = Math.floor(code / 6); return { id, ruolo: role } })
    const f = disponiSquadra(roster.map(p => p.id), roster)
    for (let i = 0; i < f.players.length; i++) for (let j = i + 1; j < f.players.length; j++) {
      const a = coordinateCampo(f.players[i], 'A'), b = coordinateCampo(f.players[j], 'A')
      assert.ok(Math.abs(a.x - b.x) >= 0.27 || Math.abs(a.y - b.y) >= 64 / 620, `overlap for roles ${roster.map(p => p.ruolo)} `)
    }
  }
})
