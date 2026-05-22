# ☘️ Guida Cork — Erasmus 2026

Guida interattiva per il soggiorno Erasmus a Cork (**11 luglio – 12 agosto 2026**): musei, pub, mercati, gite e planner uscite.

## Funzionalità

- Schede per cultura, nightlife, shopping e gite fuori porta
- Ricerca e filtro **preferiti** per ogni sezione
- **Planner uscite** con date nel periodo Erasmus, export/import JSON
- **Planning di gruppo** con utenti invitati, voti aggregati e approvazione admin
- Grafico budget mensile (Chart.js)
- Link verificati ai siti ufficiali (Cork City Council, Discover Ireland, ecc.)

## Anteprima locale

Il sito carica le sezioni via `fetch`. Apri sempre con un server locale:

```bash
cd GuidaCork
npx serve .
```

Poi apri `http://localhost:3000` (o la porta indicata).

## Pubblicare su GitHub Pages (gratuito)

1. Crea un repository su GitHub (es. `GuidaCork`) e carica tutti i file.
2. Vai su **Settings → Pages**.
3. **Source**: *Deploy from a branch*.
4. **Branch**: `main` (o `master`) · cartella **`/ (root)`**.
5. Salva. Il sito sarà disponibile su:

   `https://<tuo-username>.github.io/GuidaCork/`

> Il file `.nojekyll` evita che Jekyll ignori cartelle o file.

### Deploy automatico (opzionale)

È incluso il workflow `.github/workflows/pages.yml`: dopo ogni push su `main`, GitHub Pages si aggiorna da solo.

## Struttura

```
index.html              # App principale (carica i JSON all'avvio)
planner.js              # Logica planner + preferiti (localStorage)
planner-ui.js           # Interfaccia planner (agenda, calendario, mini-mappa)
supabase-client.js      # Connessione Supabase per utenti/proposte/voti
group-planning-ui.js    # UI planning di gruppo
map.js                  # Mappa Leaflet + filtri categoria
weather.js              # Previsioni Open-Meteo + consigli stagione
data/
  config.json           # Schede navigazione, date Erasmus, elenco file luoghi
  supabase-config.json  # Project URL e anon key pubblica Supabase
  coordinates.json      # Lat/lng per la mappa (chiave = id luogo)
  places/
    culture.json        # Musei, teatri…
    food.json           # Ristoranti e cafè
    nightlife.json      # Pub
    shopping.json       # Mercati e shopping
    excursions.json     # Gite fuori porta
sections/*.html         # Layout HTML di ogni scheda
```

## Modificare i luoghi

Apri il file JSON della categoria che ti interessa (es. `data/places/food.json`) e aggiungi o modifica un oggetto:

```json
{
  "id": "food-nuovo",
  "category": "food",
  "title": "Nome locale",
  "desc": "Descrizione…",
  "icon": "🍽️",
  "note": "Etichetta breve",
  "hours": "Mar-Sab 12:00–22:00",
  "url": "https://esempio.ie"
}
```

Campi utili per le gite: `transport`, `time`, `cost`. Salva e ricarica la pagina in Live Server.

Per cambiare le date del planner, modifica `erasmus` in `data/config.json`.

## Planning di gruppo con Supabase

Il sito resta statico, ma il planning condiviso usa Supabase per login, inviti, proposte, voti e approvazione finale.

1. Apri Supabase → SQL editor.
2. Esegui tutto il file `database/supabase-schema.sql`.
3. In Supabase → Project Settings → API copia la publishable key pubblica.
4. Incollala in `data/supabase-config.json` nel campo `anonKey`.
5. Crea il primo admin dal database dopo il primo accesso, oppure inserisci manualmente un invito admin nella tabella `invites`.

Esempio per pre-invitare un admin dal SQL editor:

```sql
insert into public.invites (email, role)
values ('admin@email.it', 'admin');
```

Se preferisci accesso con password, invita prima l'email: al primo accesso il sito crea l'account Supabase solo per quell'email invitata. Il magic link resta disponibile come alternativa.

Se creando una proposta compare l'errore `new row violates row-level security policy for table "proposal_versions"`, esegui in SQL Editor il file `database/patch-proposal-versions-rls.sql`.

Regole implementate:

- Solo chi ha un invito attivo ottiene un profilo `active`.
- I voti sono visibili nel sito solo come conteggi aggregati.
- Ogni modifica importante a una proposta crea una nuova versione.
- Dopo una modifica, i voti precedenti restano nello storico e gli utenti devono votare la versione corrente.
- Solo gli admin possono approvare il planning finale.
- Sono consentiti al massimo 3 admin attivi o invitati.

## Note

- I dati del planner personale restano nel browser (`localStorage`).
- La password del database non deve essere messa nei file pubblici del sito.
- Alcuni siti (Facebook, Discover Ireland) possono bloccare richieste automatiche ma funzionano nel browser.
