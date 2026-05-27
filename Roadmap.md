FUCIABOL — Roadmap modifiche decise
1. Direzione generale del progetto

FUCIABOL è una PWA, non un’app nativa. Per ora si resta su questa strada: gli utenti entrano dal browser, fanno “Aggiungi a schermata Home” e usano la web app come se fosse un’app.

L’obiettivo ora è trasformare la resa visiva da “sito web” a app mobile-first, mantenendo comunque una buona resa anche da browser desktop.

La direzione grafica scelta è:

Premium Sports App Neon

Caratteristiche:

sfondo scuro profondo;
accenti ciano/neon;
card moderne con bordi sottili e glow leggero;
interfaccia verticale da app;
pochi elementi per schermata;
elementi grandi e comodi da usare con il dito;
menu e navigazione più compatti;
stile sport/fantasy moderno, senza sembrare troppo sito gestionale.

L’immagine di riferimento scelta è quella con:

logo FUCIABOL in alto;
box utente in alto a destra;
menu a tendina moderno;
card dashboard scure con bordi ciano;
card giocatore a sinistra;
crediti, progresso overall, prossima partita e ultime partite organizzati in blocchi puliti.

La grafica deve essere adattata sia a mobile/PWA sia a desktop/browser, ma la priorità è la resa mobile.

2. Navigazione e layout generale
Stato attuale

È stato già introdotto un sistema più moderno rispetto alla vecchia barra con le voci sparse.

Prima c’era una barra larga con:

Dashboard | Calendario | Stats | Classifica | Scommesse | Admin

Ora l’idea è:

logo FUCIABOL in alto a sinistra;
box utente moderno in alto a destra;
pulsante Menu;
menu a tendina/pannello con le sezioni;
logout dentro il menu;
voci diverse per utente normale e admin.
Struttura desiderata
Utente normale

Menu:

Dashboard
Calendario
Statistiche
Classifica
Scommesse
Esci
Admin

Menu:

Calendario
Statistiche
Classifica
Scommesse
Admin
Esci

L’admin non deve avere necessariamente Dashboard personale; al login admin può atterrare su Calendario o Admin.

Cosa migliorare graficamente

Il menu attuale funziona meglio strutturalmente, ma deve essere reso più moderno:

meno emoji;
più icone coerenti;
pannello glass scuro;
voce attiva evidente;
hover/tap state più belli;
bordi ciano sottili;
box utente più premium;
logout meno “bottone rosso buttato lì”, più integrato nel menu.
3. Dashboard utente
Direzione

La Dashboard deve diventare la schermata principale “da app” del giocatore.

Deve contenere:

card giocatore/profilo;
saluto personalizzato;
crediti disponibili;
vittorie/sconfitte/crediti guadagnati;
progresso overall;
prossima partita;
ultime partite;
eventuale obiettivo/missione.
Stile

La Dashboard deve seguire lo stile Premium Sports App Neon:

fondo scuro;
card larghe in verticale su mobile;
bordi ciano;
numeri grandi;
icone semplici;
glow controllato;
layout chiaro da PWA.

Su desktop può adattarsi con più colonne, ma non deve sembrare una dashboard gestionale vecchia.

4. Classifica — modifica funzionale importante
Obiettivo

La pagina Classifica non deve mostrare solo la classifica assoluta per punti. Deve permettere di filtrare la classifica in base a più criteri.

Filtri decisi

Aggiungere filtri/tabs:

Punti totali
Win rate
Media gol
Gol totali
Logica dei filtri
Punti totali

È la classifica attuale.

Ordinamento:

punti;
differenza reti;
gol fatti.
Win rate

Formula:

vittorie / partite giocate * 100

Da mostrare come percentuale.

Esempio:

75%

Nota importante: per evitare distorsioni, usare un criterio minimo, ad esempio:

minimo 2 partite giocate

oppure mostrare comunque tutti ma indicare chiaramente le partite giocate.

Esempio:

100% WR — 1 PG

Meglio ancora:

se PG < 2, mostrare un badge “campione ridotto” oppure metterli sotto.
Media gol

Formula:

gol fatti / partite giocate

Da mostrare con uno o due decimali.

Esempio:

1.25 gol/partita
Gol totali

Classifica bomber assoluta.

Ordinamento:

gol fatti;
media gol;
punti o partite giocate come criterio secondario.
Grafica Classifica

La classifica mobile deve essere a card/lista moderna, non tabella compressa.

Ogni riga/card dovrebbe mostrare:

posizione;
foto/avatar;
nome;
ruolo/overall;
valore principale del filtro attivo;
statistiche secondarie.

Esempio per filtro Punti:

#1 Gregorio
DC/ATT · OVR 71
11 punti
PG 7 · V 3 · P 2 · S 2 · GF 8

Esempio per filtro Win rate:

#1 Marco
WR 75%
PG 4 · V 3 · S 1

Esempio per Media gol:

#1 Beppe
1.80 gol/partita
GF 9 · PG 5

Esempio per Gol totali:

#1 Beppe
9 gol
Media 1.80 · PG 5
5. Statistiche generali

La pagina Statistiche può restare nella logica attuale, ma andrà uniformata graficamente alla direzione Premium Neon.

Possibili miglioramenti futuri:

card giocatori più coerenti con le card FUT;
filtri per ruolo;
filtro per overall;
filtro per forma;
evidenza su bomber, MVP, miglior media, peggior forma;
miglior integrazione delle foto.
6. Foto giocatori nelle card
Problema

Attualmente per avere una resa bella nelle card spesso serve una foto/personaggio con sfondo rimosso o generato apposta.

Obiettivo

Fare in modo che anche le foto normali caricate dall’admin siano integrate meglio nelle card senza dover rimuovere manualmente lo sfondo.

Soluzione grafica

Non usare per forza background removal.

Migliorare invece la resa con:

object-fit: cover;
object-position: center top;
border-radius;
overlay scuro/ciano;
cornice interna;
gradient mask;
ombra/drop-shadow;

La foto può stare dentro un frame/scudo o rettangolo verticale, con:

bordo ciano o metallico;
sfondo scuro;
overlay leggero;
eventuale gradiente dal basso verso l’alto;
ritaglio automatico centrato sul volto/corpo.

Obiettivo: anche se la foto ha uno sfondo normale, la card deve sembrare coerente e non “foto appiccicata”.

Questa modifica riguarda probabilmente:

Dashboard.jsx
Statistiche.jsx
Classifica.jsx

e qualsiasi componente che mostra card giocatore.

7. Scommesse — frase rotante
Modifica piccola

Aggiungere tra le frasi/motti che ruotano nella pagina Scommesse questa frase:

Il 99% dei giocatori smette prima della grande vincita.

File probabile:

src/pages/Scommesse.jsx

Questa modifica è semplice e non dovrebbe toccare database o logiche.

8. Guest / Ospiti
Obiettivo

Permettere all’admin di distinguere tra:

Giocatori fissi
Guest / Ospiti

I guest sono persone che giocano raramente, ma che devono poter essere inserite nelle partite e avere statistiche minime.

Soluzione database consigliata

Aggiungere un campo alla tabella giocatori.

Opzione consigliata:

tipo text default 'player'

Valori possibili:

player
guest

Alternativa più semplice:

is_guest boolean default false

Preferenza: usare tipo, perché in futuro è più flessibile.

Logica desiderata

I guest:

possono essere creati dall’admin;
possono essere inseriti nelle partite;
possono avere gol, assist, voti e statistiche;
possono avere o non avere PIN;
devono essere distinguibili dai giocatori fissi;
devono essere esclusi di default dalla classifica principale;
possono essere inclusi tramite filtro “Mostra guest”.
Admin

Nel pannello Admin, quando si crea/modifica un giocatore, aggiungere:

Tipo profilo:
[Giocatore fisso] [Guest]
Classifica

Di default:

Mostra solo giocatori fissi

Opzione:

Includi guest

Oppure tab:

Giocatori | Guest | Tutti
9. Feature ispirate al sito di riferimento

È stato mostrato un sito/PWA di riferimento con alcune feature interessanti, in particolare:

creazione formazioni;
equilibrio squadre;
confronto testa a testa;
classifica generale con riepiloghi;
calendario visuale;
schermate verticali molto mobile-first.

Non bisogna copiare lo stile, perché FUCIABOL resta dark/neon, però alcune funzioni sono interessanti.

Feature futura più interessante
Generatore squadre bilanciate

L’admin seleziona i presenti e l’app propone due squadre equilibrate.

Parametri possibili:

overall;
ruolo;
forma;
storico vittorie;
gol;
eventuale preferenza manuale.

Output:

Squadra A — Overall medio 73
Squadra B — Overall medio 72
Equilibrio: 94%

Questa feature sarebbe molto coerente con FUCIABOL e molto utile.

Altra feature futura
Face-off tra giocatori

Selezioni due giocatori e l’app mostra confronto:

overall;
partite giocate;
vittorie;
win rate;
gol;
media gol;
forma;
crediti;
storico scontri, se possibile.

Questa non è prioritaria, ma sarebbe molto bella.

10. Calendario

Il Calendario è stato già sistemato a livello responsive: su mobile la card partita non deve più uscire dallo schermo.

Miglioramenti futuri:

renderlo più visuale;
eventualmente aggiungere vista calendario mensile;
evidenziare giorni con partita;
migliorare Gazzetta Fuciabol;
card partita più premium/neon;
se admin, pulsanti gestione più belli.

Non è il prossimo intervento prioritario.

11. Admin

L’Admin va mantenuto funzionale, ma più avanti andrà modernizzato graficamente.

Priorità Admin future:

gestione giocatori più pulita;
distinzione player/guest;
caricamento foto più guidato;
gestione partite;
eventuale generatore squadre;
eventuali statistiche admin.
12. Ordine di lavoro consigliato
Fase 1 — Restyling base e navigazione
Raffinare Layout.jsx e App.jsx.
Migliorare header, box utente, menu.
Avvicinare la PWA allo stile Premium Sports App Neon.
Valutare se mantenere solo menu o aggiungere bottom navigation mobile.
Fase 2 — Classifica con filtri

Modificare Classifica.jsx con:

Punti totali
Win rate
Media gol
Gol totali

Questa è la prossima modifica funzionale consigliata.

Fase 3 — Scommesse

Aggiungere frase:

Il 99% dei giocatori smette prima della grande vincita.
Fase 4 — Foto integrate

Migliorare resa delle foto nelle card senza background removal.

Fase 5 — Guest player

Aggiungere campo database:

tipo = player | guest

Poi aggiornare Admin, Classifica e selezione giocatori nelle partite.

Fase 6 — Feature avanzate
Generatore squadre bilanciate.
Face-off tra giocatori.
Calendario visuale.
Hall of Fame/record storici.
13. Vincoli tecnici da rispettare

Il progetto usa:

React + Vite
Supabase
Vercel
Stili inline
No Tailwind
No CSS files complessi salvo index.css minimo

I file principali sono:

src/App.jsx
src/Layout.jsx
src/pages/Dashboard.jsx
src/pages/Calendario.jsx
src/pages/Classifica.jsx
src/pages/Statistiche.jsx
src/pages/Scommesse.jsx
src/pages/Admin.jsx
src/pages/calcoli.js
src/pages/scommesseCalcoli.js

Quando si modifica codice:

non cambiare nomi file senza git mv;
attenzione al case-sensitive di Vercel/Linux;
non rompere gli import;
mantenere tutto compatibile con PWA;
fare modifiche una pagina alla volta;
evitare deploy continui: meglio accumulare modifiche e deployare insieme quando possibile.