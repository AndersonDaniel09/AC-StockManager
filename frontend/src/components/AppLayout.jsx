import { useEffect, useState } from 'react';
import AppSidebar from './AppSidebar';
import { getAppSettings } from '../services/appSettings.service';

export default function AppLayout({ title, subtitle, actions, children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    const refreshSettings = () => {
      const settings = getAppSettings();
      setLogoUrl(settings.logoUrl || '');
    };

    refreshSettings();
    window.addEventListener('app-settings-changed', refreshSettings);
    return () => window.removeEventListener('app-settings-changed', refreshSettings);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <div className="hidden lg:block fixed left-0 top-0 h-screen z-30">
        <AppSidebar />
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="mobile-sidebar-enter relative z-10 overflow-visible w-[86vw] max-w-[22rem] h-full shadow-2xl border-r border-slate-800">
            <AppSidebar
              mobile
              onNavigate={() => setMobileMenuOpen(false)}
              onClose={() => setMobileMenuOpen(false)}
            />
          </div>
          <button
            type="button"
            className="mobile-backdrop-enter relative z-0 flex-1 bg-slate-950/45"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Cerrar menú"
          />
        </div>
      )}

      <main className="flex-1 p-4 sm:p-5 md:p-8 lg:ml-64">
        <div className="w-full max-w-[1400px] mx-auto">
        <header className="mb-5 md:mb-6">
          <div className="lg:hidden mb-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="inline-flex items-center justify-center w-11 h-11 rounded-xl border border-slate-300 bg-white text-slate-700 shadow-sm"
              aria-label="Abrir menú"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">{title}</h2>
              {subtitle && <p className="text-slate-600 mt-1 text-sm sm:text-base">{subtitle}</p>}

              {actions && (
                <div className="mt-3 flex lg:hidden flex-wrap items-center gap-2">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Logo empresa"
                      className="h-12 w-auto max-w-[220px] object-contain"
                      onError={() => setLogoUrl('')}
                    />
                  ) : null}
                  {actions}
                </div>
              )}
            </div>

            {actions && (
              <div className="hidden lg:flex items-center gap-3">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo empresa"
                    className="h-16 w-auto max-w-[320px] object-contain"
                    onError={() => setLogoUrl('')}
                  />
                ) : null}
                {actions}
              </div>
            )}
          </div>
        </header>
        {children}
        </div>
      </main>
    </div>
  );
}
