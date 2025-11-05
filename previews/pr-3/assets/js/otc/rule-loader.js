import { deepClone } from './utils.js';

const INDEX_PATH = 'assets/data/rule-packs/index.json';
const packCache = new Map();
let indexCache = null;

export async function loadRulePackIndex() {
  if (Array.isArray(indexCache)) {
    return deepClone(indexCache);
  }

  const response = await fetch(INDEX_PATH, { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`Unable to load rule pack index (status ${response.status}).`);
  }
  const payload = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error('Rule pack index is malformed.');
  }
  indexCache = payload;
  return deepClone(indexCache);
}

export async function loadRulePack(metadataOrId) {
  if (!metadataOrId) {
    throw new Error('Rule pack identifier is required.');
  }

  const meta = await resolveMetadata(metadataOrId);
  const cacheKey = meta.file;

  if (packCache.has(cacheKey)) {
    return deepClone(packCache.get(cacheKey));
  }

  const url = `assets/data/rule-packs/${meta.file}`;
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`Failed to load rule pack ${meta.id} (status ${response.status}).`);
  }

  const rawPack = await response.json();
  const prepared = prepareRulePack(rawPack, meta);
  packCache.set(cacheKey, prepared);
  return deepClone(prepared);
}

async function resolveMetadata(metadataOrId) {
  if (typeof metadataOrId === 'object' && metadataOrId !== null) {
    if (!metadataOrId.file || !metadataOrId.id) {
      throw new Error('Rule pack metadata is missing required properties.');
    }
    return metadataOrId;
  }

  const id = String(metadataOrId);
  const index = await loadRulePackIndex();
  const found = index.find((entry) => entry.id === id);
  if (!found) {
    throw new Error(`Unknown rule pack id: ${id}`);
  }
  return found;
}

function prepareRulePack(pack, metadata) {
  const prepared = deepClone(pack);
  prepared.metadata = {
    id: pack.id,
    title: pack.title,
    version: pack.version,
    effective: pack.effective,
    pathway: pack.pathway,
    presentation: pack.presentation,
    summary: pack.summary,
    ...metadata
  };

  const intake = prepared.intake || {};
  const sections = Array.isArray(intake.sections) ? intake.sections : [];
  const fieldCatalog = {};
  const required = new Set(Array.isArray(intake.required) ? intake.required : []);

  sections.forEach((section) => {
    const fields = Array.isArray(section.fields) ? section.fields : [];
    fields.forEach((field) => {
      if (!field || typeof field !== 'object') {
        return;
      }
      if (Array.isArray(field.options) && field.type === 'checkbox-group') {
        field.options.forEach((option) => {
          if (option && option.path) {
            fieldCatalog[option.path] = buildFieldMeta(section, option, required.has(option.path), field.type);
          }
        });
      }
      if (field.path) {
        fieldCatalog[field.path] = buildFieldMeta(section, field, required.has(field.path), field.type);
      }
    });
  });

  prepared.intake = {
    defaults: intake.defaults || {},
    required: Array.from(required),
    sections,
    fieldCatalog
  };

  return prepared;
}

function buildFieldMeta(section, field, required, fallbackType) {
  return {
    id: field.id || field.path,
    label: field.label || field.path,
    clarifier: field.clarifier || '',
    sectionId: section.id,
    sectionTitle: section.title || '',
    required: Boolean(required),
    type: field.type || fallbackType || 'text'
  };
}
