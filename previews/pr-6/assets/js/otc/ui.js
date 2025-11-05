import {
  subscribe,
  updatePatientField,
  setComplaint,
  setRulePack,
  setAnswer,
  loadScenario,
  getState,
  resetIntake
} from './store.js';
import { getRulePackById, getRulePacksForComplaint } from './rule-packs.js';

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
  }
];

const dom = {};
const IDLE_TRANSCRIPT_STATUS = 'Parser idle.';
let lastOutcome = null;

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
  dom.patientPregnant.value = state.patient.pregnant ?? 'unknown';
  dom.patientPostcode.value = state.patient.postcode ?? '';

  const missingIds = new Set((state.missing || []).map((item) => item.id));
  dom.patientAge.closest('.patient-field').classList.toggle('is-missing', missingIds.has('patient.age'));
  dom.patientSex.closest('.patient-field').classList.toggle('is-missing', missingIds.has('patient.sex'));
  dom.patientPregnant.closest('.patient-field').classList.toggle('is-missing', missingIds.has('patient.pregnant'));
}

function renderComplaints(state) {
  const select = dom.complaintSelect;
  if (select.dataset.initialised !== 'true') {
    select.innerHTML = '';
    select.appendChild(createOption('', 'Select presenting complaint'));
    for (const option of state.complaintOptions) {
      select.appendChild(createOption(option.id, option.label));
    }
    select.dataset.initialised = 'true';
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

export function initializeUi() {
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

  bindPatientEvents();
  bindComplaintEvents();
  bindScenarioButtons();
  bindCopyButton();
  bindTranscriptControls();

  subscribe((state) => {
    renderComplaints(state);
    renderRulePackSelect(state);
    renderPatientSection(state);
    renderQuestions(state);
    renderMissingChips(state);
    renderMissingHighlight(state);
    renderRulePackDetails(state);
    renderDecision(state);
  });

  // Render initial state
  renderComplaints(getState());
  dom.transcriptStatus.textContent = IDLE_TRANSCRIPT_STATUS;
}
