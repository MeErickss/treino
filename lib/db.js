'use client';

// ---------------------------------------------------------------------------
// Camada de dados 100% local (localStorage). Sem backend, funciona offline.
// Modelo:
//  Routine  = { id, name, finisher, exercises: [Exercise] }
//  Exercise = { id, name, targetSets, targetReps, meta, obs }
//    targetReps/meta são TEXTO livre (ex: "8 a 10", "35/40kg", "Halter 8-9kg")
//    -> a "meta" é só referência; o peso/reps reais vêm do log do treino.
//  Session  = { id, routineId, routineName, finisher, date, entries: [Entry] }
//  Entry    = { exerciseId, name, targetSets, targetReps, meta, obs,
//               sets: [{ weight, reps, done }], feeling, note }
//  feeling  = 'facil' | 'ok' | 'limite' | null
// ---------------------------------------------------------------------------

const K_ROUTINES = 'academia.routines.v1';
const K_SESSIONS = 'academia.sessions.v1';
const K_ACTIVE = 'academia.active.v1';

function read(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return String(Date.now()) + Math.random().toString(16).slice(2);
}

// Extrai o primeiro número de um texto (ex: "35/40kg" -> 35, "8 a 10" -> 8).
export function parseNum(str) {
  if (str == null) return null;
  const m = String(str).replace(',', '.').match(/\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

// ---- Rotinas --------------------------------------------------------------

export function getRoutines() {
  return read(K_ROUTINES, []);
}

export function saveRoutines(list) {
  write(K_ROUTINES, list);
}

export function getRoutine(id) {
  return getRoutines().find((r) => r.id === id) || null;
}

export function upsertRoutine(routine) {
  const list = getRoutines();
  const i = list.findIndex((r) => r.id === routine.id);
  if (i >= 0) list[i] = routine;
  else list.push(routine);
  saveRoutines(list);
  return routine;
}

export function deleteRoutine(id) {
  saveRoutines(getRoutines().filter((r) => r.id !== id));
}

// ---- Sessões (treinos concluídos) ----------------------------------------

export function getSessions() {
  return read(K_SESSIONS, []).sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function saveSession(session) {
  const list = read(K_SESSIONS, []);
  const i = list.findIndex((s) => s.id === session.id);
  if (i >= 0) list[i] = session;
  else list.push(session);
  write(K_SESSIONS, list);
}

export function deleteSession(id) {
  write(K_SESSIONS, read(K_SESSIONS, []).filter((s) => s.id !== id));
}

// ---- Sessão ativa (treino em andamento) ----------------------------------

export function getActive() {
  return read(K_ACTIVE, null);
}

export function setActive(session) {
  write(K_ACTIVE, session);
}

export function clearActive() {
  if (typeof window !== 'undefined') localStorage.removeItem(K_ACTIVE);
}

export function startSession(routine) {
  // Puxa como sugestão inicial o último peso/reps que você usou em cada exercício.
  const session = {
    id: uid(),
    routineId: routine.id,
    routineName: routine.name,
    date: new Date().toISOString(),
    finisher: routine.finisher || '',
    entries: routine.exercises.map((ex) => {
      const last = lastEntryFor(ex.name);
      const startWeight = last?.bestWeight ?? parseNum(ex.meta);
      const startReps = parseNum(ex.targetReps);
      return {
        exerciseId: ex.id,
        name: ex.name,
        targetSets: ex.targetSets,
        targetReps: ex.targetReps,
        meta: ex.meta ?? '',
        obs: ex.obs ?? '',
        sets: Array.from({ length: ex.targetSets || 1 }, () => ({
          weight: startWeight,
          reps: startReps,
          done: false,
        })),
        feeling: null,
        note: '',
      };
    }),
  };
  setActive(session);
  return session;
}

// ---- Histórico / progressão ----------------------------------------------

const norm = (s) => (s || '').trim().toLowerCase();

// Estatísticas de uma entrada de exercício dentro de uma sessão concluída.
export function entryStats(entry) {
  const doneSets = entry.sets.filter((s) => s.done);
  const weights = doneSets.map((s) => Number(s.weight)).filter((w) => !isNaN(w) && w > 0);
  const bestWeight = weights.length ? Math.max(...weights) : null;
  const volume = doneSets.reduce(
    (a, s) => a + (Number(s.weight) || 0) * (Number(s.reps) || 0),
    0
  );
  const allDone = entry.sets.length > 0 && entry.sets.every((s) => s.done);
  const targetR = parseNum(entry.targetReps) || 0;
  const hitReps = doneSets.length > 0 && doneSets.every((s) => (Number(s.reps) || 0) >= targetR);
  return { bestWeight, volume, allDone, hitReps, doneCount: doneSets.length };
}

// Último desempenho registrado para um exercício (por nome).
export function lastEntryFor(name) {
  for (const s of getSessions()) {
    // getSessions já vem do mais recente pro mais antigo
    for (const e of s.entries) {
      if (norm(e.name) === norm(name)) {
        return { date: s.date, entry: e, ...entryStats(e) };
      }
    }
  }
  return null;
}

// Histórico completo de um exercício, do mais antigo pro mais novo.
export function getExerciseHistory(name) {
  const out = [];
  for (const s of read(K_SESSIONS, [])) {
    for (const e of s.entries) {
      if (norm(e.name) === norm(name)) {
        out.push({ date: s.date, entry: e, ...entryStats(e) });
      }
    }
  }
  return out.sort((a, b) => new Date(a.date) - new Date(b.date));
}

// Lista de nomes de exercícios que já têm histórico.
export function getExerciseNames() {
  const set = new Map();
  for (const s of read(K_SESSIONS, [])) {
    for (const e of s.entries) set.set(norm(e.name), e.name);
  }
  return [...set.values()].sort((a, b) => a.localeCompare(b));
}

// ---- Backup ---------------------------------------------------------------

export function exportAll() {
  return JSON.stringify(
    {
      app: 'academia',
      version: 1,
      exportedAt: new Date().toISOString(),
      routines: getRoutines(),
      sessions: read(K_SESSIONS, []),
    },
    null,
    2
  );
}

export function importAll(json) {
  const data = typeof json === 'string' ? JSON.parse(json) : json;
  if (Array.isArray(data.routines)) saveRoutines(data.routines);
  if (Array.isArray(data.sessions)) write(K_SESSIONS, data.sessions);
  return true;
}

// ---- Seed: seus treinos A / B / C (importados do WhatsApp) -----------------

function ex(name, targetSets, targetReps, meta, obs = '') {
  return { id: uid(), name, targetSets, targetReps, meta, obs };
}

export function seedExampleRoutines() {
  const routines = [
    {
      id: uid(),
      name: 'Treino A — Costas e Bíceps',
      finisher: '8 a 10 min de simulador de ESCADA (ritmo constante)',
      exercises: [
        ex('Puxada Aberta (polia/máquina)', 4, '8', '35/40kg'),
        ex('Puxada Fechada (puxada peito)', 4, '8', '35kg'),
        ex('Voador Invertido (posterior de ombro)', 4, '10', '15kg', 'Bem lento'),
        ex('Bíceps com Halter', 4, '8', 'Halter 8 ou 9kg', 'Sem pausas'),
        ex('Bíceps na Polia (ou corda)', 4, '8', '30kg'),
      ],
    },
    {
      id: uid(),
      name: 'Treino B — Peito e Tríceps',
      finisher: 'Abdominal no chão (4x15) + Prancha isométrica (3x 45s)',
      exercises: [
        ex('Supino Reto (máquina/halter livre)', 4, '8', 'Halter 12kg'),
        ex('Supino Inclinado (máquina/halter)', 4, '8', 'Halter 10kg'),
        ex('Voador (crucifixo máquina)', 4, '10', '20kg', 'Segurar 1s fechado'),
        ex('Tríceps Polia (barra reta ou V)', 4, '8', '30kg'),
        ex('Tríceps Corda de Costas (francês)', 4, '8', '25kg fixos'),
      ],
    },
    {
      id: uid(),
      name: 'Treino C — Pernas',
      finisher: 'Sem esteira. Ir direto tomar o shake!',
      exercises: [
        ex('Leg Press', 4, '8', '35kg cada lado', 'Descer bem'),
        ex('Cadeira Extensora', 4, '8 a 10', '40/45kg'),
        ex('Mesa Flexora (ou flexora em pé)', 4, '8', '20kg', 'Descida lenta'),
        ex('Cadeira Abdutora', 3, '12', '35kg', 'Segurar 1s aberta'),
        ex('Panturrilha Sentado', 4, '12', 'Máquina zerada', 'Descer em 4 segundos'),
        ex('Panturrilha no Leg Reto', 4, '12', 'Unilateral', 'Metade das placas, uma perna por vez'),
      ],
    },
  ];
  saveRoutines([...getRoutines(), ...routines]);
  return routines;
}
