import { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import AppLayout from '../components/AppLayout';
import { useToast } from '../components/Toast';

const BASE_URL = window.location.origin;
const REGISTER_URL = `${BASE_URL}/guest-register`;

export default function GuestQRPage() {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const qrRef = useRef(null);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(REGISTER_URL);
      setCopied(true);
      showToast('Enlace copiado al portapapeles', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast('No se pudo copiar. Copia el link manualmente.', 'warning');
    }
  }

  function printQR() {
    const svgEl = qrRef.current?.querySelector('svg');
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const printWindow = window.open('', '_blank', 'width=600,height=700');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR de Registro – Hotel SFR</title>
          <style>
            body { margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: sans-serif; background: #fff; }
            h1 { font-size: 1.6rem; margin-bottom: 0.25rem; color: #1e293b; }
            p  { font-size: 0.9rem; color: #64748b; margin-bottom: 1.5rem; }
            svg { width: 260px; height: 260px; }
            .url { margin-top: 1.2rem; font-size: 0.75rem; color: #475569; word-break: break-all; max-width: 280px; text-align: center; }
          </style>
        </head>
        <body>
          <h1>🏨 Regístrate como huésped</h1>
          <p>Escanea el código QR para registrarte y acceder al servicio de fiado</p>
          ${svgData}
          <div class="url">${REGISTER_URL}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }

  return (
    <AppLayout title="QR de Registro" subtitle="Comparte este código para que los huéspedes se registren">
      <div className="flex flex-col items-center gap-6 py-4">
        {/* QR Card */}
        <div ref={qrRef} className="bg-white rounded-3xl shadow-lg border border-slate-200 p-8 flex flex-col items-center gap-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 mb-1 shadow">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <p className="text-lg font-extrabold text-slate-800">Registro de huésped</p>
          <QRCodeSVG
            value={REGISTER_URL}
            size={220}
            bgColor="#ffffff"
            fgColor="#1e293b"
            level="M"
            includeMargin
          />
          <p className="text-xs text-slate-400 text-center max-w-[220px] break-all">
            {REGISTER_URL}
          </p>
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 max-w-sm text-center">
          <p className="text-sm text-blue-800 font-medium">
            El huésped escanea el QR o abre el link, llena el formulario y queda registrado automáticamente.
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Luego puedes buscarlo por nombre o cédula al momento de fiar.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 w-full max-w-sm">
          <button
            onClick={copyLink}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow transition-colors flex items-center justify-center gap-2"
          >
            {copied ? '✅ ¡Copiado!' : '🔗 Copiar enlace'}
          </button>
          <button
            onClick={printQR}
            className="w-full bg-slate-700 hover:bg-slate-800 text-white font-bold py-3 rounded-xl shadow transition-colors flex items-center justify-center gap-2"
          >
            🖨️ Imprimir / Guardar QR
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
