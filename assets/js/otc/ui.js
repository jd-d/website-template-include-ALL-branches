import {
  subscribe,
  updatePatientField,
  setComplaint,
  setRulePack,
  setAnswer,
  loadScenario,
  getState,
  resetIntake,
  applyNlpSuggestion,
  dismissNlpSuggestion,
  applyConfidentNlpSuggestions,
  describeSuggestionConfidence,
  ensureRulePacksLoaded
} from './store.js';
import {
  getRulePackById,
  getRulePacksForComplaint,
  getRulePacks,
  subscribeToRulePacks
} from './rule-packs.js';

const scenarioPresets = [
  {
    id: 'uti_supply',
    label: 'UTI - Nitrofurantoin supply',
    patient: { age: 28, sex: 'female', pregnant: 'no', postcode: 'LS1 4AB' },
    complaintId: 'urinary_symptoms',
    rulePackId: 'uti_women_16_64',
    answers: {
      dysuria: 'yes',
      frequency: 'yes',
      urgency: 'yes',
      visibleHaematuria: 'no',
      fever: 'no',
      loinPain: 'no',
      vaginalDischarge: 'no',
      durationDays: 2,
      recurrentUti: 'no',
      diabetes: 'no',
      renalImpairment: 'no',
      indwellingCatheter: 'no',
      immunocompromised: 'no',
      recentUti: 'no'
    }
  },
  {
    id: 'sore_throat_high',
    label: 'Sore throat - FeverPAIN 4',
    patient: { age: 22, sex: 'female', pregnant: 'no', postcode: 'B1 1AA' },
    complaintId: 'sore_throat',
    rulePackId: 'sore_throat_feverpain',
    answers: {
      airwayCompromise: 'no',
      systemicallyUnwell: 'no',
      immunocompromise: 'no',
      fever: 'yes',
      purulence: 'yes',
      rapidOnset: 'yes',
      inflamedTonsils: 'yes',
      noCough: 'yes',
      durationDays: 2,
      previousStrep: 'no',
      antibioticAllergy: 'no'
    }
  },
  {
    id: 'sinusitis_supply',
    label: 'Sinusitis - Nasal steroid supply',
    patient: { age: 36, sex: 'female', pregnant: 'no', postcode: 'CF10 1AA' },
    complaintId: 'sinus_congestion',
    rulePackId: 'acute_sinusitis',
    answers: {
      orbitalSymptoms: 'no',
      severeSystemic: 'no',
      immunocompromised: 'no',
      purulentDischarge: 'yes',
      facialPain: 'yes',
      nasalObstruction: 'yes',
      fever: 'no',
      doubleSickening: 'no',
      durationDays: 5,
      recentAntibiotic: 'no',
      antibioticAllergy: 'no'
    }
  },
  {
    id: 'earache_delayed',
    label: 'Earache - Delayed antibiotic plan',
    patient: { age: 5, sex: 'male', pregnant: 'no', postcode: 'NE1 4LP' },
    complaintId: 'earache',
    rulePackId: 'earache_aom',
    answers: {
      mastoiditisSigns: 'no',
      facialParalysis: 'no',
      systemicallyUnwell: 'no',
      severeOtalgia: 'yes',
      otorrhoea: 'no',
      feverHigh: 'no',
      bilateral: 'yes',
      perforation: 'no',
      durationDays: 2,
      recurrentOtitis: 'no',
      immunocompromised: 'no',
      antibioticsLastMonth: 'no',
      antibioticAllergy: 'no'
    }
  },
  {
    id: 'impetigo_supply',
    label: 'Impetigo - Topical fusidic acid',
    patient: { age: 8, sex: 'female', pregnant: 'no', postcode: 'LE1 5YA' },
    complaintId: 'skin_infection',
    rulePackId: 'impetigo',
    answers: {
      systemicIllness: 'no',
      rapidSpread: 'no',
      periorbital: 'no',
      bullous: 'no',
      widespread: 'no',
      recurrent: 'no',
      mrsaRisk: 'no',
      durationDays: 3,
      immunocompromised: 'no',
      penicillinAllergy: 'no'
    }
  },
  {
    id: 'insect_bite_referral',
    label: 'Infected bite - Urgent referral',
    patient: { age: 54, sex: 'female', pregnant: 'no', postcode: 'EH2 3JG' },
    complaintId: 'skin_bite',
    rulePackId: 'infected_insect_bite',
    answers: {
      anaphylaxis: 'no',
      rapidSwelling: 'yes',
      systemicSymptoms: 'yes',
      erythemaExpanding: 'yes',
      purulence: 'no',
      lymphangitis: 'yes',
      lesionSizeCm: 18,
      durationDays: 1,
      immunocompromised: 'no',
      diabetes: 'no',
      antibioticAllergy: 'no'
    }
  },
  {
    id: 'shingles_supply',
    label: 'Shingles - Early antiviral supply',
    patient: { age: 62, sex: 'female', postcode: 'BS1 4ST' },
    complaintId: 'rash_pain',
    rulePackId: 'shingles',
    answers: {
      ophthalmicInvolvement: 'no',
      cranialNerve: 'no',
      immunocompromised: 'no',
      dermatomalRash: 'yes',
      pain: 'yes',
      newLesions: 'yes',
      durationHours: 48,
      severePain: 'yes',
      pregnancyConcern: 'no',
      antiviralContra: 'no'
    }
  },
  {
    id: 'otc_cold_relief',
    label: 'OTC - Cold relief supply',
    patient: { age: 34, sex: 'female', pregnant: 'no', postcode: 'M1 2AB' },
    complaintId: 'otc_cough_cold',
    rulePackId: 'otc_cough_cold',
    answers: {
      severeBreathlessness: 'no',
      chestPain: 'no',
      immunosuppressed: 'no',
      commonSymptoms: ['cough', 'nasal_congestion', 'sore_throat'],
      durationDays: 3,
      selfCareTried: 'simple',
      smoker: 'no',
      underlyingLungDisease: 'no'
    }
  },
  {
    id: 'otc_diarrhoea_supply',
    label: 'OTC - Diarrhoea rehydration',
    patient: { age: 38, sex: 'male', pregnant: 'no', postcode: 'NG1 4AA' },
    complaintId: 'otc_diarrhoea',
    rulePackId: 'otc_diarrhoea',
    answers: {
      bloodyStool: 'no',
      severeDehydration: 'no',
      immunocompromised: 'no',
      stoolFeatures: ['loose', 'watery', 'abdominal_pain'],
      durationDays: 2,
      episodesPerDay: 5,
      recentTravel: 'no',
      recentAntibiotic: 'no',
      frailtyRisk: 'no'
    }
  },
  {
    id: 'otc_constipation_supply',
    label: 'OTC - Macrogol plan',
    patient: { age: 46, sex: 'female', pregnant: 'no', postcode: 'S1 2NP' },
    complaintId: 'otc_constipation',
    rulePackId: 'otc_constipation',
    answers: {
      suddenOnset: 'no',
      rectalBleeding: 'no',
      unexplainedWeightLoss: 'no',
      associatedSymptoms: ['hard_stools', 'straining', 'bloating'],
      durationDays: 7,
      recentOpioid: 'no',
      dietaryChanges: 'low_fibre',
      activityLevel: 'reduced'
    }
  }
];

const PATIENT_FIELD_LABELS = {
  'patient.age': 'Age',
  'patient.sex': 'Sex',
  'patient.pregnant': 'Pregnancy status',
  'patient.postcode': 'Postcode'
};

const HELP_CONTENT = {
  'patient-age': {
    title: 'Patient age',
    body:
      'Age gates Pharmacy First eligibility, guides OTC dosing bands, and drives clarifier chips for paediatric safety checks.'
  },
  'patient-sex': {
    title: 'Recorded sex',
    body:
      'Sex at birth and gender markers influence rule-pack availability, red flag thresholds, and the consultation note summary. Select the patient preference if a binary option is not appropriate.'
  },
  'patient-pregnancy': {
    title: 'Pregnancy screening',
    body:
      'Pregnancy status routes certain pathways (for example UTI supply) to referral, adjusts safety-netting, and provides an auditable record for governance reviews.'
  },
  'patient-postcode': {
    title: 'Postcode usage',
    body:
      'Postcodes remain optional. They populate the documentation export for Pharmacy First reporting and let you confirm ICS coverage without storing identifiable data.'
  },
  complaint: {
    title: 'Presenting complaint',
    body:
      'Complaints act as the first filter for rule packs. Pick the symptom cluster that matches the patient narrative to unlock the relevant pathways.'
  },
  'rule-pack': {
    title: 'Rule pack chooser',
    body:
      'Rule packs bundle inclusion criteria, red flags, actions, and safety netting. Choose one after selecting the presenting complaint to run eligibility and recommendation logic.'
  },
  transcript: {
    title: 'Transcript quick start',
    body:
      'Use the built-in sample to preview how parser suggestions appear, then paste EPS exports or manual notes for live consultations. Read the <a href="docs/nlp-intake.md" target="_blank" rel="noopener">NLP intake guidance</a> for deeper authoring tips.'
  },
  'transcript-editor': {
    title: 'Editor tips',
    body:
      'Keep each speaker on a new line for clearer parsing. The parser ignores greetings, timestamps, and filler phrases while surfacing clinically relevant findings.'
  }
};

const transcriptSamples = {
  uti_sample: {
    label: 'UTI supply sample',
    text: [
      'Pharmacist: Thanks for waiting. What symptoms are you experiencing today?',
      'Patient: I have burning when I pass urine and I need to go more often since Monday.',
      'Pharmacist: Any fever, loin pain, or blood in the urine?',
      'Patient: No, it is just the stinging and needing to go.',
      'Pharmacist: Are you pregnant or is there any chance you could be?',
      'Patient: No chance, I am not pregnant.',
      'Pharmacist: Have you had a UTI treated in the last 3 months?',
      'Patient: No, this is the first time in a while.',
      'Pharmacist: Any kidney problems, diabetes, or catheter in place?',
      'Patient: None of those.',
      'Pharmacist: Do you have a fever or feel very unwell?',
      'Patient: I feel okay apart from the urinary symptoms.',
      'Pharmacist: Any vaginal discharge or concerns for sexually transmitted infection?',
      'Patient: No, nothing like that.',
      'Pharmacist: How old are you today?',
      'Patient: Twenty eight.',
      'Pharmacist: Great, we can supply nitrofurantoin today and I will go through the safety advice with you.'
    ].join('\n')
  }
};

const guidedTourSteps = [
  {
    selector: '#scenario-buttons',
    title: 'Scenario presets',
    body:
      'Use the ready-made scenarios to preload intake data and see how the decision engine responds to common presentations.'
  },
  {
    selector: '#transcript-quickstart',
    title: 'Transcript parsing helpers',
    body:
      'Load the example transcript or paste notes from practice to populate NLP suggestions and speed up data entry.'
  },
  {
    selector: '#decision-card',
    title: 'Decision support output',
    body:
      'Review the recommendation, action list, warnings, and documentation export before recording the consultation outcome.'
  }
];

const SUGGESTION_TARGET_LABELS = {
  patient: 'Patient detail',
  answer: 'Intake response'
};

const CONFIDENCE_CLASS_MAP = {
  confirmed: 'confirmed',
  'likely accurate': 'likely',
  'needs review': 'review',
  'low confidence': 'low'
};

const BULK_CONFIDENCE_THRESHOLD = 0.85;
const BULK_CONFIDENCE_PERCENT = Math.round(BULK_CONFIDENCE_THRESHOLD * 100);

const QUESTION_INDEX = new Map();

function rebuildQuestionIndex(packs = getRulePacks()) {
  QUESTION_INDEX.clear();
  for (const pack of packs || []) {
    for (const section of pack.sections || []) {
      for (const question of section.questions || []) {
        if (!QUESTION_INDEX.has(question.id)) {
          QUESTION_INDEX.set(question.id, question);
        }
      }
    }
  }
}

subscribeToRulePacks((packs) => {
  rebuildQuestionIndex(packs);
});

let activeHelpPopover = null;
let activeHelpTrigger = null;
let helpPopoverId = 0;

const dom = {};
const IDLE_TRANSCRIPT_STATUS = 'Parser idle.';
let lastOutcome = null;

const tourState = {
  overlay: null,
  content: null,
  progress: null,
  title: null,
  body: null,
  nextButton: null,
  prevButton: null,
  closeButton: null,
  triggerButton: null,
  index: 0,
  active: false,
  currentHighlight: null
};

function qs(selector) {
  const element = document.querySelector(selector);
  if (!element) {
    throw new Error(`Missing expected element: ${selector}`);
  }
  return element;
}

function createOption(value, label) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  return option;
}

function positionHelpPopover(popover, trigger) {
  const triggerRect = trigger.getBoundingClientRect();
  const scrollY = window.scrollY || document.documentElement.scrollTop;
  const scrollX = window.scrollX || document.documentElement.scrollLeft;
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = document.documentElement.clientHeight;
  let top = triggerRect.bottom + scrollY + 8;
  let left = triggerRect.left + scrollX;
  const width = popover.offsetWidth;
  const height = popover.offsetHeight;

  if (left + width + 16 > scrollX + viewportWidth) {
    left = Math.max(scrollX + 16, scrollX + viewportWidth - width - 16);
  }

  if (top + height + 16 > scrollY + viewportHeight) {
    top = Math.max(scrollY + 16, triggerRect.top + scrollY - height - 12);
  }

  popover.style.top = `${top}px`;
  popover.style.left = `${left}px`;
}

function closeHelpPopover() {
  if (!activeHelpPopover) {
    return;
  }
  if (activeHelpPopover.parentNode) {
    activeHelpPopover.parentNode.removeChild(activeHelpPopover);
  }
  if (activeHelpTrigger) {
    activeHelpTrigger.setAttribute('aria-expanded', 'false');
    activeHelpTrigger.removeAttribute('aria-controls');
  }
  document.removeEventListener('click', handleHelpDocumentClick, true);
  document.removeEventListener('keydown', handleHelpKeydown, true);
  window.removeEventListener('resize', handleHelpReposition);
  window.removeEventListener('scroll', handleHelpReposition, true);
  activeHelpPopover = null;
  activeHelpTrigger = null;
}

function handleHelpDocumentClick(event) {
  if (!activeHelpPopover || !activeHelpTrigger) {
    return;
  }
  if (activeHelpPopover.contains(event.target) || activeHelpTrigger.contains(event.target)) {
    return;
  }
  closeHelpPopover();
}

function handleHelpKeydown(event) {
  if (event.key === 'Escape') {
    event.stopPropagation();
    const trigger = activeHelpTrigger;
    closeHelpPopover();
    if (trigger) {
      trigger.focus({ preventScroll: true });
    }
  }
}

function handleHelpReposition() {
  if (activeHelpPopover && activeHelpTrigger) {
    positionHelpPopover(activeHelpPopover, activeHelpTrigger);
  }
}

function openHelpPopover(trigger) {
  const key = trigger.dataset.helpKey;
  const content = HELP_CONTENT[key];
  if (!content) {
    return;
  }
  if (activeHelpTrigger === trigger) {
    closeHelpPopover();
    return;
  }
  closeHelpPopover();

  const popover = document.createElement('div');
  popover.className = 'help-popover';
  popover.setAttribute('role', 'dialog');
  popover.setAttribute('aria-modal', 'false');

  const title = document.createElement('h3');
  title.className = 'help-popover__title';
  title.textContent = content.title;
  popover.appendChild(title);

  const body = document.createElement('p');
  body.className = 'help-popover__body';
  body.innerHTML = content.body;
  popover.appendChild(body);

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'help-popover__close';
  closeButton.textContent = 'Close';
  closeButton.addEventListener('click', () => {
    closeHelpPopover();
    trigger.focus({ preventScroll: true });
  });
  popover.appendChild(closeButton);

  document.body.appendChild(popover);
  positionHelpPopover(popover, trigger);

  helpPopoverId += 1;
  const popoverId = `help-popover-${helpPopoverId}`;
  popover.id = popoverId;
  trigger.setAttribute('aria-controls', popoverId);
  trigger.setAttribute('aria-expanded', 'true');

  activeHelpPopover = popover;
  activeHelpTrigger = trigger;

  document.addEventListener('click', handleHelpDocumentClick, true);
  document.addEventListener('keydown', handleHelpKeydown, true);
  window.addEventListener('resize', handleHelpReposition);
  window.addEventListener('scroll', handleHelpReposition, true);

  closeButton.focus({ preventScroll: true });
}

function bindHelpTriggers() {
  const triggers = document.querySelectorAll('.help-trigger[data-help-key]');
  triggers.forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      openHelpPopover(trigger);
    });
  });
}

function normalizeSuggestionString(value) {
  const trimmed = String(value || '').trim();
  if (trimmed.length === 0) {
    return '';
  }
  if (/^[A-Z0-9\s]+$/.test(trimmed)) {
    return trimmed;
  }
  const normalised = trimmed.replace(/_/g, ' ');
  return normalised.charAt(0).toUpperCase() + normalised.slice(1);
}

function formatSuggestionValue(value, suggestion) {
  if (value === null || value === undefined) {
    return '';
  }
  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeSuggestionString(entry))
      .filter((entry) => entry.length > 0)
      .join(', ');
  }
  if (typeof value === 'number') {
    const question = suggestion.target === 'answer' ? QUESTION_INDEX.get(suggestion.field) : null;
    if (question?.type === 'number' && /day/i.test(question.id || '')) {
      const suffix = value === 1 ? ' day' : ' days';
      return `${value}${suffix}`;
    }
    return String(value);
  }
  if (typeof value === 'string') {
    return normalizeSuggestionString(value);
  }
  return String(value);
}

function getSuggestionLabel(state, suggestion) {
  if (suggestion.target === 'patient') {
    const key = `patient.${suggestion.field}`;
    return PATIENT_FIELD_LABELS[key] || suggestion.field;
  }
  if (suggestion.target === 'answer') {
    const cached = QUESTION_INDEX.get(suggestion.field);
    if (cached) {
      return cached.label;
    }
    const pack = state.rulePackId ? getRulePackById(state.rulePackId) : null;
    if (pack) {
      for (const section of pack.sections || []) {
        for (const question of section.questions || []) {
          if (question.id === suggestion.field) {
            return question.label;
          }
        }
      }
    }
  }
  return suggestion.field;
}

function describeSuggestionStatus(status) {
  switch (status) {
    case 'applied':
      return 'Applied to intake';
    case 'dismissed':
      return 'Dismissed';
    default:
      return 'Detected from transcript';
  }
}

function getConfidenceDetails(suggestion) {
  const label = describeSuggestionConfidence(suggestion?.confidence);
  const className = CONFIDENCE_CLASS_MAP[label] || 'review';
  const percent = Math.max(0, Math.min(100, Math.round((suggestion?.confidence ?? 0) * 100)));
  return { label, className, percent };
}

function ensureSuggestionPanel() {
  if (dom.suggestionPanel) {
    return;
  }
  const editor = dom.transcriptTextarea?.closest('.transcript-editor');
  if (!editor) {
    return;
  }

  const panel = document.createElement('div');
  panel.id = 'transcript-suggestions';
  panel.className = 'transcript-suggestions stack';

  const header = document.createElement('div');
  header.className = 'transcript-suggestions__header';

  const titleGroup = document.createElement('div');
  titleGroup.className = 'transcript-suggestions__title';

  const heading = document.createElement('h3');
  heading.textContent = 'Suggested intake values';
  titleGroup.appendChild(heading);

  const blurb = document.createElement('p');
  blurb.className = 'muted transcript-suggestions__blurb';
  blurb.textContent = 'Review and apply values extracted from the transcript parser.';
  titleGroup.appendChild(blurb);

  header.appendChild(titleGroup);

  const applyAllButton = document.createElement('button');
  applyAllButton.type = 'button';
  applyAllButton.className = 'suggestion-bulk-action';
  applyAllButton.textContent = `Apply all confident values (≥${BULK_CONFIDENCE_PERCENT}%)`;
  applyAllButton.disabled = true;
  applyAllButton.setAttribute('aria-disabled', 'true');
  applyAllButton.addEventListener('click', () => {
    if (applyAllButton.disabled) {
      return;
    }
    applyConfidentNlpSuggestions(BULK_CONFIDENCE_THRESHOLD);
  });
  header.appendChild(applyAllButton);

  panel.appendChild(header);

  const list = document.createElement('div');
  list.className = 'transcript-suggestions__list';
  panel.appendChild(list);

  const empty = document.createElement('p');
  empty.className = 'transcript-suggestions__empty muted';
  empty.textContent = 'No transcript suggestions yet. Paste a consultation to generate candidates.';
  panel.appendChild(empty);

  editor.insertAdjacentElement('afterend', panel);

  dom.suggestionPanel = panel;
  dom.suggestionList = list;
  dom.suggestionEmpty = empty;
  dom.applyConfidentButton = applyAllButton;
}

function renderSuggestionPanel(state) {
  ensureSuggestionPanel();
  if (!dom.suggestionPanel) {
    return;
  }
  const suggestions = state.nlpSuggestions || {};
  const order = state.nlpSuggestionOrder && state.nlpSuggestionOrder.length > 0
    ? state.nlpSuggestionOrder
    : Object.keys(suggestions);

  dom.suggestionList.innerHTML = '';

  let confidentPending = 0;
  for (const fieldId of order) {
    const suggestion = suggestions[fieldId];
    if (!suggestion) {
      continue;
    }

    const card = document.createElement('article');
    card.className = 'suggestion-card';
    card.dataset.status = suggestion.status || 'pending';
    card.dataset.fieldId = fieldId;
    card.dataset.target = suggestion.target;

    const header = document.createElement('div');
    header.className = 'suggestion-card__header';

    const label = document.createElement('div');
    label.className = 'suggestion-card__label-group';

    const name = document.createElement('span');
    name.className = 'suggestion-card__label';
    name.textContent = getSuggestionLabel(state, suggestion);
    label.appendChild(name);

    const meta = document.createElement('span');
    meta.className = 'suggestion-card__meta muted';
    meta.textContent = SUGGESTION_TARGET_LABELS[suggestion.target] || 'Suggested value';
    label.appendChild(meta);

    header.appendChild(label);

    const confidence = getConfidenceDetails(suggestion);
    const badge = document.createElement('span');
    badge.className = `chip suggestion-confidence suggestion-confidence--${confidence.className}`;
    badge.textContent = `${confidence.label} · ${confidence.percent}%`;
    header.appendChild(badge);

    card.appendChild(header);

    const value = document.createElement('div');
    value.className = 'suggestion-card__value';
    value.textContent = formatSuggestionValue(suggestion.value, suggestion);
    card.appendChild(value);

    const status = document.createElement('span');
    status.className = 'suggestion-card__status muted';
    status.textContent = describeSuggestionStatus(suggestion.status);
    card.appendChild(status);

    const actions = document.createElement('div');
    actions.className = 'suggestion-card__actions';

    const applyButton = document.createElement('button');
    applyButton.type = 'button';
    applyButton.className = 'suggestion-action suggestion-action--apply';
    const isApplied = suggestion.status === 'applied';
    const isDismissed = suggestion.status === 'dismissed';
    applyButton.textContent = isApplied ? 'Applied' : 'Apply';
    applyButton.disabled = isApplied || isDismissed;
    if (isDismissed) {
      applyButton.title = 'Suggestion dismissed';
    }
    applyButton.addEventListener('click', () => {
      applyNlpSuggestion(fieldId);
    });
    actions.appendChild(applyButton);

    const ignoreButton = document.createElement('button');
    ignoreButton.type = 'button';
    ignoreButton.className = 'suggestion-action suggestion-action--dismiss';
    ignoreButton.textContent = suggestion.status === 'dismissed' ? 'Ignored' : 'Ignore';
    ignoreButton.disabled = suggestion.status === 'dismissed' || suggestion.status === 'applied';
    if (suggestion.status === 'applied') {
      ignoreButton.title = 'Value already applied';
    }
    ignoreButton.addEventListener('click', () => {
      dismissNlpSuggestion(fieldId);
    });
    actions.appendChild(ignoreButton);

    card.appendChild(actions);

    if (suggestion.status === 'pending' && suggestion.confidence >= BULK_CONFIDENCE_THRESHOLD) {
      confidentPending += 1;
    }

    dom.suggestionList.appendChild(card);
  }

  const isEmpty = dom.suggestionList.childElementCount === 0;
  dom.suggestionEmpty.hidden = !isEmpty;
  dom.suggestionList.hidden = isEmpty;

  if (dom.applyConfidentButton) {
    dom.applyConfidentButton.disabled = confidentPending === 0;
    dom.applyConfidentButton.setAttribute('aria-disabled', dom.applyConfidentButton.disabled ? 'true' : 'false');
  }
}

function buildBooleanQuestion(question, value) {
  const wrapper = document.createElement('div');
  wrapper.className = 'question';
  wrapper.dataset.questionId = question.id;

  const label = document.createElement('span');
  label.className = 'question__label';
  label.textContent = question.label;
  wrapper.appendChild(label);

  const control = document.createElement('div');
  control.className = 'choice-group';

  const options = [
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' }
  ];
  if (!question.required) {
    options.push({ value: 'unknown', label: 'Unknown' });
  }

  for (const option of options) {
    const id = `${question.id}-${option.value}`;
    const choice = document.createElement('label');
    choice.className = 'choice-pill';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = question.id;
    input.value = option.value;
    input.id = id;
    if (value === option.value) {
      input.checked = true;
    }
    input.addEventListener('change', () => {
      setAnswer(question.id, input.value);
    });
    const span = document.createElement('span');
    span.textContent = option.label;
    choice.appendChild(input);
    choice.appendChild(span);
    control.appendChild(choice);
  }

  wrapper.appendChild(control);

  if (question.helper) {
    const helper = document.createElement('p');
    helper.className = 'question__helper';
    helper.textContent = question.helper;
    wrapper.appendChild(helper);
  }

  return wrapper;
}

function buildNumberQuestion(question, value) {
  const wrapper = document.createElement('div');
  wrapper.className = 'question';
  wrapper.dataset.questionId = question.id;

  const label = document.createElement('label');
  label.className = 'question__label';
  label.setAttribute('for', question.id);
  label.textContent = question.label;

  const input = document.createElement('input');
  input.type = 'number';
  input.id = question.id;
  input.className = 'question__input';
  if (typeof question.min === 'number') {
    input.min = String(question.min);
  }
  if (typeof question.max === 'number') {
    input.max = String(question.max);
  }
  input.value = value ?? '';
  input.addEventListener('input', () => {
    const val = input.value === '' ? '' : Number(input.value);
    setAnswer(question.id, input.value === '' ? '' : val);
  });

  wrapper.appendChild(label);
  wrapper.appendChild(input);

  if (question.helper) {
    const helper = document.createElement('p');
    helper.className = 'question__helper';
    helper.textContent = question.helper;
    wrapper.appendChild(helper);
  }

  return wrapper;
}

function buildSelectQuestion(question, value) {
  const wrapper = document.createElement('div');
  wrapper.className = 'question';
  wrapper.dataset.questionId = question.id;

  const label = document.createElement('label');
  label.className = 'question__label';
  label.setAttribute('for', question.id);
  label.textContent = question.label;

  const select = document.createElement('select');
  select.id = question.id;
  select.className = 'question__input';
  select.appendChild(createOption('', 'Select'));
  for (const option of question.options || []) {
    select.appendChild(createOption(option.value, option.label));
  }
  select.value = value ?? '';
  select.addEventListener('change', () => {
    setAnswer(question.id, select.value);
  });

  wrapper.appendChild(label);
  wrapper.appendChild(select);

  if (question.helper) {
    const helper = document.createElement('p');
    helper.className = 'question__helper';
    helper.textContent = question.helper;
    wrapper.appendChild(helper);
  }

  return wrapper;
}

function buildMultiSelectQuestion(question, value) {
  const wrapper = document.createElement('div');
  wrapper.className = 'question';
  wrapper.dataset.questionId = question.id;

  const label = document.createElement('span');
  label.className = 'question__label';
  label.textContent = question.label;
  wrapper.appendChild(label);

  const control = document.createElement('div');
  control.className = 'choice-group';

  const selected = new Set(
    Array.isArray(value)
      ? value.map((item) => String(item))
      : value
        ? [String(value)]
        : []
  );

  for (const option of question.options || []) {
    const choice = document.createElement('label');
    choice.className = 'choice-pill';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = question.id;
    input.value = option.value;
    if (selected.has(option.value)) {
      input.checked = true;
    }
    input.addEventListener('change', () => {
      const values = Array.from(control.querySelectorAll('input[type="checkbox"]'))
        .filter((node) => node.checked)
        .map((node) => node.value);
      setAnswer(question.id, values);
    });
    const span = document.createElement('span');
    span.textContent = option.label;
    choice.appendChild(input);
    choice.appendChild(span);
    control.appendChild(choice);
  }

  wrapper.appendChild(control);

  if (question.helper) {
    const helper = document.createElement('p');
    helper.className = 'question__helper';
    helper.textContent = question.helper;
    wrapper.appendChild(helper);
  }

  return wrapper;
}

function renderQuestions(state) {
  const container = dom.intakeSections;
  container.innerHTML = '';
  if (!state.rulePackId) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'Select a pathway to display intake questions.';
    container.appendChild(empty);
    return;
  }

  const rulePack = getRulePackById(state.rulePackId);
  if (!rulePack) {
    return;
  }

  for (const section of rulePack.sections) {
    const sectionEl = document.createElement('section');
    sectionEl.className = 'intake-section';

    const heading = document.createElement('h3');
    heading.textContent = section.title;
    sectionEl.appendChild(heading);

    const questionsContainer = document.createElement('div');
    questionsContainer.className = 'intake-section__questions';

    for (const question of section.questions) {
      const currentValue = state.answers[question.id];
      let rendered;
      switch (question.type) {
        case 'boolean':
          rendered = buildBooleanQuestion(question, currentValue ?? '');
          break;
        case 'number':
          rendered = buildNumberQuestion(question, currentValue ?? '');
          break;
        case 'select':
          rendered = buildSelectQuestion(question, currentValue ?? '');
          break;
        case 'multi_select':
          rendered = buildMultiSelectQuestion(question, currentValue ?? []);
          break;
        default:
          rendered = document.createElement('div');
          rendered.textContent = `Unsupported question type: ${question.type}`;
      }
      questionsContainer.appendChild(rendered);
    }

    sectionEl.appendChild(questionsContainer);
    container.appendChild(sectionEl);
  }
}

function renderPatientSection(state) {
  dom.patientAge.value = state.patient.age ?? '';
  dom.patientSex.value = state.patient.sex ?? '';
  dom.patientPregnant.value = state.patient.pregnant ?? '';
  dom.patientPostcode.value = state.patient.postcode ?? '';

  const missingIds = new Set((state.missing || []).map((item) => item.id));
  dom.patientAge.closest('.patient-field').classList.toggle('is-missing', missingIds.has('patient.age'));
  dom.patientSex.closest('.patient-field').classList.toggle('is-missing', missingIds.has('patient.sex'));
  dom.patientPregnant.closest('.patient-field').classList.toggle('is-missing', missingIds.has('patient.pregnant'));
}

function renderComplaints(state) {
  const select = dom.complaintSelect;
  select.innerHTML = '';
  select.appendChild(createOption('', 'Select presenting complaint'));
  for (const option of state.complaintOptions || []) {
    select.appendChild(createOption(option.id, option.label));
  }
  select.value = state.complaintId ?? '';
}

function renderRulePackSelect(state) {
  const select = dom.rulePackSelect;
  select.innerHTML = '';
  select.appendChild(createOption('', state.complaintId ? 'Choose pathway' : 'Select presenting complaint first'));
  if (state.complaintId) {
    const packs = getRulePacksForComplaint(state.complaintId);
    for (const pack of packs) {
      select.appendChild(createOption(pack.id, pack.name));
    }
  }
  select.value = state.rulePackId ?? '';
}

function renderMissingChips(state) {
  const container = dom.missingChips;
  container.innerHTML = '';
  const missing = state.missing || [];
  if (missing.length === 0) {
    return;
  }
  for (const item of missing) {
    const chip = document.createElement('span');
    chip.className = 'chip chip--warning';
    chip.textContent = item.label;
    container.appendChild(chip);
  }
}

function renderRulePackDetails(state) {
  const details = dom.rulePackDetails;
  details.innerHTML = '';
  if (!state.rulePackId) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'Choose a pathway to view governance and inclusion criteria.';
    details.appendChild(empty);
    dom.rulePackMeta.textContent = 'No pathway selected';
    return;
  }

  const pack = getRulePackById(state.rulePackId);
  if (!pack) {
    return;
  }

  dom.rulePackMeta.textContent = `Version ${pack.version} · Effective ${pack.effectiveFrom} · Reviewed ${pack.lastReviewed}`;

  const desc = document.createElement('p');
  desc.textContent = pack.description;
  details.appendChild(desc);

  const inclusionTitle = document.createElement('h3');
  inclusionTitle.textContent = 'Inclusions';
  details.appendChild(inclusionTitle);

  const inclusionList = document.createElement('ul');
  inclusionList.className = 'list';
  for (const item of pack.inclusion) {
    const li = document.createElement('li');
    li.textContent = item;
    inclusionList.appendChild(li);
  }
  details.appendChild(inclusionList);

  const exclusionTitle = document.createElement('h3');
  exclusionTitle.textContent = 'Exclusions';
  details.appendChild(exclusionTitle);

  const exclusionList = document.createElement('ul');
  exclusionList.className = 'list';
  for (const item of pack.exclusion) {
    const li = document.createElement('li');
    li.textContent = item;
    exclusionList.appendChild(li);
  }
  details.appendChild(exclusionList);

  const safetyTitle = document.createElement('h3');
  safetyTitle.textContent = 'Safety netting';
  details.appendChild(safetyTitle);

  const safetyList = document.createElement('ul');
  safetyList.className = 'list';
  for (const item of pack.safetyNetting) {
    const li = document.createElement('li');
    li.textContent = item;
    safetyList.appendChild(li);
  }
  details.appendChild(safetyList);

  const structureTitle = document.createElement('h3');
  structureTitle.textContent = 'Intake structure';
  details.appendChild(structureTitle);

  const structureList = document.createElement('ul');
  structureList.className = 'list';
  for (const section of pack.sections || []) {
    const li = document.createElement('li');
    const type = section.type || 'questionnaire';
    const questions = section.questions || [];
    const questionTypes = Array.from(new Set(questions.map((question) => question.type || 'unknown')));
    const questionLabel = questions.length === 1 ? 'question' : 'questions';
    const typeLabel = type.replace(/_/g, ' ');
    const typeDisplay = typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1);
    li.textContent = `${section.title} · ${typeDisplay} · ${questions.length} ${questionLabel}`;
    if (questionTypes.length > 0) {
      const typeSummary = questionTypes
        .map((entry) => {
          const normalized = String(entry || '').replace(/_/g, ' ');
          return normalized.charAt(0).toUpperCase() + normalized.slice(1);
        })
        .join(', ');
      li.textContent += ` (${typeSummary})`;
    }
    structureList.appendChild(li);
  }
  details.appendChild(structureList);
}

function renderDecision(state) {
  const evaluation = state.evaluation;
  const statusEl = dom.decisionStatus;
  const summaryEl = dom.decisionSummary;
  const traceList = dom.decisionTrace;
  const actionsList = dom.actionsList;
  const warningsList = dom.warningsList;
  const safetyList = dom.safetyList;
  const docOutput = dom.documentationOutput;
  const srStatus = dom.srStatus;

  traceList.innerHTML = '';
  actionsList.innerHTML = '';
  warningsList.innerHTML = '';
  safetyList.innerHTML = '';

  const outcome = evaluation?.outcome || 'incomplete';
  dom.decisionCard.dataset.outcome = outcome;
  statusEl.textContent = evaluation?.headline || 'Awaiting intake';
  summaryEl.textContent = evaluation?.summary || '';

  if (evaluation?.trace) {
    for (const item of evaluation.trace) {
      const li = document.createElement('li');
      li.className = `trace-item trace-item--${item.status}`;
      li.textContent = item.label;
      traceList.appendChild(li);
    }
  }

  if (evaluation?.actions) {
    for (const action of evaluation.actions) {
      const li = document.createElement('li');
      li.textContent = action;
      actionsList.appendChild(li);
    }
  }

  if (evaluation?.warnings && evaluation.warnings.length > 0) {
    warningsList.parentElement.classList.remove('is-hidden');
    for (const warning of evaluation.warnings) {
      const li = document.createElement('li');
      li.textContent = warning;
      warningsList.appendChild(li);
    }
  } else {
    warningsList.parentElement.classList.add('is-hidden');
  }

  if (evaluation?.safetyNet) {
    for (const item of evaluation.safetyNet) {
      const li = document.createElement('li');
      li.textContent = item;
      safetyList.appendChild(li);
    }
  }

  if (evaluation?.documentation) {
    docOutput.value = evaluation.documentation;
  } else {
    docOutput.value = '';
  }

  if (evaluation?.governance) {
    dom.governanceSummary.textContent = `Rule pack version ${evaluation.governance.version} · Effective ${evaluation.governance.effectiveFrom} · Reviewed ${evaluation.governance.lastReviewed}`;
  } else {
    dom.governanceSummary.textContent = '';
  }

  if (lastOutcome && lastOutcome !== outcome) {
    srStatus.textContent = `Decision updated: ${statusEl.textContent}`;
  }
  lastOutcome = outcome;
}

function renderMissingHighlight(state) {
  const missingIds = new Set((state.missing || []).map((item) => item.id));
  const questionNodes = dom.intakeSections.querySelectorAll('.question');
  for (const node of questionNodes) {
    const id = node.dataset.questionId;
    if (!id) {
      continue;
    }
    node.classList.toggle('is-missing', missingIds.has(id));
  }
}

function renderSuggestionHighlights(state) {
  const suggestions = state.nlpSuggestions || {};
  const patientWrappers = {
    'patient.age': dom.patientAge?.closest('.patient-field'),
    'patient.sex': dom.patientSex?.closest('.patient-field'),
    'patient.pregnant': dom.patientPregnant?.closest('.patient-field'),
    'patient.postcode': dom.patientPostcode?.closest('.patient-field')
  };

  for (const [fieldId, element] of Object.entries(patientWrappers)) {
    if (!element) {
      continue;
    }
    const suggestion = suggestions[fieldId];
    if (suggestion) {
      const status = suggestion.status || 'pending';
      element.dataset.nlpStatus = status;
    } else {
      element.removeAttribute('data-nlp-status');
    }
  }

  const questionNodes = dom.intakeSections.querySelectorAll('.question');
  for (const node of questionNodes) {
    const questionId = node.dataset.questionId;
    if (!questionId) {
      node.removeAttribute('data-nlp-status');
      continue;
    }
    const suggestion = suggestions[questionId];
    if (suggestion) {
      node.dataset.nlpStatus = suggestion.status || 'pending';
    } else {
      node.removeAttribute('data-nlp-status');
    }
  }
}

function bindPatientEvents() {
  dom.patientAge.addEventListener('input', (event) => {
    const value = event.target.value;
    updatePatientField('age', value === '' ? '' : Number(value));
  });
  dom.patientSex.addEventListener('change', (event) => {
    updatePatientField('sex', event.target.value);
  });
  dom.patientPregnant.addEventListener('change', (event) => {
    updatePatientField('pregnant', event.target.value);
  });
  dom.patientPostcode.addEventListener('input', (event) => {
    updatePatientField('postcode', event.target.value.toUpperCase());
  });
}

function bindComplaintEvents() {
  dom.complaintSelect.addEventListener('change', (event) => {
    setComplaint(event.target.value);
  });

  dom.rulePackSelect.addEventListener('change', (event) => {
    setRulePack(event.target.value);
  });
}

function bindScenarioButtons() {
  for (const scenario of scenarioPresets) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip chip--ghost';
    button.textContent = scenario.label;
    button.addEventListener('click', () => {
      loadScenario(scenario);
    });
    dom.scenarioContainer.appendChild(button);
  }

  dom.resetButton.addEventListener('click', () => {
    resetIntake();
  });
}

function bindCopyButton() {
  const original = dom.copyButton.textContent;
  dom.copyButton.addEventListener('click', async () => {
    const text = dom.documentationOutput.value;
    if (!text) {
      return;
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        dom.copyButton.dataset.state = 'copied';
        dom.copyButton.textContent = 'Copied';
        setTimeout(() => {
          dom.copyButton.dataset.state = '';
          dom.copyButton.textContent = original;
        }, 2000);
      } else {
        dom.documentationOutput.select();
        document.execCommand('copy');
      }
    } catch (error) {
      console.error('Copy failed', error);
    }
  });
}

function bindTranscriptControls() {
  dom.transcriptParseButton.addEventListener('click', () => {
    dom.transcriptStatus.textContent = 'Parsing requested. Awaiting response.';
    dom.transcriptFeedback.textContent = '';
    dom.srStatus.textContent = 'Transcript parsing requested.';
    const event = new CustomEvent('otcflow:transcript:parse', {
      detail: {
        text: dom.transcriptTextarea.value,
        statusElement: dom.transcriptStatus,
        feedbackElement: dom.transcriptFeedback
      }
    });
    document.dispatchEvent(event);
  });

  dom.transcriptClearButton.addEventListener('click', () => {
    dom.transcriptTextarea.value = '';
    dom.transcriptTextarea.focus();
    dom.transcriptStatus.textContent = IDLE_TRANSCRIPT_STATUS;
    dom.transcriptFeedback.textContent = '';
    dom.srStatus.textContent = 'Transcript cleared.';
    const event = new CustomEvent('otcflow:transcript:clear');
    document.dispatchEvent(event);
  });
}

function bindTranscriptSamples() {
  if (!dom.transcriptQuickstart) {
    return;
  }
  dom.transcriptQuickstart.addEventListener('click', async (event) => {
    const button = event.target.closest('.transcript-sample');
    if (!button) {
      return;
    }
    const sampleId = button.dataset.sampleId;
    const action = button.dataset.sampleAction;
    if (!sampleId || !action) {
      return;
    }
    const sample = transcriptSamples[sampleId];
    if (!sample) {
      return;
    }

    if (action === 'load') {
      dom.transcriptTextarea.value = sample.text;
      dom.transcriptTextarea.focus();
      dom.transcriptStatus.textContent = 'Sample transcript loaded. Parse to generate suggestions.';
      dom.transcriptFeedback.textContent = '';
      dom.srStatus.textContent = 'Sample transcript inserted into the editor.';
      return;
    }

    if (action === 'copy') {
      const original = button.textContent;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(sample.text);
        } else {
          const temp = document.createElement('textarea');
          temp.value = sample.text;
          temp.setAttribute('readonly', 'true');
          temp.style.position = 'absolute';
          temp.style.left = '-9999px';
          document.body.appendChild(temp);
          temp.select();
          document.execCommand('copy');
          document.body.removeChild(temp);
        }
        button.textContent = 'Copied';
        dom.srStatus.textContent = 'Sample transcript copied to clipboard.';
        setTimeout(() => {
          button.textContent = original;
        }, 2000);
      } catch (error) {
        console.error('Sample copy failed', error);
        dom.srStatus.textContent = 'Clipboard copy failed. Please copy manually.';
      }
    }
  });
}

function highlightTourTarget(element) {
  if (tourState.currentHighlight && tourState.currentHighlight !== element) {
    tourState.currentHighlight.classList.remove('tour-highlight');
  }
  if (!element) {
    tourState.currentHighlight = null;
    return;
  }
  tourState.currentHighlight = element;
  element.classList.add('tour-highlight');
  element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
}

function updateGuidedTourStep() {
  if (!tourState.overlay) {
    return;
  }
  const step = guidedTourSteps[tourState.index];
  if (!step) {
    endGuidedTour();
    return;
  }
  let target = null;
  if (step.selector) {
    target = document.querySelector(step.selector);
  }
  if (!target) {
    if (tourState.index < guidedTourSteps.length - 1) {
      tourState.index += 1;
      updateGuidedTourStep();
    } else {
      endGuidedTour();
    }
    return;
  }

  highlightTourTarget(target);

  tourState.progress.textContent = `Step ${tourState.index + 1} of ${guidedTourSteps.length}`;
  tourState.title.textContent = step.title;
  tourState.body.textContent = step.body;
  tourState.prevButton.disabled = tourState.index === 0;
  tourState.nextButton.textContent = tourState.index === guidedTourSteps.length - 1 ? 'Finish' : 'Next';
}

function endGuidedTour() {
  if (!tourState.active) {
    return;
  }
  if (tourState.currentHighlight) {
    tourState.currentHighlight.classList.remove('tour-highlight');
    tourState.currentHighlight = null;
  }
  if (tourState.overlay) {
    tourState.overlay.classList.remove('is-active');
    tourState.overlay.setAttribute('aria-hidden', 'true');
  }
  document.body.classList.remove('is-tour-active');
  tourState.active = false;
  document.removeEventListener('keydown', handleTourKeydown, true);
  if (tourState.triggerButton) {
    tourState.triggerButton.focus({ preventScroll: true });
  }
}

function advanceGuidedTour(offset) {
  if (!tourState.active) {
    return;
  }
  const nextIndex = tourState.index + offset;
  if (nextIndex < 0) {
    return;
  }
  if (nextIndex >= guidedTourSteps.length) {
    endGuidedTour();
    return;
  }
  tourState.index = nextIndex;
  updateGuidedTourStep();
}

function handleTourKeydown(event) {
  if (!tourState.active) {
    return;
  }
  if (event.key === 'Escape') {
    event.preventDefault();
    endGuidedTour();
    return;
  }
  if (event.key === 'ArrowRight') {
    event.preventDefault();
    advanceGuidedTour(1);
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault();
    advanceGuidedTour(-1);
  }
}

function startGuidedTour() {
  if (!tourState.overlay || tourState.active) {
    return;
  }
  closeHelpPopover();
  tourState.index = 0;
  tourState.active = true;
  tourState.overlay.classList.add('is-active');
  tourState.overlay.setAttribute('aria-hidden', 'false');
  document.body.classList.add('is-tour-active');
  updateGuidedTourStep();
  requestAnimationFrame(() => {
    if (tourState.content) {
      tourState.content.focus({ preventScroll: true });
    }
  });
  document.addEventListener('keydown', handleTourKeydown, true);
}

function setupGuidedTour() {
  const trigger = dom.tourStartButton;
  if (!trigger || tourState.overlay) {
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'guided-overlay';
  overlay.setAttribute('aria-hidden', 'true');

  const backdrop = document.createElement('div');
  backdrop.className = 'guided-overlay__backdrop';
  overlay.appendChild(backdrop);

  const content = document.createElement('div');
  content.className = 'guided-overlay__content';
  content.setAttribute('role', 'dialog');
  content.setAttribute('aria-modal', 'true');
  content.setAttribute('aria-live', 'polite');
  content.tabIndex = -1;

  const progress = document.createElement('p');
  progress.className = 'guided-overlay__progress';
  content.appendChild(progress);

  const title = document.createElement('h3');
  title.className = 'guided-overlay__title';
  content.appendChild(title);

  const body = document.createElement('p');
  body.className = 'guided-overlay__body';
  content.appendChild(body);

  const actions = document.createElement('div');
  actions.className = 'guided-overlay__actions';

  const prevButton = document.createElement('button');
  prevButton.type = 'button';
  prevButton.className = 'btn btn--ghost';
  prevButton.textContent = 'Back';
  prevButton.disabled = true;
  actions.appendChild(prevButton);

  const nextButton = document.createElement('button');
  nextButton.type = 'button';
  nextButton.className = 'btn btn--primary';
  nextButton.textContent = 'Next';
  actions.appendChild(nextButton);

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'btn btn--secondary';
  closeButton.textContent = 'End tour';
  actions.appendChild(closeButton);

  content.appendChild(actions);
  overlay.appendChild(content);
  document.body.appendChild(overlay);

  tourState.overlay = overlay;
  tourState.content = content;
  tourState.progress = progress;
  tourState.title = title;
  tourState.body = body;
  tourState.nextButton = nextButton;
  tourState.prevButton = prevButton;
  tourState.closeButton = closeButton;
  tourState.triggerButton = trigger;

  trigger.addEventListener('click', (event) => {
    event.preventDefault();
    startGuidedTour();
  });

  nextButton.addEventListener('click', () => {
    if (tourState.index >= guidedTourSteps.length - 1) {
      endGuidedTour();
    } else {
      advanceGuidedTour(1);
    }
  });

  prevButton.addEventListener('click', () => {
    advanceGuidedTour(-1);
  });

  closeButton.addEventListener('click', () => {
    endGuidedTour();
  });

  backdrop.addEventListener('click', () => {
    endGuidedTour();
  });
}

export async function initializeUi() {
  dom.patientAge = qs('#patient-age');
  dom.patientSex = qs('#patient-sex');
  dom.patientPregnant = qs('#patient-pregnant');
  dom.patientPostcode = qs('#patient-postcode');
  dom.complaintSelect = qs('#complaint-select');
  dom.rulePackSelect = qs('#rule-pack-select');
  dom.intakeSections = qs('#intake-sections');
  dom.missingChips = qs('#missing-chips');
  dom.rulePackDetails = qs('#rule-pack-details');
  dom.rulePackMeta = qs('#rule-pack-meta');
  dom.decisionCard = qs('#decision-card');
  dom.decisionStatus = qs('#decision-status');
  dom.decisionSummary = qs('#decision-summary');
  dom.decisionTrace = qs('#decision-trace');
  dom.actionsList = qs('#actions-list');
  dom.warningsList = qs('#warnings-list');
  dom.safetyList = qs('#safety-net-list');
  dom.documentationOutput = qs('#documentation-output');
  dom.copyButton = qs('#copy-documentation');
  dom.transcriptTextarea = qs('#nlp-transcript');
  dom.transcriptParseButton = qs('#parse-transcript');
  dom.transcriptClearButton = qs('#clear-transcript');
  dom.transcriptStatus = qs('#transcript-status');
  dom.transcriptFeedback = qs('#transcript-feedback');
  dom.scenarioContainer = qs('#scenario-buttons');
  dom.resetButton = qs('#reset-intake');
  dom.governanceSummary = qs('#governance-summary');
  dom.srStatus = qs('#sr-status');
  dom.transcriptQuickstart = document.getElementById('transcript-quickstart');
  dom.tourStartButton = document.getElementById('start-guided-tour');

  bindPatientEvents();
  bindComplaintEvents();
  bindScenarioButtons();
  bindCopyButton();
  bindTranscriptControls();
  bindTranscriptSamples();
  bindHelpTriggers();
  setupGuidedTour();

  subscribe((state) => {
    renderComplaints(state);
    renderRulePackSelect(state);
    renderPatientSection(state);
    renderQuestions(state);
    renderMissingChips(state);
    renderMissingHighlight(state);
    renderSuggestionPanel(state);
    renderSuggestionHighlights(state);
    renderRulePackDetails(state);
    renderDecision(state);
  });

  await ensureRulePacksLoaded();
  rebuildQuestionIndex();
  renderComplaints(getState());
  renderRulePackSelect(getState());
  dom.transcriptStatus.textContent = IDLE_TRANSCRIPT_STATUS;

  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('sw.js');
    } catch (error) {
      console.error('Service worker registration failed', error);
    }
  }
}
