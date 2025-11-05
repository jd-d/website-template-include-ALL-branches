import { deepClone } from './utils.js';

export function createStore(initialState = {}) {
  let state = deepClone(initialState);
  const listeners = new Set();

  function notify() {
    const snapshot = deepClone(state);
    listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (error) {
        // Surface errors without blocking other subscribers
        console.error('Store listener error', error); // eslint-disable-line no-console
      }
    });
  }

  function getState() {
    return deepClone(state);
  }

  function setState(update) {
    const current = deepClone(state);
    let next;

    if (typeof update === 'function') {
      next = update(current);
    } else if (update && typeof update === 'object') {
      next = { ...current, ...update };
    } else {
      return;
    }

    if (!next || typeof next !== 'object') {
      return;
    }

    state = next;
    notify();
  }

  function replaceState(nextState) {
    if (!nextState || typeof nextState !== 'object') {
      return;
    }
    state = deepClone(nextState);
    notify();
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') {
      return () => {};
    }
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  return { getState, setState, replaceState, subscribe };
}
