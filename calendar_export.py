import uuid
from datetime import datetime, timedelta


def generate_ics(summary, start_dt, duration_minutes=60, description=""):
    """Erzeugt den Inhalt einer .ics-Datei mit einem einzelnen Termin + Erinnerung."""
    end_dt = start_dt + timedelta(minutes=duration_minutes)

    def fmt(dt):
        return dt.strftime("%Y%m%dT%H%M%S")

    uid = f"{uuid.uuid4()}@gym-tracker"
    timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//GymTracker//DE",
        "BEGIN:VEVENT",
        f"UID:{uid}",
        f"DTSTAMP:{timestamp}",
        f"DTSTART:{fmt(start_dt)}",
        f"DTEND:{fmt(end_dt)}",
        f"SUMMARY:{summary}",
        f"DESCRIPTION:{description}",
        "BEGIN:VALARM",
        "TRIGGER:-PT30M",
        "ACTION:DISPLAY",
        f"DESCRIPTION:Erinnerung: {summary}",
        "END:VALARM",
        "END:VEVENT",
        "END:VCALENDAR",
    ]
    return "\r\n".join(lines) + "\r\n"
