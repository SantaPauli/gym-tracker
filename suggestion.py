from datetime import date

from models import db, Exercise, Workout, WorkoutSet, MUSCLE_GROUPS

WEIGHT_INCREMENT = 2.5


def last_trained_dates():
    """Letztes Trainingsdatum pro Muskelgruppe (None, falls noch nie trainiert)."""
    dates = {}
    for muscle_group in MUSCLE_GROUPS:
        last_date = (
            db.session.query(db.func.max(Workout.date))
            .join(WorkoutSet, WorkoutSet.workout_id == Workout.id)
            .join(Exercise, Exercise.id == WorkoutSet.exercise_id)
            .filter(Exercise.muscle_group == muscle_group)
            .scalar()
        )
        dates[muscle_group] = last_date
    return dates


def suggest_muscle_group():
    """Muskelgruppe, die am längsten nicht (oder noch nie) trainiert wurde."""
    dates = last_trained_dates()
    return min(MUSCLE_GROUPS, key=lambda mg: dates[mg] or date.min)


def last_performance(exercise_id):
    return (
        WorkoutSet.query.join(Workout)
        .filter(WorkoutSet.exercise_id == exercise_id)
        .order_by(Workout.date.desc(), WorkoutSet.set_number.desc())
        .first()
    )


def suggest_progression(exercise):
    """Progressive-Overload-Vorschlag basierend auf der letzten Leistung."""
    last_set = last_performance(exercise.id)
    if last_set is None:
        return {"weight": None, "reps": None, "info": "Noch keine Daten – leicht starten."}

    if last_set.weight and last_set.weight > 0:
        new_weight = round(last_set.weight + WEIGHT_INCREMENT, 1)
        return {
            "weight": new_weight,
            "reps": last_set.reps,
            "info": f"Letztes Mal: {last_set.weight} kg × {last_set.reps} Wdh.",
        }

    return {
        "weight": last_set.weight,
        "reps": last_set.reps + 1,
        "info": f"Letztes Mal: {last_set.reps} Wdh. (Bodyweight)",
    }
