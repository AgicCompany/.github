// @ts-nocheck
/*
 * lib/status.mjs
 * Stato degli item basato sullo status nativo delle issue GitHub (public preview).
 * Modulo puro (nessuna env, nessuna chiamata API): usato da alert, digest, metriche,
 * conformita' e migrazione.
 *
 * Regole:
 * - La fonte autorevole e' lo status nativo dell'issue. Gli script lo confrontano per
 *   categoria (category.key), non per nome: GitHub indica che i nomi possono cambiare.
 * - Il campo "Status" del Project resta solo come specchio con i 7 nomi nativi (GitHub lo
 *   sincronizza nei due sensi). Serve per le colonne del board e per i draft.
 * - "Blocked" non esiste nello status nativo: si usa la label BLOCKED_LABEL.
 */

export const NATIVE_STATUSES = ['Backlog', 'Todo', 'In progress', 'In review', 'Done', 'Not planned', 'Duplicate'];

// Colori delle opzioni dello Status specchio, allineati all'interfaccia GitHub degli stati nativi:
// verde = issue aperta, viola = chiusa completata, grigio = chiusa senza completamento.
export const NATIVE_STATUS_COLORS = {
  Backlog: 'GREEN',
  Todo: 'GREEN',
  'In progress': 'GREEN',
  'In review': 'GREEN',
  Done: 'PURPLE',
  'Not planned': 'GRAY',
  Duplicate: 'GRAY',
};

const CATEGORY_BY_NATIVE = {
  backlog: 'backlog',
  todo: 'planned',
  'in progress': 'started',
  'in review': 'started',
  done: 'completed',
  'not planned': 'not_planned',
  duplicate: 'duplicate',
};

// Vecchie opzioni del campo Status (standard Kanban/Scrum AGIC) -> status nativo equivalente.
// Usata dalla migrazione e, durante la transizione, per i progetti non ancora migrati.
export const LEGACY_TO_NATIVE = {
  backlog: 'Backlog',
  new: 'Backlog',
  'in analysis': 'Backlog',
  ready: 'Todo',
  'ready to work': 'Todo',
  approved: 'Todo',
  'to do': 'Todo',
  todo: 'Todo',
  'in progress': 'In progress',
  blocked: 'In progress',
  'in review': 'In review',
  'ready for qa': 'In review',
  'validated by qa': 'In review',
  done: 'Done',
  removed: 'Not planned',
  'not planned': 'Not planned',
  duplicate: 'Duplicate',
};

export const BLOCKED_LABEL = 'blocked';
export const NOT_STARTED_CATEGORIES = ['backlog', 'planned'];
export const STARTED_CATEGORIES = ['started'];
export const CLOSED_CATEGORIES = ['completed', 'not_planned', 'duplicate'];

const norm = s => (s || '').trim().toLowerCase();

export function isNativeName(name) {
  return norm(name) in CATEGORY_BY_NATIVE;
}

export function nativeFromLegacy(name) {
  return LEGACY_TO_NATIVE[norm(name)] ?? null;
}

export function categoryOfName(name) {
  return CATEGORY_BY_NATIVE[norm(nativeFromLegacy(name))] ?? null;
}

// Un board e' "migrato" quando il campo Status ha solo nomi nativi (specchio dello status nativo).
export function isNativeMirror(optionNames = []) {
  return optionNames.length > 0 && optionNames.every(isNativeName);
}

function categoryFromClosedState(stateReason) {
  if (stateReason === 'NOT_PLANNED') return 'not_planned';
  if (stateReason === 'DUPLICATE') return 'duplicate';
  return 'completed';
}

/*
 * Categoria di stato di un item.
 * - Board non ancora migrato (legacyBoard): vince il valore del board, per non cambiare il
 *   comportamento prima della migrazione.
 * - Board migrato: vince lo status nativo dell'issue; per draft e issue senza status si usa il board.
 * - Ultimo fallback: issue chiusa -> categoria dal motivo di chiusura.
 */
export function resolveCategory({ nativeCategory, projectStatus, closed, stateReason, legacyBoard = false }) {
  const fromBoard = categoryOfName(projectStatus);
  if (legacyBoard && fromBoard) return fromBoard;
  if (nativeCategory) return nativeCategory;
  if (fromBoard) return fromBoard;
  if (closed) return categoryFromClosedState(stateReason);
  return null;
}

export function isBlocked(labels = [], projectStatus = null) {
  return labels.some(l => norm(l) === BLOCKED_LABEL) || norm(projectStatus) === 'blocked';
}

export const isClosedCategory = c => CLOSED_CATEGORIES.includes(c);
export const isStartedCategory = c => STARTED_CATEGORIES.includes(c);
export const isNotStartedCategory = c => NOT_STARTED_CATEGORIES.includes(c);
