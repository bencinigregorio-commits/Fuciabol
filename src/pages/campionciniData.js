import { supabase } from '../supabase'

// Optional columns are fetched separately: missing migration must not break existing screens.
export async function caricaAspettoGiocatori() {
  return supabase.from('giocatori').select('id, nome_campo, campioncino_url, avatar_guest')
}

export function unisciAspetto(players, appearance) {
  return players.map(player => ({ ...player, ...appearance.find(a => String(a.id) === String(player.id)) }))
}
