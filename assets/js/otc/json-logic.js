const OPERATORS = new Set([
  '==', '!=', '>', '>=', '<', '<=', 'and', 'or', '!', '+', '-', '*', '/', 'if', 'includes'
]);

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function getPathValue(path, data) {
  if (path === '' || path === undefined || path === null) {
    return data;
  }
  const parts = Array.isArray(path) ? path : String(path).split('.');
  let current = data;
  for (const part of parts) {
    if (current == null) {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

function evaluateArray(args, data) {
  return args.map((arg) => evaluateExpression(arg, data));
}

function evaluateIf(args, data) {
  const evaluated = Array.isArray(args) ? args : [args];
  for (let i = 0; i < evaluated.length - 1; i += 2) {
    const condition = evaluateExpression(evaluated[i], data);
    if (condition) {
      return evaluateExpression(evaluated[i + 1], data);
    }
  }
  if (evaluated.length % 2 === 1) {
    return evaluateExpression(evaluated[evaluated.length - 1], data);
  }
  return null;
}

export function evaluateExpression(expression, data) {
  if (Array.isArray(expression)) {
    return evaluateArray(expression, data);
  }
  if (!isPlainObject(expression)) {
    return expression;
  }
  const entries = Object.entries(expression);
  if (entries.length !== 1) {
    return Object.fromEntries(entries.map(([key, value]) => [key, evaluateExpression(value, data)]));
  }
  const [operator, operand] = entries[0];

  switch (operator) {
    case 'var':
      return getPathValue(operand, data);
    case '==': {
      const [left, right] = evaluateArray(operand, data);
      return left === right;
    }
    case '!=': {
      const [left, right] = evaluateArray(operand, data);
      return left !== right;
    }
    case '>': {
      const [left, right] = evaluateArray(operand, data);
      return left > right;
    }
    case '>=': {
      const [left, right] = evaluateArray(operand, data);
      return left >= right;
    }
    case '<': {
      const [left, right] = evaluateArray(operand, data);
      return left < right;
    }
    case '<=': {
      const [left, right] = evaluateArray(operand, data);
      return left <= right;
    }
    case 'and': {
      const values = evaluateArray(Array.isArray(operand) ? operand : [operand], data);
      return values.every(Boolean);
    }
    case 'or': {
      const values = evaluateArray(Array.isArray(operand) ? operand : [operand], data);
      return values.some(Boolean);
    }
    case '!':
      return !evaluateExpression(operand, data);
    case '+': {
      const values = evaluateArray(Array.isArray(operand) ? operand : [operand], data);
      return values.reduce((total, value) => total + Number(value || 0), 0);
    }
    case '-': {
      const values = evaluateArray(Array.isArray(operand) ? operand : [operand], data);
      if (values.length === 0) {
        return 0;
      }
      if (values.length === 1) {
        return -Number(values[0] || 0);
      }
      return values.slice(1).reduce((total, value) => total - Number(value || 0), Number(values[0] || 0));
    }
    case '*': {
      const values = evaluateArray(Array.isArray(operand) ? operand : [operand], data);
      return values.reduce((total, value) => total * Number(value || 0), 1);
    }
    case '/': {
      const values = evaluateArray(Array.isArray(operand) ? operand : [operand], data);
      if (values.length === 0) {
        return 0;
      }
      return values.slice(1).reduce((total, value) => {
        const divisor = Number(value || 0);
        return divisor === 0 ? Infinity : total / divisor;
      }, Number(values[0] || 0));
    }
    case 'if':
      return evaluateIf(operand, data);
    case 'includes': {
      const [collection, value] = evaluateArray(operand, data);
      if (Array.isArray(collection)) {
        return collection.includes(value);
      }
      if (typeof collection === 'string') {
        return collection.includes(String(value));
      }
      return false;
    }
    default:
      if (OPERATORS.has(operator)) {
        throw new Error(`Operator ${operator} not implemented.`);
      }
      return Object.fromEntries(entries.map(([key, value]) => [key, evaluateExpression(value, data)]));
  }
}

export function renderTemplate(template, data) {
  if (typeof template !== 'string') {
    return template;
  }
  return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_match, path) => {
    const value = getPathValue(path.trim(), data);
    if (value === undefined || value === null) {
      return 'unknown';
    }
    return Array.isArray(value) ? value.join(', ') : String(value);
  });
}

export function resolveStructuredValue(value, data) {
  if (Array.isArray(value)) {
    return value
      .map((item) => resolveStructuredValue(item, data))
      .filter((item) => item !== null && item !== undefined && item !== '');
  }
  if (isPlainObject(value)) {
    if (Object.keys(value).length === 1 && value.expr) {
      return evaluateExpression(value.expr, data);
    }
    const entries = Object.entries(value);
    const resolved = {};
    for (const [key, child] of entries) {
      resolved[key] = resolveStructuredValue(child, data);
    }
    return resolved;
  }
  if (typeof value === 'string') {
    return renderTemplate(value, data);
  }
  return value;
}
