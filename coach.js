'use strict';

// Trainingslogik ohne Oberfläche: Muskelzuordnung, Tendenz zur Vor-Einheit und
// Gewichtsempfehlungen. Reine Funktionen, damit sie sich einzeln testen lassen.

// ---------- Muskeln ----------
// Welche Muskeln eine Übung trifft (Haupt- und mitarbeitende Muskeln), anhand von
// Stichworten im Namen. Die erste passende Regel zählt, daher Spezielles zuerst.
const MUSCLE_RULES = [
  [/butterfly-reverse|reverse fly|face-?pull|vorgebeugt/, ['delt_rear', 'traps_mid', 'upperback'], ['traps_upper']],
  [/schrägbankdrück/, ['chest_upper', 'delt_front'], ['chest_lower', 'triceps']],
  [/bankdrück|brustpresse|liegestütz/, ['chest_upper', 'chest_lower'], ['delt_front', 'triceps']],
  [/butterfly|fliegende/, ['chest_upper', 'chest_lower'], ['delt_front']],
  [/seitheben/, ['delt_side'], ['traps_upper']],
  [/schulterdrück|frontheben|military/, ['delt_front', 'delt_side'], ['triceps']],
  [/latzieh|klimmz|pull-?down/, ['lats'], ['biceps', 'upperback', 'delt_rear']],
  [/rudern.*breit|breit.*rudern/, ['upperback', 'traps_mid', 'delt_rear'], ['lats', 'biceps']],
  [/rudern/, ['lats', 'traps_mid'], ['biceps', 'delt_rear', 'upperback']],
  [/shrug/, ['traps_upper'], ['forearms']],
  [/trizeps|triceps|dips/, ['triceps'], []],
  [/hammer/, ['forearms', 'biceps'], []],
  [/bizeps|curl(?!.*bein)/, ['biceps'], ['forearms']],
  [/kreuzheben|deadlift/, ['hamstrings', 'glutes'], ['lowerback', 'forearms']],
  [/hüftstreck|hip ?thrust|glute/, ['glutes'], ['hamstrings']],
  [/hyperextension|rückenstreck/, ['lowerback'], ['glutes', 'hamstrings']],
  [/beinbeug|leg ?curl/, ['hamstrings'], ['calves']],
  [/wade|calf/, ['calves'], []],
  [/beinstreck|leg ?extension/, ['quads'], []],
  [/beinpresse|squat|kniebeug|ausfall/, ['quads', 'glutes'], ['adductors', 'hamstrings']],
  [/adduktor/, ['adductors'], []],
  [/beinheb|leg ?raise/, ['abs_lower', 'hipflex'], ['abs', 'obliques']],
  [/crunch|bauch|sit-?up/, ['abs', 'abs_lower'], ['obliques']],
  [/plank|unterarmstütz/, ['abs'], ['obliques', 'lowerback']],
  [/oblique|russian|seitbeug/, ['obliques'], ['abs']],
];

const LOWER_BODY = new Set(['quads', 'glutes', 'hamstrings', 'calves', 'adductors', 'lowerback']);

function muscleRule(name) {
  const n = String(name).toLowerCase();
  return MUSCLE_RULES.find(([re]) => re.test(n)) || null;
}

// Beine/Gesäß/unterer Rücken (große Muskelgruppen) vertragen größere Gewichtssprünge.
function isLowerBody(name) {
  const rule = muscleRule(name);
  return !!rule && rule[1].some(m => LOWER_BODY.has(m));
}

// ---------- Hilfen ----------
function roundKg(n) {
  return Math.round(n * 100) / 100;
}

function fmtKg(n) {
  return String(roundKg(n)).replace('.', ',');
}

// "10" → {lo:10, hi:10}, "8-12" → {lo:8, hi:12}; sonst null.
function parseRepRange(s) {
  const m = String(s || '').replace(/\s/g, '').match(/^(\d+)(?:-(\d+))?$/);
  if (!m) return null;
  const a = +m[1], b = m[2] ? +m[2] : a;
  if (!a || !b) return null;
  return { lo: Math.min(a, b), hi: Math.max(a, b) };
}

// Höchstes Gewicht der Einheit; null, wenn nirgends ein Gewicht eingetragen ist.
function topKg(sets) {
  const kgs = sets.map(s => s.kg).filter(v => v !== null && v !== undefined);
  return kgs.length ? Math.max(...kgs) : null;
}

// Sätze mit dem Arbeitsgewicht (höchstes Gewicht). Ohne Gewicht: alle Sätze.
function workSets(sets) {
  const top = topKg(sets);
  return sets.filter(s => (top === null ? true : s.kg === top) && s.reps !== null && s.reps !== undefined);
}

function sumReps(sets) {
  return sets.reduce((n, s) => n + (s.reps || 0), 0);
}

// Verlauf einer Übung, neueste Einheit zuerst: [{ start, sets }]
function exerciseHistory(sessions, name, before) {
  const key = String(name).toLowerCase();
  const limit = before ? new Date(before).getTime() : Infinity;
  const out = [];
  for (const s of sessions) {
    if (new Date(s.start).getTime() >= limit) continue;
    const ex = s.exercises.find(e => e.name.toLowerCase() === key);
    if (ex && ex.sets.length) out.push({ start: s.start, sessionId: s.id, sets: ex.sets });
  }
  return out.sort((a, b) => new Date(b.start) - new Date(a.start));
}

// ---------- Tendenz zur vorherigen Einheit ----------
// Erst zählt das Arbeitsgewicht; ist es gleich, die Wiederholungen mit diesem Gewicht.
// Ohne Gewichte (Körpergewicht): alle Wiederholungen.
function compareSets(cur, prev) {
  if (!prev || !prev.length) return { dir: 'new', text: 'erstes Mal' };
  const a = topKg(cur), b = topKg(prev);
  if (a !== null && b !== null && (a > 0 || b > 0)) {
    const d = roundKg(a - b);
    if (d > 0) return { dir: 'up', kg: d, text: `+${fmtKg(d)} kg` };
    if (d < 0) return { dir: 'down', kg: d, text: `−${fmtKg(-d)} kg` };
    const r = sumReps(workSets(cur)) - sumReps(workSets(prev));
    if (r > 0) return { dir: 'up', reps: r, text: `+${r} Wdh.` };
    if (r < 0) return { dir: 'down', reps: r, text: `−${-r} Wdh.` };
    return { dir: 'same', text: 'gleich' };
  }
  const r = sumReps(cur) - sumReps(prev);
  if (r > 0) return { dir: 'up', reps: r, text: `+${r} Wdh.` };
  if (r < 0) return { dir: 'down', reps: r, text: `−${-r} Wdh.` };
  return { dir: 'same', text: 'gleich' };
}

const TREND_ARROW = { up: '↑', down: '↓', same: '→', new: '•' };

function trendLabel(t) {
  return `${TREND_ARROW[t.dir]} ${t.text}`;
}

// ---------- Gewichtsempfehlung ----------
// Grundlage (siehe README):
// - ACSM Position Stand "Progression Models in Resistance Training" (2009): Last um 2–10 %
//   erhöhen, sobald die aktuelle Last 1–2 Wiederholungen über dem Ziel geschafft wird.
// - "2-für-2-Regel" (ACSM/NSCA-Lehrmaterial): steigern, wenn das Ziel in zwei Einheiten
//   hintereinander übertroffen wird; Oberkörper/kleine Muskeln ~2–5 %, Beine/große ~5–10 %.
// - Prof. Ingo Froböse (Deutsche Sporthochschule Köln): mit sauberer Technik schrittweise an
//   höhere Gewichte heranarbeiten, nah an die Erschöpfung trainieren.
// Empfohlen wird nur, wenn die letzten Einheiten es eindeutig hergeben; sonst null.
const REC_SOURCE = 'Grundlage: ACSM-Empfehlung zur Progression im Krafttraining (+2–10 %, sobald das Ziel um 1–2 Wdh. übertroffen wird), 2-für-2-Regel und Prof. Ingo Froböse (Sporthochschule Köln): schrittweise steigern, Technik vor Gewicht.';

function recommend({ history, reps, name, step }) {
  const range = parseRepRange(reps);
  const last = history && history[0];
  if (!range || !last) return null;
  const S = step > 0 ? step : 2.5;
  const work = workSets(last.sets);
  if (!work.length) return null;
  const kg = topKg(last.sets);
  const minReps = Math.min(...work.map(s => s.reps));
  const prev = history[1];
  const prevWork = prev && topKg(prev.sets) === kg ? workSets(prev.sets) : [];
  const prevMin = prevWork.length ? Math.min(...prevWork.map(s => s.reps)) : null;
  const avg = arr => arr.reduce((n, s) => n + s.reps, 0) / arr.length;
  const lower = isLowerBody(name);
  const target = range.lo === range.hi ? `${range.hi}` : `${range.lo}–${range.hi}`;

  // Steigern: alle Arbeitssätze 1+ Wdh. über dem Ziel, oder zweimal in Folge das Ziel geschafft.
  const exceeded = minReps >= range.hi + 1;
  const twiceAtTop = minReps >= range.hi && prevMin !== null && prevMin >= range.hi;
  if (exceeded || twiceAtTop) {
    const why = exceeded
      ? `Letztes Mal hast du in allen Sätzen mindestens ${minReps} Wdh. geschafft – mehr als dein Ziel von ${target}.`
      : `Du hast dein Ziel von ${target} Wdh. zweimal hintereinander in allen Sätzen erreicht.`;
    if (!kg) {
      // Ohne Zusatzgewicht: mit einem kleinen Gewicht beginnen.
      const add = Math.min(S, 5);
      return {
        type: 'up', kg: add, reps: range.lo, short: `+${fmtKg(add)} kg`,
        title: `Mit Zusatzgewicht starten: ${fmtKg(add)} kg`,
        text: `${why} Nimm ein kleines Zusatzgewicht (z. B. Hantelscheibe) und ziele auf ${range.lo} Wdh.`,
      };
    }
    const pct = lower ? 0.05 : 0.025;
    const next = roundKg(kg + Math.max(S, Math.ceil((kg * pct) / S - 1e-9) * S));
    const jump = (next - kg) / kg;
    const pctTxt = `+${Math.round(jump * 100)} %`;
    // Doppelte Progression: Ist der kleinste Gewichtsschritt groß (> 10 %), erst über
    // Wiederholungen steigern; ab 2 Wdh. über dem Ziel ist auch der größere Sprung vertretbar.
    const wellAbove = minReps >= range.hi + 2;
    if (jump > 0.25 + 1e-9 || (jump > 0.10 + 1e-9 && !wellAbove)) {
      const goal = Math.max(range.hi + 2, minReps + 1);
      const tooBig = jump > 0.25 + 1e-9;
      return {
        type: 'reps', kg, reps: goal, label: tooBig ? 'Tipp' : 'Steigern', short: tooBig ? 'kleinere Schritte' : `${goal} Wdh.`,
        title: tooBig ? `Bei ${fmtKg(kg)} kg bleiben – kleinere Gewichtsschritte nutzen` : `Bei ${fmtKg(kg)} kg bleiben, auf ${goal} Wdh. steigern`,
        text: tooBig
          ? `${why} Der nächste Schritt im Zahlenrad (${fmtKg(next)} kg) wäre ${pctTxt} – empfohlen sind 2–10 %. Nutze ein leichteres Zwischengewicht und stell unter Daten → Zahlenrad kleinere Schritte ein; bis dahin Gewicht halten, langsam und sauber ausführen.`
          : `${why} Der nächste Schritt (${fmtKg(next)} kg) wäre ${pctTxt} – mehr als die empfohlenen 2–10 %. Steigere deshalb zuerst auf ${goal} Wdh. pro Satz, danach ist der größere Gewichtssprung gut machbar.`,
      };
    }
    const reps2 = range.lo === range.hi ? range.hi : range.lo;
    return {
      type: 'up', kg: next, reps: reps2, short: `${fmtKg(next)} kg`,
      title: `Gewicht erhöhen: ${fmtKg(kg)} → ${fmtKg(next)} kg`,
      text: `${why} Steigere auf ${fmtKg(next)} kg (${pctTxt}) und ziele auf ${reps2} Wdh.${range.lo !== range.hi ? ` – dann arbeitest du dich wieder bis ${range.hi} hoch.` : ' – anfangs sind ein, zwei Wdh. weniger normal.'}${jump > 0.10 + 1e-9 ? ' Der Sprung ist etwas größer als üblich, weil du dein Ziel klar übertroffen hast.' : ''}`,
    };
  }

  // Reduzieren: zweimal hintereinander klar (2+ Wdh.) unter dem Zielbereich.
  if (kg && prevWork.length && avg(work) < range.lo - 1 && avg(prevWork) < range.lo - 1) {
    const cut = Math.max(S, Math.round((kg * 0.075) / S) * S);
    const next = roundKg(kg - cut);
    if (next > 0) {
      return {
        type: 'down', kg: next, reps: range.lo, short: `${fmtKg(next)} kg`,
        title: `Gewicht leicht reduzieren: ${fmtKg(kg)} → ${fmtKg(next)} kg`,
        text: `In den letzten zwei Einheiten lagst du mit ${fmtKg(kg)} kg deutlich unter deinem Ziel von ${target} Wdh. Mit etwas weniger Gewicht schaffst du saubere Wiederholungen im Zielbereich und kannst danach wieder steigern.`,
      };
    }
  }
  return null;
}

// Hinweis ohne konkrete Empfehlung (für die Detailansicht).
function holdHint({ history, reps }) {
  const range = parseRepRange(reps);
  if (!range || !history || !history.length) return '';
  const kg = topKg(history[0].sets);
  const at = kg ? ` bei ${fmtKg(kg)} kg` : '';
  return `Gewicht halten${at} und die Wiederholungen steigern, bis du ${range.hi} Wdh. in allen Sätzen schaffst – dann folgt die nächste Steigerung.`;
}

if (typeof module !== 'undefined') {
  module.exports = { MUSCLE_RULES, muscleRule, isLowerBody, parseRepRange, topKg, workSets, exerciseHistory, compareSets, trendLabel, recommend, holdHint, fmtKg, REC_SOURCE };
}
