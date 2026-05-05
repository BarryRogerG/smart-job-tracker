import { normalizeStatus } from "./jobStats.js";
import { STAGE_BY_KEY } from "./jobStages.js";

// Thin lookup wrapper — every helper below normalizes the status, fetches the
// stage, and returns one of its `classes` slots (or a fallback). The stage
// definitions themselves live in jobStages.js so adding a new pipeline stage
// or rebranding an existing one is a one-file change.
function getStage(status) {
  return STAGE_BY_KEY[normalizeStatus(status)];
}

export function statusClass(status) {
  return getStage(status)?.classes.badge || "bg-gray-100 text-text-body";
}

export function statusCardTone(status) {
  return getStage(status)?.classes.cardTone || "bg-white border-slate-200";
}

export function statusLabel(status) {
  return getStage(status)?.label || status || "Unknown";
}
