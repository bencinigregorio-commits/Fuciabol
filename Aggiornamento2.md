Sì, confermo: **non intendevo togliere Dashboard, Statistiche, Classifica, Calendario, Scommesse, Admin ecc.**

La struttura attuale resta. L’idea è **aggiungere nuovi moduli/funzionalità** e, dove serve, **riposizionare meglio alcune cose**. L’unico vero spostamento che valuterei è la **Gazzetta fuori dal Calendario**, perché ha senso come sezione autonoma. Ma non significa eliminare il Calendario: anzi, il Calendario diventerebbe più pulito e operativo.

Ti preparo una roadmap completa da salvare in un file tipo:

```text
ROADMAP_FUCIABOL_PROSSIMA_FASE.md
```

---

# FUCIABOL — Roadmap estesa prossima fase

## 1. Stato attuale del progetto

FUCIABOL oggi ha già una base solida:

* Dashboard giocatore;
* Calendario;
* Match Live guidato;
* Statistiche con player card v2;
* Classifica;
* Scommesse;
* Admin;
* Guest/Ospiti separati;
* Gazzetta integrata nel Calendario;
* menu/header globali uniformati;
* stile premium sportivo neon.

La struttura attuale **non va smontata**.

L’obiettivo della prossima fase non è rifare l’app, ma trasformarla da semplice app di gestione calcetto in:

```text
social game privato del gruppo
+
strumento organizzativo settimanale
+
motore di conversazione su WhatsApp
+
archivio narrativo della lega
```

---

# 2. Principio guida

Ogni nuova feature deve rispondere a questa domanda:

```text
Questa cosa rende FUCIABOL più vivo, più partecipativo e più discusso nel gruppo?
```

Se sì, è coerente.

FUCIABOL deve continuare a essere:

* mobile-first;
* premium sports app neon;
* dark/cyan;
* app-like;
* leggibile da telefono;
* senza perdere la grafica attuale.

Non bisogna tornare a:

* emoji giganti brutte;
* tabelle grezze;
* layout desktop-first;
* stile admin dashboard;
* pagine scollegate tra loro.

---

# 3. Struttura generale dell’app

La struttura attuale resta:

```text
Dashboard
Calendario
Statistiche
Classifica
Scommesse
Admin
```

Possibili nuove sezioni future:

```text
Gazzetta
Spogliatoio / Hype Room
```

Ma non vanno introdotte subito tutte insieme.

## Ruolo ideale delle sezioni

### Dashboard

Deve diventare la home personale del player.

Contiene:

* card giocatore;
* crediti;
* forma;
* ultime prestazioni;
* prossima partita;
* disponibilità personale;
* sondaggi attivi;
* eventuali alert sociali.

La Dashboard deve rispondere a:

```text
Cosa sta succedendo nella mia carriera FUCIABOL?
```

---

### Calendario

Deve diventare il centro operativo delle partite.

Contiene:

* partite in programma;
* disponibilità;
* gestione live;
* tabellini;
* partite concluse.

Il Calendario non deve essere appesantito troppo dalla Gazzetta.
La Gazzetta può essere spostata in una sezione autonoma in futuro.

---

### Statistiche

Resta il catalogo giocatori/card.

Contiene:

* player card;
* dati individuali;
* guest separati;
* IF/MVP;
* progressione.

Non va stravolta ora.

---

### Classifica

Resta la pagina status/ranking.

Contiene:

* classifica principale;
* classifica guest separata;
* filtri punti/win rate/media gol/gol totali.

Non va stravolta ora.

---

### Scommesse

Resta pagina separata per quote e crediti.

In futuro può essere migliorata graficamente e arricchita, ma i sondaggi sociali non devono essere confusi con le scommesse.

---

### Admin

Resta pannello operativo.

Contiene:

* gestione giocatori;
* gestione guest;
* gestione partite;
* riapertura partite;
* eventuale futura gestione luoghi;
* eventuale futura gestione sondaggi.

---

# 4. Prossima grande feature: disponibilità partita

## Obiettivo

I player fissi devono poter segnare la propria disponibilità alla prossima partita.

Stati disponibili:

```text
✅ Ci sono
❓ In forse
❌ Non ci sono
```

I guest non devono essere convocati automaticamente.
Restano selezionabili manualmente dall’admin quando servono.

---

## Dove appare

### Dashboard

Card prioritaria:

```text
PROSSIMA PARTITA PREVISTA

Giovedì 12 giugno
Ore 21:00
Campo: Sport City

✅ Presenti: 7
❓ In forse: 2
❌ Assenti: 1

[Ci sono] [In forse] [Non ci sono]
```

Questa card deve stare molto in alto, perché crea abitudine.

---

### Calendario

Dentro la card della partita:

```text
Disponibilità

✅ Presenti
- Gregorio
- Jack
- Lovino

❓ In forse
- Gemma

❌ Assenti
- Bencini
```

---

### Admin

L’admin deve vedere rapidamente:

```text
Confermati: 7/10
In forse: 2
Assenti: 1
Mancano: 3
```

Così decide se chiamare guest.

---

## Database consigliato

Prima versione semplice: aggiungere campo JSONB a `partite`.

```sql
ALTER TABLE partite
ADD COLUMN IF NOT EXISTS disponibilita jsonb DEFAULT '{}'::jsonb;
```

Struttura:

```js
{
  "12": {
    "stato": "presente",
    "updatedAt": "2026-06-03T..."
  },
  "15": {
    "stato": "forse",
    "updatedAt": "2026-06-03T..."
  },
  "18": {
    "stato": "assente",
    "updatedAt": "2026-06-03T..."
  }
}
```

Motivo: il progetto usa già JSONB per `eventi`, `votazioni`, `voti_calcolati`.

---

## File coinvolti

Probabili file:

```text
Calendario.jsx
Dashboard.jsx
Admin.jsx
```

Possibile impatto minimo su:

```text
Layout.jsx
```

se serve aggiungere alert/badge futuri, ma non nella prima fase.

---

# 5. Informazioni partita: luogo, ora, note

## Obiettivo

Quando l’admin crea una partita, deve poter indicare:

```text
Data
Ora
Luogo
Note
```

Ora e data probabilmente esistono già.
Il luogo potrebbe non esserci ancora.

## Prima versione

Aggiungere campo manuale `luogo` alla partita.

Possibile SQL:

```sql
ALTER TABLE partite
ADD COLUMN IF NOT EXISTS luogo text;
```

Eventualmente:

```sql
ALTER TABLE partite
ADD COLUMN IF NOT EXISTS note text;
```

## Versione futura

Gestione luoghi ricorrenti:

```text
Sport City
Le Palme
Empire
Circolo X
```

Con orari tipici:

```text
20:00
21:00
22:00
```

Ma questa va fatta dopo.
Prima basta `luogo` manuale.

---

# 6. WhatsApp: strategia corretta

## Non partire subito con API WhatsApp

Non conviene ora integrare direttamente WhatsApp API.

Motivi:

* complessità tecnica;
* gestione permessi;
* business account;
* possibili limiti gruppi;
* rischio di perdere tempo.

## Strategia migliore

Usare FUCIABOL per generare contenuti condivisibili.

Aggiungere bottoni:

```text
Condividi su WhatsApp
```

che generano testo pronto.

L’admin o i player lo condividono manualmente nel gruppo.

---

## Contenuti da condividere

### Convocazione

```text
⚽ FUCIABOL — PROSSIMA PARTITA

📅 Giovedì 12 giugno
🕘 Ore 21:00
📍 Sport City

✅ Presenti: 7
❓ In forse: 2
❌ Assenti: 1

Segnatevi su FUCIABOL.
```

---

### Squadre ufficiali

```text
🔥 FUCIABOL — SQUADRE UFFICIALI

Team A
- Gregorio
- Jack
- Lovino

Team B
- Gemma
- Bencini
- Scatizzi

Si gioca alle 21:00.
```

---

### Risultato finale

```text
🏁 FUCIABOL — RISULTATO FINALE

Team A 7 - 5 Team B

Marcatori:
Lovino x3
Jack x2
Gregorio x1

MVP:
Lovino — 8.6
```

---

### Gazzetta

```text
🗞️ GAZZETTA FUCIABOL

“Lovino accende la notte, Bencini sparisce nella nebbia”

Leggi la nuova Gazzetta su FUCIABOL.
```

---

## Implementazione tecnica

Prima versione:

* `navigator.share()` se disponibile;
* fallback con link WhatsApp:

```js
https://wa.me/?text=...
```

Non serve collegare direttamente il gruppo.

---

# 7. Sondaggi sociali pre-partita

## Obiettivo

Creare interazione durante la settimana.

Non sono scommesse.
Sono contenuti sociali/ironici.

Esempi:

```text
Chi arriva più cotto giovedì?
Chi sbaglia più gol?
Chi farà polemica?
Chi sarà MVP?
Chi segna per primo?
Chi arriva in ritardo?
Chi si inventa una scusa?
```

## Dove metterli

Prima versione: Dashboard.

Sezione:

```text
SONDAGGIO DELLA SETTIMANA

Chi arriva più cotto giovedì?

○ Gregorio
○ Lovino
○ Jack
○ Gemma

[Invia voto]
```

Risultati:

* visibili dopo aver votato;
* oppure sempre visibili, da decidere.

## In futuro

Possibile pagina dedicata:

```text
Spogliatoio
```

oppure:

```text
Hype Room
```

Ma non ora.

---

## Database possibile

Prima versione semplice: campo JSONB dentro `partite`.

```sql
ALTER TABLE partite
ADD COLUMN IF NOT EXISTS sondaggi jsonb DEFAULT '[]'::jsonb;
```

Esempio:

```js
[
  {
    "id": "poll_1",
    "domanda": "Chi arriva più cotto giovedì?",
    "opzioni": [1, 2, 3, 4],
    "voti": {
      "12": 3,
      "15": 1
    },
    "attivo": true
  }
]
```

Alternativa più pulita: tabella separata `sondaggi`.
Ma per prima versione JSONB va bene.

---

## Chi può crearli

Prima versione:

```text
Admin crea sondaggio
Player votano
```

In futuro:

```text
Player propongono sondaggio
Admin approva
```

---

# 8. Gazzetta autonoma

## Stato attuale

La Gazzetta è dentro Calendario.

## Problema

Il Calendario deve diventare operativo:

```text
partite
disponibilità
live
tabellini
```

La Gazzetta invece è narrativa:

```text
racconto
lore
meme
storia del gruppo
```

## Direzione futura

Creare pagina autonoma:

```text
Gazzetta
```

Con:

* ultimo articolo;
* archivio;
* genera articolo solo admin;
* condividi su WhatsApp;
* titoli forti;
* tono giornalistico ironico.

## Non urgente

Da fare dopo disponibilità/WhatsApp share.

---

# 9. Tabellini partite concluse

## Obiettivo

Migliorare le partite passate.

Ogni partita chiusa dovrebbe mostrare:

```text
Team A 7 - 5 Team B

Marcatori:
Lovino x3
Jack x2
Gregorio x1

Assist:
Gemma x2
Bencini x1

MVP:
Lovino — 8.6
```

In stile premium FUCIABOL.

## File coinvolto

```text
Calendario.jsx
```

## Priorità

Media-alta.

Ora il Match Live funziona, quindi i tabellini diventeranno più importanti.

---

# 10. Correzione eventi

## Obiettivo

Se durante il live si sbaglia a segnare un gol/assist, l’admin deve poter correggere.

Attualmente il flusso guidato è ottimo per aggiungere gol, ma serve anche una vista:

```text
Correggi eventi

Lovino
Gol: 2  [-] [+]
Assist: 1  [-] [+]

Jack
Gol: 1  [-] [+]
Assist: 0 [-] [+]
```

## Dove

Dentro Match Live, visibile solo admin.

## Priorità

Media.

Da fare dopo aver testato il live in una partita vera.

---

# 11. Foto speciali / IF dinamiche

## Stato attuale

I giocatori hanno foto base:

```text
foto_url
```

## Evoluzione desiderata

Aggiungere:

```sql
ALTER TABLE giocatori
ADD COLUMN IF NOT EXISTS foto_special_url text;
```

Logica:

```text
card normale → foto_url
card IF/MVP/TOTW → foto_special_url se esiste
```

Se `foto_special_url` manca, usare `foto_url`.

## Dove usarla

* Statistiche;
* Dashboard;
* Gazzetta;
* Team of the Week futuro.

## Priorità

Media-bassa.
Bella feature, ma dopo convocazioni e sondaggi.

---

# 12. Team of the Week / premi settimanali

## Obiettivo

Creare riconoscimenti settimanali:

```text
MVP
Bomber
Assistman
Rivelazione
Flop ironico
Scommettitore della settimana
```

Da usare in:

* Dashboard;
* Gazzetta;
* WhatsApp;
* card speciali.

## Priorità

Futura.

---

# 13. Scommesse: evoluzione futura

## Stato attuale

Scommesse funziona.

## Idee future

* grafica più betting premium;
* schedina più bella;
* storico scommesse;
* quote condivisibili su WhatsApp;
* classifica crediti;
* badge ironici;
* frase “Il 99% dei giocatori smette prima della grande vincita” già inserita.

## Priorità

Media-bassa.

Non mischiare con i sondaggi sociali.

---

# 14. Ordine operativo consigliato

## Fase A — Organizzazione partita

```text
1. Aggiungere luogo/note alla partita
2. Aggiungere disponibilita jsonb
3. Dashboard: Prossima partita prevista
4. Calendario: disponibilità partita
5. Admin: riepilogo disponibilità
```

Questa è la prossima fase principale.

---

## Fase B — WhatsApp share manuale

```text
1. Condividi convocazione
2. Condividi squadre
3. Condividi risultato finale
4. Condividi Gazzetta
```

---

## Fase C — Sondaggi sociali

```text
1. Admin crea sondaggio pre-partita
2. Player votano dalla Dashboard
3. Risultati visibili
4. Condividi sondaggio/risultati su WhatsApp
```

---

## Fase D — Gazzetta autonoma

```text
1. Creare pagina Gazzetta
2. Spostare contenuto dal Calendario
3. Archivio articoli
4. Condivisione WhatsApp
```

---

## Fase E — Tabellini / correzione eventi

```text
1. Migliorare tabellini partite concluse
2. Aggiungere Correggi eventi per admin
```

---

## Fase F — Card speciali e TOTW

```text
1. Aggiungere foto_special_url
2. Usare foto speciale per IF/MVP
3. Creare Team of the Week
```

---

# 15. Cosa non fare ora

Non fare subito:

* integrazione WhatsApp API reale;
* nuova pagina social complessa;
* chat interna;
* refactor globale;
* redesign grafico;
* modifica profonda del sistema scommesse;
* automazioni troppo complesse.

Prima bisogna creare abitudine settimanale:

```text
prossima partita
+
disponibilità
+
WhatsApp share
```

---

# 16. Prossimo prompt consigliato per Claude

```text
Leggi ROADMAP_FUCIABOL_PROSSIMA_FASE.md, PASSAGGIO_CONSEGNE_CLAUDE.md, AGGIORNAMENTO.md e Aggiornamento2.md.

Voglio iniziare la prossima fase: organizzazione partita e disponibilità player.

Prima di scrivere codice, analizza il progetto e dimmi il piano operativo.

Obiettivo:
aggiungere alla prossima partita:
- luogo
- note
- disponibilità player fissi: Ci sono / In forse / Non ci sono
- riepilogo disponibilità in Dashboard e Calendario
- i guest non devono essere convocati automaticamente

Prima di implementare, dimmi:
1. quali campi mancano in Supabase;
2. quali query SQL devo eseguire;
3. quali file andrebbero modificati;
4. impatto su Calendario, Dashboard, Admin, Match Live e Guest;
5. piano più sicuro per implementare a step senza rompere nulla.

Non scrivere codice.
Dammi solo analisi tecnica e piano operativo.
```

---

# 17. Sintesi finale

La struttura esistente resta.

Non si tolgono:

```text
Dashboard
Calendario
Statistiche
Classifica
Scommesse
Admin
```

Si aggiungono gradualmente:

```text
Disponibilità partita
Prossima partita prevista
WhatsApp share
Sondaggi sociali
Gazzetta autonoma
Tabellini migliori
Correzione eventi
Foto speciali
Team of the Week
```

Priorità immediata:

```text
Disponibilità player + prossima partita + convocazione condivisibile
```
---

# 18. Aggiornamento stato effettivo dopo ultima fase sviluppo

## Blocchi ora funzionanti

Dopo gli ultimi interventi, risultano funzionanti e da considerare **chiusi salvo bug**:

```text
UI globale / header / menu
Statistiche con card v2
Guest separati in Admin
Guest separati in Statistiche
Guest separati in Classifica
Badge Guest nel Calendario
Match Live guidato admin
Match Live mobile-first anche per player
Riapri Live / Riapri Votazioni da Admin
Fix salvataggio votazioni post-partita
Stato votazioni: chi ha votato / chi manca
```

## Votazioni post-partita

È stato risolto un bug importante: il salvataggio voti usava una copia stale di `partita.votazioni` e poteva sovrascrivere voti già salvati da altri player.

La logica corretta ora deve restare:

```js
// prima recupera votazioni fresche da Supabase
// poi rimuove solo l'eventuale voto dello stesso voterId
// poi aggiunge il nuovo voto
// poi salva preservando gli altri voti
```

Regola importante:

```text
Non modificare più il flusso votazioni senza preservare il fetch fresco da Supabase.
```

È stata aggiunta anche la sezione **Stato votazioni**, che mostra:

- quanti hanno votato;
- chi ha votato;
- chi manca;
- senza mostrare i voti numerici dati.

## Match Live

Il Match Live ora funziona con flusso guidato:

```text
+ Gol → scegli squadra → scegli marcatore → scegli assist/Nessuno → conferma
```

È stato anche corretto il problema mobile: la visuale live per player/non-admin ora deve restare leggibile in verticale, senza obbligare a girare il telefono.

Regola importante:

```text
Non tornare al layout live a due colonne obbligatorie.
Non tornare ai bottoni +G/-G/+A/-A accanto a ogni giocatore come interfaccia principale.
```

I controlli di correzione eventi possono essere aggiunti in futuro, ma non devono sostituire il flusso guidato.

---

# 19. Visione a lungo termine: da app privata a piattaforma

## Ambizione futura

FUCIABOL nasce come social game privato per un gruppo di amici che giocano a calcetto, ma la visione a lungo termine può essere molto più ampia.

L’idea futura è trasformare FUCIABOL in una piattaforma che possa funzionare:

```text
a livello di singolo gruppo di amici
+
a livello cittadino
+
a livello nazionale
+
eventualmente internazionale
```

L’obiettivo non è solo gestire partite, ma creare una cultura giocosa e competitiva intorno al calcetto amatoriale.

## Doppia anima del prodotto

FUCIABOL dovrebbe mantenere due livelli:

### 1. Lega privata / gruppo di amici

È la dimensione attuale.

Include:

- giocatori del gruppo;
- guest;
- partite settimanali;
- scommesse interne;
- card;
- statistiche;
- classifica;
- Gazzetta;
- sondaggi;
- WhatsApp come amplificatore sociale.

Questa parte deve restare semplice, familiare, ironica e identitaria.

### 2. Ecosistema pubblico / competitivo

In futuro FUCIABOL potrebbe avere anche una dimensione pubblica:

- dashboard nazionale;
- dashboard internazionale;
- classifiche tra giocatori di gruppi diversi;
- classifiche per città;
- classifiche per nazione;
- classifiche per formato;
- repository campetti;
- tornei tra community;
- ranking pubblico dei migliori player amatoriali;
- ranking dei migliori campi.

Questa parte va pensata come sviluppo futuro, non come priorità immediata.

---

# 20. Dashboard nazionale e internazionale

## Idea

In futuro potrebbe esistere una dashboard pubblica stile videogiochi competitivi, simile per logica sociale a giochi come Clash of Clans o Clash Royale.

Ogni gruppo resta autonomo, ma alcuni dati aggregati possono alimentare classifiche più ampie.

## Possibili livelli di classifica

```text
Classifica gruppo
Classifica città
Classifica regione
Classifica nazionale
Classifica internazionale
```

## Possibili filtri

```text
Formato partita:
- 5v5
- 7v7
- 8v8
- 11v11

Zona:
- città
- provincia
- regione
- nazione

Ruolo:
- portiere
- difensore
- centrocampista
- attaccante
- jolly

Periodo:
- settimana
- mese
- stagione
- all time
```

## Metriche possibili

```text
Overall
Media voto
Gol
Assist
Win rate
MVP
Presenze
Forma recente
Crediti
Performance nelle ultime 5 partite
```

## Attenzione

Questa parte non va implementata ora.

Per diventare possibile, prima servirebbero:

- account utente veri;
- gestione gruppi/leghe;
- privacy;
- normalizzazione dei formati;
- anti-cheat o sistemi di validazione;
- database più strutturato;
- separazione tra dati privati e dati pubblici.

Per ora va tenuta come direzione strategica futura.

---

# 21. Repository pubblico dei campetti

## Idea

FUCIABOL potrebbe diventare anche un archivio pubblico dei campetti/campi da calcetto.

Gli utenti potrebbero votare il campo dopo averci giocato.

## Obiettivo

Creare una sorta di repository filtrabile dei campi:

```text
Campi nella mia zona
Campi migliori per qualità
Campi più economici
Campi con migliori servizi
Campi più votati
Campi consigliati per 5v5 / 7v7 / 8v8 / 11v11
```

## Criteri di valutazione campo

Possibili criteri:

```text
Qualità del campo da gioco
Illuminazione
Spogliatoi
Docce
Servizi
Organizzazione
Prezzo
Parcheggio
Posizione
Atmosfera
Qualità pallone/reti/porte
Disponibilità orari
```

## Struttura futura possibile

Tabella `campi`:

```text
id
nome
indirizzo
città
zona
latitudine
longitudine
formati_supportati
prezzo_medio
note
created_at
```

Tabella `recensioni_campi`:

```text
id
campo_id
user_id
partita_id
qualita_campo
illuminazione
spogliatoi
servizi
prezzo
organizzazione
voto_generale
commento
created_at
```

## Collegamento con FUCIABOL privato

Quando l’admin crea una partita, in futuro potrebbe scegliere un campo dal repository.

Dopo la partita, i player potrebbero ricevere una micro-domanda:

```text
Com’è stato il campo?
```

e votare rapidamente.

## Priorità

Non immediata.

Prima versione possibile più avanti:

```text
campo/luogo manuale nella partita
+
voto campo post-partita
+
lista campi più usati dal gruppo
```

Solo dopo avrebbe senso creare un repository pubblico.

---

# 22. Scommesse live e interazione durante partita

## Idea

In futuro FUCIABOL potrebbe avere anche una parte di scommesse live.

Esempi:

```text
Prossimo gol
Chi segna il prossimo?
Over/under gol totali
Rimonta sì/no
MVP live
Gol entro i prossimi 5 minuti
```

## Attenzione

Questa feature è delicata.

Va distinta chiaramente da:

- sondaggi sociali;
- votazioni;
- disponibilità;
- Gazzetta.

Le scommesse live richiedono:

- Match Live affidabile;
- timing evento;
- gestione crediti;
- regole chiare;
- prevenzione abusi;
- probabilmente admin/automatismi per chiudere mercati live.

## Priorità

Futura.

Non implementare prima di:

```text
Match Live stabile in partite vere
Correzione eventi funzionante
Tabellini solidi
Scommesse attuali rifinite
```

---

# 23. Formati: 5v5, 7v7, 8v8, 11v11

## Idea

In futuro FUCIABOL potrebbe supportare formati diversi:

```text
5v5
7v7
8v8
11v11
```

Questo permetterebbe classifiche più corrette e confronti più sensati.

## Possibili impatti

Il formato potrebbe influenzare:

- statistiche;
- media gol;
- ruolo;
- valore delle prestazioni;
- overall;
- confrontabilità tra player;
- ranking pubblico.

## Campo futuro possibile

Aggiungere a `partite`:

```sql
ALTER TABLE partite
ADD COLUMN IF NOT EXISTS formato text DEFAULT '5v5';
```

Valori possibili:

```text
5v5
6v6
7v7
8v8
11v11
```

## Priorità

Bassa nel breve periodo.

Per ora FUCIABOL resta centrato sul calcetto del gruppo.

---

# 24. Tornei e community tra gruppi

## Visione futura

Se FUCIABOL crescesse, ogni gruppo potrebbe diventare una “lega”.

Più leghe potrebbero poi confrontarsi:

```text
Lega Bottoni
Lega Roma Nord
Lega Firenze
Lega Milano
Lega London
Lega Madrid
```

## Possibili feature future

```text
Tornei tra gruppi
Ranking leghe
Miglior player della città
Miglior bomber nazionale
Coppa FUCIABOL
Eventi speciali
Finali tra leghe
```

## Principio

Questa dimensione deve nascere dopo aver reso fortissima l’esperienza del singolo gruppo.

Prima bisogna creare un prodotto che faccia dire:

```text
Voglio usarlo anche col mio gruppo.
```

Solo dopo ha senso pensare a scala nazionale/internazionale.

---

# 25. Roadmap lunga: dal gruppo privato alla piattaforma

## Fase 1 — Lega privata forte

Obiettivo:

```text
FUCIABOL deve funzionare benissimo per un gruppo di amici.
```

Include:

- Match Live;
- statistiche;
- classifiche;
- scommesse;
- guest;
- disponibilità;
- WhatsApp share;
- sondaggi;
- Gazzetta;
- tabellini;
- correzione eventi.

Questa è la priorità attuale.

---

## Fase 2 — Community privata evoluta

Obiettivo:

```text
Rendere FUCIABOL vivo per tutta la settimana.
```

Include:

- Dashboard più sociale;
- prossima partita;
- sondaggi;
- hype pre-partita;
- Gazzetta autonoma;
- WhatsApp share;
- premi settimanali;
- Team of the Week;
- status player.

---

## Fase 3 — Multi-lega

Obiettivo:

```text
Permettere ad altri gruppi di creare la propria lega FUCIABOL.
```

Richiede:

- account utente;
- creazione gruppo/lega;
- ruoli admin/player;
- inviti;
- separazione dati per lega;
- privacy;
- configurazione regole.

---

## Fase 4 — Dashboard pubblica

Obiettivo:

```text
Confrontare giocatori e leghe diverse.
```

Include:

- classifiche pubbliche;
- filtri città/nazione/formato;
- ranking player;
- ranking leghe;
- profili pubblici;
- statistiche normalizzate.

---

## Fase 5 — Repository campetti

Obiettivo:

```text
Mappare e valutare i campi da calcetto.
```

Include:

- database campi;
- recensioni;
- voti post-partita;
- ricerca per zona;
- ranking campi;
- filtri per formato/servizi/prezzo.

---

## Fase 6 — Dimensione internazionale

Obiettivo:

```text
Creare un format esportabile in altri paesi.
```

Possibili mercati futuri:

```text
Italia
Regno Unito
Spagna
Portogallo
Francia
Germania
```

La base però deve restare universale:

```text
amici
calcetto
competizione
sfottò
statistiche
identità
community
```

---

# 26. Regola strategica finale

La crescita futura non deve far perdere la forza iniziale.

FUCIABOL non deve diventare subito una piattaforma generica.

Deve prima essere:

```text
la migliore app possibile per far vivere il calcetto tra amici
```

Solo dopo può diventare:

```text
una piattaforma nazionale/internazionale per community di calcetto
```

Priorità immediata:

```text
rendere fortissima la lega privata
```

Visione lunga:

```text
trasformare FUCIABOL in un social game calcistico amatoriale scalabile
```
