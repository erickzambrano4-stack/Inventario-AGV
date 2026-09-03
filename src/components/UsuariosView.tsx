import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { INITIAL_UPS, Role } from '../types';
import {
  Users,
  UserPlus,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  MapPin,
  Lock,
  User
} from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

const PAGE_SIZE = 8;

export const UsuariosView: React.FC = () => {
  const { usuarios, currentUser, addUser, deleteUser, showToast } = useInventory();

  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newRole, setNewRole] = useState<Role>('operador');
  const [newUp, setNewUp] = useState<string>('LUPITA');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTargetUser, setDeleteTargetUser] = useState<string | null>(null);

  // Filtered users
  const filtered = useMemo(() => {
    return usuarios.filter(
      u =>
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.up.toLowerCase().includes(search.toLowerCase()) ||
        u.role.toLowerCase().includes(search.toLowerCase())
    );
  }, [usuarios, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    const usernameClean = newUsername.trim().toLowerCase();
    if (!usernameClean || !newName.trim() || !newPass) {
      showToast('Todos los campos son obligatorios', 'warning');
      return;
    }

    if (!/^[a-z0-9._-]+$/.test(usernameClean)) {
      showToast('El usuario solo debe contener letras, números, puntos o guiones', 'error');
      return;
    }

    if (newPass.length < 6) {
      showToast('La contraseña debe tener al menos 6 caracteres', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await addUser({
        username: usernameClean,
        name: newName.trim(),
        password: newPass,
        role: newRole,
        up: newRole === 'admin' ? 'ALL' : newUp
      });

      if (ok) {
        setNewUsername('');
        setNewName('');
        setNewPass('');
        setNewRole('operador');
        setNewUp('LUPITA');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetUser) return;
    await deleteUser(deleteTargetUser);
    setDeleteTargetUser(null);
  };

  return (
    <div className="space-y-6">
      {/* Create User Card */}
      <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6 sm:p-8 border-t-4 border-t-amber-500">
        <h2 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2.5">
          <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
            <UserPlus className="w-5 h-5" />
          </div>
          Crear Nuevo Usuario del Sistema
        </h2>

        <form onSubmit={handleCreateUser} className="bg-slate-50/70 p-5 rounded-2xl border border-gray-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                Usuario (Login) *
              </label>
              <input
                type="text"
                maxLength={30}
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
                placeholder="jperez"
                className="w-full border border-gray-200 rounded-xl p-2.5 bg-white text-sm focus:ring-2 focus:ring-amber-500 outline-none lowercase font-medium"
                required
              />
            </div>

            <div className="lg:col-span-3">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                Nombre Completo *
              </label>
              <input
                type="text"
                maxLength={80}
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Juan Pérez"
                className="w-full border border-gray-200 rounded-xl p-2.5 bg-white text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                required
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                Contraseña *
              </label>
              <input
                type="password"
                minLength={6}
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                placeholder="Mín. 6 car."
                className="w-full border border-gray-200 rounded-xl p-2.5 bg-white text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                required
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                Rol de Acceso *
              </label>
              <select
                value={newRole}
                onChange={e => {
                  const r = e.target.value as Role;
                  setNewRole(r);
                  if (r === 'admin') setNewUp('ALL');
                }}
                className="w-full border border-gray-200 rounded-xl p-2.5 bg-white text-sm font-medium focus:ring-2 focus:ring-amber-500 outline-none"
              >
                <option value="operador">Operador</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                Ubicación (UP) *
              </label>
              <select
                value={newUp}
                onChange={e => setNewUp(e.target.value)}
                disabled={newRole === 'admin'}
                className="w-full border border-gray-200 rounded-xl p-2.5 bg-white text-sm font-medium focus:ring-2 focus:ring-amber-500 outline-none disabled:opacity-60 disabled:bg-gray-100"
              >
                <option value="ALL">Todas las UP</option>
                {INITIAL_UPS.map(loc => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-2.5 font-semibold text-sm transition shadow-md shadow-amber-500/25 flex items-center justify-center gap-1 disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                <span>Crear</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gray-50/40">
          <div>
            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-500" />
              Directorio de Usuarios ({usuarios.length})
            </h3>
            <p className="text-xs text-gray-500">Cuentas con acceso al sistema y sus permisos respectivos</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar usuario o nombre..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] text-gray-500 uppercase tracking-wider bg-slate-50 border-b border-gray-100 font-semibold">
              <tr>
                <th className="px-6 py-3.5">Usuario</th>
                <th className="px-6 py-3.5">Nombre Completo</th>
                <th className="px-6 py-3.5">Rol</th>
                <th className="px-6 py-3.5">Ubicación Asignada (UP)</th>
                <th className="px-6 py-3.5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pageItems.length > 0 ? (
                pageItems.map(user => {
                  const isCurrent = user.username === currentUser?.username;
                  const isMainAdmin = user.username === 'admin';
                  const isAdminRole = user.role === 'admin';

                  return (
                    <tr key={user.username} className="hover:bg-slate-50/60 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 lowercase">{user.username}</span>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                              TÚ
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-gray-700 font-medium">{user.name}</td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${
                            isAdminRole
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          <Shield className="w-3 h-3" />
                          {isAdminRole ? 'Administrador' : 'Operador'}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold">
                          <MapPin className="w-3.5 h-3.5 text-gray-500" />
                          {user.up || 'ALL'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setDeleteTargetUser(user.username)}
                          disabled={isCurrent || isMainAdmin}
                          className={`p-1.5 rounded-lg transition ${
                            isCurrent || isMainAdmin
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-rose-500 hover:text-rose-700 hover:bg-rose-50'
                          }`}
                          title={isCurrent ? 'No puedes eliminar tu propia cuenta' : 'Eliminar usuario'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-gray-400 text-sm">
                    No se encontraron usuarios.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-3.5 border-t border-gray-100 bg-gray-50/40 gap-3">
            <p className="text-xs text-gray-500">
              Mostrando {Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)} a{' '}
              {Math.min(currentPage * PAGE_SIZE, filtered.length)} de {filtered.length} usuarios
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Anterior
              </button>
              <span className="text-xs font-medium text-gray-500">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition"
              >
                Siguiente <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete User Confirmation */}
      <ConfirmModal
        isOpen={Boolean(deleteTargetUser)}
        title="Eliminar Usuario"
        message={`¿Estás seguro de revocar y eliminar permanentemente la cuenta de "${deleteTargetUser}"?`}
        confirmText="Sí, Eliminar Usuario"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTargetUser(null)}
      />
    </div>
  );
};
