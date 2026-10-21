# Formazioni e campioncini — prova locale

Ramo: feature/formazioni-campioncini.

## Cosa provare

1. Avviare `npm run dev` e aprire http://127.0.0.1:5173/formazioni-demo.html.
2. La demo usa dati di esempio, non scrive su Supabase. Mostra cinque per squadra, il campioncino Bencini e i quattro robot ospiti.
3. Provare senza portiere, squadra incompleta, modifica dei ruoli e preparazione/scaricamento della locandina.
4. Nel calendario reale il campo appare sulle partite in programma. Iscrizioni, lista convocati e invito testuale WhatsApp restano disponibili.

## Attivazione del salvataggio

Nel progetto Supabase, SQL Editor, eseguire il contenuto di `supabase/migrations/0003_formazioni_campioncini.sql`.
Lo script aggiunge tre campi opzionali sui giocatori e un JSON delle scelte di ruolo sulla partita. Mantiene la protezione della colonna PIN. Non cambia nomi, foto, voti o partite esistenti.

Senza migrazione: il campo e la locandina funzionano con dati e immagini attuali, il campioncino Bencini incluso e i robot ospiti. Il salvataggio segnala chiaramente che manca l'aggiornamento; non viene dichiarato riuscito.

Dopo la migrazione: Admin → Campioncini consente un nome breve personalizzato, il caricamento di un'immagine (PNG trasparente consigliato) separata dalla foto del profilo e la scelta dell'avatar guest. Riutilizza il bucket `foto-giocatori`, già esistente. Le nuove immagini vengono ridimensionate a un massimo di 512 px all'upload.

## Regole

- Nome automatico: cognome per nomi completi, soprannome per nomi singoli, Maestro per Il Maestro. Il campo personalizzato gestisce le eccezioni senza rinominare il profilo.
- I guest conservano un avatar stabile, scelto dall'ID fra quattro SVG condivisi. Non caricano immagini personali sul campo.
- Le posizioni sono determinate dai ruoli; i doppi ruoli occupano una linea meno affollata. L'admin può scegliere un ruolo diverso per la singola partita e tornare ad Automatico.
- Al massimo un portiere per squadra. Se mancante: portiere a turno, senza trasformare un giocatore in un portiere fittizio. In caso di più candidati portieri il primo viene schierato in porta, gli altri in movimento.
- Nessun giocatore inventato per completare le squadre: i posti liberi sono indicati nel contatore.
- La condivisione avviene in due passi: preparazione/anteprima e poi condivisione. Questo mantiene il gesto dell'utente richiesto dai browser mobili. Il destinatario WhatsApp viene scelto dall'utente. Su browser senza condivisione di file è disponibile lo scaricamento PNG.

## Verifiche

- `node --test tests/formazioni.test.mjs`
- `npm run build`
- Verifiche responsive effettuate a 390 px: dieci avatar, cinque per metà, nessun overflow orizzontale o sovrapposizione nella demo; locandina PNG generata; caso senza portiere e modifica ruolo provati.

Non sono state applicate migrazioni remote né pubblicati cambiamenti su Vercel. La condivisione effettiva su WhatsApp richiede una prova sul telefono fisico.
