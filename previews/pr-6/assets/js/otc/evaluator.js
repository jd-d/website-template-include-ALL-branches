import { getRulePackById } from './rule-packs.js';

const REQUIRED_PATIENT_FIELDS = ['age', 'sex'];

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

function booleanAnswer(answers, id) {
  return normalizeBoolean(answers[id]);
}

function numericAnswer(answers, id) {
  return normalizeNumber(answers[id]);
}

function stringAnswer(answers, id) {
  const value = answers[id];
  if (value === undefined || value === null || value === '') {
    return null;
  }
  return String(value);
}

function collectMissingFields(rulePack, intake) {
  const missing = [];
  for (const field of REQUIRED_PATIENT_FIELDS) {
    const value = intake.patient[field];
    if (field === 'age') {
      const asNumber = normalizeNumber(value);
      if (!Number.isFinite(asNumber)) {
        missing.push({ id: 'patient.age', label: 'Patient age' });
      }
    } else if (!value) {
      missing.push({ id: `patient.${field}`, label: `Patient ${field}` });
    }
  }

  if (intake.patient.sex === 'female' && normalizeBoolean(intake.patient.pregnant) === null) {
    missing.push({ id: 'patient.pregnant', label: 'Pregnancy status' });
  }

  for (const section of rulePack.sections) {
    for (const question of section.questions) {
      if (!question.required) {
        continue;
      }
      const raw = intake.answers[question.id];
      if (question.type === 'boolean') {
        if (normalizeBoolean(raw) === null) {
          missing.push({ id: question.id, label: question.label });
        }
      } else if (question.type === 'number') {
        if (!Number.isFinite(normalizeNumber(raw))) {
          missing.push({ id: question.id, label: question.label });
        }
      } else if (!raw) {
        missing.push({ id: question.id, label: question.label });
      }
    }
  }

  return missing;
}

function evaluateUti(intake, rulePack) {
  const { patient, answers } = intake;
  const trace = [];
  const warnings = [];
  const actions = [];
  const redFlags = [];

  const age = normalizeNumber(patient.age);
  if (age >= 16 && age <= 64) {
    trace.push({ status: 'pass', label: 'Age between 16 and 64 years.' });
  } else {
    trace.push({ status: 'fail', label: 'Age outside 16 to 64 years.' });
    return {
      outcome: 'refer',
      urgency: 'routine',
      headline: 'Refer to GP - outside Pharmacy First age range',
      summary: 'Age criteria for community supply are not met.',
      trace,
      warnings,
      actions: ['Signpost to GP or urgent care as per local protocol.'],
      safetyNet: rulePack.safetyNetting
    };
  }

  if (patient.sex === 'female') {
    trace.push({ status: 'pass', label: 'Patient identifies as female.' });
  } else {
    trace.push({ status: 'fail', label: 'Only available for women.' });
    return {
      outcome: 'refer',
      urgency: 'routine',
      headline: 'Refer - pathway designed for women aged 16 to 64',
      summary: 'Presenting patient is outside the defined cohort.',
      trace,
      warnings,
      actions: ['Refer to GP or appropriate service for assessment.'],
      safetyNet: rulePack.safetyNetting
    };
  }

  const pregnant = normalizeBoolean(patient.pregnant);
  if (pregnant === true) {
    trace.push({ status: 'fail', label: 'Pregnancy is an exclusion.' });
    return {
      outcome: 'refer',
      urgency: 'routine',
      headline: 'Refer to GP - pregnancy is excluded',
      summary: 'Pregnant patients should be reviewed by their GP or midwife.',
      trace,
      warnings,
      actions: ['Discuss referral urgency based on symptoms and arrange GP review.'],
      safetyNet: rulePack.safetyNetting
    };
  }
  if (pregnant === false) {
    trace.push({ status: 'pass', label: 'Pregnancy excluded.' });
  } else {
    trace.push({ status: 'warn', label: 'Pregnancy status unknown.' });
    warnings.push('Confirm pregnancy status before supply.');
  }

  const redFlagChecks = [
    { id: 'fever', label: 'Fever or rigors' },
    { id: 'loinPain', label: 'Loin or flank pain' },
    { id: 'visibleHaematuria', label: 'Visible haematuria' }
  ];

  for (const item of redFlagChecks) {
    if (booleanAnswer(answers, item.id) === true) {
      redFlags.push(item.label);
    }
  }

  if (redFlags.length > 0) {
    for (const flag of redFlags) {
      trace.push({ status: 'fail', label: `${flag} present - urgent referral required.` });
    }
    return {
      outcome: 'refer',
      urgency: 'urgent',
      headline: 'Urgent referral - red flag symptoms identified',
      summary: redFlags.join('; '),
      trace,
      warnings,
      actions: ['Escalate to urgent care or 999 according to severity.'],
      safetyNet: rulePack.safetyNetting,
      referral: {
        destination: 'Urgent care / 111 / GP',
        reason: `Red flag(s): ${redFlags.join(', ')}`
      }
    };
  }

  const riskChecks = [
    { id: 'recurrentUti', label: 'Recurrent UTI history' },
    { id: 'diabetes', label: 'Poorly controlled diabetes' },
    { id: 'indwellingCatheter', label: 'Indwelling catheter' },
    { id: 'immunocompromised', label: 'Immunocompromised' },
    { id: 'recentUti', label: 'Recent UTI treatment (<4 weeks)' }
  ];

  const flaggedRisks = [];
  for (const check of riskChecks) {
    if (booleanAnswer(answers, check.id) === true) {
      flaggedRisks.push(check.label);
    }
  }

  const renal = stringAnswer(answers, 'renalImpairment');
  if (renal === 'yes') {
    flaggedRisks.push('Renal impairment present');
  }
  if (renal === 'unknown') {
    warnings.push('Renal function not confirmed - adjust choice accordingly.');
  }

  if (flaggedRisks.length > 0) {
    for (const risk of flaggedRisks) {
      trace.push({ status: 'fail', label: `${risk} is an exclusion.` });
    }
    return {
      outcome: 'refer',
      urgency: 'routine',
      headline: 'Refer to GP - risk factors outside Pharmacy First scope',
      summary: flaggedRisks.join('; '),
      trace,
      warnings,
      actions: ['Arrange GP review. Provide self-care advice while awaiting appointment.'],
      safetyNet: rulePack.safetyNetting,
      referral: {
        destination: 'GP',
        reason: flaggedRisks.join(', ')
      }
    };
  }

  const symptomCount = ['dysuria', 'frequency', 'urgency'].reduce((total, id) => {
    return total + (booleanAnswer(answers, id) === true ? 1 : 0);
  }, 0);

  trace.push({ status: symptomCount >= 2 ? 'pass' : 'warn', label: `${symptomCount} core urinary symptoms recorded.` });

  if (booleanAnswer(answers, 'vaginalDischarge') === true) {
    trace.push({ status: 'warn', label: 'Vaginal discharge present - consider STI or vaginal infection.' });
    warnings.push('Consider alternative diagnoses due to vaginal discharge.');
  }

  const durationDays = numericAnswer(answers, 'durationDays');
  if (Number.isFinite(durationDays)) {
    if (durationDays > 28) {
      trace.push({ status: 'fail', label: 'Symptoms lasting longer than 28 days.' });
      return {
        outcome: 'refer',
        urgency: 'routine',
        headline: 'Refer - symptom duration exceeds 28 days',
        summary: 'Chronic symptoms require GP review before supply.',
        trace,
        warnings,
        actions: ['Arrange GP assessment for persistent urinary symptoms.'],
        safetyNet: rulePack.safetyNetting
      };
    }
    trace.push({ status: 'pass', label: `Duration recorded as ${durationDays} day(s).` });
  }

  if (symptomCount < 2) {
    warnings.push('At least two urinary symptoms are normally required for supply.');
    return {
      outcome: 'advice',
      urgency: 'routine',
      headline: 'Provide self-care advice - diagnostic certainty low',
      summary: 'Fewer than two core symptoms recorded; consider delayed referral.',
      trace,
      warnings,
      actions: ['Offer hydration and analgesia advice.', 'Consider urine dip where available.', 'Refer if symptoms worsen.'],
      safetyNet: rulePack.safetyNetting
    };
  }

  actions.push('Supply Nitrofurantoin MR 100 mg twice daily for 3 days.');
  actions.push('Advise on hydration and analgesia (paracetamol or ibuprofen if suitable).');
  actions.push('Counsel on avoiding sexual intercourse until symptoms resolve.');

  return {
    outcome: 'supply',
    urgency: 'routine',
    headline: 'Supply Nitrofurantoin MR 100 mg twice daily for 3 days',
    summary: 'Patient meets inclusion criteria with no exclusions detected.',
    trace,
    warnings,
    actions,
    safetyNet: rulePack.safetyNetting,
    supply: {
      product: 'Nitrofurantoin 100 mg modified release capsules',
      dosage: '1 capsule twice daily for 3 days with food',
      notes: 'Check creatinine clearance ≥45 mL/min before supply.'
    }
  };
}

function evaluateSoreThroat(intake, rulePack) {
  const { patient, answers } = intake;
  const trace = [];
  const warnings = [];
  const actions = [];

  const age = normalizeNumber(patient.age);
  if (age >= 5) {
    trace.push({ status: 'pass', label: 'Age 5 years or older.' });
  } else {
    trace.push({ status: 'fail', label: 'Pharmacy First sore throat pathway is for age ≥5 years.' });
    return {
      outcome: 'refer',
      urgency: 'routine',
      headline: 'Refer - patient under 5 years old',
      summary: 'Outside scope of Pharmacy First sore throat service.',
      trace,
      warnings,
      actions: ['Arrange GP or paediatric assessment.'],
      safetyNet: rulePack.safetyNetting
    };
  }

  const urgentFlags = [];
  if (booleanAnswer(answers, 'airwayCompromise') === true) {
    urgentFlags.push('Airway compromise / stridor');
  }
  if (booleanAnswer(answers, 'systemicallyUnwell') === true) {
    urgentFlags.push('Severe systemic illness');
  }
  if (urgentFlags.length > 0) {
    for (const flag of urgentFlags) {
      trace.push({ status: 'fail', label: `${flag} - escalate immediately.` });
    }
    return {
      outcome: 'refer',
      urgency: 'urgent',
      headline: 'Urgent referral - red flag symptoms identified',
      summary: urgentFlags.join('; '),
      trace,
      warnings,
      actions: ['Call 999 or arrange urgent medical review.'],
      safetyNet: rulePack.safetyNetting,
      referral: {
        destination: 'Urgent care / A&E',
        reason: urgentFlags.join(', ')
      }
    };
  }

  if (booleanAnswer(answers, 'immunocompromise') === true) {
    trace.push({ status: 'fail', label: 'Immunocompromised patient - refer to GP.' });
    return {
      outcome: 'refer',
      urgency: 'routine',
      headline: 'Refer - immunocompromise is an exclusion',
      summary: 'Requires medical assessment due to immunocompromise.',
      trace,
      warnings,
      actions: ['Arrange GP review and document rationale.'],
      safetyNet: rulePack.safetyNetting
    };
  }

  const durationDays = numericAnswer(answers, 'durationDays');
  if (Number.isFinite(durationDays)) {
    if (durationDays > 10) {
      trace.push({ status: 'fail', label: 'Symptoms present for more than 10 days.' });
      return {
        outcome: 'refer',
        urgency: 'routine',
        headline: 'Refer - duration exceeds 10 days',
        summary: 'Persistent sore throat should be assessed by GP.',
        trace,
        warnings,
        actions: ['Arrange GP follow-up for persistent symptoms.'],
        safetyNet: rulePack.safetyNetting
      };
    }
    trace.push({ status: 'pass', label: `Duration recorded as ${durationDays} day(s).` });
  }

  if (booleanAnswer(answers, 'previousStrep') === true) {
    trace.push({ status: 'warn', label: 'Scarlet fever or positive strep test in last 30 days.' });
    warnings.push('Contact GP - repeat infection within 30 days.');
  }

  const feverPainCriteria = ['fever', 'purulence', 'rapidOnset', 'inflamedTonsils', 'noCough'];
  let score = 0;
  for (const criterion of feverPainCriteria) {
    if (booleanAnswer(answers, criterion) === true) {
      score += 1;
    }
  }
  trace.push({ status: score >= 0 ? 'pass' : 'warn', label: `FeverPAIN score calculated: ${score}.` });

  const penicillinAllergy = stringAnswer(answers, 'antibioticAllergy');
  if (penicillinAllergy === 'yes') {
    warnings.push('Use clarithromycin in place of penicillin.');
  } else if (penicillinAllergy === 'unknown') {
    warnings.push('Clarify penicillin allergy status before supply.');
  }

  if (score <= 1) {
    actions.push('Offer self-care advice including fluids, rest, and simple analgesia.');
    actions.push('Reassure that symptoms usually settle within 1 week.');
    return {
      outcome: 'advice',
      urgency: 'routine',
      headline: 'Self-care advice - FeverPAIN score 0 to 1',
      summary: 'Antibiotics not indicated. Provide safety netting and OTC analgesia advice.',
      trace,
      warnings,
      actions,
      safetyNet: rulePack.safetyNetting
    };
  }

  if (score === 2 || score === 3) {
    actions.push('Consider issuing a delayed antibiotic prescription if symptoms worsen.');
    actions.push('Provide self-care advice and throat lozenges or spray if appropriate.');
    return {
      outcome: 'advice',
      urgency: 'routine',
      headline: 'Consider delayed antibiotic - FeverPAIN score 2 to 3',
      summary: 'Discuss safety netting and provide delayed prescription if clinically appropriate.',
      trace,
      warnings,
      actions,
      safetyNet: rulePack.safetyNetting
    };
  }

  actions.push(
    penicillinAllergy === 'yes'
      ? 'Supply Clarithromycin 250 mg twice daily for 5 days (weight adjusted for children).'
      : 'Supply Phenoxymethylpenicillin 500 mg four times daily for 5 days (child doses weight adjusted).'
  );
  actions.push('Provide written safety-netting advice and advise on infection control.');

  return {
    outcome: 'supply',
    urgency: 'routine',
    headline:
      penicillinAllergy === 'yes'
        ? 'Supply Clarithromycin for 5 days'
        : 'Supply Phenoxymethylpenicillin for 5 days',
    summary: 'FeverPAIN score ≥4 - antibiotics recommended to shorten illness duration.',
    trace,
    warnings,
    actions,
    safetyNet: rulePack.safetyNetting,
    supply: {
      product:
        penicillinAllergy === 'yes'
          ? 'Clarithromycin 250 mg tablets (or paediatric suspension)'
          : 'Phenoxymethylpenicillin 250 mg/5 mL oral solution or tablets',
      dosage:
        penicillinAllergy === 'yes'
          ? 'Take 250 mg twice daily for 5 days (adjust for age/weight).'
          : 'Take 500 mg four times daily for 5 days (child dose 12.5 mg/kg four times daily).',
      notes: 'Confirm ability to swallow tablets or supply appropriate suspension.'
    }
  };
}

function buildDocumentation(intake, rulePack, result) {
  const { patient } = intake;
  const lines = [];
  const age = normalizeNumber(patient.age);
  const pregnant = normalizeBoolean(patient.pregnant);

  lines.push(`# Consultation summary - ${rulePack.name}`);
  lines.push('');
  lines.push(`- Rule pack version ${rulePack.version} (effective from ${rulePack.effectiveFrom}, last reviewed ${rulePack.lastReviewed}).`);
  lines.push(`- Patient: age ${Number.isFinite(age) ? age : 'unknown'}, sex ${patient.sex || 'unknown'}.`);
  if (patient.sex === 'female') {
    lines.push(`- Pregnancy: ${pregnant === null ? 'unknown' : pregnant ? 'pregnant' : 'not pregnant'}.`);
  }
  if (patient.postcode) {
    lines.push(`- Postcode: ${patient.postcode}.`);
  }

  lines.push('');
  lines.push('## Assessment');
  lines.push(`- Presenting complaint: ${rulePack.complaint.label}.`);
  lines.push(`- Outcome: ${result.headline}.`);
  if (result.warnings && result.warnings.length > 0) {
    for (const warning of result.warnings) {
      lines.push(`- Caution: ${warning}`);
    }
  }

  lines.push('');
  lines.push('## Decision trace');
  for (const item of result.trace) {
    lines.push(`- [${item.status.toUpperCase()}] ${item.label}`);
  }

  lines.push('');
  lines.push('## Plan');
  if (result.actions && result.actions.length > 0) {
    for (const action of result.actions) {
      lines.push(`- ${action}`);
    }
  }
  if (result.supply) {
    lines.push(`- Product: ${result.supply.product}.`);
    lines.push(`- Dosage: ${result.supply.dosage}.`);
    lines.push(`- Notes: ${result.supply.notes}.`);
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
  const rulePack = getRulePackById(rulePackId);
  if (!rulePack) {
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

  let result;
  switch (rulePack.id) {
    case 'uti_women_16_64':
      result = evaluateUti(intake, rulePack);
      break;
    case 'sore_throat_feverpain':
      result = evaluateSoreThroat(intake, rulePack);
      break;
    default:
      result = {
        outcome: 'incomplete',
        headline: 'Evaluation not implemented',
        summary: 'This rule pack is defined but has no evaluation logic yet.',
        trace: [],
        warnings: [],
        actions: [],
        safetyNet: rulePack.safetyNetting
      };
  }

  return {
    ...result,
    documentation: buildDocumentation(intake, rulePack, result),
    governance: {
      version: rulePack.version,
      effectiveFrom: rulePack.effectiveFrom,
      lastReviewed: rulePack.lastReviewed
    }
  };
}
