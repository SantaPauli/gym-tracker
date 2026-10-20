# Gym Tracker

Kleine Flask-Webanwendung zum Tracken von Workouts, mit Übungsvorschlägen
(Muskelgruppen-Rotation + Progressive Overload) und Kalender-Export (.ics).

## Setup

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

Die App läuft dann unter http://localhost:5000 (und im lokalen WLAN über die
angezeigte IP-Adresse, z.B. für den Zugriff vom Smartphone und "Zum
Homescreen hinzufügen").

## Features

- **Übungen** verwalten (Name, Muskelgruppe, Equipment), mit Equipment-Filter
- **Training loggen**: Workout mit mehreren Sätzen (Übung, Gewicht, Wdh.)
- **Historie**: alle vergangenen Workouts
- **Vorschlag**: welche Muskelgruppe ist dran + Gewichts-/Wdh.-Vorschlag pro Übung
- **Kalender**: nächstes Training planen und als .ics-Datei herunterladen
