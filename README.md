# Gym Tracker

Einfache Web-App fürs Handy, mit der du deinen festen Trainingsplan (5 Trainings in Rotation) abarbeitest:
Training starten → Sätze mit kg/Wdh. abhaken → beenden → das Training steht im Kalender.

Die App läuft komplett im Browser und braucht keinen Server und kein Konto. Sie funktioniert auch offline im Gym.

## Funktionen

- **Trainingsplan**: Oberkörper · Unterkörper A · Push · Pull · Unterkörper B (Original in `plan.js`).
  Zwischen den Trainings wischen oder oben auf die Kreise tippen. ✓ = in den letzten 7 Tagen erledigt.
- **Trainingstage**: Am Ende der Karten „+ Trainingstag hinzufügen“. Über „⋯“ oben auf einer Karte:
  umbenennen, als nächstes Training festlegen, nach links/rechts schieben oder löschen.
- **Übungen anpassen**: „+ Übung hinzufügen“ (mit Vorschlägen aus allen Trainings und deiner letzten Leistung).
  Über „⋯“ an jeder Übung: Verlauf & Empfehlung, bearbeiten, verschieben oder entfernen. Entfernte Übungen
  bleiben im Übungsspeicher und tauchen beim Hinzufügen wieder auf – samt deinen alten Werten.
- **Training**: kg und Wdh. tippst du nicht ein, sondern wählst sie im **Zahlenrad** (Gewicht in 5-kg-Schritten,
  einstellbar unter Daten; Wdh. in 1er-Schritten). Nach dem Gewicht springt das Rad direkt zu den Wdh.,
  dann „Satz abhaken“. Wer lieber tippt: „Eintippen“.
- **Vorbelegung**: Die Werte deiner letzten Einheit stehen grau in den Feldern – einfach ✓ antippen,
  wenn du sie wieder geschafft hast. Übungen, die du noch nie gemacht hast, bleiben leer.
- **Effekt**: Sind alle Sätze einer Übung abgehakt, gibt es ein kleines Konfetti und das Abzeichen „geschafft“.
- **Empfehlungen**: Ein Symbol an der Übung schlägt vor, das Gewicht zu steigern oder anzupassen – nur wenn
  deine letzten Einheiten das eindeutig hergeben (siehe unten). Antippen zeigt Begründung und Verlauf;
  im Training lässt sich die Empfehlung als graue Vorgabe übernehmen.
- **Kalender mit Tendenz**: Jedes Training wird gespeichert. Pro Übung zeigt ↑ / → / ↓, ob du dich im
  Vergleich zur letzten Einheit derselben Übung gesteigert hast (erst Gewicht, bei gleichem Gewicht die Wdh.).
- **Export**: Unter „Daten“ als **CSV** (Excel/Numbers, ein Satz pro Zeile, mit Tendenz – auch für Übungen,
  die nicht mehr im Plan sind) oder als **Kalender-Datei (.ics)** mit Tendenzen in der Beschreibung.
  „In Handy-Kalender“ öffnet auf dem iPhone direkt das Kalender-Fenster.
- **Backup**: Unter „Daten“ ein Backup (Trainings, Plan, Übungsspeicher, Einstellungen) speichern bzw. laden.

## Wie die Empfehlungen entstehen

Grundlage sind deine letzten Einheiten derselben Übung und der Wdh.-Zielbereich aus dem Plan (z. B. `10` oder `8-12`).
Gezählt werden die Sätze mit deinem Arbeitsgewicht (höchstes Gewicht der Einheit).

| Situation | Empfehlung |
|---|---|
| Alle Sätze **1+ Wdh. über** dem Ziel – oder das Ziel **zweimal hintereinander** in allen Sätzen erreicht | Gewicht erhöhen: Oberkörper ~2,5 %, Beine ~5 %, aufgerundet auf den Zahlenrad-Schritt |
| Der kleinste Schritt wäre > 10 % (z. B. 40 → 45 kg) | erst auf Ziel + 2 Wdh. steigern, dann den größeren Sprung |
| Der kleinste Schritt wäre > 25 % (z. B. 6 → 11 kg) | Gewicht halten, kleinere Gewichtsschritte nutzen |
| **Zweimal hintereinander** klar (2+ Wdh.) unter dem Ziel | Gewicht um ~5–10 % reduzieren |
| alles andere, oder noch keine Daten | keine Empfehlung |

Quellen:
- ACSM Position Stand *Progression Models in Resistance Training for Healthy Adults* (2009): Last um 2–10 % erhöhen,
  sobald die aktuelle Last 1–2 Wdh. über dem Ziel geschafft wird
  ([PDF](https://www.sportgeneeskunde.com/wp-content/uploads/ACSM-Position-Stand-Progression-Models-in-Resistance-Training-for-Healthy-Adults.pdf)).
- „2-für-2-Regel“ aus ACSM/NSCA-Lehrmaterial: steigern, wenn das Ziel in zwei Einheiten hintereinander übertroffen wird;
  Oberkörper ~2–5 %, Beine ~5–10 % ([Übersicht](https://app.achievable.me/study/cscs/learn/program-design-for-resistance-training-training-frequency-exercise-order-and-training-load-and-repetitions)).
- Prof. Ingo Froböse (Deutsche Sporthochschule Köln): mit sauberer Ausführung schrittweise an höhere Gewichte
  heranarbeiten, nah an die Erschöpfung trainieren, 3–5 Sätze pro Übung
  ([utopia.de](https://utopia.de/news/froboese-warnt-fettgewebe-zunahme-muskelmasse),
  [bike-magazin.de](https://www.bike-magazin.de/training/fitness/muskelaufbau-was-wirklich-wirkt-und-was-nur-zeit-kostet/)).

Die Empfehlungen sind Richtwerte, kein Ersatz für Trainer oder Arzt – Technik geht vor Gewicht.

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

Wer `plan.js` selbst ändert: Danach in `sw.js` die Versionsnummer (z. B. `gym-tracker-v10` → `v11`) hochzählen,
damit das Handy die neue Version lädt. Ein in der App angepasster Plan hat Vorrang vor `plan.js`.

## Kalender-Abo (zurückgestellt)

Eine automatische Anbindung an den Apple-Kalender (Abo über ein geheimes GitHub-Gist) liegt fertig auf dem
Branch [`kalender-abo`](../../tree/kalender-abo) und kann später wieder übernommen werden.

## Aufbau

- `index.html`, `style.css` – Seite und Aussehen
- `plan.js` – Original-Trainingsplan
- `coach.js` – Trainingslogik ohne Oberfläche: Muskelzuordnung, Tendenz, Empfehlungen
- `app.js` – Oberfläche und Speicherung
- `sw.js` – Offline-Speicher und Updates

## Lokal testen

```bash
python3 -m http.server 8000
# → http://localhost:8000
```
