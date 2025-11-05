const THEME_KEY = 'otcflow-theme';
const THEME_LOCK_KEY = 'otcflow-theme-lock';

export function initializeThemeControls() {
  const root = document.documentElement;
  const toggle = document.getElementById('theme-toggle');
  const lock = document.getElementById('theme-lock');

  if (!toggle || !lock) {
    return;
  }

  const initialTheme = root.dataset.theme === 'light' ? 'light' : 'dark';
  updateToggleLabel(toggle, initialTheme);
  lock.checked = root.dataset.themeLock === 'true';

  toggle.addEventListener('click', () => {
    if (root.dataset.themeLock === 'true') {
      return;
    }
    const current = root.dataset.theme === 'light' ? 'light' : 'dark';
    const next = current === 'light' ? 'dark' : 'light';
    applyTheme(root, next, true);
    updateToggleLabel(toggle, next);
  });

  lock.addEventListener('change', () => {
    const locked = lock.checked;
    root.dataset.themeLock = locked ? 'true' : 'false';
    try {
      localStorage.setItem(THEME_LOCK_KEY, locked ? 'true' : 'false');
      if (!locked) {
        localStorage.removeItem(THEME_KEY);
      }
    } catch (error) {
      // ignore storage errors
    }
    if (locked) {
      const current = root.dataset.theme === 'light' ? 'light' : 'dark';
      applyTheme(root, current, true);
      updateToggleLabel(toggle, current);
    }
  });
}

function applyTheme(root, theme, persist) {
  const normalized = theme === 'light' ? 'light' : 'dark';
  root.classList.remove('theme-light', 'theme-dark', 'light', 'dark');
  root.classList.add(`theme-${normalized}`, normalized);
  root.dataset.theme = normalized;
  if (persist) {
    try {
      localStorage.setItem(THEME_KEY, normalized);
    } catch (error) {
      // ignore storage errors
    }
  }
}

function updateToggleLabel(toggle, theme) {
  const label = toggle.querySelector('.toggle-label');
  if (label) {
    label.textContent = theme === 'dark' ? 'Dark mode' : 'Light mode';
  }
  toggle.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
}
