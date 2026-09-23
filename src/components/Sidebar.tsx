import React, { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import {
  LayoutDashboard,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  Package,
  Users,
  Settings,
  LogOut,
  Database,
  Cloud,
  MapPin,
  Menu,
  X,
  BookOpen,
  ClipboardList,
  UserCheck
} from 'lucide-react';
import { ConfigModal } from './ConfigModal';

export const Sidebar: React.FC = () => {
  const {
    currentUser,
    activeTab,
    setActiveTab,
    logout,
    appSettings,
    cloudConnected,
    syncStatusText
  } = useInventory();

  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!currentUser) return null;

  const isAdmin = currentUser.role === 'admin';

  const navItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard, color: 'text-blue-400' },
    { id: 'solicitudes' as const, label: 'Solicitudes Insumos', icon: ClipboardList, color: 'text-violet-400' },
    { id: 'responsables' as const, label: 'Responsables UP', icon: UserCheck, color: 'text-teal-400' },
    { id: 'entrada' as const, label: 'Entradas', icon: ArrowDownLeft, color: 'text-emerald-400' },
    { id: 'salida' as const, label: 'Salidas', icon: ArrowUpRight, color: 'text-rose-400' },
    { id: 'historial' as const, label: 'Historial', icon: History, color: 'text-amber-400' }
  ];

  const adminNavItems = [
    { id: 'items' as const, label: 'Base de Ítems', icon: Package, color: 'text-indigo-400' },
    { id: 'usuarios' as const, label: 'Gestión Usuarios', icon: Users, color: 'text-amber-400' },
    { id: 'manual' as const, label: 'Manual de Uso', icon: BookOpen, color: 'text-purple-400' }
  ];

  const handleNavClick = (tab: any) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Top Header */}
      <header className="md:hidden bg-slate-900 text-white px-4 py-3.5 flex items-center justify-between shadow-md z-30 sticky top-0 border-b border-slate-800">
        <div className="flex items-center gap-2.5 overflow-hidden">
          {appSettings.logoUrl ? (
            <img
              src={appSettings.logoUrl}
              alt="Logo"
              className="w-7 h-7 object-contain rounded bg-white p-0.5"
              onError={e => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Database className="w-4 h-4" />
            </div>
          )}
          <span className="font-bold text-sm text-white truncate max-w-[140px]">
            {appSettings.appName}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsConfigOpen(true)}
            className="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800"
            title="Configuración"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-300 hover:text-white rounded-lg bg-slate-800"
            aria-label="Abrir menú"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-14 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 z-40 p-4 shadow-2xl flex flex-col gap-1.5 animate-in slide-in-from-top-2 duration-150">
          <div className="pb-3 mb-2 border-b border-slate-800">
            <p className="text-xs text-slate-400 font-medium">Usuario activo</p>
            <p className="text-sm font-bold text-white">{currentUser.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${isAdmin ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-600/30 text-blue-300 border border-blue-500/30'}`}>
                {isAdmin ? 'Administrador' : 'Supervisor'}
              </span>
              <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                <MapPin className="w-3 h-3 text-slate-500" /> UP: {currentUser.up}
              </span>
            </div>
          </div>

          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  isActive ? 'bg-blue-600 text-white font-semibold' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.color}`} />
                <span>{item.label}</span>
              </button>
            );
          })}

          {isAdmin && (
            <>
              <div className="pt-2 pb-1">
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-amber-500/80">Administración</p>
              </div>
              {adminNavItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                      isActive ? 'bg-blue-600 text-white font-semibold' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.color}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </>
          )}

          <div className="pt-3 mt-2 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={() => {
                logout();
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-2 text-rose-400 text-sm font-medium py-2 px-3 hover:bg-rose-500/10 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </button>
            <button
              onClick={() => {
                setIsConfigOpen(true);
                setMobileMenuOpen(false);
              }}
              className="text-slate-400 hover:text-white p-2 text-xs flex items-center gap-1"
            >
              <Settings className="w-4 h-4" /> Ajustes
            </button>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex-col hidden md:flex h-full shrink-0 shadow-2xl z-20 border-r border-slate-800 select-none">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            {appSettings.logoUrl ? (
              <img
                src={appSettings.logoUrl}
                alt="Logo"
                className="w-9 h-9 object-contain rounded-lg bg-white p-1 shadow-sm"
                onError={e => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                <Database className="w-5 h-5" />
              </div>
            )}
            <div className="overflow-hidden">
              <h1 className="font-bold text-base tracking-tight text-white truncate leading-tight">
                {appSettings.appName}
              </h1>
              <p className="text-[11px] text-blue-400 font-medium">Control de Inventario</p>
            </div>
          </div>

          {/* User Profile Card */}
          <div className="mt-4 p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 truncate">{currentUser.name}</span>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wider uppercase ${
                  isAdmin ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' : 'bg-blue-600/30 text-blue-300 border border-blue-500/30'
                }`}
              >
                {isAdmin ? 'ADMIN' : 'SUPERVISOR'}
              </span>
            </div>
            <div className="mt-1 flex items-center text-[11px] text-slate-400">
              <MapPin className="w-3 h-3 mr-1 text-slate-500" />
              <span>UP Asignada: <strong className="text-slate-300">{currentUser.up}</strong></span>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-3.5 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition-all font-medium text-sm ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.color}`} />
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Admin Area */}
          {isAdmin && (
            <>
              <div className="pt-4 pb-1 px-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500/80">
                  Administración
                </p>
              </div>

              {adminNavItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition-all font-medium text-sm ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-semibold'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.color}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              <button
                onClick={() => setIsConfigOpen(true)}
                className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition text-slate-300 hover:bg-slate-800/80 hover:text-white text-sm font-medium mt-1"
              >
                <Settings className="w-4 h-4 text-slate-400" />
                <span>Configuración</span>
              </button>
            </>
          )}
        </nav>

        {/* Cloud Connection Badge */}
        <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-950/40">
          <div
            onClick={() => setIsConfigOpen(true)}
            className="cursor-pointer group flex items-center justify-between text-[11px] text-slate-400 py-1"
            title={syncStatusText}
          >
            <div className="flex items-center gap-1.5 truncate">
              <Cloud className={`w-3.5 h-3.5 shrink-0 ${cloudConnected ? 'text-emerald-400' : 'text-amber-400'}`} />
              <span className="truncate group-hover:text-slate-200">Firebase (Producción)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[9px] uppercase font-bold text-emerald-400 bg-emerald-950/60 px-1 py-0.2 rounded border border-emerald-800/50">PROD</span>
              <span className={`w-2 h-2 rounded-full shrink-0 ${cloudConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`}></span>
            </div>
          </div>
        </div>

        {/* Logout Footer */}
        <div className="p-3 border-t border-slate-800">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl transition text-slate-400 hover:text-rose-400 hover:bg-slate-800/90 border border-slate-800 text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Settings Modal */}
      <ConfigModal isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} />
    </>
  );
};
