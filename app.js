'use strict';

// ---------- Speicher ----------
// Alles liegt lokal im Browser (localStorage). Backup über "Daten" → Export
// oder automatisch über das Kalender-Abo (GitHub-Gist, siehe unten).
const STORE_KEY = 'gymtracker.v1';

function validDate(v) {
  return typeof v === 'string' && !Number.isNaN(new Date(v).getTime());
}

function numOrNull(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

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

function validIndex(i) {
  return Number.isInteger(i) && i >= 0 && i < PLAN.length;
}

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY));
    if (s && Array.isArray(s.sessions)) {
      const active = s.active && Array.isArray(s.active.exercises) && validDate(s.active.start) ? s.active : null;
      return {
        sessions: s.sessions.map(cleanSession).filter(Boolean),
        active,
        nextIndex: validIndex(s.nextIndex) ? s.nextIndex : 0,
      };
    }
  } catch (e) { /* kaputte Daten → neu anfangen */ }
  return { sessions: [], active: null, nextIndex: 0 };
}

let state = load();
let saveWarned = false;

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
    saveWarned = false;
  } catch (e) {
    if (!saveWarned) alert('Speichern fehlgeschlagen (Speicher voll oder privater Modus). Bitte ein Backup machen.');
    saveWarned = true;
  }
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
    app: 'gym-tracker', version: 1, exported: new Date().toISOString(),
    sessions: state.sessions, nextIndex: state.nextIndex,
  }, null, 2);
}

// Übernimmt Trainings aus einem Backup (bekannte IDs werden übersprungen).
function mergeBackup(data, takeNextIndex) {
  if (!data || !Array.isArray(data.sessions)) throw new Error('format');
  const known = new Set(state.sessions.map(s => s.id));
  const added = data.sessions.map(cleanSession).filter(s => s && !known.has(s.id));
  state.sessions.push(...added);
  if (takeNextIndex && validIndex(data.nextIndex)) state.nextIndex = data.nextIndex;
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
  const lines = [`${sessionSets(s)} Sätze · ${fmtDuration(new Date(s.end) - new Date(s.start))}`, ''];
  for (const e of s.exercises) lines.push(`${e.name}: ${setsText(e.sets)}`);
  return lines.join('\n');
}

// feed = true: Kalender-Abo (eigener Kalendername + Aktualisierungsintervall).
function buildIcs(sessions, feed) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GymTracker//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  if (feed) {
    lines.push('X-WR-CALNAME:Gym Training', 'REFRESH-INTERVAL;VALUE=DURATION:PT1H', 'X-PUBLISHED-TTL:PT1H');
  }
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

// ---------- Kalender-Abo über GitHub-Gist ----------
// Die App lädt nach jeder Änderung eine .ics-Datei (und ein Backup) in ein
// geheimes Gist hoch. Der Apple-Kalender abonniert die feste Adresse dieser
// Datei und holt sich neue Trainings automatisch.
const SYNC_KEY = 'gymtracker.sync';
const GIST_DESC = 'Gym Tracker – Trainingskalender';
const ICS_FILE = 'gym-trainings.ics';
const BACKUP_FILE = 'gym-backup.json';

function emptySync() {
  return { token: '', gistId: null, owner: null, pending: false, lastSync: null, error: null };
}

function loadSync() {
  try {
    const s = JSON.parse(localStorage.getItem(SYNC_KEY));
    if (s && typeof s.token === 'string') return { ...emptySync(), ...s };
  } catch (e) { /* ignorieren */ }
  return emptySync();
}

let sync = loadSync();
let syncRunning = null;
let syncAgain = false;

function saveSync() {
  try { localStorage.setItem(SYNC_KEY, JSON.stringify(sync)); } catch (e) { /* ignorieren */ }
}

function syncConnected() {
  return !!(sync.token && sync.gistId && sync.owner);
}

function calendarUrl() {
  return `https://gist.githubusercontent.com/${sync.owner}/${sync.gistId}/raw/${ICS_FILE}`;
}

async function gh(path, opts = {}) {
  const headers = { Accept: 'application/vnd.github+json', Authorization: `Bearer ${sync.token}` };
  if (opts.body) headers['Content-Type'] = 'application/json';
  const res = await fetch('https://api.github.com' + path, { ...opts, headers, cache: 'no-store' });
  if (!res.ok) {
    const err = new Error(`GitHub ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

function syncErrorText(e) {
  if (e.status === 401) return 'Token ungültig oder abgelaufen – bitte neu verbinden.';
  if (e.status === 403 || e.status === 404) return 'Keine Berechtigung für Gists – Token braucht das Recht „gist“.';
  if (e.status) return `GitHub-Fehler ${e.status} – wird später erneut versucht.`;
  return 'Keine Verbindung – wird automatisch nachgeholt.';
}

async function uploadGist() {
  const files = {
    [ICS_FILE]: { content: buildIcs(sortedSessions().reverse(), true) },
    [BACKUP_FILE]: { content: backupJson() },
  };
  if (sync.gistId) {
    try {
      const g = await gh(`/gists/${sync.gistId}`, { method: 'PATCH', body: JSON.stringify({ files }) });
      if (g.owner) sync.owner = g.owner.login;
      return;
    } catch (e) {
      if (e.status !== 404) throw e;
      sync.gistId = null; // Gist wurde gelöscht → neu anlegen
    }
  }
  const g = await gh('/gists', {
    method: 'POST',
    body: JSON.stringify({ description: GIST_DESC, public: false, files }),
  });
  sync.gistId = g.id;
  if (g.owner) sync.owner = g.owner.login;
}

function requestSync() {
  if (!sync.token) return Promise.resolve();
  sync.pending = true;
  saveSync();
  if (syncRunning) {
    syncAgain = true;
    return syncRunning;
  }
  syncRunning = (async () => {
    do {
      syncAgain = false;
      try {
        await uploadGist();
        sync.pending = false;
        sync.error = null;
        sync.lastSync = new Date().toISOString();
      } catch (e) {
        sync.error = syncErrorText(e);
      }
      saveSync();
    } while (syncAgain && !sync.error);
    syncRunning = null;
    updateSyncStatus();
  })();
  return syncRunning;
}

async function connectSync(token) {
  sync = { ...emptySync(), token };
  try {
    const me = await gh('/user');
    sync.owner = me.login;
    // Schon ein Gist von früher (z. B. altes Handy)? Dann weiterverwenden und Trainings übernehmen.
    const gists = await gh('/gists?per_page=100');
    const found = gists.find(g => g.description === GIST_DESC && g.files && g.files[ICS_FILE]);
    if (found) {
      sync.gistId = found.id;
      const full = await gh(`/gists/${found.id}`);
      const f = full.files && full.files[BACKUP_FILE];
      if (f) {
        const text = f.truncated ? await (await fetch(f.raw_url)).text() : f.content;
        mergeBackup(JSON.parse(text), state.sessions.length === 0);
        planIndex = state.nextIndex;
      }
    }
    saveSync();
  } catch (e) {
    sync = emptySync();
    saveSync();
    throw e;
  }
  await requestSync();
  if (sync.error) {
    const msg = sync.error;
    sync = emptySync();
    saveSync();
    throw new Error(msg);
  }
}

function updateSyncStatus() {
  const el = document.getElementById('sync-status');
  if (!el) return;
  if (sync.error) el.textContent = '⚠️ ' + sync.error;
  else if (syncRunning || sync.pending) el.textContent = '⏳ Wird übertragen …';
  else if (sync.lastSync) el.textContent = `✓ Zuletzt übertragen: ${fmtDate(sync.lastSync)}, ${fmtTime(sync.lastSync)} Uhr`;
  else el.textContent = '';
}

// Offline nicht übertragene Änderungen nachholen.
function retrySync() {
  if (sync.token && sync.pending && !syncRunning) requestSync();
}
window.addEventListener('online', retrySync);
document.addEventListener('visibilitychange', () => { if (!document.hidden) retrySync(); });

// ---------- Modal ----------
function openModal(html) {
  document.getElementById('modal-box').innerHTML = html;
  document.getElementById('modal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
}

document.getElementById('modal').addEventListener('click', e => {
  if (e.target.id === 'modal') closeModal();
});

// ---------- Navigation ----------
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

// ---------- Trainingsplan ----------
function exerciseLine(workout, ex) {
  const last = lastSetsFor(workout.id, ex.name);
  let reps = ex.reps, kg = ex.kg;
  if (last) {
    reps = range(last.map(s => s.reps).filter(v => v !== null), String) || reps;
    kg = range(last.map(s => s.kg).filter(v => v !== null), fmtNum) || kg;
  }
  return `${ex.sets} Sätze · ${esc(reps)} Wdh. · ${esc(kg)} kg`;
}

function renderPlan() {
  if (!validIndex(planIndex)) planIndex = 0;

  const tabs = PLAN.map((w, i) => {
    const recent = doneRecently(w.id);
    const cls = ['tab'];
    if (recent) cls.push('done');
    if (i === planIndex) cls.push('active');
    return `<button class="${cls.join(' ')}" data-tab="${i}">${recent ? '✓' : i + 1}</button>`;
  }).join('');

  const cards = PLAN.map((w, i) => {
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
          <div class="stat"><small>Zuletzt</small>⏱ ${dur}</div>
          <div class="stat"><small>Umfang</small>${totalSets(w)} Sätze</div>
          <div class="stat"><small>Übungen</small>${w.exercises.length}</div>
        </div>
        ${w.exercises.map(ex => `
          <div class="ex">
            <div class="ex-name">${esc(ex.name)}</div>
            <div class="ex-equip">${esc(ex.equip)}</div>
            <div class="ex-line">${exerciseLine(w, ex)}</div>
          </div>`).join('')}
      </section>`;
  }).join('');

  app.innerHTML = `
    <div class="plan-head"><h1>Trainingsplan</h1><div class="tabs">${tabs}</div></div>
    <div class="slider" id="slider">${cards}</div>
    <button class="btn float" id="start">${esc(PLAN[planIndex].name)} starten</button>`;

  const slider = document.getElementById('slider');
  const step = () => slider.firstElementChild.getBoundingClientRect().width + 12;
  requestAnimationFrame(() => { slider.scrollLeft = planIndex * step(); });

  slider.addEventListener('scroll', () => {
    const i = Math.min(PLAN.length - 1, Math.max(0, Math.round(slider.scrollLeft / step())));
    if (i !== planIndex) {
      planIndex = i;
      document.querySelectorAll('.tab').forEach((t, j) => t.classList.toggle('active', j === i));
      document.getElementById('start').textContent = `${PLAN[i].name} starten`;
    }
  }, { passive: true });

  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
    slider.scrollTo({ left: +t.dataset.tab * step(), behavior: 'smooth' });
  }));

  document.getElementById('start').addEventListener('click', () => startWorkout(planIndex));
}

// ---------- Training durchführen ----------
function startWorkout(i) {
  const w = PLAN[i];
  state.active = {
    workoutId: w.id,
    name: w.name,
    start: new Date().toISOString(),
    lastAt: null,
    exercises: w.exercises.map(ex => {
      const last = lastSetsFor(w.id, ex.name);
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
    }),
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
      <button class="check" data-act="check" aria-label="Satz abhaken">✓</button>
    </div>`;
}

function renderWorkout() {
  const a = state.active;
  const p = workoutProgress(a);
  app.innerHTML = `
    <div class="wo-head">
      <div><h2>${esc(a.name)}</h2><div class="muted" style="font-size:14px">${p.done} von ${p.total} Sätzen</div></div>
      <div class="timer" id="timer">${fmtClock(Date.now() - new Date(a.start))}</div>
    </div>
    <div class="progress"><div style="width:${p.total ? (p.done / p.total) * 100 : 0}%"></div></div>
    ${a.exercises.map((e, ei) => `
      <div class="ex ${e.sets.length && e.sets.every(s => s.done) ? 'complete' : ''}">
        <div class="ex-name">${esc(e.name)}</div>
        <div class="ex-equip">${esc(e.equip)} · Ziel ${esc(e.target)}</div>
        <div class="set-row head"><div>Satz</div><div style="text-align:center">kg</div><div style="text-align:center">Wdh.</div><div></div></div>
        ${e.sets.map((s, si) => setRowHtml(ei, si, s)).join('')}
        <div class="ex-actions">
          <button class="link" data-act="add" data-ei="${ei}">+ Satz</button>
          ${e.sets.length ? `<button class="link red" data-act="remove" data-ei="${ei}">− Satz</button>` : ''}
        </div>
      </div>`).join('')}
    <button class="btn secondary" id="cancel" style="margin-top:16px">Training abbrechen</button>
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

  // Bei offener Tastatur den schwebenden "Beenden"-Button ausblenden.
  app.addEventListener('focusin', e => { if (e.target.matches('input')) document.body.classList.add('typing'); });
  app.addEventListener('focusout', e => {
    if (!(e.relatedTarget && e.relatedTarget.matches && e.relatedTarget.matches('input'))) document.body.classList.remove('typing');
  });

  app.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => {
    const act = b.dataset.act;
    const row = b.closest('.set-row');
    const ei = row ? +row.dataset.ei : +b.dataset.ei;
    const ex = state.active.exercises[ei];
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
    const y = window.scrollY;
    render();
    window.scrollTo(0, y);
  }));

  document.getElementById('cancel').addEventListener('click', () => {
    if (!confirm('Training abbrechen? Die Eingaben gehen verloren.')) return;
    state.active = null;
    save();
    render();
  });

  document.getElementById('finish').addEventListener('click', finishWorkout);
}

function finishWorkout() {
  const a = state.active;
  const exercises = a.exercises
    .map(e => ({
      name: e.name,
      equip: e.equip,
      sets: e.sets.filter(s => s.done).map(s => ({ kg: num(s.kg), reps: num(s.reps) })),
    }))
    .filter(e => e.sets.length);

  if (!exercises.length) {
    if (confirm('Noch kein Satz abgehakt. Training verwerfen?')) {
      state.active = null;
      save();
      render();
    }
    return;
  }
  const p = workoutProgress(a);
  if (p.done < p.total && !confirm(`${p.done} von ${p.total} Sätzen erledigt. Training trotzdem beenden?`)) return;

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
  const idx = PLAN.findIndex(w => w.id === a.workoutId);
  state.nextIndex = (idx + 1) % PLAN.length;
  planIndex = state.nextIndex;
  state.active = null;
  save();
  requestSync();

  view = 'calendar';
  calMonth = startOfMonth(new Date(session.start));
  calSelected = dayKey(session.start);
  render();
  window.scrollTo(0, 0);

  const calHint = syncConnected()
    ? 'Wird automatisch in deinen abonnierten Kalender übertragen.'
    : 'Ist im Kalender der App eingetragen.';
  openModal(`
    <div class="big-check">✅</div>
    <h2 style="text-align:center">Training gespeichert!</h2>
    <p class="muted" style="text-align:center">${esc(session.name)} · ${fmtDuration(new Date(session.end) - new Date(session.start))} · ${sessionSets(session)} Sätze<br>
    ${calHint} Nächstes Training: <b>${esc(PLAN[state.nextIndex].name)}</b></p>
    ${syncConnected() ? '' : '<button class="btn" id="m-ics">📅 Auch in Handy-Kalender eintragen</button>'}
    <button class="btn secondary" id="m-close">Fertig</button>`);
  const icsBtn = document.getElementById('m-ics');
  if (icsBtn) icsBtn.addEventListener('click', () => { exportSessionIcs(session); closeModal(); });
  document.getElementById('m-close').addEventListener('click', closeModal);
}

// ---------- Kalender ----------
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

function sessionCardHtml(s) {
  return `
    <div class="session">
      <div class="session-title">${esc(s.name)}</div>
      <div class="muted" style="font-size:14px;margin-top:2px">
        ${fmtDate(s.start)} · ${fmtTime(s.start)}–${fmtTime(s.end)} · ${fmtDuration(new Date(s.end) - new Date(s.start))} · ${sessionSets(s)} Sätze
      </div>
      <ul>${s.exercises.map(e => `<li><b>${esc(e.name)}</b>: ${esc(setsText(e.sets))}</li>`).join('')}</ul>
      <div class="btn-row">
        ${syncConnected() ? '' : `<button class="btn small secondary" data-ics="${esc(s.id)}">📅 In Handy-Kalender</button>`}
        <button class="btn small danger" data-del="${esc(s.id)}">Löschen</button>
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
    <h3 style="margin:18px 0 10px">${heading}</h3>
    ${list.length ? list.map(sessionCardHtml).join('') : `<p class="muted">${empty}</p>`}`;

  document.getElementById('prev').addEventListener('click', () => { calMonth = new Date(y, m - 1, 1); render(); });
  document.getElementById('next').addEventListener('click', () => { calMonth = new Date(y, m + 1, 1); render(); });
  app.querySelectorAll('[data-day]').forEach(b => b.addEventListener('click', () => { calSelected = b.dataset.day; render(); }));
  app.querySelectorAll('[data-ics]').forEach(b => b.addEventListener('click', () => {
    const s = state.sessions.find(x => x.id === b.dataset.ics);
    if (s) exportSessionIcs(s);
  }));
  app.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
    if (!confirm('Dieses Training wirklich löschen?')) return;
    state.sessions = state.sessions.filter(x => x.id !== b.dataset.del);
    save();
    requestSync();
    render();
  }));
}

// ---------- Daten ----------
function syncPanelHtml() {
  if (!syncConnected()) {
    return `
      <div class="panel">
        <h3>Apple-Kalender verbinden (Abo)</h3>
        <p>Neue Trainings erscheinen dann automatisch in deinem Apple-Kalender. Die App legt dafür in deinem
        GitHub-Konto ein <b>geheimes Gist</b> an (nicht öffentlich gelistet, aber für jeden mit dem Link lesbar).</p>
        <ol class="steps">
          <li><a href="https://github.com/settings/tokens/new?scopes=gist&description=Gym%20Tracker" target="_blank" rel="noopener">Token bei GitHub erstellen</a>:
            nur Haken bei <b>gist</b>, Ablauf z. B. „No expiration“ → <i>Generate token</i> → kopieren.</li>
          <li>Token hier einfügen und verbinden.</li>
        </ol>
        <input class="field" id="token" type="password" placeholder="ghp_…" autocomplete="off" autocapitalize="off" spellcheck="false">
        <button class="btn" id="connect" style="margin-top:10px">Verbinden</button>
        <p class="muted" id="sync-status" style="margin:10px 0 0">${sync.error ? '⚠️ ' + esc(sync.error) : ''}</p>
      </div>`;
  }
  const https = calendarUrl();
  return `
    <div class="panel">
      <h3>Apple-Kalender (Abo) ✓</h3>
      <p>Einmal abonnieren, danach kommen neue Trainings automatisch. Der Kalender aktualisiert sich je nach
      Einstellung alle 15 Min. bis 1 Std.</p>
      <a class="btn" href="${esc(https.replace(/^https:/, 'webcal:'))}">📅 Im Apple-Kalender abonnieren</a>
      <button class="btn secondary" id="copy-url">🔗 Kalender-Adresse kopieren</button>
      <button class="btn secondary" id="sync-now">🔄 Jetzt übertragen</button>
      <p class="muted" id="sync-status" style="margin:10px 0 0"></p>
      <p class="muted" style="margin:10px 0 0;word-break:break-all;font-size:12px">${esc(https)}</p>
      <button class="link red" id="disconnect" style="margin-top:6px">Verbindung trennen</button>
    </div>`;
}

function renderData() {
  app.innerHTML = `
    <h1>Daten</h1>
    ${syncPanelHtml()}
    <div class="panel">
      <h3>Nächstes Training</h3>
      <p>Wird nach jedem Training automatisch weitergeschaltet.</p>
      <select id="next-sel">${PLAN.map((w, i) => `<option value="${i}" ${i === state.nextIndex ? 'selected' : ''}>${i + 1}. ${esc(w.name)}</option>`).join('')}</select>
    </div>
    <div class="panel">
      <h3>Kalender-Datei (.ics)</h3>
      <p>Alle ${state.sessions.length} Trainings einmalig als Datei exportieren (ohne Abo).</p>
      <button class="btn secondary" id="ics-all" ${state.sessions.length ? '' : 'disabled'}>📅 Kalender-Datei exportieren</button>
    </div>
    <div class="panel">
      <h3>Backup</h3>
      <p>Die Daten liegen auf diesem Gerät im Browser${syncConnected() ? ' und als Kopie im Gist' : ''}. Mit einem Backup kannst du sie auch auf ein neues Handy übertragen.</p>
      <button class="btn secondary" id="export">⬇️ Backup speichern</button>
      <button class="btn secondary" id="import">⬆️ Backup laden</button>
      <input type="file" id="import-file" accept="application/json,.json" class="hidden">
    </div>
    <div class="panel">
      <h3>Alles löschen</h3>
      <p>Löscht alle gespeicherten Trainings auf diesem Gerät${syncConnected() ? ' und im Abo-Kalender' : ''}.</p>
      <button class="btn danger" id="reset">Alle Daten löschen</button>
    </div>`;

  updateSyncStatus();

  const connectBtn = document.getElementById('connect');
  if (connectBtn) connectBtn.addEventListener('click', async () => {
    const token = document.getElementById('token').value.trim();
    if (!token) return;
    connectBtn.disabled = true;
    connectBtn.textContent = 'Verbinde …';
    try {
      await connectSync(token);
    } catch (e) {
      alert(e.status ? syncErrorText(e) : (e.message || 'Verbindung fehlgeschlagen.'));
    }
    render();
  });

  const copyBtn = document.getElementById('copy-url');
  if (copyBtn) copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(calendarUrl());
      copyBtn.textContent = '✓ Kopiert';
    } catch (e) {
      prompt('Kalender-Adresse:', calendarUrl());
    }
  });

  const syncBtn = document.getElementById('sync-now');
  if (syncBtn) syncBtn.addEventListener('click', () => { requestSync(); updateSyncStatus(); });

  const discBtn = document.getElementById('disconnect');
  if (discBtn) discBtn.addEventListener('click', () => {
    if (!confirm('Verbindung trennen? Das Gist und das Kalender-Abo bleiben bestehen, werden aber nicht mehr aktualisiert.')) return;
    sync = emptySync();
    saveSync();
    render();
  });

  document.getElementById('next-sel').addEventListener('change', e => {
    state.nextIndex = +e.target.value;
    planIndex = state.nextIndex;
    save();
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
      const added = mergeBackup(JSON.parse(await f.text()), true);
      planIndex = state.nextIndex;
      requestSync();
      alert(`${added} Trainings importiert.`);
      render();
    } catch (e) {
      alert('Die Datei ist kein gültiges Backup.');
    }
  });
  document.getElementById('reset').addEventListener('click', () => {
    if (!confirm('Wirklich ALLE Trainings löschen?')) return;
    if (!confirm('Sicher? Das kann nicht rückgängig gemacht werden.')) return;
    state = { sessions: [], active: null, nextIndex: 0 };
    planIndex = 0;
    save();
    requestSync();
    render();
  });
}

// ---------- Start ----------
render();
retrySync();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
