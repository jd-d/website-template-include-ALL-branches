import { coerceNumber, coerceTriState, uniqueId } from '../utils.js';

export function renderIntakeForm(container, pack, intake, onChange) {
  if (!(container instanceof HTMLElement)) {
    return { highlightClarifiers() {} };
  }

  container.innerHTML = '';

  if (!pack) {
    const emptyMessage = container.dataset.emptyMessage || 'Select a pathway to begin.';
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = emptyMessage;
    container.appendChild(empty);
    return { highlightClarifiers() {} };
  }

  const form = document.createElement('form');
  form.className = 'intake-form';
  form.noValidate = true;
  form.addEventListener('submit', (event) => event.preventDefault());

  const fieldRefs = new Map();

  const sections = Array.isArray(pack.intake?.sections) ? pack.intake.sections : [];

  sections.forEach((section) => {
    const sectionEl = document.createElement('section');
    sectionEl.className = 'intake-section';

    const header = document.createElement('div');
    header.className = 'intake-section__header';

    const title = document.createElement('h3');
    title.className = 'intake-section__title';
    title.textContent = section.title || 'Section';
    header.appendChild(title);

    if (section.description) {
      const description = document.createElement('p');
      description.className = 'intake-section__description';
      description.textContent = section.description;
      header.appendChild(description);
    }

    sectionEl.appendChild(header);

    const fieldGrid = document.createElement('div');
    fieldGrid.className = 'field-grid';
    if (section.layout === 'two-col') {
      fieldGrid.classList.add('two-col');
    }

    const fields = Array.isArray(section.fields) ? section.fields : [];
    fields.forEach((field) => {
      const control = createFieldControl(field, intake, onChange, fieldRefs);
      if (control) {
        fieldGrid.appendChild(control);
      }
    });

    sectionEl.appendChild(fieldGrid);
    form.appendChild(sectionEl);
  });

  container.appendChild(form);

  return {
    highlightClarifiers(paths) {
      const clarifierSet = new Set(paths || []);
      fieldRefs.forEach((element, path) => {
        if (!element) {
          return;
        }
        if (clarifierSet.has(path)) {
          element.classList.add('is-clarifier');
        } else {
          element.classList.remove('is-clarifier');
        }
      });
    }
  };
}

function createFieldControl(field, intake, onChange, fieldRefs) {
  if (!field || !field.path) {
    return null;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'control';
  wrapper.dataset.path = field.path;
  fieldRefs.set(field.path, wrapper);

  const label = document.createElement('label');
  label.setAttribute('for', field.id || field.path);
  label.textContent = field.label || field.path;
  const isRequired = Boolean(field.required);
  if (isRequired) {
    const requiredMarker = document.createElement('span');
    requiredMarker.className = 'required';
    requiredMarker.textContent = '*';
    label.appendChild(requiredMarker);
  }
  wrapper.appendChild(label);

  if (field.description) {
    const description = document.createElement('p');
    description.className = 'muted';
    description.textContent = field.description;
    wrapper.appendChild(description);
  }

  const currentValue = getCurrentValue(intake, field.path);

  switch (field.type) {
    case 'number':
      wrapper.appendChild(createNumberInput(field, currentValue, onChange));
      break;
    case 'textarea':
      wrapper.appendChild(createTextarea(field, currentValue, onChange));
      break;
    case 'select':
      wrapper.appendChild(createSelect(field, currentValue, onChange));
      break;
    case 'tri-state':
      wrapper.classList.add('control--inline-options');
      wrapper.appendChild(createTriState(field, currentValue, onChange));
      break;
    default:
      wrapper.appendChild(createTextInput(field, currentValue, onChange));
      break;
  }

  return wrapper;
}

function getCurrentValue(intake, path) {
  if (!intake || typeof intake !== 'object') {
    return undefined;
  }
  const segments = path.split('.');
  let cursor = intake;
  for (const segment of segments) {
    if (!cursor || typeof cursor !== 'object') {
      return undefined;
    }
    cursor = cursor[segment];
  }
  return cursor;
}

function createNumberInput(field, value, onChange) {
  const input = document.createElement('input');
  input.type = 'number';
  input.id = field.id || field.path;
  if (typeof field.min === 'number') {
    input.min = String(field.min);
  }
  if (typeof field.max === 'number') {
    input.max = String(field.max);
  }
  if (value !== null && value !== undefined) {
    input.value = String(value);
  }
  input.addEventListener('input', () => {
    const parsed = coerceNumber(input.value);
    triggerChange(onChange, field.path, parsed);
  });
  return input;
}

function createTextarea(field, value, onChange) {
  const textarea = document.createElement('textarea');
  textarea.id = field.id || field.path;
  textarea.value = typeof value === 'string' ? value : '';
  textarea.addEventListener('input', () => {
    triggerChange(onChange, field.path, textarea.value);
  });
  return textarea;
}

function createTextInput(field, value, onChange) {
  const input = document.createElement('input');
  input.type = 'text';
  input.id = field.id || field.path;
  input.value = value ? String(value) : '';
  input.addEventListener('input', () => {
    triggerChange(onChange, field.path, input.value);
  });
  return input;
}

function createSelect(field, value, onChange) {
  const select = document.createElement('select');
  select.id = field.id || field.path;
  const options = Array.isArray(field.options) ? field.options : [];
  options.forEach((option) => {
    const optionEl = document.createElement('option');
    optionEl.value = stringifyOptionValue(option.value);
    optionEl.textContent = option.label || option.value;
    if (stringifyOptionValue(option.value) === stringifyOptionValue(value)) {
      optionEl.selected = true;
    }
    select.appendChild(optionEl);
  });
  select.addEventListener('change', () => {
    const raw = select.value;
    if (raw === 'true' || raw === 'false') {
      triggerChange(onChange, field.path, raw === 'true');
    } else {
      triggerChange(onChange, field.path, raw);
    }
  });
  return select;
}

function createTriState(field, value, onChange) {
  const wrapper = document.createElement('div');
  wrapper.className = 'control--inline-options';
  const name = uniqueId(field.path.replace(/[^a-z0-9]/gi, ''));
  const options = Array.isArray(field.options)
    ? field.options
    : [
        { value: true, label: 'Yes' },
        { value: false, label: 'No' },
        { value: 'unknown', label: 'Unknown' }
      ];

  options.forEach((option) => {
    const chip = document.createElement('label');
    chip.className = 'option-chip';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.value = stringifyOptionValue(option.value);
    if (stringifyOptionValue(option.value) === stringifyOptionValue(value)) {
      input.checked = true;
      chip.classList.add('is-active');
    }

    input.addEventListener('change', () => {
      if (!input.checked) {
        return;
      }
      wrapper.querySelectorAll('.option-chip').forEach((chipEl) => chipEl.classList.remove('is-active'));
      chip.classList.add('is-active');
      const nextValue = parseTriStateValue(input.value);
      triggerChange(onChange, field.path, nextValue);
    });

    chip.append(input, document.createTextNode(option.label || String(option.value)));
    wrapper.appendChild(chip);
  });

  return wrapper;
}

function stringifyOptionValue(value) {
  if (value === true) {
    return 'true';
  }
  if (value === false) {
    return 'false';
  }
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}

function parseTriStateValue(value) {
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return coerceTriState(value);
}

function triggerChange(onChange, path, value) {
  if (typeof onChange === 'function') {
    onChange(path, value);
  }
}
