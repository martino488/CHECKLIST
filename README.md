# Estrattore checklist su Netlify

Pagina statica + una Netlify Function. Le checklist si salvano in un file `checklists.json` dentro un repository GitHub privato, quindi le ritrovi da PC e da telefono.

```
public/                       pagina, manifest e icone (già pronta, non serve nessuna build)
netlify/functions/checklist.js   legge e scrive il file su GitHub, protetta da PIN
netlify.toml                  configurazione Netlify
app.template.html, parser.js,
sample.txt, build.js          sorgenti: `node build.js` rigenera public/index.html
```

## Perché due repository

- **Repo del sito** (questo progetto): ogni commit fa partire un deploy.
- **Repo dei dati** (privato, separato): qui la function scrive ad ogni salvataggio. Se i dati stessero nel repo del sito, ogni spunta causerebbe un nuovo deploy.

## Configurazione

1. **Repo del sito.** Crea un repository su GitHub e carica il contenuto di questa cartella.
2. **Repo dei dati.** Crea un secondo repository **privato**, per esempio `checklist-data`, spuntando "Add a README file" (serve che il branch `main` esista).
3. **Token GitHub.** GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token.
   - Repository access: *Only select repositories* → `checklist-data`
   - Permissions → Repository permissions → **Contents: Read and write**
   - Copia il token (`github_pat_...`).
4. **Netlify.** Add new project → Import an existing project → GitHub → scegli il repo del sito. Le impostazioni di build vengono lette da `netlify.toml`.
5. **Variabili d'ambiente.** Project configuration → Environment variables:

   | Nome | Valore |
   |---|---|
   | `GITHUB_TOKEN` | il token del punto 3 |
   | `GITHUB_REPO` | `tuo-utente/checklist-data` |
   | `APP_PIN` | un PIN o una frase lunga, che userai per entrare |

   Opzionali: `GITHUB_BRANCH` (default `main`), `GITHUB_PATH` (default `checklists.json`).
6. **Nuovo deploy.** Deploys → Trigger deploy → Deploy project (le variabili valgono dal deploy successivo).
7. **Primo accesso.** Apri l'indirizzo Netlify, inserisci il PIN quando richiesto. Il PIN resta salvato su quel dispositivo.

## Sul telefono

Apri l'indirizzo, inserisci il PIN, poi:
- iPhone (Safari): Condividi → Aggiungi alla schermata Home
- Android (Chrome): menu ⋮ → Aggiungi a schermata Home / Installa app

## Come funziona la sincronizzazione

- Ogni modifica si salva subito sul dispositivo e, dopo circa un secondo, su GitHub (un commit "Aggiorna checklist").
- Quando riapri l'app o torni su di essa, scarica le novità. Se due dispositivi modificano insieme, per ogni checklist vince la modifica più recente.
- Senza rete le modifiche restano sul dispositivo e partono al ritorno della connessione.
- Se apri `public/index.html` come file locale, funziona senza sincronizzazione ("Solo su questo dispositivo").

## Sicurezza

- Il PIN è l'unica protezione dell'indirizzo pubblico: scegline uno lungo. Chi non lo conosce non può leggere né scrivere i dati.
- Il token GitHub non arriva mai al browser: resta nelle variabili Netlify.
- Il contenuto delle checklist (e dei documenti incollati) finisce nel repo dei dati: tienilo privato.
- Il PDF o il Word caricato viene letto nel browser; ne viene salvato solo il testo estratto.
