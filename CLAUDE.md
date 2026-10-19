# cageneve.ch – Projektwissen für Claude

Diese Datei fasst alles Wichtige zum Projekt zusammen, damit eine neue
Claude-Sitzung (Claude Code oder claude.ai) sofort weiterarbeiten kann.
Sie enthält bewusst **keine Passwörter oder Schlüssel** – das Repository ist öffentlich.

Stand: 19.10.2026

## Worum es geht

Website der **Komuniteti Shqiptar i Gjenevës / Communauté Albanaise de Genève (KShGj)**,
einer gemeinnützigen Vereinigung in Genf. Die Website ist **zweisprachig: Albanisch (SQ) und
Französisch (FR)**. Der Verwaltungsbereich ist zusätzlich auf **Deutsch (DE)** verfügbar.

- Live-Website: https://www.cageneve.ch
- Verwaltungsbereich (Admin): https://www.cageneve.ch/admin.html
- Erstellt und betreut von Ida Avdiu (GitHub `idaavdiu`)

## Arbeitsweise mit Ida

- **Kommunikation auf Deutsch**, einfach und ohne Fachjargon; Ida ist keine Entwicklerin.
  Bei Schritten in Vercel/GitHub-Oberflächen genau sagen, wo man klickt.
- **Claude darf selbst committen und auf `master` pushen.** Ein Push auf `master` deployt
  automatisch über Vercel (ca. 1 Minute). Danach live prüfen (z.B. mit `curl`), ob die
  Änderung angekommen ist.
- `gh` (GitHub CLI) ist auf Idas Rechner als `idaavdiu` angemeldet (Scopes inkl. `repo`, `workflow`).
- Die Vercel-CLI ist **nicht** installiert, und Claude hat keinen Zugang zum Vercel-Dashboard.
  Umgebungsvariablen ändern und Redeploys aus dem Dashboard macht Ida selbst, mit Anleitung.
- Vor größeren Änderungen an der Homepage: das Ergebnis vorher lokal prüfen
  (`python -m http.server` im Projektordner und Headless-Edge-Screenshots bzw. `--dump-dom`;
  Edge liegt unter `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`).
  Achtung: Headless-Screenshots im Desktop-Modus haben eine Mindestbreite von ~500 px; für
  Handy-Ansichten über das DevTools-Protokoll mit `Emulation.setDeviceMetricsOverride` (mobile: true) messen.

## Orte

| Was | Wo |
|---|---|
| Lokaler Projektordner (Git-Repo) | `C:\Users\Ida Avdiu\Documents\cageneve\source-69cee8d18579f6229731c730-db73e89ed903c385` |
| GitHub (öffentlich, Live-Quelle) | https://github.com/idaavdiu/cageneve – Branch `master` |
| GitHub-Backup (privat) | https://github.com/idaavdiu/cageneve-backup |
| Lokale Backup-Datei | `C:\Users\Ida Avdiu\Documents\cageneve\backups\cageneve-*.bundle` |
| Hosting | Vercel, Projekt mit dem GitHub-Repo verbunden, Domain www.cageneve.ch |
| Alter Ordner (nicht mehr verwendet) | `C:\Users\Ida Avdiu\Documents\cageneve\deploy-69cee8f03b97c60ddd65f47b` (früheres Netlify-Deployment) |

## Aufbau

Reine statische Website ohne Build-Schritt, plus Vercel Serverless Functions in `api/`.
Vercel liefert jede Datei im Repo öffentlich aus. `vercel.json` leitet deshalb `/CLAUDE.md` auf
die Startseite um; neue interne Dateien dort ebenfalls eintragen.

- `index.html` und `cageneve.html` – die Homepage. **Beide Dateien müssen identisch bleiben**
  (jede Änderung in beiden machen und mit `diff -q index.html cageneve.html` prüfen).
  Sprachwahl über `setLang('sq'|'fr')` und `<span class="lang-sq">…</span><span class="lang-fr">…</span>`.
- `assets/site-data.js` – lädt `data/*.json` und rendert damit auf der Homepage die Bereiche
  **Ngjarjet (Flyer/Events)**, **Dokumente**, **Kryesia (Vorstand)** und **Sponsorë**.
  Im HTML sind diese Grids leer (`<div class="events-grid"></div>` usw.).
- `data/events.json`, `data/documents.json`, `data/board.json`, `data/sponsors.json` – die Inhalte.
  Die **Reihenfolge im Array ist die Anzeigereihenfolge** (Flyer werden nicht mehr nach Datum sortiert;
  Dokument-Jahre schon, absteigend).
- `admin.html` – Verwaltungsbereich (eine Datei, `<script type="module">`), Reiter:
  Flyer · Dokumente · Kryesia · Sponsoren. Texte in einem `I18N`-Objekt für `de`, `sq`, `fr`;
  neue UI-Texte immer in allen drei Sprachen ergänzen.
- Bilder/PDFs, die schon immer da waren, liegen direkt im Repo (`Foto AFISHE/`, `FOTO REKLAMA/`,
  `Dokumente-Raportet/`, Porträts im Hauptordner). **Neue Uploads über den Admin landen in
  Vercel Blob** (öffentliche URLs `https://….public.blob.vercel-storage.com/…`), nicht im Repo.

### So speichert der Admin

Der Admin schreibt **nicht** in eine Datenbank, sondern ändert `data/*.json` direkt auf GitHub
über die GitHub-API (`api/_github.js`, Committer `cageneve-admin`). Jede Änderung im Admin ist
also ein Commit auf `master` und löst ein Vercel-Deployment aus (Website ist nach ~1 Minute aktuell).

**Darum vor jedem eigenen Push immer zuerst `git pull --rebase --autostash`**, sonst kollidiert
man mit Änderungen, die Ida inzwischen im Admin gemacht hat.

### API (`api/`)

| Datei | Zweck |
|---|---|
| `_auth.js` | Session-Cookie `cageneve_admin_session` (HMAC mit `SESSION_SECRET`, 7 Tage gültig), `requireAuth` |
| `_captcha.js`, `captcha.js` | Rechen-Captcha vor dem Login: `GET` liefert Aufgabe, `POST` prüft Antwort und gibt einen 2-Minuten-Pass zurück (zustandslos, HMAC) |
| `login.js` | `POST {password, captchaPass}` – braucht gültigen Captcha-Pass, vergleicht mit `ADMIN_PASSWORD` |
| `logout.js` | Cookie löschen |
| `_github.js` | `getJsonFile`, `putJsonFile` (GitHub Contents API), `reorderById` |
| `events.js`, `documents.js`, `board.js`, `sponsors.js` | CRUD für die jeweilige JSON-Datei: `GET`, `POST` (neu), `PUT` (bearbeiten), `PATCH {ids}` (Reihenfolge), `DELETE ?id=` |
| `upload.js` | Erzeugt Vercel-Blob-Client-Tokens für Uploads aus dem Admin |

Upload im Browser: `admin.html` holt den Client-Token über `api('/api/upload', …)` selbst und
lädt dann mit `put()` aus `@vercel/blob/client` hoch. (Nicht die SDK-Funktion `upload()` verwenden –
die verschluckt die echte Fehlermeldung des Servers als „Failed to retrieve the client token“.)

Drag & Drop im Admin: SortableJS 1.15.6 (ESM von jsDelivr), Griff `.drag-handle` (⠿), Funktion
`makeSortable()` speichert sofort per `PATCH`. Funktioniert am Handy über den Griff.

## Umgebungsvariablen in Vercel (Werte nur im Vercel-Dashboard!)

Vercel → Projekt → **Settings → Environment Variables**. Nach jeder Änderung
**Deployments → oberster Eintrag → ⋯ → Redeploy**, sonst gilt der neue Wert nicht.

| Name | Zweck |
|---|---|
| `ADMIN_PASSWORD` | Passwort für den Verwaltungsbereich |
| `SESSION_SECRET` | Lange Zufallszeichenkette für Session-Cookies und Captcha; ändern = alle abmelden |
| `GITHUB_TOKEN` | GitHub-Token mit Schreibrecht auf `idaavdiu/cageneve` (für das Speichern im Admin) |
| `BLOB_READ_WRITE_TOKEN` | Vercel-Blob-Schlüssel, beginnt mit `vercel_blob_rw_`. Entsteht, wenn man den Blob-Speicher unter Storage mit dem Projekt verbindet |

Lehre aus Oktober 2026: Beim Einrichten von Blob wurde versehentlich Beispielcode
(`import { put } from …`) statt des Schlüssels in eine falsch benannte Variable kopiert.
Bei Blob-Fehlern zuerst prüfen, ob `BLOB_READ_WRITE_TOKEN` richtig gesetzt ist.

## Backup

- Privates Repo `idaavdiu/cageneve-backup`, Standard-Branch `backup-bot`, mit GitHub Action
  „Wöchentliches Backup“ (`.github/workflows/backup.yml`, **jeden Montag ~05:17**, auch manuell
  über *Actions → Run workflow*):
  - spiegelt alle Branches von `idaavdiu/cageneve` (`master` usw.),
  - legt Tags `snapshot-JJJJ-MM-TT` an, wenn sich `master` geändert hat (alte Stände bleiben erhalten),
  - lädt alle in `data/*.json` referenzierten Vercel-Blob-Dateien nach `blobs/` (`scripts/backup-blobs.mjs`).
- Die README im Backup-Repo erklärt die Wiederherstellung.
- Ida wollte bewusst **kein tägliches** Backup; wöchentlich reicht.

## Verlauf (wichtigste Schritte)

- Admin-Bereich mit Flyern und Dokumenten (Uploads via Vercel Blob), Sprachwahl DE/SQ/FR.
- 19.10.2026: Blob-Upload-Fehler behoben (falscher Token in Vercel), Drag & Drop für Flyer und
  Dokumente, Login-Knopf auf der Homepage (Desktop: 🔒 Hyrje/Connexion; Handy: im ☰-Menü),
  Rechen-Captcha vor dem Admin-Passwort, Kryesia und Sponsoren im Admin verwaltbar
  (inkl. Fotos/Logos, Texte, optionaler Sponsor-Link), Handy-Kopfzeile neu angeordnet
  (Logo links; Sprache, „Bëhu anëtar“ und ☰ rechts), automatisches Backup eingerichtet.

## Offene Punkte / Ideen

- Ida sollte das Admin-Passwort ändern (es stand am 19.10.2026 in einem Chat).
- Bei 320 px Breite (sehr alte Handys) ist die Homepage ca. 20 px zu breit – nicht von der Kopfzeile,
  sondern von einem anderen Element; bisher nicht behoben.
