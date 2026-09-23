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

const MainLayout: React.FC = () => {
  const { currentUser, activeTab, setActiveTab } = useInventory();

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
