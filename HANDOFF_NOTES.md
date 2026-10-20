# FUCIABOL — Riepilogo per ripartire in locale

Incolla questo come primo messaggio in una nuova sessione Claude Code locale (dentro la cartella del repo clonato), così chi riprende ha subito il contesto.

---

## Il progetto

FUCIABOL è una PWA React + Vite + Supabase per gestire un gruppo di calcetto tra amici: giocatori con overall/forma dinamici stile FIFA Ultimate Team, partite con slot squadra, votazioni post-partita, scommesse tra giocatori, classifica, statistiche.

**Repo**: `bencinigregorio-commits/Fuciabol`
**Deploy**: Vercel (progetto `fuciabol-su5h`), collegato al branch `main` — ogni merge su `main` pubblica in automatico
**Database**: Supabase (progetto `jiabtjhvvouehxpikaph`)

## Convenzioni di lavoro stabilite in questa sessione

- **Stile codice**: inline styles ovunque, niente CSS esterno/Tailwind (anche se `tailwindcss` è nel progetto, non è davvero usato)
- **Git**: lavoro su branch feature, apro PR, **le mergio io stesso** (l'utente ha chiesto piena autonomia, non vuole cliccare "merge" su GitHub)
- **Prima di ogni commit**: `npm run build` deve passare senza errori
- **Mai toccare `package-lock.json`** a meno che non si installi davvero una dipendenza nuova necessaria (es. `web-push`) — se `npm install` lo tocca solo per rumore di versione, va ripristinato con `git checkout -- package-lock.json`
- L'utente non è tecnico, va guidato passo-passo per qualunque azione manuale fuori da GitHub (Supabase, Vercel)

## Cosa è stato fatto (in ordine)

1. **Bug fix iniziali**: Gazzetta che aggregava tutte le partite invece dell'ultima, badge IF su giocatore sbagliato, overflow mobile
2. **Fase A — sistema a slot squadra**: creazione partita con formato (5v5/7v7/8v8/11v11), iscrizione autonoma dei giocatori, pannello admin per gestire slot, auto-bilanciamento squadre per overall
3. **Redesign completo**: Login, Dashboard, Classifica, Statistiche, Scommesse, tutte le modali — stesso linguaggio visivo (dark navy + cyan + gradi oro/argento/bronzo stile FUT), reso più "audace" su richiesta esplicita
4. **Riduzione rumore visivo**: sezioni comprimibili in Calendario (solo da giocare + ultima chiusa aperte di default) e Statistiche (legenda/guest collassati)
5. **Audit di sicurezza e correttezza completo** (vedi sotto, è la parte più delicata)
6. **Feature "accattivanti"**: Pack Opening (rivelazione stile FUT quando sale l'overall), Team of the Week (formazione dei migliori della settimana, esportabile come immagine)
7. **Feature di retention**: streak di presenza (partite di fila giocate), rivale più vicino in classifica, notifiche push reali

## ⚠️ Stato sicurezza — IMPORTANTE da conoscere

L'app **non ha vera autenticazione server-side**: "admin" è solo un PIN (`1234`) controllato lato client, stesso anon key per tutti. Per mitigare il rischio più grave (Supabase segnalava "RLS disabled" — chiunque con l'URL del progetto poteva leggere/scrivere tutto il DB), sono state eseguite **due migrazioni SQL manuali** (già applicate da Gregorio su Supabase, non ripetere):

- `supabase/migrations/0001_enable_rls_and_protect_pin.sql` — abilita RLS con policy permissive (per non rompere l'app priva di vera auth), e **revoca la lettura della colonna `pin`** per tutti tramite un GRANT a livello di colonna + funzione `login_by_pin` (SECURITY DEFINER) per il login
- `supabase/migrations/0002_push_subscriptions.sql` — tabella per le notifiche push

**Trappola in cui sono già caduto una volta**: qualsiasi query `select('*')` sulla tabella `giocatori` ora **fallisce del tutto** (Postgres nega l'intera query se manca il privilegio anche su una sola colonna, qui `pin`). Ho dovuto girare tutto il codice a sostituire `select('*')` con liste esplicite di colonne (mai includere `pin`). **Se in futuro si aggiunge una nuova query su `giocatori`, va sempre usata una select esplicita senza `pin`, mai `select('*')`.**

Colonne leggibili da `anon` su `giocatori`: `id, nome, ruolo, overall, crediti, forma_punti, foto_url, is_guest, voti_storico` (NON `pin`).

## Variabili d'ambiente su Vercel (già configurate)

- `ANTHROPIC_API_KEY` — per la generazione articolo Gazzetta (via `api/gazzetta.js`, chiamata server-side, mai esposta al client)
- `VAPID_PRIVATE_KEY` — per le notifiche push (chiave pubblica è hardcoded in `Dashboard.jsx` e `api/send-notification.js`, è sicura da avere nel client)
- `SUPABASE_SERVICE_ROLE_KEY` — usata solo da `api/send-notification.js` per leggere tutte le sottoscrizioni push bypassando RLS

(La vecchia `VITE_ANTHROPIC_API_KEY` non è più usata, può essere rimossa da Vercel se non già fatto.)

## Roadmap — cosa resta aperto (proposte mai costruite, da riproporre se interessano)

- Storico testa a testa tra due giocatori
- Pagina admin per gestire/correggere le scommesse a mano
- Export riepilogo stagionale (stesso motore Canvas già costruito per il riepilogo partita)
- Convocazione automatica suggerita dall'admin

## Debito tecnico noto, rimandato apposta (non dimenticanza)

- **Nessuna vera autenticazione per-utente** — accettabile per un'app tra amici, sarebbe un progetto a parte
- **Riapertura votazioni non sicura**: se si riapre una partita già chiusa e la si richiude, i punti forma/overall vengono riapplicati una seconda volta a tutti i giocatori (doppio conteggio). C'è un avviso nell'UI ma non un fix strutturale — richiederebbe un flag "punti già applicati" per evitare il doppio conteggio in modo sicuro

## File chiave da conoscere

- `src/App.jsx` — routing a tab, login (PIN admin `1234` o RPC `login_by_pin`)
- `src/pages/Calendario.jsx` — il file più grande, partite/slot/votazioni/scommesse/Gazzetta/Team of the Week
- `src/pages/Dashboard.jsx` — hero, KPI, streak, rivale, Pack Opening, notifiche push
- `src/pages/Admin.jsx` — gestione giocatori/partite (PIN non più visibile in chiaro)
- `src/pages/calcoli.js` — calcolo voto finale e overall
- `src/pages/scommesseCalcoli.js` — quote scommesse
- `src/pages/classificaUtils.js` — calcolo classifica condiviso tra Classifica.jsx e Dashboard.jsx
- `src/pages/riepilogoCard.js` / `src/pages/totwCard.js` — generatori immagine via Canvas (riepilogo partita / Team of the Week)
- `src/sw.js` — service worker custom (injectManifest, gestisce push notifications)
- `api/gazzetta.js` / `api/send-notification.js` — funzioni serverless Vercel

---

**Stato alla fine di questa sessione**: tutto mergiato su `main`, build verificato ad ogni step, Dashboard appena sistemata dopo un bug introdotto dalla migrazione RLS (select('*') che falliva). In attesa di conferma da Gregorio che tutto funzioni di nuovo correttamente dopo l'ultimo fix.
