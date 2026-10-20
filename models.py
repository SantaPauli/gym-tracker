from datetime import date

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

MUSCLE_GROUPS = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Core"]
EQUIPMENT_TYPES = ["Bodyweight", "Dumbbell", "Barbell", "Machine", "Cable", "Band"]


class Exercise(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    muscle_group = db.Column(db.String(50), nullable=False)
    equipment = db.Column(db.String(50), nullable=False)

    def __repr__(self):
        return f"<Exercise {self.name}>"


class Workout(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False, default=date.today)
    note = db.Column(db.String(255))

    sets = db.relationship(
        "WorkoutSet",
        backref="workout",
        cascade="all, delete-orphan",
        order_by="WorkoutSet.set_number",
    )


class WorkoutSet(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    workout_id = db.Column(db.Integer, db.ForeignKey("workout.id"), nullable=False)
    exercise_id = db.Column(db.Integer, db.ForeignKey("exercise.id"), nullable=False)
    set_number = db.Column(db.Integer, nullable=False)
    weight = db.Column(db.Float, nullable=False)
    reps = db.Column(db.Integer, nullable=False)

    exercise = db.relationship("Exercise")
