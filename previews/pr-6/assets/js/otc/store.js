import { evaluate } from './evaluator.js';
import { getComplaintOptions, getRulePackById, getRulePacksForComplaint } from './rule-packs.js';

const initialPatient = {
  age: '',
  sex: '',
  pregnant: 'unknown',
  postcode: ''
};

const state = {
  patient: { ...initialPatient },
  complaintId: '',
  rulePackId: '',
  answers: {},
  evaluation: null,
  missing: [],
  complaintOptions: getComplaintOptions(),
  nlpSuggestions: {},
  nlpStatus: {}
};

const listeners = new Set();

function deriveNlpStatusFromSuggestions(suggestions) {
  return Object.fromEntries(
    Object.entries(suggestions).map(([fieldId, suggestion]) => {
      const confidence = suggestion && typeof suggestion.confidence === 'number'
        ? suggestion.confidence
        : undefined;
      return [fieldId, describeSuggestionConfidence(confidence)];
    })
  );
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

export function setNlpSuggestions(parsed) {
  const suggestions = parsed && typeof parsed === 'object' ? parsed : {};
  state.nlpSuggestions = suggestions;
  state.nlpStatus = deriveNlpStatusFromSuggestions(state.nlpSuggestions);
  notify();
}

export function applyNlpSuggestion(fieldId) {
  const suggestion = state.nlpSuggestions[fieldId];
  if (!suggestion) {
    return;
  }
  const { value } = suggestion;
  if (Object.prototype.hasOwnProperty.call(state.patient, fieldId)) {
    state.patient[fieldId] = value;
  } else {
    state.answers[fieldId] = value;
  }
  state.nlpStatus[fieldId] = 'applied';
  notify();
}

export function resetIntake() {
  state.patient = { ...initialPatient };
  state.complaintId = '';
  state.rulePackId = '';
  resetAnswers();
  state.nlpSuggestions = {};
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
  state.nlpSuggestions = { ...(scenario.nlpSuggestions || {}) };
  state.nlpStatus = deriveNlpStatusFromSuggestions(state.nlpSuggestions);
  notify();
}

notify();
