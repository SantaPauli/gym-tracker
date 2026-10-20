// Trainingsplan – 1:1 übernommen. Reihenfolge = Rotation (1 → 5 → 1 …).
// reps/kg sind die Zielwerte, die in der Übersicht angezeigt werden,
// solange es für eine Übung noch keine eigenen Werte gibt.
const PLAN = [
  {
    id: 'oberkoerper',
    name: 'Oberkörper',
    exercises: [
      { name: 'Schrägbankdrücken', equip: 'Langhantel', sets: 5, reps: '10', kg: '-' },
      { name: 'Rudern enger neutraler Griff', equip: 'Maschine', sets: 3, reps: '6', kg: '-' },
      { name: 'Rudern breiter Obergriff', equip: 'Maschine', sets: 3, reps: '10', kg: '-' },
      { name: 'Seitheben vorgebeugt auf der Schrägbank', equip: 'Kurzhanteln', sets: 3, reps: '10', kg: '-' },
      { name: 'Butterfly-Reverse', equip: 'Maschine', sets: 3, reps: '10', kg: '-' },
      { name: 'Trizepsdrücken mit Strick', equip: 'Kabelzug', sets: 3, reps: '10', kg: '-' },
      { name: 'Bizeps-Curls auf der Schrägbank', equip: 'Kurzhanteln', sets: 4, reps: '10-14', kg: '-' },
    ],
  },
  {
    id: 'unterkoerper-a',
    name: 'Unterkörper A',
    exercises: [
      { name: 'Beinpresse enger Stand', equip: 'Maschine', sets: 3, reps: '10', kg: '-' },
      { name: 'Rumänisches Kreuzheben', equip: 'Langhantel', sets: 3, reps: '10', kg: '-' },
      { name: 'Hyperextensions (Rückenstrecken)', equip: 'Körpergewicht', sets: 2, reps: '10', kg: '-' },
      { name: 'Wadendrücken im Stehen', equip: 'Maschine', sets: 4, reps: '10-14', kg: '-' },
      { name: 'Crunches im Sitzen', equip: 'Maschine', sets: 4, reps: '10', kg: '-' },
    ],
  },
  {
    id: 'push',
    name: 'Push',
    exercises: [
      { name: 'Bankdrücken', equip: 'Kurzhanteln', sets: 4, reps: '6-14', kg: '20-25' },
      { name: 'Butterfly mit gestreckten Armen', equip: 'Maschine', sets: 2, reps: '10-16', kg: '47,5-55' },
      { name: 'Seitheben', equip: 'Kurzhanteln', sets: 3, reps: '10', kg: '5' },
      { name: 'Seitheben mit gestreckten Armen', equip: 'Maschine', sets: 3, reps: '14-16', kg: '30' },
      { name: 'Trizepsdrücken über Kopf', equip: 'Kabelzug', sets: 3, reps: '10', kg: '25' },
      { name: 'Trizepsdrücken mit Strick', equip: 'Kabelzug', sets: 2, reps: '10-11', kg: '5' },
      { name: 'Beinheben', equip: 'Körpergewicht', sets: 4, reps: '10-12', kg: '0' },
      { name: 'Hyperextensions (Rückenstrecken)', equip: 'Körpergewicht', sets: 3, reps: '8-10', kg: '10' },
    ],
  },
  {
    id: 'pull',
    name: 'Pull',
    exercises: [
      { name: 'Rudern enger neutraler Griff', equip: 'Maschine', sets: 3, reps: '10', kg: '-' },
      { name: 'Latziehen breiter Obergriff', equip: 'Maschine', sets: 3, reps: '10', kg: '-' },
      { name: 'Face-Pulls', equip: 'Kabelzug', sets: 3, reps: '10', kg: '-' },
      { name: 'Butterfly-Reverse', equip: 'Maschine', sets: 3, reps: '14', kg: '-' },
      { name: 'Bizeps-Curls', equip: 'Maschine', sets: 3, reps: '10', kg: '-' },
      { name: 'Shrugs', equip: 'Hex-Bar', sets: 4, reps: '10', kg: '-' },
    ],
  },
  {
    id: 'unterkoerper-b',
    name: 'Unterkörper B',
    exercises: [
      { name: 'Hack-Squats enger Stand', equip: 'Maschine', sets: 3, reps: '10', kg: '61' },
      { name: 'Beinstrecken', equip: 'Maschine', sets: 4, reps: '10-16', kg: '22,5-25' },
      { name: 'Hyperextensions (Hüftstrecken)', equip: 'Körpergewicht', sets: 3, reps: '10', kg: '0-10' },
      { name: 'Beinbeugen im Sitzen', equip: 'Maschine', sets: 4, reps: '10-17', kg: '30-35' },
      { name: 'Bizeps-Curls', equip: 'Maschine', sets: 4, reps: '10-12', kg: '35' },
    ],
  },
];
