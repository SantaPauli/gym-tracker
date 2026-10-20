import os
from datetime import datetime, date

from flask import Flask, render_template, request, redirect, url_for, flash, Response
from sqlalchemy.exc import IntegrityError

from models import db, Exercise, Workout, WorkoutSet, MUSCLE_GROUPS, EQUIPMENT_TYPES
from suggestion import suggest_muscle_group, suggest_progression
from calendar_export import generate_ics

basedir = os.path.abspath(os.path.dirname(__file__))

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{os.path.join(basedir, 'gym.db')}"
app.config["SECRET_KEY"] = "dev"
db.init_app(app)

SEED_EXERCISES = [
    ("Bankdrücken", "Chest", "Barbell"),
    ("Schrägbankdrücken", "Chest", "Dumbbell"),
    ("Liegestütze", "Chest", "Bodyweight"),
    ("Kniebeuge", "Legs", "Barbell"),
    ("Ausfallschritte", "Legs", "Dumbbell"),
    ("Beinpresse", "Legs", "Machine"),
    ("Kreuzheben", "Back", "Barbell"),
    ("Klimmzüge", "Back", "Bodyweight"),
    ("Rudern", "Back", "Cable"),
    ("Schulterdrücken", "Shoulders", "Dumbbell"),
    ("Seitheben", "Shoulders", "Dumbbell"),
    ("Face Pulls", "Shoulders", "Cable"),
    ("Bizepscurls", "Arms", "Dumbbell"),
    ("Trizepsdrücken", "Arms", "Cable"),
    ("Hammer Curls", "Arms", "Dumbbell"),
    ("Plank", "Core", "Bodyweight"),
    ("Crunches", "Core", "Bodyweight"),
    ("Russian Twists", "Core", "Bodyweight"),
]


def init_db():
    db.create_all()
    if Exercise.query.count() == 0:
        for name, muscle_group, equipment in SEED_EXERCISES:
            db.session.add(Exercise(name=name, muscle_group=muscle_group, equipment=equipment))
        db.session.commit()


@app.route("/")
def index():
    return redirect(url_for("suggestion"))


# ---------- Übungen ----------

@app.route("/exercises")
def exercises():
    equipment_filter = request.args.get("equipment") or None
    query = Exercise.query
    if equipment_filter:
        query = query.filter_by(equipment=equipment_filter)
    all_exercises = query.order_by(Exercise.muscle_group, Exercise.name).all()
    return render_template(
        "exercises.html",
        exercises=all_exercises,
        muscle_groups=MUSCLE_GROUPS,
        equipment_types=EQUIPMENT_TYPES,
        equipment_filter=equipment_filter,
    )


@app.route("/exercises/add", methods=["POST"])
def add_exercise():
    name = request.form["name"].strip()
    muscle_group = request.form["muscle_group"]
    equipment = request.form["equipment"]
    if name:
        db.session.add(Exercise(name=name, muscle_group=muscle_group, equipment=equipment))
        try:
            db.session.commit()
            flash(f"Übung '{name}' hinzugefügt.")
        except IntegrityError:
            db.session.rollback()
            flash(f"Übung '{name}' existiert bereits.")
    return redirect(url_for("exercises"))


@app.route("/exercises/<int:exercise_id>/delete", methods=["POST"])
def delete_exercise(exercise_id):
    exercise = Exercise.query.get_or_404(exercise_id)
    in_use = WorkoutSet.query.filter_by(exercise_id=exercise_id).first() is not None
    if in_use:
        flash(f"Übung '{exercise.name}' ist in geloggten Workouts verwendet und kann nicht gelöscht werden.")
    else:
        db.session.delete(exercise)
        db.session.commit()
        flash(f"Übung '{exercise.name}' gelöscht.")
    return redirect(url_for("exercises"))


# ---------- Workout loggen ----------

@app.route("/log", methods=["GET", "POST"])
def log_workout():
    if request.method == "POST":
        workout_date = datetime.strptime(request.form["date"], "%Y-%m-%d").date()
        note = request.form.get("note", "")
        workout = Workout(date=workout_date, note=note)
        db.session.add(workout)
        db.session.flush()

        exercise_ids = request.form.getlist("exercise_id")
        weights = request.form.getlist("weight")
        reps_list = request.form.getlist("reps")

        set_counters = {}
        for exercise_id, weight, reps in zip(exercise_ids, weights, reps_list):
            if not exercise_id or not weight or not reps:
                continue
            exercise_id = int(exercise_id)
            set_counters[exercise_id] = set_counters.get(exercise_id, 0) + 1
            db.session.add(
                WorkoutSet(
                    workout_id=workout.id,
                    exercise_id=exercise_id,
                    set_number=set_counters[exercise_id],
                    weight=float(weight),
                    reps=int(reps),
                )
            )
        db.session.commit()
        flash("Workout gespeichert.")
        return redirect(url_for("history"))

    all_exercises = Exercise.query.order_by(Exercise.muscle_group, Exercise.name).all()
    return render_template("log_workout.html", exercises=all_exercises, today=date.today().isoformat())


# ---------- Historie ----------

@app.route("/history")
def history():
    workouts = Workout.query.order_by(Workout.date.desc()).all()
    return render_template("history.html", workouts=workouts)


@app.route("/history/<int:workout_id>/delete", methods=["POST"])
def delete_workout(workout_id):
    workout = Workout.query.get_or_404(workout_id)
    db.session.delete(workout)
    db.session.commit()
    flash("Workout gelöscht.")
    return redirect(url_for("history"))


# ---------- Vorschlag ----------

@app.route("/suggestion")
def suggestion():
    muscle_group = suggest_muscle_group()
    candidates = Exercise.query.filter_by(muscle_group=muscle_group).all()
    suggestions = [{"exercise": ex, **suggest_progression(ex)} for ex in candidates]
    return render_template("suggestion.html", muscle_group=muscle_group, suggestions=suggestions)


# ---------- Kalender ----------

@app.route("/schedule", methods=["GET", "POST"])
def schedule():
    if request.method == "POST":
        workout_dt = datetime.strptime(
            f"{request.form['date']} {request.form['time']}", "%Y-%m-%d %H:%M"
        )
        ics_content = generate_ics(
            summary="Training",
            start_dt=workout_dt,
            duration_minutes=60,
            description="Geplantes Training aus Gym-Tracker",
        )
        return Response(
            ics_content,
            mimetype="text/calendar",
            headers={"Content-Disposition": "attachment; filename=training.ics"},
        )
    return render_template("schedule.html", today=date.today().isoformat())


if __name__ == "__main__":
    with app.app_context():
        init_db()
    app.run(debug=True, host="0.0.0.0")
