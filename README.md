# Gym Tracker

Einfache Web-App fürs Handy, mit der du deinen festen Trainingsplan (5 Trainings in Rotation) abarbeitest:
Training starten → Sätze mit kg/Wdh. abhaken → beenden → das Training steht im Kalender.

Die App läuft komplett im Browser und braucht keinen Server und kein Konto. Sie funktioniert auch offline im Gym.

## Funktionen

- **Trainingsplan**: Oberkörper · Unterkörper A · Push · Pull · Unterkörper B (Original in `plan.js`).
  Zwischen den Trainings wischen oder oben auf den Namen tippen. ✓ = in den letzten 7 Tagen erledigt.
- **Plan anpassen**: „+ Übung hinzufügen“ fügt eine Übung zum Training hinzu (mit Vorschlägen aus allen
  Trainings). Über „⋯“ an jeder Übung: bearbeiten, nach oben/unten schieben oder aus dem Plan entfernen.
- **Training abhaken**: pro Satz kg und Wiederholungen eintragen und ✓ antippen. Leere Felder werden
  mit den Werten vom letzten Mal (grau vorausgefüllt) übernommen. Sätze lassen sich hinzufügen/entfernen.
- **Übungen während des Trainings**: unten „+ Übung hinzufügen“ – wahlweise nur für dieses Training oder
  auch dauerhaft im Plan. Über „⋯“ eine Übung verschieben oder für dieses Training entfernen.
- **Kalender**: jedes beendete Training wird automatisch gespeichert und im Monatskalender angezeigt,
  mit allen Sätzen, Dauer und Uhrzeit.
- **Handy-Kalender**: Mit „In Handy-Kalender“ wird eine `.ics`-Datei erzeugt, die du in Apple-/Google-Kalender
  übernehmen kannst. Unter „Daten“ kannst du auch alle Trainings auf einmal exportieren.
- **Backup**: Unter „Daten“ ein Backup (Trainings + Plan) speichern bzw. laden, z. B. für ein neues Handy.

## Auf dem Handy nutzen (GitHub Pages)

Hinweis: Mit einem kostenlosen GitHub-Konto funktioniert Pages nur bei **öffentlichen** Repositories
(Settings → General → Danger Zone → Change visibility). Deine Trainingsdaten liegen nicht im Repository.

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

Am einfachsten direkt in der App (siehe oben). Der angepasste Plan wird auf dem Handy gespeichert;
„Daten → Plan zurücksetzen“ stellt das Original aus [`plan.js`](plan.js) wieder her.

Wer `plan.js` selbst ändert: Danach in `sw.js` die Versionsnummer (z. B. `gym-tracker-v3` → `v4`) hochzählen,
damit das Handy die neue Version lädt. Ein in der App angepasster Plan hat Vorrang vor `plan.js`.

## Kalender-Abo (zurückgestellt)

Eine automatische Anbindung an den Apple-Kalender (Abo über ein geheimes GitHub-Gist) liegt fertig auf dem
Branch [`kalender-abo`](../../tree/kalender-abo) und kann später wieder übernommen werden.

## Lokal testen

```bash
python3 -m http.server 8000
# → http://localhost:8000
```
