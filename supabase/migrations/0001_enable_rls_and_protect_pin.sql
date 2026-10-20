-- FUCIABOL — abilita Row-Level Security e protegge la colonna pin.
--
-- Questo script va eseguito UNA VOLTA nell'SQL Editor di Supabase
-- (Project → SQL Editor → New query → incolla → Run).
--
-- Cosa fa:
-- 1) Attiva RLS su giocatori / partite / scommesse (richiesto da Supabase,
--    altrimenti chiunque conosca l'URL del progetto legge/scrive tutto).
-- 2) Mantiene l'app funzionante esattamente come oggi: l'app non usa un vero
--    sistema di login lato server (l'admin è solo un PIN controllato nel
--    browser), quindi le policy restano permissive per il ruolo "anon" —
--    altrimenti l'app smetterebbe di funzionare per tutti.
-- 3) Protegge nello specifico la colonna "pin": nessuno può più leggerla
--    con una select diretta, nemmeno via API REST con la chiave pubblica.
--    Il login continua a funzionare tramite una funzione dedicata
--    (login_by_pin) che verifica il pin senza mai restituirlo.
--
-- Nota: questo NON introduce una vera autenticazione per-utente (serve un
-- progetto più grande per quello). Riduce il rischio concreto più urgente
-- (lettura di tutti i PIN, warning di Supabase) restando compatibile con
-- l'architettura attuale, pensata per essere leggera.

-- 1) Abilita RLS
alter table public.giocatori enable row level security;
alter table public.partite enable row level security;
alter table public.scommesse enable row level security;

-- 2) Policy permissive (equivalenti all'accesso attuale) per tenere l'app
--    funzionante così com'è
drop policy if exists "anon full access" on public.giocatori;
create policy "anon full access" on public.giocatori
  for all to anon using (true) with check (true);

drop policy if exists "anon full access" on public.partite;
create policy "anon full access" on public.partite
  for all to anon using (true) with check (true);

drop policy if exists "anon full access" on public.scommesse;
create policy "anon full access" on public.scommesse
  for all to anon using (true) with check (true);

-- 3) Protezione colonna pin: nessuna select diretta sulla colonna.
--    (I privilegi a livello di colonna sono indipendenti dalle RLS policy.)
revoke select on public.giocatori from anon;
grant select (id, nome, ruolo, overall, crediti, forma_punti, foto_url, is_guest, voti_storico)
  on public.giocatori to anon;
grant insert, update, delete on public.giocatori to anon;

-- Funzione sicura per il login: verifica il pin e restituisce solo i dati
-- pubblici del giocatore corrispondente, senza mai esporre la colonna pin.
create or replace function public.login_by_pin(input_pin text)
returns json
language sql
security definer
set search_path = public
as $$
  select json_build_object(
    'id', g.id,
    'nome', g.nome,
    'ruolo', g.ruolo,
    'overall', g.overall,
    'crediti', g.crediti,
    'is_guest', g.is_guest
  )
  from giocatori g
  where g.pin = input_pin
  limit 1;
$$;

grant execute on function public.login_by_pin(text) to anon;
