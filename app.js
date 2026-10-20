'use strict';

// ---------- Speicher ----------
// Alles liegt lokal im Browser (localStorage). Backup über "Daten" → Export.
const STORE_KEY = 'gymtracker.v1';
const PLAN_KEY = 'gymtracker.plan';

// Reste der zurückgestellten Kalender-Abo-Funktion (enthielt einen Token) entfernen.
try { localStorage.removeItem('gymtracker.sync'); } catch (e) { /* ignorieren */ }

function readJson(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    toast('Speichern fehlgeschlagen – Speicher voll oder privater Modus. Bitte ein Backup machen.');
    return false;
  }
}

function validDate(v) {
  return typeof v === 'string' && !Number.isNaN(new Date(v).getTime());
}

function numOrNull(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function clampInt(v, lo, hi, fallback) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
}

// ---------- Trainingsplan ----------
// plan.js liefert den Original-Plan (PLAN). Änderungen in der App werden als
// eigener Plan gespeichert; "Daten → Plan zurücksetzen" stellt das Original wieder her.
function cleanPlanExercise(e) {
  return {
    name: String(e.name).trim(),
    equip: String(e.equip || ''),
    sets: clampInt(e.sets, 1, 20, 3),
    reps: String(e.reps || '10'),
    kg: String(e.kg || '-'),
  };
}

function cleanPlan(p) {
  if (!Array.isArray(p)) return null;
  const out = p
    .filter(w => w && typeof w.id === 'string' && Array.isArray(w.exercises))
    .map(w => ({
      id: w.id,
      name: String(w.name || w.id),
      exercises: w.exercises.filter(e => e && typeof e.name === 'string' && e.name.trim()).map(cleanPlanExercise),
    }));
  return out.length ? out : null;
}

function defaultPlan() {
  return JSON.parse(JSON.stringify(PLAN));
}

let plan = cleanPlan(readJson(PLAN_KEY)) || defaultPlan();

function savePlan() {
  writeJson(PLAN_KEY, plan);
}

function planIsDefault() {
  return JSON.stringify(plan) === JSON.stringify(cleanPlan(PLAN));
}

function validIndex(i) {
  return Number.isInteger(i) && i >= 0 && i < plan.length;
}

// ---------- Trainingsdaten ----------
// Prüft eine gespeicherte/importierte Trainingseinheit; null, wenn unbrauchbar.
function cleanSession(s) {
  if (!s || typeof s.id !== 'string' || !validDate(s.start) || !Array.isArray(s.exercises)) return null;
  return {
    id: s.id,
    workoutId: String(s.workoutId || ''),
    name: String(s.name || 'Training'),
    start: s.start,
    end: validDate(s.end) && new Date(s.end) >= new Date(s.start) ? s.end : s.start,
    exercises: s.exercises
      .filter(e => e && Array.isArray(e.sets))
      .map(e => ({
        name: String(e.name || ''),
        equip: String(e.equip || ''),
        sets: e.sets.filter(Boolean).map(x => ({ kg: numOrNull(x.kg), reps: numOrNull(x.reps) })),
      })),
  };
}

function load() {
  const s = readJson(STORE_KEY);
  if (s && Array.isArray(s.sessions)) {
    const active = s.active && Array.isArray(s.active.exercises) && validDate(s.active.start) ? s.active : null;
    return {
      sessions: s.sessions.map(cleanSession).filter(Boolean),
      active,
      nextIndex: validIndex(s.nextIndex) ? s.nextIndex : 0,
    };
  }
  return { sessions: [], active: null, nextIndex: 0 };
}

let state = load();

function save() {
  writeJson(STORE_KEY, state);
}

if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

// ---------- UI-Zustand ----------
let view = 'plan';
let planIndex = state.nextIndex;
let calMonth = startOfMonth(new Date());
let calSelected = dayKey(new Date());
let timerHandle = null;

const app = document.getElementById('app');

// ---------- Hilfsfunktionen ----------
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function num(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function fmtNum(n) {
  return String(Math.round(n * 100) / 100).replace('.', ',');
}

function pad(n) { return String(n).padStart(2, '0'); }

function dayKey(d) {
  d = new Date(d);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }

function fmtDate(d) {
  d = new Date(d);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

function fmtTime(d) {
  d = new Date(d);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtDuration(ms) {
  const min = Math.max(0, Math.round(ms / 60000));
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)} h`;
}

function fmtClock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
}

function range(values, fmt) {
  if (!values.length) return null;
  const lo = Math.min(...values), hi = Math.max(...values);
  return lo === hi ? fmt(lo) : `${fmt(lo)}-${fmt(hi)}`;
}

function moveItem(arr, i, delta) {
  const j = i + delta;
  if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
}

function setsLabel(n) {
  return `${n} ${n === 1 ? 'Satz' : 'Sätze'}`;
}

function totalSets(workout) {
  return workout.exercises.reduce((n, e) => n + e.sets, 0);
}

function sessionSets(session) {
  return session.exercises.reduce((n, e) => n + e.sets.length, 0);
}

function sortedSessions() {
  return [...state.sessions].sort((a, b) => new Date(b.start) - new Date(a.start));
}

function lastSessionOf(workoutId) {
  return sortedSessions().find(s => s.workoutId === workoutId) || null;
}

// Letzte Sätze einer Übung: zuerst aus demselben Training, sonst aus irgendeinem.
function lastSetsFor(workoutId, exName) {
  const all = sortedSessions();
  for (const pass of [true, false]) {
    for (const s of all) {
      if (pass && s.workoutId !== workoutId) continue;
      const ex = s.exercises.find(e => e.name === exName);
      if (ex && ex.sets.length) return ex.sets;
    }
  }
  return null;
}

function doneRecently(workoutId) {
  const s = lastSessionOf(workoutId);
  return s && (Date.now() - new Date(s.start)) < 7 * 24 * 3600 * 1000 ? s : null;
}

// ---------- Icons ----------
const ICONS = {
  dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  data: '<ellipse cx="12" cy="6" rx="7.5" ry="2.8"/><path d="M4.5 6v6c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8V6M4.5 12v6c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8v-6"/>',
  more: '<circle cx="5.5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18.5" cy="12" r="1.2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  trash: '<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 15V4M7 9l5-5 5 5M5 20h14"/>',
  clock: '<circle cx="12" cy="13" r="7.5"/><path d="M12 9.5V13l2.5 1.8M9.5 2.5h5"/>',
  reset: '<path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5"/>',
};

function icon(name) {
  return `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
}

// ---------- Hinweise (Toast) ----------
let toastHandle = null;

function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastHandle);
  toastHandle = setTimeout(() => t.classList.remove('show'), 2800);
}

// ---------- Modal / Bottom-Sheet ----------
const modalEl = document.getElementById('modal');
const modalBox = document.getElementById('modal-box');
let modalCloseHook = null;

function openModal(html, onClose) {
  modalBox.innerHTML = html;
  modalCloseHook = onClose || null;
  modalEl.classList.remove('hidden');
  modalBox.scrollTop = 0;
}

function closeModal() {
  modalEl.classList.add('hidden');
  const hook = modalCloseHook;
  modalCloseHook = null;
  if (hook) hook();
}

modalEl.addEventListener('click', e => {
  if (e.target === modalEl) closeModal();
});

// Bei offener Tastatur (iPhone) das Sheet über der Tastatur halten.
if (window.visualViewport) {
  const vv = window.visualViewport;
  const fit = () => {
    modalEl.style.height = vv.height + 'px';
    modalEl.style.top = vv.offsetTop + 'px';
  };
  vv.addEventListener('resize', fit);
  vv.addEventListener('scroll', fit);
}

// Eigener Bestätigungsdialog statt confirm() (der zeigt auf dem iPhone die Web-Adresse an).
function askConfirm({ title, text = '', ok = 'OK', danger = false }) {
  return new Promise(resolve => {
    openModal(`
      <h2 class="sheet-h">${esc(title)}</h2>
      ${text ? `<p class="sheet-text">${esc(text)}</p>` : ''}
      <button class="btn ${danger ? 'danger-fill' : ''}" id="c-ok">${esc(ok)}</button>
      <button class="btn secondary" id="c-cancel">Abbrechen</button>`, () => resolve(false));
    document.getElementById('c-ok').addEventListener('click', () => {
      modalCloseHook = null;
      closeModal();
      resolve(true);
    });
    document.getElementById('c-cancel').addEventListener('click', closeModal);
  });
}

// Auswahlmenü für "⋯"-Buttons.
function openSheet(title, actions) {
  openModal(`
    <div class="sheet-title">${esc(title)}</div>
    ${actions.map((a, i) => `
      <button class="sheet-btn ${a.danger ? 'danger' : ''}" data-i="${i}" ${a.disabled ? 'disabled' : ''}>
        ${icon(a.icon)}<span>${esc(a.label)}</span>
      </button>`).join('')}
    <button class="btn secondary" id="s-cancel" style="margin-top:6px">Abbrechen</button>`);
  modalBox.querySelectorAll('[data-i]').forEach(b => b.addEventListener('click', () => {
    closeModal();
    actions[+b.dataset.i].run();
  }));
  document.getElementById('s-cancel').addEventListener('click', closeModal);
}

// ---------- Übung hinzufügen / bearbeiten ----------
const EQUIPMENT = ['Maschine', 'Kabelzug', 'Kurzhanteln', 'Langhantel', 'Körpergewicht', 'Hex-Bar', 'SZ-Stange', 'Sonstiges'];

// Alle bekannten Übungen (Plan, Original-Plan, Historie) als Vorschläge.
function knownExercises() {
  const map = new Map();
  const add = e => {
    const key = e.name.toLowerCase();
    if (e.name && !map.has(key)) map.set(key, { name: e.name, equip: e.equip || '', sets: e.sets || 3, reps: e.reps || '10', kg: e.kg || '-' });
  };
  plan.forEach(w => w.exercises.forEach(add));
  PLAN.forEach(w => w.exercises.forEach(add));
  sortedSessions().forEach(s => s.exercises.forEach(e => add({ name: e.name, equip: e.equip, sets: e.sets.length })));
  return [...map.values()];
}

function normalizeRange(v, decimals) {
  const s = String(v).trim().replace(/\s+/g, '').replace(/–/g, '-');
  if (!s) return '';
  const part = decimals ? '\\d+(?:[.,]\\d+)?' : '\\d+';
  if (!new RegExp(`^${part}(?:-${part})?$`).test(s)) return null;
  return decimals ? s.replace(/\./g, ',') : s;
}

// opts: { title, submit, initial, exclude: [Namen], planOption: 'Push' | null, onSave(values, toPlan) }
function exerciseForm(opts) {
  const f = { name: '', equip: '', sets: 3, reps: '10', kg: '', ...opts.initial };
  if (f.kg === '-') f.kg = '';
  const exclude = new Set((opts.exclude || []).map(n => n.toLowerCase()));

  openModal(`
    <h2 class="sheet-h">${esc(opts.title)}</h2>
    <div class="form">
      <label for="f-name">Name</label>
      <input class="field" id="f-name" value="${esc(f.name)}" placeholder="z. B. Kniebeugen" autocomplete="off" autocapitalize="sentences">
      <div class="suggest" id="f-suggest"></div>
      <label>Gerät</label>
      <div class="equip-chips" id="f-equip">
        ${EQUIPMENT.map(e => `<button type="button" data-eq="${esc(e)}" class="${e === f.equip ? 'on' : ''}">${esc(e)}</button>`).join('')}
      </div>
      <div class="form-row">
        <div>
          <label>Sätze</label>
          <div class="stepper">
            <button type="button" id="f-minus" aria-label="Weniger Sätze">${icon('minus')}</button>
            <span id="f-sets">${f.sets}</span>
            <button type="button" id="f-plus" aria-label="Mehr Sätze">${icon('plus')}</button>
          </div>
        </div>
        <div>
          <label for="f-reps">Wdh.</label>
          <input class="field" id="f-reps" value="${esc(f.reps)}" placeholder="10" autocomplete="off">
        </div>
        <div>
          <label for="f-kg">kg</label>
          <input class="field" id="f-kg" value="${esc(f.kg)}" placeholder="–" inputmode="decimal" autocomplete="off">
        </div>
      </div>
      <p class="hint">Wdh./kg auch als Bereich, z. B. 8-12</p>
      ${opts.planOption ? `
        <label class="check-line"><input type="checkbox" id="f-plan">
          <span>Auch im Trainingsplan „${esc(opts.planOption)}“ speichern</span></label>` : ''}
      <div class="form-error" id="f-error"></div>
      <button class="btn" id="f-save">${esc(opts.submit)}</button>
      <button class="btn secondary" id="f-cancel">Abbrechen</button>
    </div>`);

  const nameIn = document.getElementById('f-name');
  const setsEl = document.getElementById('f-sets');
  const suggestEl = document.getElementById('f-suggest');
  const errorEl = document.getElementById('f-error');
  const known = knownExercises().filter(e => !exclude.has(e.name.toLowerCase()));

  const setEquip = eq => {
    f.equip = eq;
    modalBox.querySelectorAll('[data-eq]').forEach(b => b.classList.toggle('on', b.dataset.eq === eq));
  };

  const showSuggestions = () => {
    const q = nameIn.value.trim().toLowerCase();
    const hits = q ? known.filter(e => e.name.toLowerCase().includes(q) && e.name.toLowerCase() !== q).slice(0, 6) : [];
    suggestEl.innerHTML = hits.map((e, i) => `<button type="button" data-s="${i}">${esc(e.name)}${e.equip ? ` <small>${esc(e.equip)}</small>` : ''}</button>`).join('');
    suggestEl.querySelectorAll('[data-s]').forEach(b => b.addEventListener('click', () => {
      const e = hits[+b.dataset.s];
      nameIn.value = e.name;
      setEquip(e.equip);
      f.sets = e.sets;
      setsEl.textContent = f.sets;
      document.getElementById('f-reps').value = e.reps;
      document.getElementById('f-kg').value = e.kg === '-' ? '' : e.kg;
      suggestEl.innerHTML = '';
    }));
  };

  nameIn.addEventListener('input', () => { errorEl.textContent = ''; showSuggestions(); });
  modalBox.querySelectorAll('[data-eq]').forEach(b => b.addEventListener('click', () => setEquip(f.equip === b.dataset.eq ? '' : b.dataset.eq)));
  document.getElementById('f-minus').addEventListener('click', () => { f.sets = Math.max(1, f.sets - 1); setsEl.textContent = f.sets; });
  document.getElementById('f-plus').addEventListener('click', () => { f.sets = Math.min(20, f.sets + 1); setsEl.textContent = f.sets; });
  document.getElementById('f-cancel').addEventListener('click', closeModal);

  document.getElementById('f-save').addEventListener('click', () => {
    const name = nameIn.value.trim().replace(/\s+/g, ' ');
    const reps = normalizeRange(document.getElementById('f-reps').value, false);
    const kg = normalizeRange(document.getElementById('f-kg').value, true);
    let err = '';
    if (!name) err = 'Bitte einen Namen eingeben.';
    else if (exclude.has(name.toLowerCase())) err = 'Diese Übung ist hier schon drin.';
    else if (reps === null) err = 'Wdh. bitte als Zahl, z. B. 10 oder 8-12.';
    else if (kg === null) err = 'kg bitte als Zahl, z. B. 20 oder 22,5.';
    if (err) {
      errorEl.textContent = err;
      return;
    }
    const planBox = document.getElementById('f-plan');
    closeModal();
    opts.onSave({ name, equip: f.equip, sets: f.sets, reps: reps || '10', kg: kg || '-' }, !!(planBox && planBox.checked));
  });

  if (!f.name) nameIn.focus();
}

// ---------- Datei-Download / Teilen ----------
function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const file = typeof File === 'function' ? new File([blob], name, { type }) : null;
  // Als Homescreen-App auf iOS funktionieren Downloads nicht zuverlässig → Teilen-Menü.
  if (navigator.standalone && file && navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file], title: name }).catch(() => {});
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function backupJson() {
  return JSON.stringify({
    app: 'gym-tracker', version: 2, exported: new Date().toISOString(),
    sessions: state.sessions, nextIndex: state.nextIndex, plan,
  }, null, 2);
}

// Übernimmt Trainings (und ggf. den Plan) aus einem Backup; bekannte IDs werden übersprungen.
function mergeBackup(data) {
  if (!data || !Array.isArray(data.sessions)) throw new Error('format');
  const importedPlan = cleanPlan(data.plan);
  if (importedPlan) {
    plan = importedPlan;
    savePlan();
  }
  const known = new Set(state.sessions.map(s => s.id));
  const added = data.sessions.map(cleanSession).filter(s => s && !known.has(s.id));
  state.sessions.push(...added);
  if (validIndex(data.nextIndex)) state.nextIndex = data.nextIndex;
  if (!validIndex(state.nextIndex)) state.nextIndex = 0;
  save();
  return added.length;
}

// ---------- Kalender-Export (.ics) ----------
function icsEscape(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

function icsStamp(d) {
  return new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// Zeilen nach RFC 5545 auf max. 75 Bytes umbrechen.
function icsFold(line) {
  const enc = new TextEncoder();
  const out = [];
  let cur = '', bytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (bytes + b > 74) {
      out.push(cur);
      cur = ' ';
      bytes = 1;
    }
    cur += ch;
    bytes += b;
  }
  out.push(cur);
  return out.join('\r\n');
}

function setsText(sets) {
  return sets.map(s => `${s.kg === null ? '-' : fmtNum(s.kg)} kg × ${s.reps === null ? '-' : s.reps}`).join(', ');
}

function sessionDescription(s) {
  const lines = [`${setsLabel(sessionSets(s))} · ${fmtDuration(new Date(s.end) - new Date(s.start))}`, ''];
  for (const e of s.exercises) lines.push(`${e.name}: ${setsText(e.sets)}`);
  return lines.join('\n');
}

function buildIcs(sessions) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GymTracker//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const s of sessions) {
    let end = new Date(s.end);
    if (end - new Date(s.start) < 5 * 60000) end = new Date(new Date(s.start).getTime() + 5 * 60000);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${s.id}@gym-tracker`,
      `DTSTAMP:${icsStamp(new Date())}`,
      `DTSTART:${icsStamp(s.start)}`,
      `DTEND:${icsStamp(end)}`,
      `SUMMARY:${icsEscape('Training: ' + s.name)}`,
      `DESCRIPTION:${icsEscape(sessionDescription(s))}`,
      'END:VEVENT'
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(icsFold).join('\r\n') + '\r\n';
}

function exportSessionIcs(s) {
  const name = `training-${dayKey(s.start)}-${s.workoutId || 'training'}.ics`;
  downloadFile(name, buildIcs([s]), 'text/calendar;charset=utf-8');
}

// ---------- Navigation ----------
document.querySelectorAll('#nav button').forEach(b => {
  b.insertAdjacentHTML('afterbegin', icon(b.dataset.icon));
});

document.getElementById('nav').addEventListener('click', e => {
  const b = e.target.closest('button[data-view]');
  if (!b) return;
  view = b.dataset.view;
  render();
  window.scrollTo(0, 0);
});

function render() {
  clearInterval(timerHandle);
  document.body.classList.remove('typing');
  document.body.classList.toggle('in-workout', !!state.active);
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  if (state.active) return renderWorkout();
  if (view === 'calendar') return renderCalendar();
  if (view === 'data') return renderData();
  renderPlan();
}

// Neu zeichnen, ohne dass die Seite nach oben springt.
function rerenderKeepScroll() {
  const y = window.scrollY;
  render();
  window.scrollTo(0, y);
}

// ---------- Ansicht: Trainingsplan ----------
function exerciseLine(workout, ex) {
  const last = lastSetsFor(workout.id, ex.name);
  let reps = ex.reps, kg = ex.kg;
  if (last) {
    reps = range(last.map(s => s.reps).filter(v => v !== null), String) || reps;
    kg = range(last.map(s => s.kg).filter(v => v !== null), fmtNum) || kg;
  }
  return `${setsLabel(ex.sets)} · ${esc(reps)} Wdh. · ${esc(kg)} kg`;
}

function renderPlan() {
  if (!validIndex(planIndex)) planIndex = 0;

  const chips = plan.map((w, i) => {
    const recent = doneRecently(w.id);
    return `<button class="chip ${i === planIndex ? 'active' : ''} ${recent ? 'done' : ''}" data-tab="${i}">
      ${recent ? icon('check') : ''}${esc(w.name)}</button>`;
  }).join('');

  const cards = plan.map((w, i) => {
    const last = lastSessionOf(w.id);
    let badge = '<span class="badge">Zukünftiges Training</span>';
    if (i === state.nextIndex) badge = '<span class="badge next">Nächstes Training</span>';
    else if (doneRecently(w.id)) badge = '<span class="badge done">Abgeschlossen</span>';
    const date = last ? `<span class="card-date">${fmtDate(last.start)}</span>` : '';
    const dur = last ? fmtDuration(new Date(last.end) - new Date(last.start)) : '–';
    return `
      <section class="wcard">
        <div class="card-top">${badge}${date}</div>
        <h2>${esc(w.name)}</h2>
        <div class="stats">
          <div class="stat"><small>Zuletzt</small>${dur}</div>
          <div class="stat"><small>Sätze</small>${totalSets(w)}</div>
          <div class="stat"><small>Übungen</small>${w.exercises.length}</div>
        </div>
        <button class="add-line" data-add="${i}">${icon('plus')}Übung hinzufügen</button>
        ${w.exercises.length ? w.exercises.map((ex, j) => `
          <div class="ex">
            <div class="ex-head">
              <div>
                <div class="ex-name">${esc(ex.name)}</div>
                ${ex.equip ? `<div class="ex-equip">${esc(ex.equip)}</div>` : ''}
              </div>
              <button class="more" data-more="${i}:${j}" aria-label="Optionen für ${esc(ex.name)}">${icon('more')}</button>
            </div>
            <div class="ex-line">${exerciseLine(w, ex)}</div>
          </div>`).join('') : '<p class="empty">Noch keine Übungen – füge oben welche hinzu.</p>'}
      </section>`;
  }).join('');

  app.innerHTML = `
    <h1>Trainingsplan</h1>
    <div class="chips-row" id="chips">${chips}</div>
    <div class="slider" id="slider">${cards}</div>
    <button class="btn float" id="start">${esc(plan[planIndex].name)} starten</button>`;

  const slider = document.getElementById('slider');
  const chipRow = document.getElementById('chips');
  const step = () => slider.firstElementChild.getBoundingClientRect().width + 12;
  const showChip = (i, smooth) => {
    const c = chipRow.children[i];
    chipRow.scrollTo({ left: c.offsetLeft - 16, behavior: smooth ? 'smooth' : 'auto' });
  };
  requestAnimationFrame(() => {
    slider.scrollLeft = planIndex * step();
    showChip(planIndex, false);
  });

  slider.addEventListener('scroll', () => {
    const i = Math.min(plan.length - 1, Math.max(0, Math.round(slider.scrollLeft / step())));
    if (i !== planIndex) {
      planIndex = i;
      [...chipRow.children].forEach((c, j) => c.classList.toggle('active', j === i));
      showChip(i, true);
      document.getElementById('start').textContent = `${plan[i].name} starten`;
    }
  }, { passive: true });

  chipRow.querySelectorAll('[data-tab]').forEach(t => t.addEventListener('click', () => {
    slider.scrollTo({ left: +t.dataset.tab * step(), behavior: 'smooth' });
  }));

  app.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => addToPlan(+b.dataset.add)));
  app.querySelectorAll('[data-more]').forEach(b => b.addEventListener('click', () => {
    const [i, j] = b.dataset.more.split(':').map(Number);
    planExerciseMenu(i, j);
  }));

  document.getElementById('start').addEventListener('click', () => startWorkout(planIndex));
}

function addToPlan(i) {
  const w = plan[i];
  exerciseForm({
    title: `Übung zu „${w.name}“ hinzufügen`,
    submit: 'Hinzufügen',
    exclude: w.exercises.map(e => e.name),
    onSave: values => {
      w.exercises.push(cleanPlanExercise(values));
      savePlan();
      rerenderKeepScroll();
      toast(`„${values.name}“ hinzugefügt`);
    },
  });
}

function planExerciseMenu(i, j) {
  const w = plan[i];
  const ex = w.exercises[j];
  openSheet(ex.name, [
    {
      label: 'Bearbeiten', icon: 'edit', run: () => exerciseForm({
        title: 'Übung bearbeiten',
        submit: 'Speichern',
        initial: ex,
        exclude: w.exercises.filter((_, k) => k !== j).map(e => e.name),
        onSave: values => {
          w.exercises[j] = cleanPlanExercise(values);
          savePlan();
          rerenderKeepScroll();
        },
      }),
    },
    { label: 'Nach oben', icon: 'up', disabled: j === 0, run: () => { moveItem(w.exercises, j, -1); savePlan(); rerenderKeepScroll(); } },
    { label: 'Nach unten', icon: 'down', disabled: j === w.exercises.length - 1, run: () => { moveItem(w.exercises, j, 1); savePlan(); rerenderKeepScroll(); } },
    {
      label: 'Aus dem Plan entfernen', icon: 'trash', danger: true, run: async () => {
        const ok = await askConfirm({
          title: `„${ex.name}“ entfernen?`,
          text: `Die Übung wird aus „${w.name}“ gelöscht. Bisherige Trainings bleiben erhalten.`,
          ok: 'Entfernen', danger: true,
        });
        if (!ok) return;
        w.exercises.splice(j, 1);
        savePlan();
        rerenderKeepScroll();
        toast(`„${ex.name}“ entfernt`);
      },
    },
  ]);
}

// ---------- Ansicht: Training läuft ----------
// Baut eine Übung für das laufende Training; Vorschlagswerte vom letzten Mal bzw. aus dem Plan.
function activeExercise(workoutId, ex) {
  const last = lastSetsFor(workoutId, ex.name);
  const planKg = num(String(ex.kg).split('-').pop());
  const planReps = num(String(ex.reps).split('-')[0]);
  const sets = [];
  for (let n = 0; n < ex.sets; n++) {
    const prev = last ? last[Math.min(n, last.length - 1)] : null;
    sets.push({
      kg: '', reps: '', done: false,
      phKg: prev && prev.kg !== null ? fmtNum(prev.kg) : (planKg !== null ? fmtNum(planKg) : ''),
      phReps: prev && prev.reps !== null ? String(prev.reps) : (planReps !== null ? String(planReps) : ''),
    });
  }
  return { name: ex.name, equip: ex.equip, target: `${ex.sets} × ${ex.reps} Wdh.`, sets };
}

function startWorkout(i) {
  const w = plan[i];
  state.active = {
    workoutId: w.id,
    name: w.name,
    start: new Date().toISOString(),
    lastAt: null,
    exercises: w.exercises.map(ex => activeExercise(w.id, ex)),
  };
  save();
  render();
  window.scrollTo(0, 0);
}

function workoutProgress(a) {
  let done = 0, total = 0;
  for (const e of a.exercises) for (const s of e.sets) { total++; if (s.done) done++; }
  return { done, total };
}

function setRowHtml(ei, si, s) {
  return `
    <div class="set-row ${s.done ? 'done' : ''}" data-ei="${ei}" data-si="${si}">
      <div class="num">${si + 1}</div>
      <input inputmode="decimal" data-f="kg" placeholder="${esc(s.phKg || 'kg')}" value="${esc(s.kg)}" autocomplete="off">
      <input inputmode="numeric" data-f="reps" placeholder="${esc(s.phReps || 'Wdh.')}" value="${esc(s.reps)}" autocomplete="off">
      <button class="check" data-act="check" aria-label="Satz ${si + 1} abhaken">${icon('check')}</button>
    </div>`;
}

function renderWorkout() {
  const a = state.active;
  const p = workoutProgress(a);
  app.innerHTML = `
    <div class="wo-head">
      <div>
        <h2>${esc(a.name)}</h2>
        <div class="muted small">${p.done} von ${p.total} ${p.total === 1 ? 'Satz' : 'Sätzen'}</div>
      </div>
      <div class="timer" id="timer">${fmtClock(Date.now() - new Date(a.start))}</div>
    </div>
    <div class="progress"><div style="width:${p.total ? (p.done / p.total) * 100 : 0}%"></div></div>
    ${a.exercises.length ? '' : '<p class="empty">Keine Übungen – füge unten welche hinzu.</p>'}
    ${a.exercises.map((e, ei) => `
      <div class="ex ${e.sets.length && e.sets.every(s => s.done) ? 'complete' : ''}" data-card="${ei}">
        <div class="ex-head">
          <div>
            <div class="ex-name">${esc(e.name)}</div>
            <div class="ex-equip">${e.equip ? esc(e.equip) + ' · ' : ''}Ziel ${esc(e.target)}</div>
          </div>
          <button class="more" data-act="menu" data-ei="${ei}" aria-label="Optionen für ${esc(e.name)}">${icon('more')}</button>
        </div>
        ${e.sets.length ? '<div class="set-row head"><div>Satz</div><div>kg</div><div>Wdh.</div><div></div></div>' : ''}
        ${e.sets.map((s, si) => setRowHtml(ei, si, s)).join('')}
        <div class="ex-actions">
          <button class="pill" data-act="add" data-ei="${ei}">${icon('plus')}Satz</button>
          ${e.sets.length ? `<button class="pill red" data-act="remove" data-ei="${ei}">${icon('minus')}Satz</button>` : ''}
        </div>
      </div>`).join('')}
    <button class="add-card" id="add-ex">${icon('plus')}Übung hinzufügen</button>
    <button class="btn secondary" id="cancel" style="margin-top:22px">Training abbrechen</button>
    <button class="btn float" id="finish">Training beenden</button>`;

  timerHandle = setInterval(() => {
    const t = document.getElementById('timer');
    if (t && state.active) t.textContent = fmtClock(Date.now() - new Date(state.active.start));
  }, 1000);

  app.querySelectorAll('.set-row input').forEach(inp => inp.addEventListener('input', () => {
    const row = inp.closest('.set-row');
    state.active.exercises[+row.dataset.ei].sets[+row.dataset.si][inp.dataset.f] = inp.value;
    save();
  }));

  app.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => {
    const act = b.dataset.act;
    const row = b.closest('.set-row');
    const ei = row ? +row.dataset.ei : +b.dataset.ei;
    const ex = state.active.exercises[ei];
    if (act === 'menu') return workoutExerciseMenu(ei);
    if (act === 'check') {
      const s = ex.sets[+row.dataset.si];
      s.done = !s.done;
      if (s.done) {
        if (s.kg === '') s.kg = s.phKg;
        if (s.reps === '') s.reps = s.phReps;
        state.active.lastAt = new Date().toISOString();
      }
    } else if (act === 'add') {
      const prev = ex.sets[ex.sets.length - 1];
      ex.sets.push({
        kg: '', reps: '', done: false,
        phKg: prev ? (prev.kg || prev.phKg) : '',
        phReps: prev ? (prev.reps || prev.phReps) : '',
      });
    } else if (act === 'remove') {
      ex.sets.pop();
    }
    save();
    rerenderKeepScroll();
  }));

  document.getElementById('add-ex').addEventListener('click', addToWorkout);

  document.getElementById('cancel').addEventListener('click', async () => {
    const ok = await askConfirm({ title: 'Training abbrechen?', text: 'Alle Eingaben dieses Trainings gehen verloren.', ok: 'Training abbrechen', danger: true });
    if (!ok) return;
    state.active = null;
    save();
    render();
    window.scrollTo(0, 0);
  });

  document.getElementById('finish').addEventListener('click', finishWorkout);
}

// Bei offener Tastatur den schwebenden "Beenden"-Button ausblenden.
app.addEventListener('focusin', e => {
  if (state.active && e.target.matches('input')) document.body.classList.add('typing');
});
app.addEventListener('focusout', e => {
  if (!(e.relatedTarget && e.relatedTarget.matches && e.relatedTarget.matches('input'))) document.body.classList.remove('typing');
});

function addToWorkout() {
  const a = state.active;
  const pi = plan.findIndex(w => w.id === a.workoutId);
  exerciseForm({
    title: 'Übung hinzufügen',
    submit: 'Hinzufügen',
    exclude: a.exercises.map(e => e.name),
    planOption: pi >= 0 ? plan[pi].name : null,
    onSave: (values, toPlan) => {
      a.exercises.push(activeExercise(a.workoutId, values));
      save();
      if (toPlan && pi >= 0 && !plan[pi].exercises.some(e => e.name.toLowerCase() === values.name.toLowerCase())) {
        plan[pi].exercises.push(cleanPlanExercise(values));
        savePlan();
      }
      render();
      const card = app.querySelector(`[data-card="${a.exercises.length - 1}"]`);
      if (card) card.scrollIntoView({ block: 'center' });
      toast(toPlan ? `„${values.name}“ hinzugefügt – auch im Plan` : `„${values.name}“ hinzugefügt`);
    },
  });
}

function workoutExerciseMenu(ei) {
  const list = state.active.exercises;
  const ex = list[ei];
  openSheet(ex.name, [
    { label: 'Nach oben', icon: 'up', disabled: ei === 0, run: () => { moveItem(list, ei, -1); save(); rerenderKeepScroll(); } },
    { label: 'Nach unten', icon: 'down', disabled: ei === list.length - 1, run: () => { moveItem(list, ei, 1); save(); rerenderKeepScroll(); } },
    {
      label: 'Aus diesem Training entfernen', icon: 'trash', danger: true, run: async () => {
        const done = ex.sets.filter(s => s.done).length;
        if (done) {
          const ok = await askConfirm({
            title: `„${ex.name}“ entfernen?`,
            text: `${done} ${done === 1 ? 'abgehakter Satz geht' : 'abgehakte Sätze gehen'} verloren. Der Trainingsplan bleibt unverändert.`,
            ok: 'Entfernen', danger: true,
          });
          if (!ok) return;
        }
        list.splice(ei, 1);
        save();
        rerenderKeepScroll();
        toast(`„${ex.name}“ entfernt`);
      },
    },
  ]);
}

async function finishWorkout() {
  const a = state.active;
  const exercises = a.exercises
    .map(e => ({
      name: e.name,
      equip: e.equip,
      sets: e.sets.filter(s => s.done).map(s => ({ kg: num(s.kg), reps: num(s.reps) })),
    }))
    .filter(e => e.sets.length);

  if (!exercises.length) {
    const ok = await askConfirm({ title: 'Noch kein Satz abgehakt', text: 'Ohne abgehakte Sätze wird nichts gespeichert.', ok: 'Training verwerfen', danger: true });
    if (ok) {
      state.active = null;
      save();
      render();
      window.scrollTo(0, 0);
    }
    return;
  }
  const p = workoutProgress(a);
  if (p.done < p.total) {
    const ok = await askConfirm({ title: 'Training beenden?', text: `${p.done} von ${p.total} ${p.total === 1 ? 'Satz' : 'Sätzen'} erledigt. Nur abgehakte Sätze werden gespeichert.`, ok: 'Beenden' });
    if (!ok) return;
  }

  // Erst lange nach dem letzten Satz auf "Beenden" getippt (z. B. zu Hause)?
  // Dann zählt der letzte abgehakte Satz als Ende des Trainings.
  let end = new Date();
  const lastAt = validDate(a.lastAt) ? new Date(a.lastAt) : null;
  if (lastAt && end - lastAt > 30 * 60000) end = lastAt;

  const session = {
    id: uid(),
    workoutId: a.workoutId,
    name: a.name,
    start: a.start,
    end: end.toISOString(),
    exercises,
  };
  state.sessions.push(session);
  const idx = plan.findIndex(w => w.id === a.workoutId);
  state.nextIndex = (idx + 1) % plan.length;
  planIndex = state.nextIndex;
  state.active = null;
  save();

  view = 'calendar';
  calMonth = startOfMonth(new Date(session.start));
  calSelected = dayKey(session.start);
  render();
  window.scrollTo(0, 0);

  openModal(`
    <div class="big-check">${icon('check')}</div>
    <h2 class="sheet-h" style="text-align:center">Training gespeichert!</h2>
    <p class="sheet-text" style="text-align:center">${esc(session.name)} · ${fmtDuration(new Date(session.end) - new Date(session.start))} · ${setsLabel(sessionSets(session))}<br>
    Nächstes Training: <b>${esc(plan[state.nextIndex].name)}</b></p>
    <button class="btn" id="m-close">Fertig</button>
    <button class="btn secondary" id="m-ics">${icon('calendar')}In Handy-Kalender eintragen</button>`);
  document.getElementById('m-ics').addEventListener('click', () => { exportSessionIcs(session); closeModal(); });
  document.getElementById('m-close').addEventListener('click', closeModal);
}

// ---------- Ansicht: Kalender ----------
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

function sessionCardHtml(s) {
  return `
    <div class="session">
      <div class="session-title">${esc(s.name)}</div>
      <div class="muted small" style="margin-top:2px">
        ${fmtDate(s.start)} · ${fmtTime(s.start)}–${fmtTime(s.end)} · ${fmtDuration(new Date(s.end) - new Date(s.start))} · ${setsLabel(sessionSets(s))}
      </div>
      <ul>${s.exercises.map(e => `<li><b>${esc(e.name)}</b>: ${esc(setsText(e.sets))}</li>`).join('')}</ul>
      <div class="btn-row">
        <button class="btn small secondary" data-ics="${esc(s.id)}">${icon('calendar')}In Handy-Kalender</button>
        <button class="btn small danger" data-del="${esc(s.id)}">${icon('trash')}Löschen</button>
      </div>
    </div>`;
}

function renderCalendar() {
  const y = calMonth.getFullYear(), m = calMonth.getMonth();
  const monthPrefix = `${y}-${pad(m + 1)}-`;
  const byDay = {};
  for (const s of state.sessions) (byDay[dayKey(s.start)] = byDay[dayKey(s.start)] || []).push(s);

  const offset = (new Date(y, m, 1).getDay() + 6) % 7;
  const days = new Date(y, m + 1, 0).getDate();
  const today = dayKey(new Date());
  let cells = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(d => `<div class="wd">${d}</div>`).join('');
  for (let i = 0; i < offset; i++) cells += '<div class="day empty"></div>';
  let monthCount = 0;
  for (let d = 1; d <= days; d++) {
    const k = monthPrefix + pad(d);
    const n = (byDay[k] || []).length;
    monthCount += n;
    const cls = ['day'];
    if (n) cls.push('has');
    if (k === today) cls.push('today');
    if (k === calSelected) cls.push('sel');
    cells += `<button class="${cls.join(' ')}" data-day="${k}">${d}${n ? `<span class="dots">${'●'.repeat(Math.min(n, 3))}</span>` : ''}</button>`;
  }

  // Ausgewählter Tag liegt im angezeigten Monat → dessen Trainings, sonst alle des Monats.
  let heading, list, empty;
  if (calSelected && calSelected.startsWith(monthPrefix)) {
    const [sy, sm, sd] = calSelected.split('-');
    heading = `${sd}.${sm}.${sy}`;
    list = (byDay[calSelected] || []).sort((a, b) => new Date(a.start) - new Date(b.start));
    empty = 'Kein Training an diesem Tag.';
  } else {
    heading = `Trainings im ${MONTHS[m]}`;
    list = state.sessions.filter(s => dayKey(s.start).startsWith(monthPrefix)).sort((a, b) => new Date(b.start) - new Date(a.start));
    empty = 'Kein Training in diesem Monat.';
  }

  app.innerHTML = `
    <h1>Kalender</h1>
    <div class="cal-head">
      <button id="prev" aria-label="Voriger Monat">‹</button>
      <div class="cal-title">${MONTHS[m]} ${y}</div>
      <button id="next" aria-label="Nächster Monat">›</button>
    </div>
    <div class="cal-grid">${cells}</div>
    <div class="month-sum">${monthCount} ${monthCount === 1 ? 'Training' : 'Trainings'} in diesem Monat · ${state.sessions.length} insgesamt</div>
    <h3 class="list-h">${heading}</h3>
    ${list.length ? list.map(sessionCardHtml).join('') : `<p class="muted">${empty}</p>`}`;

  document.getElementById('prev').addEventListener('click', () => { calMonth = new Date(y, m - 1, 1); render(); });
  document.getElementById('next').addEventListener('click', () => { calMonth = new Date(y, m + 1, 1); render(); });
  app.querySelectorAll('[data-day]').forEach(b => b.addEventListener('click', () => { calSelected = b.dataset.day; rerenderKeepScroll(); }));
  app.querySelectorAll('[data-ics]').forEach(b => b.addEventListener('click', () => {
    const s = state.sessions.find(x => x.id === b.dataset.ics);
    if (s) exportSessionIcs(s);
  }));
  app.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
    const ok = await askConfirm({ title: 'Training löschen?', text: 'Das Training wird aus dem Kalender der App entfernt.', ok: 'Löschen', danger: true });
    if (!ok) return;
    state.sessions = state.sessions.filter(x => x.id !== b.dataset.del);
    save();
    rerenderKeepScroll();
  }));
}

// ---------- Ansicht: Daten ----------
function renderData() {
  app.innerHTML = `
    <h1>Daten</h1>
    <div class="panel">
      <h3>Nächstes Training</h3>
      <p>Wird nach jedem Training automatisch weitergeschaltet.</p>
      <select id="next-sel">${plan.map((w, i) => `<option value="${i}" ${i === state.nextIndex ? 'selected' : ''}>${i + 1}. ${esc(w.name)}</option>`).join('')}</select>
    </div>
    <div class="panel">
      <h3>Kalender-Datei (.ics)</h3>
      <p>${state.sessions.length === 1 ? 'Dein Training' : `Alle ${state.sessions.length} Trainings`} als Datei exportieren, z. B. für den Apple- oder Google-Kalender.</p>
      <button class="btn secondary" id="ics-all" ${state.sessions.length ? '' : 'disabled'}>${icon('calendar')}Kalender-Datei exportieren</button>
    </div>
    <div class="panel">
      <h3>Backup</h3>
      <p>Trainings und Plan liegen nur auf diesem Gerät. Mit einem Backup kannst du sie sichern oder auf ein neues Handy übertragen.</p>
      <button class="btn secondary" id="export">${icon('download')}Backup speichern</button>
      <button class="btn secondary" id="import">${icon('upload')}Backup laden</button>
      <input type="file" id="import-file" accept="application/json,.json" class="hidden">
    </div>
    <div class="panel">
      <h3>Trainingsplan</h3>
      <p>${planIsDefault() ? 'Du nutzt den Original-Plan.' : 'Du hast den Plan angepasst. Hier kannst du ihn auf das Original zurücksetzen.'}</p>
      <button class="btn secondary" id="plan-reset" ${planIsDefault() ? 'disabled' : ''}>${icon('reset')}Plan zurücksetzen</button>
    </div>
    <div class="panel">
      <h3>Alles löschen</h3>
      <p>Löscht alle gespeicherten Trainings auf diesem Gerät.</p>
      <button class="btn danger" id="reset">${icon('trash')}Alle Trainings löschen</button>
    </div>`;

  document.getElementById('next-sel').addEventListener('change', e => {
    state.nextIndex = +e.target.value;
    planIndex = state.nextIndex;
    save();
    toast(`Nächstes Training: ${plan[state.nextIndex].name}`);
  });
  document.getElementById('ics-all').addEventListener('click', () => {
    downloadFile('gym-trainings.ics', buildIcs(sortedSessions().reverse()), 'text/calendar;charset=utf-8');
  });
  document.getElementById('export').addEventListener('click', () => {
    downloadFile(`gym-backup-${dayKey(new Date())}.json`, backupJson(), 'application/json');
  });
  const fileInput = document.getElementById('import-file');
  document.getElementById('import').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const f = fileInput.files[0];
    if (!f) return;
    try {
      const added = mergeBackup(JSON.parse(await f.text()));
      planIndex = state.nextIndex;
      render();
      toast(`${added} ${added === 1 ? 'Training' : 'Trainings'} importiert`);
    } catch (e) {
      toast('Die Datei ist kein gültiges Backup.');
    }
  });
  document.getElementById('plan-reset').addEventListener('click', async () => {
    const ok = await askConfirm({ title: 'Plan zurücksetzen?', text: 'Hinzugefügte, geänderte und entfernte Übungen werden auf den Original-Plan zurückgesetzt. Deine Trainings bleiben erhalten.', ok: 'Zurücksetzen', danger: true });
    if (!ok) return;
    plan = defaultPlan();
    savePlan();
    if (!validIndex(state.nextIndex)) state.nextIndex = 0;
    render();
    toast('Plan zurückgesetzt');
  });
  document.getElementById('reset').addEventListener('click', async () => {
    const ok = await askConfirm({ title: 'Alle Trainings löschen?', text: 'Das kann nicht rückgängig gemacht werden. Mach vorher am besten ein Backup.', ok: 'Alles löschen', danger: true });
    if (!ok) return;
    state = { sessions: [], active: null, nextIndex: 0 };
    planIndex = 0;
    save();
    render();
    toast('Alle Trainings gelöscht');
  });
}

// ---------- Start ----------
render();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
