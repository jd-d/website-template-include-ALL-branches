import { createStore } from './store.js';
import { cloneAndSet } from './utils.js';
import { loadRulePackIndex, loadRulePack } from './rule-loader.js';
import { createInitialIntake, evaluatePack } from './engine.js';
import { initializeThemeControls } from './ui/theme.js';
import { renderPathwayList } from './ui/pathways.js';
import { renderIntakeForm } from './ui/intake.js';
import { renderResults } from './ui/results.js';
import { renderDocumentation } from './ui/documentation.js';

const store = createStore({
  pathways: [],
  selectedPackId: null,
  pack: null,
  intake: null,
  evaluation: {
    status: 'idle',
    clarifierPaths: []
  }
});

const pathwayContainer = document.getElementById('pathway-list');
const intakeContainer = document.getElementById('intake-container');
const resultsContainer = document.getElementById('results-container');
const documentationContainer = document.getElementById('documentation-container');
const timestampEl = document.getElementById('pack-timestamp');

let intakeView = null;

async function bootstrap() {
  initializeThemeControls();
  try {
    const pathways = await loadRulePackIndex();
    store.setState((state) => ({ ...state, pathways }));
    if (pathways.length > 0) {
      await selectPack(pathways[0]);
    } else {
      syncUI();
    }
  } catch (error) {
    displayError(resultsContainer, error);
    displayError(intakeContainer, error);
  }
  window.requestAnimationFrame(() => {
    document.body.classList.add('loaded');
  });
}

async function selectPack(metadata) {
  try {
    const pack = await loadRulePack(metadata);
    const intake = createInitialIntake(pack);
    const evaluation = evaluatePack(pack, intake);
    const pathways = store.getState().pathways;
    store.replaceState({
      pathways,
      selectedPackId: pack.metadata?.id || pack.id,
      pack,
      intake,
      evaluation
    });
    syncUI();
  } catch (error) {
    displayError(resultsContainer, error);
  }
}

function handlePathwaySelect(metadata) {
  selectPack(metadata);
}

function handleFieldChange(path, value) {
  store.setState((state) => {
    const nextIntake = cloneAndSet(state.intake || {}, path, value);
    const evaluation = state.pack ? evaluatePack(state.pack, nextIntake) : state.evaluation;
    return { ...state, intake: nextIntake, evaluation };
  });
  const state = store.getState();
  if (intakeView && state.evaluation) {
    intakeView.highlightClarifiers(state.evaluation.clarifierPaths);
  }
  renderResults(resultsContainer, state.pack, state.evaluation);
  renderDocumentation(documentationContainer, state.evaluation?.documentation, state.pack, state.evaluation);
}

function syncUI() {
  const state = store.getState();
  renderPathwayList(pathwayContainer, state.pathways, state.selectedPackId, handlePathwaySelect);
  if (state.pack) {
    intakeView = renderIntakeForm(intakeContainer, state.pack, state.intake, handleFieldChange);
    if (state.evaluation && intakeView) {
      intakeView.highlightClarifiers(state.evaluation.clarifierPaths);
    }
  } else {
    intakeView = renderIntakeForm(intakeContainer, null, null, handleFieldChange);
  }
  renderResults(resultsContainer, state.pack, state.evaluation);
  renderDocumentation(documentationContainer, state.evaluation?.documentation, state.pack, state.evaluation);
  updateHeroTimestamp(state.pack?.metadata);
}

function updateHeroTimestamp(metadata) {
  if (!timestampEl) {
    return;
  }
  if (!metadata) {
    timestampEl.textContent = 'Loaded 2025-01-01';
    return;
  }
  const version = metadata.version ? `version ${metadata.version}` : 'rule pack loaded';
  const effective = metadata.effective ? `effective ${metadata.effective}` : '';
  timestampEl.textContent = [version, effective].filter(Boolean).join(' ');
}

function displayError(container, error) {
  if (!(container instanceof HTMLElement)) {
    return;
  }
  container.innerHTML = '';
  const message = document.createElement('p');
  message.className = 'muted';
  message.textContent = `Unable to load rule packs: ${error.message}`;
  container.appendChild(message);
}

document.addEventListener('DOMContentLoaded', bootstrap);
