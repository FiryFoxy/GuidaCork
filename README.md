# ☘️ Guida Cork — Erasmus 2026

Guida interattiva per il soggiorno Erasmus a Cork (**11 luglio – 12 agosto 2026**): musei, pub, mercati, gite e planner uscite.

## Funzionalità

- Schede per cultura, nightlife, shopping e gite fuori porta
- Ricerca e filtro **preferiti** per ogni sezione
- **Planner uscite** con date nel periodo Erasmus, export/import JSON
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
map.js                  # Mappa Leaflet + filtri categoria
weather.js              # Previsioni Open-Meteo + consigli stagione
data/
  config.json           # Schede navigazione, date Erasmus, elenco file luoghi
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

## Note

- I dati del planner restano nel browser (`localStorage`).
- Alcuni siti (Facebook, Discover Ireland) possono bloccare richieste automatiche ma funzionano nel browser.
