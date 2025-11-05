import { parseTranscript } from './nlp-parser.js';
import {
  setNlpSuggestions,
  resetIntake,
  getState
} from './store.js';
import { getRulePackById } from './rule-packs.js';

const IDLE_STATUS = 'Parser idle.';
let isInitialised = false;

function resolveElement(explicitElement, fallbackId) {
  if (explicitElement && explicitElement instanceof Element) {
    return explicitElement;
  }
  if (!fallbackId) {
    return null;
  }
  return document.getElementById(fallbackId);
}

function updateScreenReaderStatus(message) {
  const srStatus = document.getElementById('sr-status');
  if (srStatus) {
    srStatus.textContent = message;
  }
}

function buildSuggestionPayload(result) {
  if (!result || typeof result !== 'object') {
    return { patient: {}, answers: {} };
  }
  const patient = {};
  const answers = {};

  for (const [field, entry] of Object.entries(result.patient || {})) {
    if (entry && typeof entry === 'object') {
      patient[field] = entry;
    }
  }

  for (const [questionId, entry] of Object.entries(result.answers || {})) {
    if (entry && typeof entry === 'object') {
      answers[questionId] = entry;
    }
  }

  return { patient, answers };
}

function countSuggestions() {
  const state = getState();
  const suggestions = state?.nlpSuggestions || {};
  const order = state?.nlpSuggestionOrder || [];
  if (order.length > 0) {
    return order.reduce((total, fieldId) => (suggestions[fieldId] ? total + 1 : total), 0);
  }
  return Object.keys(suggestions).length;
}

function describePackContext(result) {
  if (!result) {
    return '';
  }
  const parts = [];
  if (result.rulePackId) {
    const pack = getRulePackById(result.rulePackId);
    const packName = pack?.name || result.rulePackId;
    parts.push(`Pathway hint: ${packName}`);
  } else if (result.complaintId) {
    const state = getState();
    const complaint = (state?.complaintOptions || []).find((item) => item.id === result.complaintId);
    const complaintLabel = complaint?.label || result.complaintId;
    parts.push(`Complaint hint: ${complaintLabel}`);
  }
  return parts.length > 0 ? `${parts.join(' ')}.` : '';
}

function formatStatusMessage(result, suggestionCount, isBlankTranscript) {
  if (isBlankTranscript) {
    return 'No transcript detected. Intake suggestions cleared.';
  }
  if (!result) {
    return IDLE_STATUS;
  }
  const suggestionLabel = suggestionCount === 1 ? '1 suggestion ready' : `${suggestionCount} suggestions ready`;
  const packContext = describePackContext(result);
  if (suggestionCount === 0) {
    const base = 'Parsed transcript. No confident suggestions detected.';
    return packContext ? `${base} ${packContext}`.trim() : base;
  }
  const base = `Parsed transcript. ${suggestionLabel}.`;
  return packContext ? `${base} ${packContext}`.trim() : base;
}

function formatFeedbackMessage(result) {
  if (!result) {
    return '';
  }
  const feedback = [];
  const missing = Array.isArray(result.missing) ? result.missing : [];
  if (missing.length > 0) {
    const labels = missing.map((item) => item.label || item.id).filter(Boolean);
    if (labels.length > 0) {
      feedback.push(`Missing details: ${labels.join(', ')}.`);
    }
  }
  const warnings = Array.isArray(result.warnings) ? result.warnings : [];
  if (warnings.length > 0) {
    feedback.push(warnings.join(' '));
  }
  return feedback.join(' ');
}

function handleParseEvent(event) {
  const detail = event.detail || {};
  const text = typeof detail.text === 'string' ? detail.text : '';
  const trimmed = text.trim();
  const statusElement = resolveElement(detail.statusElement, 'transcript-status');
  const feedbackElement = resolveElement(detail.feedbackElement, 'transcript-feedback');

  if (statusElement) {
    statusElement.textContent = trimmed ? 'Parsing transcript…' : 'Parsing blank transcript…';
  }
  if (feedbackElement) {
    feedbackElement.textContent = '';
  }
  updateScreenReaderStatus('Parsing transcript.');

  try {
    const result = parseTranscript(text);
    const payload = buildSuggestionPayload(result);
    setNlpSuggestions(payload);
    const suggestionCount = countSuggestions();
    const statusMessage = formatStatusMessage(result, suggestionCount, trimmed.length === 0);
    if (statusElement) {
      statusElement.textContent = statusMessage;
    }
    updateScreenReaderStatus(statusMessage);
    if (feedbackElement) {
      feedbackElement.textContent = formatFeedbackMessage(result);
    }
  } catch (error) {
    console.error('Transcript parsing failed', error);
    if (statusElement) {
      statusElement.textContent = 'Parser failed. Check console for details.';
    }
    if (feedbackElement) {
      feedbackElement.textContent = error && error.message ? error.message : 'Unexpected parser error.';
    }
    updateScreenReaderStatus('Transcript parsing failed.');
  }
}

function handleClearEvent() {
  resetIntake();
  updateScreenReaderStatus('Transcript cleared and intake reset.');
}

export function initializeTranscriptController() {
  if (isInitialised) {
    return;
  }
  document.addEventListener('otcflow:transcript:parse', handleParseEvent);
  document.addEventListener('otcflow:transcript:clear', handleClearEvent);
  isInitialised = true;
}

export function resetTranscriptStatus() {
  const statusElement = document.getElementById('transcript-status');
  const feedbackElement = document.getElementById('transcript-feedback');
  if (statusElement) {
    statusElement.textContent = IDLE_STATUS;
  }
  if (feedbackElement) {
    feedbackElement.textContent = '';
  }
}
