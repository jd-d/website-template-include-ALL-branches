import { evaluate } from './evaluator.js';
import {
  loadRulePacks,
  subscribeToRulePacks,
  getComplaintOptions,
  getRulePackById,
  getRulePacksForComplaint
} from './rule-packs.js';

const initialPatient = {
  age: '',
  sex: '',
  pregnant: '',
  postcode: ''
};

const state = {
  patient: { ...initialPatient },
  complaintId: '',
  rulePackId: '',
  answers: {},
  evaluation: null,
  missing: [],
  complaintOptions: [],
  nlpSuggestions: {},
  nlpSuggestionOrder: [],
  nlpStatus: {}
};

const listeners = new Set();

function deriveNlpStatusFromSuggestions(suggestions) {
  return Object.fromEntries(
    Object.entries(suggestions).map(([fieldId, suggestion]) => {
      if (suggestion?.status === 'applied' || suggestion?.status === 'dismissed') {
        return [fieldId, suggestion.status];
      }
      const confidence = suggestion && typeof suggestion.confidence === 'number'
        ? suggestion.confidence
        : undefined;
      return [fieldId, describeSuggestionConfidence(confidence)];
    })
  );
}

function normalizeConfidence(value) {
  const numeric = typeof value === 'number' && !Number.isNaN(value) ? value : 0;
  return Number(numeric.toFixed(2));
}

function shouldIncludeSuggestion(entry) {
  if (!entry || typeof entry !== 'object') {
    return false;
  }
  const value = entry.value;
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '' || trimmed === 'unknown') {
      return false;
    }
  }
  return true;
}

function inheritStatus(previous, value) {
  if (!previous || !previous.status) {
    return 'pending';
  }
  if (previous.value === value) {
    return previous.status;
  }
  return 'pending';
}

function normalizeRawSuggestions(payload, previous) {
  const suggestions = {};
  const order = [];

  const patientEntries = payload?.patient || {};
  for (const [field, entry] of Object.entries(patientEntries)) {
    if (!shouldIncludeSuggestion(entry)) {
      continue;
    }
    const id = `patient.${field}`;
    const previousSuggestion = previous[id];
    suggestions[id] = {
      id,
      target: 'patient',
      field,
      value: entry.value,
      confidence: normalizeConfidence(entry.confidence),
      status: inheritStatus(previousSuggestion, entry.value)
    };
    order.push(id);
  }

  const answerEntries = payload?.answers || {};
  for (const [field, entry] of Object.entries(answerEntries)) {
    if (!shouldIncludeSuggestion(entry)) {
      continue;
    }
    const id = field;
    const previousSuggestion = previous[id];
    suggestions[id] = {
      id,
      target: 'answer',
      field,
      value: entry.value,
      confidence: normalizeConfidence(entry.confidence),
      status: inheritStatus(previousSuggestion, entry.value)
    };
    order.push(id);
  }

  return { suggestions, order };
}

function normalizePrecomputedSuggestions(payload, previous) {
  const suggestions = {};
  const order = [];
  for (const [id, entry] of Object.entries(payload || {})) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const previousSuggestion = previous[id];
    const normalized = {
      id,
      target: entry.target || (id.startsWith('patient.') ? 'patient' : 'answer'),
      field: entry.field || id.replace(/^patient\./, ''),
      value: entry.value,
      confidence: normalizeConfidence(entry.confidence),
      status: entry.status || inheritStatus(previousSuggestion, entry.value)
    };
    if (!shouldIncludeSuggestion(normalized)) {
      continue;
    }
    suggestions[id] = normalized;
    order.push(id);
  }
  return { suggestions, order };
}

function interpretSuggestionPayload(payload) {
  const previous = state.nlpSuggestions || {};
  if (!payload || typeof payload !== 'object') {
    return { suggestions: {}, order: [] };
  }
  if (payload.patient || payload.answers) {
    return normalizeRawSuggestions(payload, previous);
  }
  return normalizePrecomputedSuggestions(payload, previous);
}

function notify() {
  const intake = {
    patient: state.patient,
    answers: state.answers
  };
  const evaluation = evaluate(state.rulePackId, intake);
  state.evaluation = evaluation;
  state.missing = evaluation.missing || [];
  for (const listener of listeners) {
    listener(state);
  }
}

function refreshComplaintOptions() {
  const options = getComplaintOptions().map((item) => ({ id: item.id, label: item.label }));
  state.complaintOptions = options;

  if (state.complaintId) {
    const available = getRulePacksForComplaint(state.complaintId);
    const hasCurrent = available.some((pack) => pack.id === state.rulePackId);
    if (!hasCurrent) {
      state.rulePackId = available.length > 0 ? available[0].id : '';
      resetAnswers();
    }
  }
  notify();
}

subscribeToRulePacks(() => {
  refreshComplaintOptions();
});

export async function ensureRulePacksLoaded() {
  await loadRulePacks();
}

export function describeSuggestionConfidence(confidence) {
  if (typeof confidence !== 'number' || Number.isNaN(confidence)) {
    return 'needs review';
  }
  if (confidence >= 0.85) {
    return 'confirmed';
  }
  if (confidence >= 0.6) {
    return 'likely accurate';
  }
  if (confidence >= 0.4) {
    return 'needs review';
  }
  return 'low confidence';
}

function resetAnswers() {
  state.answers = {};
}

export function subscribe(listener) {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

export function getState() {
  return state;
}

export function getNlpSuggestions() {
  return state.nlpSuggestions;
}

export function getNlpStatus() {
  return state.nlpStatus;
}

export function updatePatientField(field, value) {
  if (!Object.prototype.hasOwnProperty.call(state.patient, field)) {
    return;
  }
  state.patient[field] = value;
  notify();
}

export function setComplaint(complaintId) {
  state.complaintId = complaintId;
  const packs = complaintId ? getRulePacksForComplaint(complaintId) : [];
  const firstPack = packs.length > 0 ? packs[0].id : '';
  setRulePack(firstPack);
}

export function setRulePack(rulePackId) {
  const target = rulePackId && getRulePackById(rulePackId);
  state.rulePackId = target ? target.id : '';
  resetAnswers();
  notify();
}

export function setAnswer(questionId, value) {
  state.answers[questionId] = value;
  notify();
}

export function clearAnswer(questionId) {
  delete state.answers[questionId];
  notify();
}

function refreshSuggestionStatus() {
  state.nlpStatus = deriveNlpStatusFromSuggestions(state.nlpSuggestions);
}

function applySuggestion(fieldId) {
  const suggestion = state.nlpSuggestions[fieldId];
  if (!suggestion || suggestion.status === 'applied' || suggestion.status === 'dismissed') {
    return false;
  }
  const { target, field, value } = suggestion;
  if (target === 'patient') {
    if (!Object.prototype.hasOwnProperty.call(state.patient, field)) {
      return false;
    }
    state.patient[field] = value;
  } else if (target === 'answer') {
    state.answers[field] = value;
  } else {
    return false;
  }
  suggestion.status = 'applied';
  return true;
}

export function setNlpSuggestions(payload) {
  const { suggestions, order } = interpretSuggestionPayload(payload);
  state.nlpSuggestions = suggestions;
  state.nlpSuggestionOrder = order;
  refreshSuggestionStatus();
  notify();
}

export function applyNlpSuggestion(fieldId) {
  const changed = applySuggestion(fieldId);
  if (!changed) {
    return;
  }
  refreshSuggestionStatus();
  notify();
}

export function dismissNlpSuggestion(fieldId) {
  const suggestion = state.nlpSuggestions[fieldId];
  if (!suggestion || suggestion.status === 'dismissed') {
    return;
  }
  suggestion.status = 'dismissed';
  refreshSuggestionStatus();
  notify();
}

export function applyConfidentNlpSuggestions(threshold = 0.85) {
  let appliedAny = false;
  for (const fieldId of state.nlpSuggestionOrder) {
    const suggestion = state.nlpSuggestions[fieldId];
    if (!suggestion) {
      continue;
    }
    if (suggestion.status === 'applied' || suggestion.status === 'dismissed') {
      continue;
    }
    if (suggestion.confidence >= threshold) {
      const changed = applySuggestion(fieldId);
      appliedAny = appliedAny || changed;
    }
  }
  if (!appliedAny) {
    return;
  }
  refreshSuggestionStatus();
  notify();
}

export function resetIntake() {
  state.patient = { ...initialPatient };
  state.complaintId = '';
  state.rulePackId = '';
  resetAnswers();
  state.nlpSuggestions = {};
  state.nlpSuggestionOrder = [];
  state.nlpStatus = {};
  notify();
}

export function loadScenario(scenario) {
  if (!scenario) {
    resetIntake();
    return;
  }
  state.patient = {
    ...initialPatient,
    ...scenario.patient
  };
  setComplaint(scenario.complaintId);
  state.rulePackId = scenario.rulePackId || state.rulePackId;
  resetAnswers();
  state.answers = { ...(scenario.answers || {}) };
  const { suggestions, order } = interpretSuggestionPayload(scenario.nlpSuggestions);
  state.nlpSuggestions = suggestions;
  state.nlpSuggestionOrder = order;
  refreshSuggestionStatus();
  notify();
}

notify();
