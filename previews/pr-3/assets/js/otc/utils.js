const hasStructuredClone = typeof structuredClone === 'function';

export function deepClone(value) {
  if (hasStructuredClone) {
    try {
      return structuredClone(value);
    } catch (error) {
      // Fallback below
    }
  }

  if (Array.isArray(value)) {
    return value.map((item) => deepClone(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, val]) => [key, deepClone(val)]));
  }

  return value;
}

export function getByPath(source, path) {
  if (!source || typeof path !== 'string') {
    return undefined;
  }

  return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), source);
}

export function cloneAndSet(source, path, value) {
  if (typeof path !== 'string' || !path) {
    return deepClone(source);
  }

  const result = Array.isArray(source) ? source.slice() : { ...source };
  const segments = path.split('.');
  let cursor = result;
  let sourceCursor = source;

  for (let index = 0; index < segments.length; index += 1) {
    const key = segments[index];
    const isLast = index === segments.length - 1;
    const nextSource = sourceCursor && typeof sourceCursor === 'object' ? sourceCursor[key] : undefined;

    if (isLast) {
      cursor[key] = value;
    } else {
      const nextValue = nextSource && typeof nextSource === 'object' ? deepClone(nextSource) : {};
      cursor[key] = Array.isArray(nextValue) ? nextValue.slice() : { ...nextValue };
      cursor = cursor[key];
      sourceCursor = nextSource;
    }
  }

  return result;
}

export function mergeDeep(target, source) {
  if (!source || typeof source !== 'object') {
    return deepClone(target);
  }

  const output = Array.isArray(target) ? target.slice() : { ...(target || {}) };

  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      output[key] = mergeDeep(output[key] || {}, value);
    } else if (Array.isArray(value)) {
      output[key] = value.map((item) => deepClone(item));
    } else {
      output[key] = value;
    }
  }

  return output;
}

export function isUnknown(value) {
  return (
    value === null ||
    value === undefined ||
    value === '' ||
    (typeof value === 'string' && value.toLowerCase() === 'unknown') ||
    (typeof value === 'number' && Number.isNaN(value))
  );
}

export function coerceTriState(value) {
  if (value === true || value === 'true') {
    return true;
  }
  if (value === false || value === 'false') {
    return false;
  }
  if (value === 'yes') {
    return true;
  }
  if (value === 'no') {
    return false;
  }
  return 'unknown';
}

export function coerceNumber(value) {
  if (value === '' || value === null || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function uniqueId(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function joinNatural(list) {
  if (!Array.isArray(list) || list.length === 0) {
    return '';
  }
  if (list.length === 1) {
    return list[0];
  }
  if (list.length === 2) {
    return `${list[0]} and ${list[1]}`;
  }
  const head = list.slice(0, -1).join(', ');
  return `${head}, and ${list[list.length - 1]}`;
}

export function formatDateISO(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
