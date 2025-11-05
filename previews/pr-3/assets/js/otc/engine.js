import { deepClone, formatDateISO, getByPath, isUnknown, joinNatural, mergeDeep } from './utils.js';

const DEFAULT_TEMPLATE_FALLBACK = 'Not recorded.';

export function createInitialIntake(pack) {
  const metadata = pack && pack.metadata ? pack.metadata : {};
  const base = {
    patient: {
      age: null,
      sex: 'unknown',
      pregnant: 'unknown'
    },
    presentation: metadata.presentation || pack.presentation || '',
    symptoms: {},
    history: {},
    flags: {},
    meds_allergies: {},
    notes: ''
  };

  const defaults = mergeDeep(base, pack?.intake?.defaults || {});
  ensureFieldsHaveDefaults(defaults, pack);
  return defaults;
}

export function evaluatePack(pack, intake) {
  if (!pack) {
    return {
      status: 'idle',
      clarifierPaths: [],
      referrals: [],
      supply: null,
      alternateSupplies: [],
      advice: [],
      trace: { gates: [], recommendations: [] },
      derived: {},
      documentation: null,
      decisionSummary: '',
      evaluatedAt: formatDateISO(),
      intake: {},
      packMetadata: {}
    };
  }

  const mergedIntake = mergeDeep(createInitialIntake(pack), intake || {});
  const derived = computeDerivedValues(pack, mergedIntake);
  const context = { intake: mergedIntake, pack, derived };

  const clarifierPaths = computeClarifiers(pack, mergedIntake);
  const gateTrace = evaluateGates(pack, context);
  const referrals = gateTrace.filter((gate) => gate.triggered).map((gate) => gate.outcome);

  const recommendationEvaluation = evaluateRecommendations(pack, context);
  const { supply, alternateSupplies, advice, recommendationTrace } = recommendationEvaluation;

  let status = 'pending';
  if (clarifierPaths.length > 0) {
    status = 'needs_clarification';
  }
  if (referrals.length > 0) {
    status = 'refer';
  } else if (status !== 'needs_clarification') {
    if (supply) {
      status = 'supply';
    } else if (advice.length > 0) {
      status = 'advice';
    }
  }

  const decisionSummary = buildDecisionSummary(status, { referrals, supply, advice });
  const clarifierDetails = clarifierPaths.map((path) => {
    const meta = pack.intake.fieldCatalog?.[path];
    return {
      path,
      label: meta?.label || path,
      clarifier: meta?.clarifier || '',
      required: Boolean(meta?.required)
    };
  });

  const documentation = buildDocumentation(pack, mergedIntake, {
    status,
    derived,
    supply,
    alternateSupplies,
    advice,
    referrals,
    decisionSummary,
    clarifierDetails
  });

  return {
    status,
    clarifierPaths,
    clarifierDetails,
    referrals,
    supply,
    alternateSupplies,
    advice,
    trace: {
      gates: gateTrace,
      recommendations: recommendationTrace
    },
    derived,
    documentation,
    decisionSummary,
    evaluatedAt: formatDateISO(),
    intake: mergedIntake,
    packMetadata: pack.metadata || {},
    safetyNetting: Array.isArray(pack.safetyNetting) ? pack.safetyNetting.slice() : []
  };
}

function ensureFieldsHaveDefaults(target, pack) {
  const sections = Array.isArray(pack?.intake?.sections) ? pack.intake.sections : [];
  sections.forEach((section) => {
    const fields = Array.isArray(section.fields) ? section.fields : [];
    fields.forEach((field) => {
      if (!field || !field.path) {
        return;
      }
      if (getByPath(target, field.path) !== undefined) {
        return;
      }
      const defaultValue = deriveDefaultForField(field);
      assignPathValue(target, field.path, defaultValue);
    });
  });
}

function deriveDefaultForField(field) {
  switch (field.type) {
    case 'number':
      return null;
    case 'textarea':
      return '';
    case 'tri-state':
      return 'unknown';
    case 'select':
      return field.options && field.options.length > 0 ? field.options[0].value : 'unknown';
    default:
      return 'unknown';
  }
}

function assignPathValue(target, path, value) {
  if (!path || typeof path !== 'string') {
    return;
  }
  const segments = path.split('.');
  let cursor = target;
  for (let index = 0; index < segments.length; index += 1) {
    const key = segments[index];
    if (index === segments.length - 1) {
      cursor[key] = value;
      return;
    }
    if (!cursor[key] || typeof cursor[key] !== 'object') {
      cursor[key] = {};
    }
    cursor = cursor[key];
  }
}

function computeClarifiers(pack, intake) {
  const required = Array.isArray(pack?.intake?.required) ? pack.intake.required : [];
  const clarifiers = [];
  required.forEach((path) => {
    const value = getByPath(intake, path);
    if (isUnknown(value)) {
      clarifiers.push(path);
    }
  });
  return clarifiers;
}

function evaluateGates(pack, context) {
  const gates = Array.isArray(pack?.gates) ? pack.gates : [];
  return gates.map((gate) => {
    const triggered = evaluateCondition(gate.condition, context);
    return {
      id: gate.id,
      description: gate.description,
      condition: gate.condition,
      triggered,
      passed: !triggered,
      outcome: triggered ? deepClone(gate.outcome) : null
    };
  });
}

function evaluateRecommendations(pack, context) {
  const rules = Array.isArray(pack?.recommendations) ? pack.recommendations : [];
  const recommendationTrace = [];
  let supply = null;
  const alternateSupplies = [];
  const advice = [];

  rules.forEach((rule) => {
    const matched = evaluateCondition(rule.condition, context);
    const outcome = matched ? deepClone(rule.outcome) : null;

    recommendationTrace.push({
      id: rule.id,
      title: rule.title,
      matched,
      outcome
    });

    if (!matched || !outcome || !outcome.type) {
      return;
    }

    if (outcome.type === 'supply') {
      const supplyEntry = { ...outcome, id: rule.id, title: rule.title };
      if (!supply) {
        supply = supplyEntry;
      } else {
        alternateSupplies.push(supplyEntry);
      }
    } else if (outcome.type === 'advice') {
      advice.push({ ...outcome, id: rule.id, title: rule.title });
    } else if (outcome.type === 'refer') {
      advice.push({ ...outcome, id: rule.id, title: rule.title });
    }
  });

  return { supply, alternateSupplies, advice, recommendationTrace };
}

function buildDecisionSummary(status, { referrals, supply, advice }) {
  switch (status) {
    case 'needs_clarification':
      return 'Complete the required fields to unlock a recommendation.';
    case 'refer': {
      const reasons = referrals.map((ref) => ref?.reason).filter(Boolean);
      return `Referral required: ${reasons.length > 0 ? joinNatural(reasons) : 'follow local escalation process.'}`;
    }
    case 'supply':
      return supply ? `Supply ${supply.product} – ${supply.directions}` : 'Supply authorised.';
    case 'advice': {
      const snippets = advice.flatMap((item) => item.advice || []);
      return snippets.length > 0 ? `Provide self-care advice: ${snippets[0]}` : 'Provide self-care advice.';
    }
    default:
      return 'Awaiting sufficient information for a recommendation.';
  }
}

function buildDocumentation(pack, intake, evaluation) {
  const metadata = pack.metadata || {};
  const documentation = pack.documentation || {};
  const summaryTemplate = documentation.summary || `${metadata.title || 'Consultation'} completed.`;

  const context = buildTemplateContext(pack, intake, evaluation);
  const summary = applyTemplate(summaryTemplate, context);
  const sections = Array.isArray(documentation.sections)
    ? documentation.sections.map((section) => {
        const lines = Array.isArray(section.template)
          ? section.template.map((line) => applyTemplate(line, context))
          : [];
        return {
          title: section.title || '',
          lines
        };
      })
    : [];

  const markdownLines = [];
  markdownLines.push(`# ${metadata.title || 'Consultation note'}`);
  markdownLines.push(`Rule version: ${metadata.version || 'unknown'} (effective ${metadata.effective || 'unknown'})`);
  markdownLines.push(`Consultation date: ${context.timestamp}`);
  markdownLines.push('');
  markdownLines.push(`Summary: ${summary}`);
  markdownLines.push('');

  sections.forEach((section) => {
    if (section.title) {
      markdownLines.push(`## ${section.title}`);
    }
    section.lines.forEach((line) => {
      markdownLines.push(line || DEFAULT_TEMPLATE_FALLBACK);
    });
    markdownLines.push('');
  });

  const safetyNetting = Array.isArray(pack.safetyNetting) ? pack.safetyNetting : [];
  if (safetyNetting.length > 0) {
    markdownLines.push('## Safety netting');
    safetyNetting.forEach((item) => {
      markdownLines.push(`- ${item}`);
    });
    markdownLines.push('');
  }

  const markdown = markdownLines.join('\n');

  return {
    summary,
    sections,
    markdown,
    safetyNetting
  };
}

function buildTemplateContext(pack, intake, evaluation) {
  const metadata = pack.metadata || {};
  const fieldCatalog = pack.intake?.fieldCatalog || {};
  const symptomLabels = collectLabelsByPrefix(fieldCatalog, 'symptoms.', intake, true);
  const redFlagLabels = collectLabelsByPrefix(fieldCatalog, 'flags.', intake, true);
  const notes = intake.notes && intake.notes.trim().length > 0 ? intake.notes.trim() : 'None recorded.';
  const safetyNettingList = Array.isArray(pack.safetyNetting) ? joinNatural(pack.safetyNetting) : '';

  return {
    pack: metadata,
    patient: intake.patient || {},
    symptoms: intake.symptoms || {},
    history: intake.history || {},
    flags: intake.flags || {},
    meds_allergies: intake.meds_allergies || {},
    derived: evaluation.derived || {},
    decisionSummary: evaluation.decisionSummary || '',
    status: evaluation.status,
    symptomSummary: symptomLabels.length > 0 ? joinNatural(symptomLabels) : 'No positive symptoms recorded',
    redFlagSummary: redFlagLabels.length > 0 ? joinNatural(redFlagLabels) : 'No red flags documented',
    safetyNettingList: safetyNettingList || 'Provided according to protocol.',
    notes,
    timestamp: formatDateISO(),
    clarifiers: evaluation.clarifierDetails || []
  };
}

function collectLabelsByPrefix(fieldCatalog, prefix, intake, onlyTrue) {
  return Object.entries(fieldCatalog)
    .filter(([path]) => path.startsWith(prefix))
    .map(([path, meta]) => {
      const value = getByPath(intake, path);
      if (onlyTrue) {
        if (value === true) {
          return meta.label;
        }
        return null;
      }
      if (isUnknown(value)) {
        return null;
      }
      return `${meta.label}: ${String(value)}`;
    })
    .filter(Boolean);
}

function computeDerivedValues(pack, intake) {
  const derived = {};
  const id = pack?.metadata?.id || pack?.id;

  if (id === 'sore_throat_adult') {
    const feverPainPaths = [
      'symptoms.fever_24h',
      'symptoms.purulence',
      'symptoms.rapid_onset',
      'symptoms.inflamed_tonsils',
      'symptoms.cough_absent'
    ];
    derived.feverPainScore = feverPainPaths.reduce((score, path) => {
      return score + (getByPath(intake, path) === true ? 1 : 0);
    }, 0);
  }

  return derived;
}

function applyTemplate(template, context) {
  if (typeof template !== 'string') {
    return DEFAULT_TEMPLATE_FALLBACK;
  }

  return template.replace(/{{\s*([^}]+)\s*}}/g, (match, token) => {
    const value = resolveToken(token.trim(), context);
    if (value === undefined || value === null || value === '') {
      return DEFAULT_TEMPLATE_FALLBACK;
    }
    return String(value);
  });
}

function resolveToken(token, context) {
  if (token.includes('.')) {
    const segments = token.split('.');
    let current = context;
    for (const segment of segments) {
      if (!current || typeof current !== 'object') {
        return undefined;
      }
      current = current[segment];
    }
    return current;
  }
  return context[token];
}

function evaluateCondition(condition, context) {
  if (!condition) {
    return false;
  }

  if (Array.isArray(condition)) {
    return condition.every((item) => evaluateCondition(item, context));
  }

  if (typeof condition !== 'object') {
    return Boolean(condition);
  }

  if (condition.all) {
    return condition.all.every((item) => evaluateCondition(item, context));
  }
  if (condition.any) {
    return condition.any.some((item) => evaluateCondition(item, context));
  }
  if (condition.not) {
    return !evaluateCondition(condition.not, context);
  }

  const [operator] = Object.keys(condition);
  const operand = condition[operator];

  switch (operator) {
    case 'equals':
      return compareValues(operand, context, (a, b) => normaliseValue(a) === normaliseValue(b));
    case 'notEquals':
      return compareValues(operand, context, (a, b) => normaliseValue(a) !== normaliseValue(b));
    case 'gt':
      return compareValues(operand, context, (a, b) => Number(a) > Number(b));
    case 'gte':
      return compareValues(operand, context, (a, b) => Number(a) >= Number(b));
    case 'lt':
      return compareValues(operand, context, (a, b) => Number(a) < Number(b));
    case 'lte':
      return compareValues(operand, context, (a, b) => Number(a) <= Number(b));
    case 'between':
      return compareValues(operand, context, (value, min, max) => Number(value) >= Number(min) && Number(value) <= Number(max));
    case 'notBetween':
      return compareValues(
        operand,
        context,
        (value, min, max) => !(Number(value) >= Number(min) && Number(value) <= Number(max))
      );
    case 'in':
      return compareValues(operand, context, (value, list) => {
        const haystack = Array.isArray(list) ? list : [];
        return haystack.map(normaliseValue).includes(normaliseValue(value));
      });
    case 'notIn':
      return compareValues(operand, context, (value, list) => {
        const haystack = Array.isArray(list) ? list : [];
        return !haystack.map(normaliseValue).includes(normaliseValue(value));
      });
    case 'truthy':
      return Boolean(resolveOperand(operand, context));
    case 'falsy':
      return !Boolean(resolveOperand(operand, context));
    default:
      return false;
  }
}

function compareValues(operand, context, comparator) {
  if (!Array.isArray(operand)) {
    return false;
  }
  const values = operand.map((value) => resolveOperand(value, context));
  return comparator(...values);
}

function resolveOperand(operand, context) {
  if (typeof operand === 'string') {
    if (operand.startsWith('derived.')) {
      return getByPath(context.derived, operand.replace('derived.', ''));
    }
    if (operand.startsWith('intake.')) {
      return getByPath(context.intake, operand.replace('intake.', ''));
    }
    if (operand.includes('.')) {
      return getByPath(context.intake, operand);
    }
  }
  return operand;
}

function normaliseValue(value) {
  if (typeof value === 'string') {
    return value.toLowerCase();
  }
  return value;
}
