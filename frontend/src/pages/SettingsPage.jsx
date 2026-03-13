import { useEffect, useState } from 'react';
import AppLayout from '../components/AppLayout';
import { useToast } from '../components/Toast';
import { applyDarkMode, getAppSettings, saveAppSettings } from '../services/appSettings.service';

export default function SettingsPage() {
  const { showToast } = useToast();
  const [darkMode, setDarkMode] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    const settings = getAppSettings();
    setDarkMode(settings.darkMode);
    setLogoUrl(settings.logoUrl);
  }, []);

  function handleToggleDarkMode() {
    const next = !darkMode;
    setDarkMode(next);
    applyDarkMode(next);
    saveAppSettings({ darkMode: next });
  }

  function handleSave() {
    saveAppSettings({ darkMode, logoUrl });
    applyDarkMode(darkMode);
    showToast('Configuración guardada', 'success');
  }

  return (
    <AppLayout
      title="Configuraciones"
      subtitle="Personaliza apariencia y logo para esta instalación"
    >
      <div className="ui-card p-5 max-w-2xl">
        <div className="mb-5">
          <p className="text-sm font-semibold text-slate-700 mb-2">Modo oscuro</p>
          <button
            type="button"
            onClick={handleToggleDarkMode}
            className={`ui-btn ${darkMode ? 'ui-btn-info' : 'ui-btn-neutral'}`}
          >
            {darkMode ? 'Activado' : 'Desactivado'}
          </button>
        </div>

        <div className="mb-5">
          <label className="block text-sm font-semibold text-slate-700 mb-2">URL del logo de la empresa</label>
          <input
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://mi-empresa.com/logo.png"
            className="ui-input"
          />
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={handleSave} className="ui-btn ui-btn-success">
            Guardar cambios
          </button>
          <button
            type="button"
            onClick={() => {
              setLogoUrl('');
              saveAppSettings({ logoUrl: '' });
              showToast('Logo removido', 'info');
            }}
            className="ui-btn ui-btn-neutral"
          >
            Quitar logo
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
