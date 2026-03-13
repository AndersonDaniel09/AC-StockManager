const APP_SETTINGS_KEY = 'ac_stockmanager_settings';

export function getAppSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(APP_SETTINGS_KEY) || '{}');
    return {
      darkMode: !!raw.darkMode,
      logoUrl: raw.logoUrl || '',
    };
  } catch {
    return { darkMode: false, logoUrl: '' };
  }
}

export function saveAppSettings(nextSettings) {
  const current = getAppSettings();
  const merged = {
    darkMode: typeof nextSettings?.darkMode === 'boolean' ? nextSettings.darkMode : current.darkMode,
    logoUrl: typeof nextSettings?.logoUrl === 'string' ? nextSettings.logoUrl.trim() : current.logoUrl,
  };
  localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(merged));
  window.dispatchEvent(new Event('app-settings-changed'));
  return merged;
}

export function applyDarkMode(enabled) {
  document.body.classList.toggle('dark-mode', !!enabled);
}