import React from 'react';
import { InventoryProvider, useInventory } from './context/InventoryContext';
import { Sidebar } from './components/Sidebar';
import { LoginView } from './components/LoginView';
import { DashboardView } from './components/DashboardView';
import { TransactionView } from './components/TransactionView';
import { HistorialView } from './components/HistorialView';
import { ItemsView } from './components/ItemsView';
import { UsuariosView } from './components/UsuariosView';
import { ResponsablesView } from './components/ResponsablesView';
import { SolicitudesView } from './components/SolicitudesView';
import { ManualView } from './components/ManualView';
import { ToastContainer } from './components/Toast';
import { RotateCw, Cloud } from 'lucide-react';

const MainLayout: React.FC = () => {
  const {
    currentUser,
    activeTab,
    setActiveTab,
    appSettings,
    isSyncing,
    forceCloudSync,
    lastSyncTime
  } = useInventory();

  if (!currentUser) {
    return <LoginView />;
  }

  const isAdmin = currentUser.role === 'admin';

  // Guard against non-admin accessing admin-only tabs
  if (!isAdmin && (activeTab === 'items' || activeTab === 'usuarios' || activeTab === 'manual')) {
    setActiveTab('dashboard');
  }

  return (
    <div className="flex h-screen w-full flex-col md:flex-row overflow-hidden bg-slate-100">
      {/* Sidebar (Desktop & Mobile) */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 relative">
        {/* Top Sync & Status Bar */}
        <header className="h-12 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between shrink-0 z-10 shadow-xs">
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <span className="font-bold text-slate-800 tracking-tight">{appSettings.appName}</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-600 font-medium">
              {activeTab === 'dashboard' && 'Tablero General'}
              {activeTab === 'solicitudes' && 'Solicitud de Insumos'}
              {activeTab === 'responsables' && 'Responsables de Almacén'}
              {activeTab === 'entrada' && 'Recepción (Entrada)'}
              {activeTab === 'salida' && 'Despacho (Salida)'}
              {activeTab === 'historial' && 'Historial de Movimientos'}
              {activeTab === 'items' && 'Base de Ítems'}
              {activeTab === 'usuarios' && 'Usuarios y Permisos'}
              {activeTab === 'manual' && 'Manual de Usuario'}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div
              className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/70 text-[11px] text-emerald-800"
              title="Sincronización multi-equipo en vivo: los cambios realizados por cualquier usuario se guardan y reflejan al instante en todos los dispositivos conectados."
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-semibold hidden sm:inline">
                {isSyncing ? 'Sincronizando cambios...' : 'En vivo • Sincronización multi-equipo'}
              </span>
              <span className="font-semibold sm:hidden">
                {isSyncing ? 'Sincronizando' : 'En vivo'}
              </span>
            </div>

            <button
              onClick={forceCloudSync}
              disabled={isSyncing}
              title="Forzar actualización y sincronización con todos los equipos"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition border border-slate-200/90 disabled:opacity-50"
            >
              <RotateCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-emerald-600' : ''}`} />
              <span className="hidden md:inline">Sincronizar ahora</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scroll-smooth">
          <div className="max-w-7xl mx-auto w-full">
            {activeTab === 'dashboard' && <DashboardView />}
            {activeTab === 'solicitudes' && <SolicitudesView />}
            {activeTab === 'responsables' && <ResponsablesView />}
            {activeTab === 'entrada' && <TransactionView tipo="entrada" />}
            {activeTab === 'salida' && <TransactionView tipo="salida" />}
            {activeTab === 'historial' && <HistorialView />}
            {activeTab === 'items' && isAdmin && <ItemsView />}
            {activeTab === 'usuarios' && isAdmin && <UsuariosView />}
            {activeTab === 'manual' && isAdmin && <ManualView />}
          </div>
        </div>
      </main>

      {/* Global Notifications */}
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <InventoryProvider>
      <MainLayout />
    </InventoryProvider>
  );
}
