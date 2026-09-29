# Meshfield: neue Projekt-Instanz aufsetzen

Dieser Fork (`konradvb/quackback`, Branch `meshfield-b2-storage`) ist die
gemeinsame Vorlage für **alle** Meshfield-Produkte. Jedes Produkt bekommt eine
eigene, komplett isolierte Quackback-Instanz — kein gemeinsamer Workspace,
keine gemeinsame Datenbank (siehe Begründung unten). Diese Datei ist die
Kopier-Anleitung, damit das nicht jedes Mal neu recherchiert werden muss.

## Warum pro Projekt eine eigene Instanz

Quackback ist architektonisch "single workspace" (ein `DATABASE_URL`, ein
Workspace-Name, eine gemeinsame Board-Liste — auch das eingebettete Widget
teilt sich diese Instanz-Config, `defaultBoard` filtert nur die
Neu-Post-Vorauswahl, nicht das Durchsuchen/Voten). Ein gemeinsamer Server für
mehrere Produkte hätte bedeutet: ein Produkt sieht die Boards/Namen der
anderen. Deshalb: **ein Coolify-Deployment pro Produkt**, alle aus diesem
einen Fork.

## Checkliste: neue Instanz für Produkt "X"

1. **DNS (Cloudflare, Zone des Produkts, z. B. `x.app`):** A-Record
   `feedback.x.app` → Server-IP (`46.38.240.150`), Proxied.
2. **Backblaze B2:** neuer Bucket `meshfield-x-uploads` (Private, Default
   Encryption), neue Application Key **nur für diesen Bucket** (Read+Write) —
   nie die Backup-Credentials oder einen anderen Projekt-Key wiederverwenden.
3. **Coolify:** neue Application im Projekt "Meshfield und Webseiten" →
   Git Source `konradvb/quackback`, Branch `meshfield-b2-storage`, Compose
   `docker-compose.prod.yml`. Domain: `https://feedback.x.app`.
4. **Environment Variables** (Production, Developer View) — Vorlage:
   ```
   BASE_URL=https://feedback.x.app
   SECRET_KEY=<neu, openssl rand -base64 32>
   QUACKBACK_TAG=0.13.2
   APP_PORT=3000
   POSTGRES_USER=quackback
   POSTGRES_PASSWORD=<neu, openssl rand -base64 24 — KEINE Sonderzeichen wie / falls möglich>
   POSTGRES_PASSWORD_URLENC=<dieselbe Passwort, aber URL-encoded — siehe Gotcha unten>
   POSTGRES_DB=quackback
   S3_ENDPOINT=https://s3.eu-central-003.backblazeb2.com
   S3_BUCKET=meshfield-x-uploads
   S3_REGION=eu-central-003
   S3_ACCESS_KEY_ID=<neuer Key aus Schritt 2>
   S3_SECRET_ACCESS_KEY=<neuer Key aus Schritt 2>
   EMAIL_FROM=Quackback <accounts@meshfield.io>
   ```
5. **Deploy**, dann `/api/health` prüfen (`{"status":"ok"}`).
6. **Onboarding im Browser:** Account/Workspace/Boards durchklicken.
   - **Admin-E-Mail immer `accounts@meshfield.io`** (dieselbe wie bei allen
     anderen Instanzen — kein SSO zwischen Instanzen möglich, aber
     wenigstens dieselbe Adresse/dasselbe Passwort überall).
   - Workspace-Name = Produktname (nicht "Meshfield").
   - Boards NICHT mit Produkt-Präfix benennen (anders als beim
     Multi-App-Versuch auf einer gemeinsamen Instanz) — hier reicht
     "Bug Reports" / "Feature Requests" / "UX Feedback", da die Instanz
     eh nur für dieses eine Produkt ist.
7. **Board-Zugriff:** Voten offen für alle (kein Login), Kommentieren/Posten
   hinter Login (Abwägung siehe Projekt-Gedächtnis `meshfield-ops-stack`).
8. **Backup einrichten** (noch nicht als Vorlage vorhanden — offener Punkt,
   siehe Projekt-Gedächtnis): Postgres-Dump → B2, analog zu den anderen
   Meshfield-Backups.

## Bekannte Stolpersteine (bereits gelöst, hier dokumentiert)

- **MinIO ist tot:** MinIO Inc. hat 2025 alle Images hinter Login gesperrt
  (Docker Hub *und* quay.io). Deshalb ist MinIO aus dem Compose entfernt,
  B2 direkt als S3-Backend. Nicht versuchen, MinIO zu reaktivieren.
- **Passwort-URL-Encoding-Falle:** Compose interpoliert `${VAR}` nicht
  URL-sicher. Enthält `POSTGRES_PASSWORD` Sonderzeichen wie `/`, bricht die
  `DATABASE_URL` beim App-Start (`ERR_INVALID_URL`). Deshalb der zweite,
  separat URL-encodete `POSTGRES_PASSWORD_URLENC` nur für die
  `DATABASE_URL`-Zeile im Compose. Am einfachsten: beim Passwort-Generieren
  gleich auf Sonderzeichen verzichten, dann sind beide Variablen identisch.
- **Coolifys "Docker compose content (raw)"-Feld ist read-only** bei
  Git-Source-Apps. Änderungen immer im Fork-Repo committen, dann in Coolify
  "Reload Compose" klicken (sonst validiert Coolify gegen die alte,
  gecachte Compose-Version und blockt Env-Var-Änderungen).
- **Magic-Link-Login funktioniert nur mit konfiguriertem SMTP** (Brevo o.ä.
  — `EMAIL_SMTP_*`-Variablen, aktuell bei keiner Instanz gesetzt). Bis dahin
  nur Passwort-Login nutzen, keine Magic-Link-Flows testen.

## Verwandt

Cross-Instanz-Übersicht (welche Produkte haben schon eine Instanz, welche
Domain, welcher Bucket) gehört ins Claude-Gedächtnis, nicht hierher — diese
Datei ist die Kopier-Anleitung, keine Bestandsliste.
