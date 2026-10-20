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
- **Apple-Kalender (Abo)**: Unter „Daten“ einmal mit GitHub verbinden und abonnieren, danach erscheinen neue
  Trainings automatisch im Apple-Kalender (siehe unten).
- **Ohne Abo**: Mit „In Handy-Kalender“ wird eine `.ics`-Datei erzeugt, die du in Apple-/Google-Kalender
  übernehmen kannst. Unter „Daten“ kannst du auch alle Trainings auf einmal exportieren.
- **Backup**: Unter „Daten“ ein Backup (JSON) speichern bzw. laden, z. B. für ein neues Handy.

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

## Apple-Kalender anbinden (Abo)

Der Apple-Kalender kann nur Kalender abonnieren, die online erreichbar sind. Die App lädt deshalb nach jeder
Änderung eine Kalenderdatei (`gym-trainings.ics`) und ein Backup (`gym-backup.json`) in ein **geheimes Gist**
in deinem GitHub-Konto hoch. Der Kalender holt sich die Datei von dort.

1. In der App: **Daten → Apple-Kalender verbinden → „Token bei GitHub erstellen“**.
   Auf GitHub nur den Haken bei **gist** setzen, Ablauf z. B. „No expiration“, **Generate token**, Token kopieren.
2. Token in der App einfügen → **Verbinden**.
3. **„Im Apple-Kalender abonnieren“** antippen → **Abonnieren**. Es entsteht ein eigener Kalender „Gym Training“.
   Alternativ die Adresse kopieren und unter *Einstellungen → Apps → Kalender → Accounts → Account hinzufügen →
   Andere → Kalenderabo hinzufügen* einfügen (oder am Mac: *Ablage → Neues Kalenderabonnement*).

Gut zu wissen:
- Der Apple-Kalender lädt Abos in Abständen neu (je nach Einstellung alle 15 Min. bis 1 Std.), neue Trainings
  erscheinen also nicht sekundengenau.
- Ohne Netz im Gym wird die Übertragung automatisch nachgeholt, sobald wieder Verbindung besteht.
- Ein geheimes Gist ist nicht öffentlich gelistet, aber jeder mit dem Link kann es lesen.
- Der Token liegt nur auf deinem Handy und darf nur Gists bearbeiten. Er kann auf GitHub jederzeit gelöscht werden.
- Neues Handy (oder Wechsel von Safari zur Homescreen-App, die haben getrennten Speicher): einfach mit demselben
  Token verbinden, dann werden die Trainings aus dem Gist übernommen.

## Plan ändern

Übungen, Sätze und Wiederholungen stehen in [`plan.js`](plan.js). Nach einer Änderung in `sw.js` die
Versionsnummer (z. B. `gym-tracker-v2` → `v3`) hochzählen, damit das Handy die neue Version lädt.

## Lokal testen

```bash
python3 -m http.server 8000
# → http://localhost:8000
```
