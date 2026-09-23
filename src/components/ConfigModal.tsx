import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Settings, Cloud, RefreshCw, X, Image as ImageIcon, ShieldCheck, FileSpreadsheet, Download } from 'lucide-react';
import { isSafeImageUrl } from '../lib/security';
import { firebaseConfig } from '../lib/firebase';
import { downloadMasterTemplate } from '../lib/masterDocumentTemplate';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({ isOpen, onClose }) => {
  const { appSettings, updateSettings, cloudConnected, syncStatusText, forceCloudSync, isSyncing, showToast } = useInventory();
  const [appName, setAppName] = useState(appSettings.appName);
  const [logoUrl, setLogoUrl] = useState(appSettings.logoUrl);
  const [activeSubTab, setActiveSubTab] = useState<'branding' | 'firebase'>('branding');

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (logoUrl && !isSafeImageUrl(logoUrl)) {
      showToast('La URL del logo debe comenzar con http:// o https://', 'error');
      return;
    }

    await updateSettings({
      appName: appName.trim() || 'InvControl Pro',
      logoUrl: logoUrl.trim()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9990] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Configuración del Sistema</h3>
              <p className="text-xs text-gray-500">Personalización y conexión con Firebase</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-gray-100 px-6 bg-gray-50/30">
          <button
            type="button"
            onClick={() => setActiveSubTab('branding')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 transition ${
              activeSubTab === 'branding'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Marca y Aspecto
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('firebase')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeSubTab === 'firebase'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Cloud className="w-4 h-4" /> Firebase Cloud
          </button>
        </div>

        {activeSubTab === 'branding' ? (
          <form onSubmit={handleSave} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Nombre de la Aplicación
              </label>
              <input
                type="text"
                maxLength={40}
                value={appName}
                onChange={e => setAppName(e.target.value)}
                placeholder="Ej. InvControl Pro"
                className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition bg-gray-50/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                URL del Logo Personalizado (Opcional)
              </label>
              <input
                type="text"
                value={logoUrl}
                onChange={e => setLogoUrl(e.target.value)}
                placeholder="https://ejemplo.com/logo.png"
                className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition bg-gray-50/50"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Ingresa un enlace directo a imagen (PNG/SVG/JPG). Déjalo vacío para usar el ícono predeterminado.
              </p>
            </div>

            {logoUrl && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-lg border p-1 flex items-center justify-center overflow-hidden shrink-0">
                  <img
                    src={logoUrl}
                    alt="Previsualización"
                    className="max-h-full max-w-full object-contain"
                    onError={e => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <div className="text-xs text-gray-600">
                  <span className="font-semibold text-gray-800">Previsualización del Logo</span>
                  <p className="text-[11px] text-gray-400">Si la imagen es válida, se mostrará en el encabezado.</p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm shadow-md shadow-indigo-500/25 transition"
              >
                Guardar Ajustes
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/60 text-sm">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 font-semibold text-emerald-950">
                  <Cloud className="w-4 h-4 text-emerald-600" /> Firebase Cloud (Producción)
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs">
                  Modo Producción
                </span>
              </div>
              <p className="text-xs text-emerald-900 mb-2">
                Proyecto: <code className="bg-emerald-100/90 px-1.5 py-0.5 rounded font-mono text-emerald-950 font-semibold">{firebaseConfig.projectId}</code>
              </p>
              <div className="flex items-center gap-2 text-xs">
                <span className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full ${cloudConnected ? 'bg-emerald-200/70 text-emerald-900' : 'bg-amber-100 text-amber-800'}`}>
                  <span className={`w-2 h-2 rounded-full ${cloudConnected ? 'bg-emerald-600' : 'bg-amber-500'}`}></span>
                  {cloudConnected ? 'En línea / Producción Activa' : 'Pendiente / Local'}
                </span>
                <span className="text-gray-600">{syncStatusText}</span>
              </div>
            </div>

            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">Base de Datos Firestore:</span>
                <span className="font-mono text-gray-700 text-[11px] truncate max-w-[200px]" title={firebaseConfig.firestoreDatabaseId}>
                  {firebaseConfig.firestoreDatabaseId || '(default)'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">Reglas de Seguridad:</span>
                <span className="inline-flex items-center gap-1 font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Desplegadas (Producción)
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">Auth Domain:</span>
                <span className="font-mono text-gray-700">{firebaseConfig.authDomain}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">Storage Bucket:</span>
                <span className="font-mono text-gray-700">{firebaseConfig.storageBucket}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-500">App ID:</span>
                <span className="font-mono text-gray-700">{firebaseConfig.appId}</span>
              </div>
            </div>

            <div className="pt-2 space-y-2.5">
              <button
                type="button"
                onClick={forceCloudSync}
                disabled={isSyncing}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm flex items-center justify-center gap-2 transition shadow-md disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Sincronizando con Firebase...' : 'Forzar Sincronización a la Nube'}
              </button>

              <button
                type="button"
                onClick={() => downloadMasterTemplate()}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs flex items-center justify-center gap-2 border border-blue-200/80 transition"
              >
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                Descargar Documento Maestro de Importación (.CSV)
              </button>
            </div>

            <p className="text-[11px] text-gray-400 text-center">
              Todos los movimientos de inventario, catálogo de ítems y usuarios se guardan en tiempo real en Firestore y cuentan con respaldo local.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
