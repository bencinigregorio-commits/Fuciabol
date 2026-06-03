Certo. Puoi aggiungere questo blocco in fondo ad `AGGIORNAMENTO.md`.

````md
# AGGIORNAMENTO FUCIABOL — Stato UI e prossima fase

## Stato attuale interfaccia

È stato completato un blocco importante di polish grafico globale.

### Risultati raggiunti

- La pagina **Statistiche** è diventata il nuovo riferimento visivo dell’app.
- Le **player card** sono state portate a una versione molto più moderna:
  - card verticali;
  - render PNG trasparenti integrati sopra la card;
  - niente più photo-frame/quadratino foto;
  - rarità dinamiche Bronze / Silver / Gold / IF;
  - stats bar più moderna;
  - nome integrato nella card;
  - card IF più riconoscibile.
- Il **menu globale** è stato migliorato:
  - meno emoji;
  - icone più pulite;
  - chip utente/admin più premium;
  - pannello menu più coerente con PWA/mobile app.
- Gli header di **Statistiche, Classifica e Calendario** sono stati uniformati:
  - box icona dark glass;
  - bordo/glow ciano;
  - titolo uppercase;
  - font system-ui;
  - peso 900;
  - letter-spacing 3px;
  - sottotitolo muted uppercase;
  - divisore ciano.
- Sono stati aggiornati anche **Scommesse**, **Admin** e piccoli elementi della **Dashboard**, ma va ancora verificata la piena coerenza visiva di queste sezioni.
- La Dashboard non va stravolta: la hero attuale funziona, va solo rifinita nei dettagli se necessario.

## Principio visivo da mantenere

La grafica di riferimento ora è:

**FUCIABOL Premium Sports App Neon**

Caratteristiche:
- dark UI;
- ciano controllato;
- card dinamiche;
- look sportivo premium;
- niente emoji giganti non integrate;
- niente font serif/fantasy negli header;
- niente stile Bootstrap/admin dashboard;
- mobile-first;
- app-like, non sito web.

## Regola importante sulle immagini giocatore

Le immagini dei giocatori devono essere:

- PNG con trasparenza reale;
- solo player render;
- nessuno sfondo;
- nessun glow dietro;
- nessuna card statica;
- nessun numero/testo/badge;
- render da appoggiare sopra la card React dinamica.

La card deve essere generata dal codice React, non dall’immagine.

Formula corretta:

```text
React = card dinamica + overall + ruolo + stats + rarità
PNG = solo giocatore scontornato
Supabase = dati + foto_url
````

## Stato dei file principali

### Da considerare già migliorati

* `src/pages/Statistiche.jsx`
* `src/Layout.jsx`
* `src/App.jsx`
* `src/pages/Classifica.jsx`
* `src/pages/Calendario.jsx`

### Da verificare dopo ultimo polish

* `src/pages/Scommesse.jsx`
* `src/pages/Admin.jsx`
* `src/pages/Dashboard.jsx`

In particolare, se restano emoji interne o elementi serif/vecchi, vanno sostituiti con SVG/icon box coerenti, senza stravolgere le logiche.

## Cosa NON fare adesso

Non tornare a modificare pesantemente:

* player card;
* Dashboard hero;
* Layout globale;
* menu;
* header già uniformati.

La grafica globale è abbastanza stabile. Ora bisogna evitare redesign continui.

## Prossima fase consigliata

La prossima fase importante non è più solo estetica, ma funzionale:

# Match Live dentro Calendario

Obiettivo:

creare un ciclo partita completo:

```text
In programma → Live → Chiusa
```

## Funzionalità desiderata

### Stato: In programma

La partita appare nel Calendario come programmata.

Admin può cliccare:

```text
Avvia Live
```

### Stato: Live

Quando la partita è live, deve comparire una sezione **Match Live**.

Funzioni admin:

* vedere Squadra A e Squadra B;
* aggiungere gol ai giocatori;
* aggiungere assist ai giocatori;
* aggiornare automaticamente il punteggio;
* modificare eventi se serve;
* chiudere la partita.

I player normali possono vedere il live, ma non modificarlo.

### Stato: Chiusa

Quando la partita viene chiusa:

* il risultato resta salvato;
* gli eventi gol/assist restano salvati;
* la partita passa alle partite concluse;
* viene mostrato un tabellino bello;
* restano compatibili votazioni, scommesse e Gazzetta.

## Tabellino partite concluse

Le partite passate vanno rese molto più belle.

Ogni partita chiusa dovrebbe mostrare:

* squadre;
* risultato finale;
* data;
* stato;
* marcatori;
* assist;
* eventuale MVP;
* votazioni se disponibili;
* eventuali effetti su crediti/scommesse.

Esempio struttura:

```text
Fuciabol A 7 - 5 Fuciabol B

Marcatori:
Lovino ⚽⚽
Bencini ⚽
Jack ⚽⚽⚽

Assist:
Scatizzi 🎯
Gemma 🎯🎯

MVP:
Lovino — 8.9
```

Lo stile deve essere premium FUCIABOL, non tabella grezza.

## Prima di implementare Match Live

Prima di scrivere codice, Claude deve analizzare:

* struttura attuale tabella `partite`;
* valori esistenti di `stato`;
* campo `eventi`;
* campi `squadra_a`, `squadra_b`;
* eventuali relazioni con votazioni;
* eventuali relazioni con scommesse;
* eventuali relazioni con Gazzetta;
* file coinvolti, soprattutto `Calendario.jsx`.

Non implementare subito senza analisi.

## Prompt consigliato per Claude

```text
Voglio progettare la prossima feature core di FUCIABOL: Match Live dentro Calendario.

Prima di scrivere codice, analizza il progetto e dimmi se il database e il codice attuale permettono già questo flusso:

In programma → Live → Chiusa

Obiettivo funzionale:
1. Le partite in programma devono poter essere avviate dall’admin con un bottone “Avvia Live”.
2. Quando una partita è live, deve comparire una modalità Match Live.
3. In Match Live l’admin deve poter segnare gol e assist cliccando sui giocatori delle due squadre.
4. Il punteggio squadra deve aggiornarsi automaticamente in base ai gol inseriti.
5. Gli eventi devono essere salvati nella partita, possibilmente nel campo eventi già esistente.
6. Alla fine l’admin deve poter cliccare “Chiudi partita”.
7. Una partita chiusa deve mostrare un tabellino bello:
   - risultato finale;
   - marcatori;
   - assist;
   - eventuale MVP;
   - stato partita chiusa.
8. I player normali devono poter vedere il live e il tabellino, ma non modificarli.
9. Solo admin può modificare il live match.

Prima di implementare, dimmi:
- quali campi esistono già nella tabella partite;
- se stato può già usare valori tipo pre_partita/live/chiusa;
- se eventi è già adatto a salvare gol e assist;
- quali file andrebbero modificati;
- se serve cambiare Supabase oppure no;
- qual è il piano più sicuro per implementarlo senza rompere Calendario, Scommesse, votazioni e Gazzetta.

Non scrivere ancora codice.
Dammi prima solo analisi e piano operativo.
```

## Priorità prossima

Ordine consigliato:

1. Verificare che tutti gli header siano davvero uniformati.
2. Chiudere eventuali micro-polish residui su Scommesse/Admin/Dashboard.
3. Fare analisi tecnica Match Live.
4. Implementare Match Live in Calendario.
5. Migliorare tabellini partite concluse.
6. Solo dopo pensare a:

   * foto speciali;
   * `foto_special_url`;
   * Team of the Week;
   * Gazzetta più narrativa;
   * guest player.

```

Questo aggiornamento è pensato per far capire a Claude che **la fase grafica principale è quasi chiusa** e che il prossimo blocco serio è **Calendario / Match Live / tabellini**.
```
