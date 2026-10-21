-- Eseguire una volta nel SQL Editor di Supabase. Non modifica PIN, foto o nomi esistenti.
begin;
alter table public.giocatori add column if not exists nome_campo text;
alter table public.giocatori add column if not exists campioncino_url text;
alter table public.giocatori add column if not exists avatar_guest text;
alter table public.partite add column if not exists formazione jsonb not null default '{}'::jsonb;
-- Privilegi espliciti: NON concedere SELECT su pin o su tutta la tabella.
grant select (nome_campo, campioncino_url, avatar_guest) on public.giocatori to anon;
commit;
