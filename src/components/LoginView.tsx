import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { User, Lock, Eye, EyeOff, Database, ArrowRight, ShieldAlert } from 'lucide-react';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MS = 60 * 1000;

export const LoginView: React.FC = () => {
  const { login, appSettings, showToast } = useInventory();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    if (lockoutUntil <= Date.now()) return;

    const interval = setInterval(() => {
      const diff = Math.ceil((lockoutUntil - Date.now()) / 1000);
      if (diff <= 0) {
        setLockoutUntil(0);
        setRemainingSeconds(0);
      } else {
        setRemainingSeconds(diff);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutUntil]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (Date.now() < lockoutUntil) {
      showToast(`Demasiados intentos. Espera ${remainingSeconds} segundos.`, 'error');
      return;
    }

    if (!username.trim() || !password) {
      showToast('Por favor ingresa usuario y contraseña', 'warning');
      return;
    }

    setLoading(true);

    try {
      const result = await login(username, password);
      if (result.success) {
        showToast(result.message, 'success');
        setAttempts(0);
      } else {
        const nextAttempts = attempts + 1;
        setAttempts(nextAttempts);

        if (nextAttempts >= MAX_LOGIN_ATTEMPTS) {
          const until = Date.now() + LOCKOUT_MS;
          setLockoutUntil(until);
          setRemainingSeconds(Math.ceil(LOCKOUT_MS / 1000));
          setAttempts(0);
          showToast('Cuenta bloqueada temporalmente por intentos fallidos.', 'error');
        } else {
          showToast(result.message, 'error');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const isLocked = Date.now() < lockoutUntil;

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50/40">
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/70 border border-gray-100 max-w-md w-full overflow-hidden relative transition-all">
        {/* Accent Top Line */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500"></div>

        <div className="p-8 sm:p-10">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white mb-4 shadow-lg shadow-blue-500/25 p-1">
              {appSettings.logoUrl ? (
                <img
                  src={appSettings.logoUrl}
                  alt="Logo"
                  className="w-full h-full object-contain rounded-xl bg-white p-1"
                  onError={e => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <Database className="w-8 h-8" />
              )}
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              {appSettings.appName}
            </h1>
            <p className="text-sm text-gray-500 mt-1.5">
              Control de Inventario y Subacopios
            </p>
          </div>

          {/* Lockout Warning */}
          {isLocked && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3 animate-pulse">
              <ShieldAlert className="w-5 h-5 shrink-0 text-rose-600" />
              <span>Demasiados intentos fallidos. Intenta de nuevo en <strong>{remainingSeconds} segundos</strong>.</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Usuario
              </label>
              <div className="relative">
                <User className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Ej. admin"
                  disabled={isLocked || loading}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50/70 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition disabled:opacity-50"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isLocked || loading}
                  className="w-full pl-11 pr-11 py-3 bg-gray-50/70 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition disabled:opacity-50"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  aria-label="Ver contraseña"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLocked || loading}
              className="w-full mt-2 py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Verificando credenciales...</span>
                </>
              ) : (
                <>
                  <span>Ingresar al Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="py-3 px-8 bg-slate-50 border-t border-gray-100 text-center text-[11px] text-gray-400">
          Sincronizado con Firebase Cloud &amp; Respaldo Local Seguro
        </div>
      </div>
    </div>
  );
};
