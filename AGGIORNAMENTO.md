FUCIABOL — Aggiornamento lavori recenti

Abbiamo proseguito con l’ammodernamento di FUCIABOL, restando sulla linea scelta: PWA mobile-first in stile Premium Sports App Neon.

L’obiettivo resta far sembrare l’app sempre meno un sito e sempre più una vera app sportiva/fantasy installabile da schermata Home.

Modifiche completate
1. Classifica con filtri

La pagina Classifica è stata aggiornata con filtri diversi:

Punti
Win rate
Media gol
Gol totali

La classifica ora non mostra solo i punti totali, ma può essere ordinata secondo criteri diversi.

Sono stati aggiunti:

classifica assoluta per punti;
classifica per percentuale di vittorie;
classifica per media gol;
classifica bomber per gol totali;
layout mobile sistemato dopo una prima versione che aveva rotto il podio;
podio/leaderboard più stabile su mobile.

La versione finale funziona correttamente da telefono.

2. Scommesse

Nella pagina Scommesse è stata aggiunta una nuova frase random/rotante:

Il 99% dei giocatori smette prima della grande vincita.

La modifica è stata deployata correttamente.

3. Dashboard — restyle principale

Abbiamo lavorato molto sulla Dashboard utente, che ora è diventata molto più simile a una schermata app.

La Dashboard attuale contiene:

hero iniziale con mini card giocatore;
saluto personalizzato;
chip ruolo / overall / media / crediti;
blocco crediti disponibili;
missione OVR;
riepilogo stagione;
prossima partita;
ultime prestazioni;
ultime scommesse;
ultime partite.

È stata trasformata da una dashboard più “sito” a una schermata più mobile-first.

4. Dashboard — polish e microfix

Dopo alcune prove e screenshot, abbiamo corretto vari dettagli:

rimossa la scritta invasiva SILVER/GOLD/BRONZE dalla card;
resa la card giocatore più compatta;
resa la hero più densa e più da app;
sistemata la dicitura pre partita, sostituita con:
In programma
alleggerita la sezione forma, passando da:
Forma attuale: -20

a qualcosa di più compatto tipo:

Forma: -20
resa più ordinata la sezione “Ultime prestazioni”;
migliorata leggermente l’integrazione della foto nella mini-card.

La Dashboard ora è considerata chiusa a livello strutturale, salvo micro-dettagli futuri.

Deploy

Sono stati fatti e completati correttamente vari deploy Vercel.

Commit recenti principali:

Feature: filtri classifica e nuova frase scommesse
Fix: classifica filtri layout mobile
Restyle: dashboard premium neon
Polish: dashboard mobile layout
Polish: dashboard compatta mobile
Polish: dashboard hero app mobile
Fix: dashboard dettagli mobile

Tutti i deploy sono andati a buon fine.

Nota: su Windows sono comparsi warning LF → CRLF, ma non hanno causato problemi.

Stato attuale

A oggi risultano sistemate:

Login
Header/menu generale
Dashboard utente
Classifica con filtri
Scommesse con nuova frase
Calendario responsive
Statistiche responsive

La direzione grafica resta:

Premium Sports App Neon

Quindi:

dark mode;
ciano/neon;
card compatte;
mobile-first;
look sport/fantasy moderno;
niente stile gestionale vecchio;
niente layout troppo da sito desktop.
Prossimo blocco deciso

Il prossimo blocco di lavoro sarà:

Foto e card giocatori in tutta l’app

Obiettivo:

migliorare l’integrazione delle foto caricate nelle card;
evitare che sembrino foto “appiccicate”;
non obbligare a rimuovere manualmente lo sfondo;
usare cornici, overlay, gradienti, ritagli e object-fit per renderle più coerenti;
uniformare la resa tra Dashboard, Classifica e Statistiche.

File probabilmente coinvolti:

Dashboard.jsx
Classifica.jsx
Statistiche.jsx

La priorità iniziale sarà probabilmente Statistiche.jsx, perché è la pagina dove le card giocatore si vedono di più.

Roadmap ancora aperta

Restano da fare:

1. Foto/card giocatori

Migliorare il modo in cui le foto vengono integrate nelle card senza dover rimuovere lo sfondo.

2. Guest / ospiti

Aggiungere distinzione tra:

player
guest

Probabile modifica database:

tipo text default 'player'

I guest dovrebbero essere selezionabili nelle partite ma esclusi di default dalla classifica principale, salvo filtro.

3. Gazzetta Fuciabol

Va ricordato nel backup che la Gazzetta:

appare nel Calendario;
si basa su Claude / Anthropic API;
può essere generata solo dall’admin;
i player possono leggerla ma non generarla;
dipende da una chiave API esterna;
va tenuta separata dalle funzioni core.
4. Deploy hook Vercel

Nel backup tecnico va mantenuto riferimento al deploy hook Vercel, ma senza condividerlo pubblicamente.

5. Feature future

Possibili feature future:

generatore squadre bilanciate;
face-off tra giocatori;
calendario più visuale;
record storici / Hall of Fame;
statistiche avanzate;
miglioramento pannello Admin.
Nota finale

La Dashboard per ora non va più stravolta.
Il prossimo lavoro dovrebbe concentrarsi sulle card/foto giocatori, così l’app diventa più coerente visivamente in tutte le pagine