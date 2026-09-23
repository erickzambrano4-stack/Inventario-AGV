import React, { useState, useEffect } from 'react';
import { Usuario, Role } from '../types';
import { useInventory } from '../context/InventoryContext';
import {
  X,
  Shield,
  ShieldAlert,
  MapPin,
  Lock,
  User,
  Eye,
  EyeOff,
  Save,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface EditUserModalProps {
  isOpen: boolean;
  user: Usuario | null;
  currentAdminUsername?: string;
  totalAdminsCount: number;
  onSave: (username: string, updates: { role?: Role; up?: string; name?: string; newPassword?: string }) => Promise<boolean>;
  onClose: () => void;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  user,
  currentAdminUsername,
  totalAdminsCount,
  onSave,
  onClose
}) => {
  const { ups } = useInventory();
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('supervisor');
  const [up, setUp] = useState<string>('LUPITA');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setRole(user.role === 'admin' ? 'admin' : 'supervisor');
      setUp(user.up || (user.role === 'admin' ? 'ALL' : 'LUPITA'));
      setNewPassword('');
      setShowPassword(false);
      setErrorMsg(null);
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const isCurrentAdmin = user.username === currentAdminUsername;
  const isOnlyAdmin = user.role === 'admin' && totalAdminsCount <= 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('El nombre completo es obligatorio');
      return;
    }

    if (newPassword && newPassword.length < 6) {
      setErrorMsg('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (isOnlyAdmin && role !== 'admin') {
      setErrorMsg('No puedes quitar el rol de Administrador al único administrador registrado');
      return;
    }

    setIsSaving(true);
    try {
      const success = await onSave(user.username, {
        name: name.trim(),
        role,
        up: role === 'admin' ? (up || 'ALL') : up,
        newPassword: newPassword ? newPassword.trim() : undefined
      });

      if (success) {
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al guardar los cambios');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9990] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200 my-8">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 text-white rounded-2xl shadow-md shadow-amber-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">Editar Permisos de Usuario</h3>
              <p className="text-xs text-gray-500">
                Ajusta los niveles de acceso, sede asignada o credenciales
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-xl hover:bg-gray-100 transition"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* User identifier (read only) */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gray-200 text-gray-700 flex items-center justify-center font-bold text-xs">
                <User className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Identificador de Acceso (Login)
                </span>
                <span className="font-bold text-gray-900 text-sm lowercase">{user.username}</span>
              </div>
            </div>
            {isCurrentAdmin && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Tu Cuenta Actual
              </span>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Nombre Completo *
            </label>
            <input
              type="text"
              maxLength={80}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej. Juan Pérez"
              required
              className="w-full border border-gray-200 rounded-xl p-3 bg-white text-sm focus:ring-2 focus:ring-amber-500 outline-none font-medium text-gray-900"
            />
          </div>

          {/* Role selector with descriptive cards */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Rol de Acceso y Permisos del Sistema *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option: Supervisor */}
              <button
                type="button"
                onClick={() => {
                  if (isOnlyAdmin) return;
                  setRole('supervisor');
                  if (up === 'ALL') setUp('LUPITA');
                }}
                disabled={isOnlyAdmin}
                className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between relative ${
                  role === 'supervisor' || role === 'operador'
                    ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                } ${isOnlyAdmin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    Supervisor
                  </span>
                  {(role === 'supervisor' || role === 'operador') && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Supervisión operativa de su sede: registro de entradas/salidas, recibos y solicitudes de insumos, y consulta de existencias.
                </p>
              </button>

              {/* Option: Administrador */}
              <button
                type="button"
                onClick={() => {
                  setRole('admin');
                  setUp('ALL');
                }}
                className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between relative cursor-pointer ${
                  role === 'admin'
                    ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-amber-600" />
                    Administrador
                  </span>
                  {role === 'admin' && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Control total: catálogo de ítems, permisos de usuarios, manual y reportes.
                </p>
              </button>
            </div>

            {isOnlyAdmin && (
              <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200 mt-2 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
                No se puede cambiar el rol: es el único Administrador activo en el sistema.
              </p>
            )}
          </div>

          {/* Assigned Location (UP) */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Ubicación Asignada (Subacopio / UP) *
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={up}
                onChange={e => setUp(e.target.value)}
                className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 bg-white text-sm font-medium focus:ring-2 focus:ring-amber-500 outline-none text-gray-900"
              >
                <option value="ALL">ALL (Todas las UP / Acceso Global)</option>
                {ups.map(loc => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Determina la sede de trabajo por defecto para recepciones y despachos.
            </p>
          </div>

          {/* Password Reset (Optional) */}
          <div className="pt-2 border-t border-gray-100">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-gray-500" />
                Cambiar Contraseña (Opcional)
              </span>
              <span className="text-[10px] font-normal text-gray-400 lowercase">
                dejar en blanco para no cambiar
              </span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                minLength={6}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Nueva contraseña (mínimo 6 caracteres)"
                className="w-full border border-gray-200 rounded-xl pl-3.5 pr-10 py-2.5 bg-white text-sm focus:ring-2 focus:ring-amber-500 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-lg"
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold text-sm transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl font-semibold text-white text-sm bg-amber-500 hover:bg-amber-600 shadow-md shadow-amber-500/25 transition flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Guardando...' : 'Guardar Permisos'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
