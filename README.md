# Gym Tracker

Einfache Web-App fürs Handy, mit der du deinen festen Trainingsplan (5 Trainings in Rotation) abarbeitest:
Training starten → Sätze mit kg/Wdh. abhaken → beenden → das Training steht im Kalender.

Die App läuft komplett im Browser und braucht keinen Server und kein Konto. Sie funktioniert auch offline im Gym.

## Funktionen

- **Trainingsplan**: Oberkörper · Unterkörper A · Push · Pull · Unterkörper B (in `plan.js`).
  Zwischen den Trainings wischen oder oben auf 1–5 tippen. ✓ = in den letzten 7 Tagen erledigt.
- **Training abhaken**: pro Satz kg und Wiederholungen eintragen und ✓ antippen. Leere Felder werden
  mit den Werten vom letzten Mal (grau vorausgefüllt) übernommen. Sätze lassen sich hinzufügen/entfernen.
- **Kalender**: jedes beendete Training wird automatisch gespeichert und im Monatskalender angezeigt,
  mit allen Sätzen, Dauer und Uhrzeit.
- **Handy-Kalender**: Mit „In Handy-Kalender“ wird eine `.ics`-Datei erzeugt, die du in Apple-/Google-Kalender
  übernehmen kannst. Unter „Daten“ kannst du auch alle Trainings auf einmal exportieren.
- **Backup**: Unter „Daten“ ein Backup (JSON) speichern bzw. laden, z. B. für ein neues Handy.

## Auf dem Handy nutzen (GitHub Pages)

1. Auf GitHub im Repository: **Settings → Pages → Build and deployment**
   - Source: **Deploy from a branch**
   - Branch: den Branch mit der App wählen (z. B. `master`), Ordner **/ (root)** → **Save**
2. Nach ca. 1 Minute läuft die App unter `https://<benutzername>.github.io/gym-tracker/`.
3. Die Seite auf dem Handy öffnen:
   - **iPhone (Safari)**: Teilen-Symbol → **Zum Home-Bildschirm**
   - **Android (Chrome)**: Menü ⋮ → **App installieren** / **Zum Startbildschirm hinzufügen**

> Die Trainingsdaten liegen lokal auf dem Handy, im Speicher des Browsers bzw. der Homescreen-App.
> Am besten immer dieselbe Homescreen-App nutzen und ab und zu ein Backup machen.

## Plan ändern

Übungen, Sätze und Wiederholungen stehen in [`plan.js`](plan.js). Nach einer Änderung in `sw.js` die
Versionsnummer (`gym-tracker-v1` → `v2`) hochzählen, damit das Handy die neue Version lädt.

## Lokal testen

```bash
python3 -m http.server 8000
# → http://localhost:8000
```
