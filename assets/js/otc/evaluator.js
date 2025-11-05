import {
  getRulePackById,
  evaluateDerivedValues,
  renderValue
} from './rule-packs.js';

function normalizeBoolean(value) {
  if (value === true || value === 'true' || value === 'yes') {
    return true;
  }
  if (value === false || value === 'false' || value === 'no') {
    return false;
  }
  return null;
}

function normalizeNumber(value) {
  if (value === '' || value === null || value === undefined) {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeMultiSelect(value) {
  if (value === null || value === undefined || value === '') {
    return [];
  }
  const array = Array.isArray(value) ? value : [value];
  const seen = new Set();
  const normalized = [];
  for (const entry of array) {
    const text = String(entry ?? '').trim();
    if (!text) {
      continue;
    }
    if (!seen.has(text)) {
      seen.add(text);
      normalized.push(text);
    }
  }
  return normalized;
}

function buildQuestionIndex(rulePack) {
  const index = new Map();
  for (const section of rulePack.sections || []) {
    for (const question of section.questions || []) {
      index.set(question.id, question);
    }
  }
  return index;
}

const PATIENT_BOOLEAN_FIELDS = new Set(['pregnant']);

function collectMissingFields(rulePack, intake) {
  const missing = [];
  const required = rulePack.intake?.required || {};
  const patient = intake.patient || {};
  const answers = intake.answers || {};
  const questionIndex = buildQuestionIndex(rulePack);

  for (const field of required.patient || []) {
    if (field === 'age') {
      const age = normalizeNumber(patient.age);
      if (!Number.isFinite(age)) {
        missing.push({ id: 'patient.age', label: 'Patient age' });
      }
    } else if (PATIENT_BOOLEAN_FIELDS.has(field)) {
      const normalized = normalizeBoolean(patient[field]);
      if (normalized === null) {
        missing.push({ id: `patient.${field}`, label: `Patient ${field}` });
      }
    } else {
      const value = patient[field];
      if (value === undefined || value === null || value === '') {
        missing.push({ id: `patient.${field}`, label: `Patient ${field}` });
      }
    }
  }

  function ensureAnswer(question, forceRequired = false) {
    const required = forceRequired || Boolean(question.required);
    if (!required) {
      return;
    }
    const raw = answers[question.id];
    if (question.type === 'boolean') {
      if (normalizeBoolean(raw) === null) {
        missing.push({ id: question.id, label: question.label });
      }
    } else if (question.type === 'number') {
      if (!Number.isFinite(normalizeNumber(raw))) {
        missing.push({ id: question.id, label: question.label });
      }
    } else if (question.type === 'select') {
      if (raw === undefined || raw === null || raw === '') {
        missing.push({ id: question.id, label: question.label });
      }
    } else if (question.type === 'multi_select') {
      const values = normalizeMultiSelect(raw);
      if (values.length === 0) {
        missing.push({ id: question.id, label: question.label });
      }
    } else if (raw === undefined || raw === null || raw === '') {
      missing.push({ id: question.id, label: question.label });
    }
  }

  const requiredAnswerIds = new Set(required.answers || []);
  for (const id of requiredAnswerIds) {
    const question = questionIndex.get(id);
    if (question) {
      ensureAnswer(question, true);
    }
  }

  for (const question of questionIndex.values()) {
    if (question.required && !requiredAnswerIds.has(question.id)) {
      ensureAnswer(question, true);
    }
  }

  return missing;
}

function normalizeAnswer(question, value) {
  if (!question) {
    return value;
  }
  switch (question.type) {
    case 'boolean':
      return normalizeBoolean(value);
    case 'number':
      return normalizeNumber(value);
    case 'select': {
      if (value === '' || value === undefined || value === null) {
        return null;
      }
      if (value === 'unknown') {
        return null;
      }
      return String(value);
    }
    case 'multi_select':
      return normalizeMultiSelect(value);
    default:
      return value;
  }
}

function normalizeIntake(rulePack, intake) {
  const patient = {
    age: normalizeNumber(intake.patient?.age),
    sex: intake.patient?.sex ? String(intake.patient.sex).toLowerCase() : '',
    pregnant: normalizeBoolean(intake.patient?.pregnant),
    postcode: intake.patient?.postcode || ''
  };

  const answers = {};
  const questionIndex = buildQuestionIndex(rulePack);
  for (const [id, raw] of Object.entries(intake.answers || {})) {
    const question = questionIndex.get(id);
    answers[id] = normalizeAnswer(question, raw);
  }

  return { patient, answers };
}

function appendTraceEntry(trace, detail, context, fallbackStatus) {
  if (!detail) {
    return;
  }
  const status = detail.status || fallbackStatus || 'info';
  const rendered = renderValue(detail.label, context);
  if (rendered === undefined || rendered === null) {
    return;
  }
  const label = Array.isArray(rendered) ? rendered.join(', ') : String(rendered);
  if (label.trim().length === 0) {
    return;
  }
  trace.push({ status, label });
}

function toStringList(value) {
  if (value === undefined || value === null) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => toStringList(item));
  }
  const text = String(value).trim();
  return text ? [text] : [];
}

function appendItems(target, value, context) {
  if (!value) {
    return;
  }
  const rendered = renderValue(value, context);
  const items = toStringList(rendered);
  for (const item of items) {
    target.push(item);
  }
}

function uniqueStrings(items) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const key = item.trim();
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(item);
  }
  return result;
}

function evaluateChecks(rulePack, context, trace, warnings) {
  for (const check of rulePack.logic?.checks || []) {
    const passed = Boolean(renderValue({ expr: check.expression }, context));
    const detail = passed ? check.pass : check.fail;
    appendTraceEntry(trace, detail, context, passed ? 'pass' : 'fail');
    appendItems(warnings, detail?.warnings, context);
    if (!passed && detail?.result) {
      return renderValue(detail.result, context);
    }
  }
  return null;
}

function evaluateAdvice(rulePack, context, trace, warnings, actions) {
  for (const advice of rulePack.logic?.advice || []) {
    const matched = Boolean(renderValue({ expr: advice.expression }, context));
    if (!matched) {
      continue;
    }
    appendTraceEntry(trace, advice.trace, context, advice.trace?.status || 'info');
    appendItems(warnings, advice.warnings, context);
    appendItems(actions, advice.actions, context);
  }
}

function evaluateOutcomes(rulePack, context, trace, warnings, actions) {
  for (const outcome of rulePack.logic?.outcomes || []) {
    const matched = Boolean(renderValue({ expr: outcome.expression }, context));
    if (matched) {
      appendTraceEntry(trace, outcome.trace?.pass, context, outcome.trace?.pass?.status || 'pass');
      appendItems(warnings, outcome.warnings, context);
      appendItems(actions, outcome.actions, context);
      return renderValue(outcome.result, context);
    }
    appendTraceEntry(trace, outcome.trace?.fail, context, outcome.trace?.fail?.status || 'info');
  }
  return null;
}

function evaluateDefault(rulePack, context, trace) {
  const fallback = rulePack.logic?.default;
  if (!fallback) {
    return {
      outcome: 'incomplete',
      urgency: 'routine',
      headline: 'No matching recommendation',
      summary: 'Unable to determine a recommendation for the provided answers.',
      actions: []
    };
  }
  appendTraceEntry(trace, fallback.trace, context, fallback.trace?.status || 'info');
  return renderValue(fallback.result, context);
}

function normaliseResult(result) {
  const resolved = {
    outcome: result.outcome || 'incomplete',
    urgency: result.urgency || 'routine',
    headline: result.headline || 'No recommendation available',
    summary: result.summary || '',
    actions: Array.isArray(result.actions) ? result.actions : result.actions ? [result.actions] : [],
    warnings: Array.isArray(result.warnings) ? result.warnings : result.warnings ? [result.warnings] : [],
    safetyNet: result.safetyNet || [],
    trace: result.trace || [],
    supply: result.supply || null,
    referral: result.referral || null
  };
  if (result.documentation) {
    resolved.documentation = result.documentation;
  }
  return resolved;
}

function buildDocumentation(intake, rulePack, result) {
  const lines = [];
  const age = Number.isFinite(intake.patient.age) ? intake.patient.age : 'unknown';
  const pregnancy = intake.patient.pregnant === null
    ? 'unknown'
    : intake.patient.pregnant
      ? 'pregnant'
      : 'not pregnant';

  lines.push(`# Consultation summary - ${rulePack.name}`);
  lines.push('');
  lines.push(`- Rule pack version ${rulePack.version} (effective from ${rulePack.effectiveFrom || 'unknown'}, last reviewed ${rulePack.lastReviewed || 'unknown'}).`);
  lines.push(`- Patient: age ${age}, sex ${intake.patient.sex || 'unknown'}.`);
  if (intake.patient.sex === 'female') {
    lines.push(`- Pregnancy: ${pregnancy}.`);
  }
  if (intake.patient.postcode) {
    lines.push(`- Postcode: ${intake.patient.postcode}.`);
  }

  lines.push('');
  lines.push('## Assessment');
  lines.push(`- Presenting complaint: ${rulePack.complaint?.label || 'unknown'}.`);
  lines.push(`- Outcome: ${result.headline}.`);
  for (const warning of result.warnings || []) {
    lines.push(`- Caution: ${warning}`);
  }

  lines.push('');
  lines.push('## Decision trace');
  for (const item of result.trace || []) {
    lines.push(`- [${item.status?.toUpperCase() || 'INFO'}] ${item.label}`);
  }

  lines.push('');
  lines.push('## Plan');
  for (const action of result.actions || []) {
    lines.push(`- ${action}`);
  }
  if (result.supply) {
    lines.push(`- Product: ${result.supply.product}.`);
    lines.push(`- Dosage: ${result.supply.dosage}.`);
    if (result.supply.notes) {
      lines.push(`- Notes: ${result.supply.notes}.`);
    }
  }
  if (result.referral) {
    lines.push(`- Referral: ${result.referral.destination} (${result.referral.reason}).`);
  }

  lines.push('');
  lines.push('## Safety netting');
  for (const advice of result.safetyNet || []) {
    lines.push(`- ${advice}`);
  }

  lines.push('');
  lines.push('Document generated by OTC Flow prototype. No patient identifiers stored.');

  return lines.join('\n');
}

export function evaluate(rulePackId, intake) {
  if (!rulePackId) {
    return {
      outcome: 'incomplete',
      headline: 'Select a pathway to begin',
      summary: 'Choose the presenting complaint and pathway to run the assessment.',
      trace: [],
      warnings: [],
      actions: [],
      safetyNet: []
    };
  }

  const rulePack = getRulePackById(rulePackId);
  if (!rulePack) {
    return {
      outcome: 'incomplete',
      headline: 'Pathway not available',
      summary: 'The selected pathway could not be loaded.',
      trace: [],
      warnings: [],
      actions: [],
      safetyNet: []
    };
  }

  const missing = collectMissingFields(rulePack, intake);
  if (missing.length > 0) {
    return {
      outcome: 'incomplete',
      headline: 'More information required',
      summary: 'Capture the highlighted fields before generating a recommendation.',
      missing,
      trace: [],
      warnings: [],
      actions: [],
      safetyNet: rulePack.safetyNetting
    };
  }

  const normalized = normalizeIntake(rulePack, intake);
  const context = {
    patient: normalized.patient,
    answers: normalized.answers,
    derived: {},
    pack: rulePack
  };
  context.derived = evaluateDerivedValues(rulePack, context);

  const trace = [];
  const warnings = [];
  const baseActions = [];

  const checkResult = evaluateChecks(rulePack, context, trace, warnings);
  if (checkResult) {
    const prepared = normaliseResult(checkResult);
    prepared.trace = trace;
    prepared.warnings = uniqueStrings([...warnings, ...prepared.warnings]);
    prepared.actions = uniqueStrings([...baseActions, ...prepared.actions]);
    prepared.safetyNet = prepared.safetyNet && prepared.safetyNet.length > 0 ? prepared.safetyNet : rulePack.safetyNetting;
    prepared.documentation = buildDocumentation(normalized, rulePack, prepared);
    prepared.governance = {
      version: rulePack.version,
      effectiveFrom: rulePack.effectiveFrom || 'unknown',
      lastReviewed: rulePack.lastReviewed || 'unknown'
    };
    return prepared;
  }

  evaluateAdvice(rulePack, context, trace, warnings, baseActions);
  const outcomeResult = evaluateOutcomes(rulePack, context, trace, warnings, baseActions);
  const resolvedOutcome = outcomeResult || evaluateDefault(rulePack, context, trace);
  const prepared = normaliseResult(resolvedOutcome);
  prepared.trace = trace;
  prepared.warnings = uniqueStrings([...warnings, ...prepared.warnings]);
  prepared.actions = uniqueStrings([...baseActions, ...prepared.actions]);
  prepared.safetyNet = prepared.safetyNet && prepared.safetyNet.length > 0 ? prepared.safetyNet : rulePack.safetyNetting;
  prepared.documentation = buildDocumentation(normalized, rulePack, prepared);
  prepared.governance = {
    version: rulePack.version,
    effectiveFrom: rulePack.effectiveFrom || 'unknown',
    lastReviewed: rulePack.lastReviewed || 'unknown'
  };

  return prepared;
}
