# brandlo.de Social Manager

Lokale App für Instagram und TikTok:

- **Folgen dir nicht zurück**: zeigt alle Accounts, denen du folgst, die dir aber nicht folgen – einzeln entfolgen oder Ausgewählte automatisch entfolgen.
- **Leuten aus einem anderen Account folgen**: Benutzernamen eingeben, „Wem folgt dieser Account“ (oder dessen Follower) laden, dann einzeln folgen oder **allen automatisch folgen** – mit einstellbarer Pause (Standard 5 Sekunden) dazwischen. Accounts, denen du schon folgst, werden übersprungen.

## Wie es funktioniert

Instagram und TikTok bieten keine offizielle Schnittstelle zum Folgen/Entfolgen. Die App startet deshalb über
[Playwright](https://playwright.dev) ein eigenes Chrome-Fenster, in dem du dich ganz normal einloggst. Alle Aktionen
laufen in diesem Fenster mit deiner Anmeldung – genau so, als würdest du selbst klicken. Die Anmeldung wird im
Ordner `.social-profile/` gespeichert (steht in `.gitignore`, **nicht weitergeben** – enthält deine Login-Cookies).

Die App muss deshalb **auf deinem eigenen Rechner** laufen (nicht auf Vercel o. Ä.).

## Starten

```bash
npm install
npm run setup      # einmalig: lädt den Chromium-Browser für Playwright
npm run dev
```

Dann <http://localhost:3000> öffnen:

1. Plattform wählen (Instagram / TikTok) → **Login-Fenster öffnen** → im neuen Chrome-Fenster einloggen
   (inkl. 2FA/Captcha, falls gefragt).
2. **Verbinden / Status prüfen** → dein Account wird angezeigt.
3. **Analysieren** → Liste „Folgen dir nicht zurück“.
4. Unten Benutzernamen eingeben → **Anzeigen** → **Folgen** pro Person oder **Allen automatisch folgen**.
   Eine laufende Automatik zeigt oben den Fortschritt und lässt sich jederzeit **stoppen**.

Optionale Umgebungsvariablen:

| Variable | Bedeutung |
| --- | --- |
| `CHROMIUM_PATH` | Eigener Chrome/Chromium statt des Playwright-Browsers |
| `SOCIAL_HEADLESS=1` | Browser unsichtbar starten (Login geht dann nicht – nur nach erfolgtem Login nutzen) |

## Wichtige Hinweise

- **Limits der Plattformen**: Instagram und TikTok begrenzen, wie vielen Accounts man pro Stunde/Tag folgen oder
  entfolgen darf. Meldet die Plattform eine Sperre, **stoppt die Automatik von selbst**. Danach einige Stunden warten.
- Automatisiertes Folgen/Entfolgen verstößt gegen die Nutzungsbedingungen von Instagram und TikTok und kann zu
  temporären Sperren oder im schlimmsten Fall zur Sperrung des Accounts führen. Lieber kleinere Mengen und längere
  Pausen verwenden.
- Private Accounts: deren Listen sind nur sichtbar, wenn du ihnen folgst. Bei TikTok ist die „Gefolgt“-Liste vieler
  Accounts grundsätzlich privat.
- TikTok zeigt manchmal ein Captcha – dann einfach im Chrome-Fenster lösen und die Aktion wiederholen.
- Instagram/TikTok ändern ihre Webseiten regelmäßig. Wenn etwas nicht mehr klappt, sind meist die Selektoren in
  `src/lib/social/tiktok.ts` bzw. die Endpunkte in `src/lib/social/instagram.ts` anzupassen.

## Code-Überblick

```
src/lib/social/browser.ts    Playwright-Browser (persistentes Profil), ein Tab pro Plattform, Warteschlange
src/lib/social/instagram.ts  Instagram über die Web-API im eingeloggten Tab
src/lib/social/tiktok.ts     TikTok über die Profilseite (Listen-Popup mitlesen, Folgen-Button klicken)
src/lib/social/jobs.ts       Automatik: nacheinander folgen/entfolgen mit Pause, stoppbar
src/app/api/*                API-Routen für die Oberfläche
src/components/social/*      Oberfläche
```
