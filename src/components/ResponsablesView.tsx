import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { ResponsableAlmacen } from '../types';
import {
  UserCheck,
  UserPlus,
  Building2,
  Phone,
  Mail,
  MapPin,
  Pencil,
  Trash2,
  ShieldAlert,
  Search,
  CheckCircle2,
  XCircle,
  FileText,
  X,
  Lock,
  Shield
} from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

const PRESET_CARGOS = [
  'Encargado de Almacén General',
  'Jefe de Bodega Agrícola',
  'Supervisora de Almacén e Inventarios',
  'Custodio de Agroquímicos y Fertilizantes',
  'Encargado de Insumos y Empaque',
  'Auxiliar de Almacén'
];

export const ResponsablesView: React.FC = () => {
  const {
    responsables,
    ups,
    currentUser,
    userAllowedUps,
    isGlobalAccess,
    primaryUp,
    addResponsable,
    updateResponsable,
    deleteResponsable,
    showToast,
    setActiveTab
  } = useInventory();

  // Form states
  const [nombre, setNombre] = useState('');
  const [up, setUp] = useState<string>(() => {
    return isGlobalAccess ? (ups[0] || 'LUPITA') : primaryUp;
  });
  const [cargo, setCargo] = useState(PRESET_CARGOS[0]);
  const [customCargo, setCustomCargo] = useState('');
  const [isCustomCargo, setIsCustomCargo] = useState(false);
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [notas, setNotas] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters & search
  const [filterUp, setFilterUp] = useState<string>(() => {
    return isGlobalAccess ? 'ALL' : primaryUp;
  });
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState<'all' | 'activos' | 'inactivos'>('all');

  // Sync state if permissions change
  React.useEffect(() => {
    if (!isGlobalAccess) {
      if (filterUp === 'ALL' || !userAllowedUps.includes(filterUp.toUpperCase())) {
        setFilterUp(primaryUp);
      }
      if (!userAllowedUps.includes(up.toUpperCase())) {
        setUp(primaryUp);
      }
    }
  }, [isGlobalAccess, userAllowedUps, primaryUp, filterUp, up]);

  // Edit modal
  const [editingResp, setEditingResp] = useState<ResponsableAlmacen | null>(null);

  // Delete modal
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Scoped UPs list for the current user
  const effectiveUps = useMemo(() => {
    return isGlobalAccess ? ups : userAllowedUps;
  }, [ups, isGlobalAccess, userAllowedUps]);

  // Check which UPs lack an active responsible
  const upsWithoutResponsable = useMemo(() => {
    return effectiveUps.filter(
      upName => !responsables.some(r => r.up.toUpperCase() === upName.toUpperCase() && r.activo)
    );
  }, [effectiveUps, responsables]);

  // Authorized base responsables
  const authorizedResponsables = useMemo(() => {
    if (isGlobalAccess) return responsables;
    return responsables.filter(r => userAllowedUps.includes((r.up || '').trim().toUpperCase()));
  }, [responsables, isGlobalAccess, userAllowedUps]);

  // Filtered list
  const filteredResponsables = useMemo(() => {
    return authorizedResponsables.filter(r => {
      if (filterUp !== 'ALL' && r.up.toUpperCase() !== filterUp.toUpperCase()) {
        return false;
      }
      if (filterEstado === 'activos' && !r.activo) return false;
      if (filterEstado === 'inactivos' && r.activo) return false;

      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesName = r.nombre.toLowerCase().includes(query);
        const matchesCargo = r.cargo.toLowerCase().includes(query);
        const matchesUp = r.up.toLowerCase().includes(query);
        const matchesTel = (r.telefono || '').toLowerCase().includes(query);
        if (!matchesName && !matchesCargo && !matchesUp && !matchesTel) return false;
      }

      return true;
    });
  }, [authorizedResponsables, filterUp, filterEstado, search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      showToast('Ingresa el nombre del responsable de almacén', 'warning');
      return;
    }

    const finalCargo = isCustomCargo ? (customCargo.trim() || 'Encargado de Almacén') : cargo;

    setIsSubmitting(true);
    try {
      const ok = await addResponsable({
        nombre: nombre.trim(),
        up,
        cargo: finalCargo,
        telefono: telefono.trim() || undefined,
        email: email.trim() || undefined,
        notas: notas.trim() || undefined,
        activo: true
      });

      if (ok) {
        setNombre('');
        setTelefono('');
        setEmail('');
        setNotas('');
        setIsCustomCargo(false);
        setCustomCargo('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    await deleteResponsable(deleteTargetId);
    setDeleteTargetId(null);
  };

  const handleToggleActivo = async (resp: ResponsableAlmacen) => {
    await updateResponsable(resp.id, { activo: !resp.activo });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResp) return;
    if (!editingResp.nombre.trim()) {
      showToast('El nombre no puede estar vacío', 'warning');
      return;
    }

    await updateResponsable(editingResp.id, {
      nombre: editingResp.nombre.trim(),
      cargo: editingResp.cargo.trim(),
      up: editingResp.up,
      telefono: editingResp.telefono?.trim() || undefined,
      email: editingResp.email?.trim() || undefined,
      notas: editingResp.notas?.trim() || undefined,
      activo: editingResp.activo
    });

    setEditingResp(null);
  };

  return (
    <div className="space-y-6">
      {/* Security Banner for restricted users */}
      {!isGlobalAccess && (
        <div className="bg-gradient-to-r from-teal-500/10 via-emerald-500/5 to-transparent border border-teal-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-600 text-white rounded-xl shadow-xs shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <span>Gestión de Responsables Filtrada</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-200/80 text-teal-900">
                  UP: {userAllowedUps.join(', ')}
                </span>
              </h4>
              <p className="text-xs text-gray-600 mt-0.5">
                Visualizando y configurando custodios exclusivamente para tu sede autorizada ({currentUser?.name}).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-800 bg-white px-3 py-1.5 rounded-xl border border-teal-100 shrink-0 self-start sm:self-auto shadow-2xs">
            <Shield className="w-3.5 h-3.5 text-teal-600" />
            <span>Sede Asignada</span>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-50 text-teal-600 rounded-2xl border border-teal-100">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                Responsables de Almacén por UP
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Designa y gestiona a los encargados de bodega, custodios y receptores autorizados en cada sede.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3.5 py-2 bg-slate-50 border border-gray-200 rounded-2xl text-xs font-semibold text-gray-700 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-500"></span>
            <span>{authorizedResponsables.length} Responsables Registrados</span>
          </div>
          <div className="px-3.5 py-2 bg-blue-50 border border-blue-200 rounded-2xl text-xs font-semibold text-blue-800 flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            <span>{effectiveUps.length - upsWithoutResponsable.length} de {effectiveUps.length} UPs Cubiertas</span>
          </div>
        </div>
      </div>

      {/* Warning banner if UPs without responsible */}
      {upsWithoutResponsable.length > 0 && (
        <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900 animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                {upsWithoutResponsable.length} {upsWithoutResponsable.length === 1 ? 'UP no tiene' : 'UPs no tienen'} responsable de almacén activo asignado:
              </p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {upsWithoutResponsable.map(u => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUp(u)}
                    className="px-2 py-0.5 bg-amber-200/70 hover:bg-amber-300 text-amber-950 font-bold rounded-md transition cursor-pointer"
                    title={`Asignar responsable a ${u}`}
                  >
                    + Asignar a {u}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid: Create Form (Left) & List (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Create Responsable Form (col 1-4) */}
        <div className="lg:col-span-4 bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-teal-600" />
            Registrar Responsable de Almacén
          </h2>
          <p className="text-xs text-gray-500 mb-5">
            Los datos se usarán para autorizar y firmar automáticamente las solicitudes y recibos de insumos.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Nombre */}
            <div>
              <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Nombre Completo *
              </label>
              <input
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej. Ing. Carlos Mendoza"
                required
                className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl font-medium focus:ring-2 focus:ring-teal-500 outline-none text-gray-900 text-xs"
              />
            </div>

            {/* UP Asignada */}
            <div>
              <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Unidad de Producción (UP) *</span>
                {!isGlobalAccess && (
                  <span className="text-[10px] font-extrabold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                    Sede Asignada
                  </span>
                )}
              </label>
              {isGlobalAccess ? (
                <select
                  value={up}
                  onChange={e => setUp(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl font-semibold text-gray-800 focus:ring-2 focus:ring-teal-500 outline-none text-xs"
                >
                  {ups.map(u => (
                    <option key={u} value={u}>
                      {u} {responsables.some(r => r.up.toUpperCase() === u.toUpperCase() && r.activo) ? '✓' : '(Sin asignar)'}
                    </option>
                  ))}
                </select>
              ) : userAllowedUps.length > 1 ? (
                <select
                  value={up}
                  onChange={e => setUp(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl font-semibold text-teal-900 focus:ring-2 focus:ring-teal-500 outline-none text-xs"
                >
                  {userAllowedUps.map(u => (
                    <option key={u} value={u}>
                      {u} {responsables.some(r => r.up.toUpperCase() === u.toUpperCase() && r.activo) ? '✓' : '(Sin asignar)'}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="w-full px-3.5 py-2.5 bg-teal-50/70 border border-teal-200 rounded-xl font-bold text-teal-900 flex items-center gap-2 text-xs">
                  <Lock className="w-3.5 h-3.5 text-teal-600" />
                  <span>UP {primaryUp}</span>
                </div>
              )}
            </div>

            {/* Cargo */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block font-bold text-gray-700 uppercase tracking-wider">
                  Cargo / Puesto *
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomCargo(!isCustomCargo)}
                  className="text-[11px] text-teal-600 hover:text-teal-700 font-bold hover:underline cursor-pointer"
                >
                  {isCustomCargo ? 'Elegir sugeridos' : 'Personalizar'}
                </button>
              </div>

              {isCustomCargo ? (
                <input
                  type="text"
                  value={customCargo}
                  onChange={e => setCustomCargo(e.target.value)}
                  placeholder="Ej. Coordinador de Fitosanidad"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl font-medium focus:ring-2 focus:ring-teal-500 outline-none text-xs"
                />
              ) : (
                <select
                  value={cargo}
                  onChange={e => setCargo(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl font-medium text-gray-800 focus:ring-2 focus:ring-teal-500 outline-none text-xs"
                >
                  {PRESET_CARGOS.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Contacto: Telefono y Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Teléfono / Móvil
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={telefono}
                    onChange={e => setTelefono(e.target.value)}
                    placeholder="(616) 123-4567"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl font-medium focus:ring-2 focus:ring-teal-500 outline-none text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="almacen@ejemplo.com"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl font-medium focus:ring-2 focus:ring-teal-500 outline-none text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Notas */}
            <div>
              <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Notas / Área de Custodia
              </label>
              <textarea
                value={notas}
                onChange={e => setNotas(e.target.value)}
                rows={2}
                placeholder="Ej. Bodega principal de agroquímicos y herramientas pesadas..."
                className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl font-medium focus:ring-2 focus:ring-teal-500 outline-none text-xs resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !nombre.trim()}
              className="w-full mt-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl shadow-md shadow-teal-600/20 transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isSubmitting ? 'Guardando...' : 'Asignar Responsable'}</span>
            </button>
          </form>
        </div>

        {/* List of Responsables (col 5-12) */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Filter Bar */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre, cargo, sede o teléfono..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-gray-200 rounded-xl font-medium focus:ring-2 focus:ring-teal-500 outline-none text-xs"
              />
            </div>

            {/* Filter UP */}
            <div className="flex items-center gap-2">
              {isGlobalAccess ? (
                <select
                  value={filterUp}
                  onChange={e => setFilterUp(e.target.value)}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-xl font-semibold text-gray-700 outline-none text-xs"
                >
                  <option value="ALL">Todas las UPs ({ups.length})</option>
                  {ups.map(u => (
                    <option key={u} value={u}>UP {u}</option>
                  ))}
                </select>
              ) : userAllowedUps.length > 1 ? (
                <select
                  value={filterUp}
                  onChange={e => setFilterUp(e.target.value)}
                  className="px-3 py-2 bg-teal-50 border border-teal-200 rounded-xl font-semibold text-teal-900 outline-none text-xs"
                >
                  {userAllowedUps.map(u => (
                    <option key={u} value={u}>UP {u}</option>
                  ))}
                </select>
              ) : (
                <div className="px-3 py-2 bg-teal-50 border border-teal-200 rounded-xl font-bold text-teal-900 flex items-center gap-1.5 text-xs">
                  <Lock className="w-3.5 h-3.5 text-teal-600" />
                  <span>UP {primaryUp}</span>
                </div>
              )}

              <select
                value={filterEstado}
                onChange={e => setFilterEstado(e.target.value as any)}
                className="px-3 py-2 bg-white border border-gray-200 rounded-xl font-semibold text-gray-700 outline-none text-xs"
              >
                <option value="all">Todos los estados</option>
                <option value="activos">Solo Activos</option>
                <option value="inactivos">Solo Inactivos</option>
              </select>
            </div>
          </div>

          {/* Cards List */}
          {filteredResponsables.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-3xl p-12 text-center text-gray-500">
              <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="font-bold text-gray-800 text-sm">No se encontraron responsables de almacén</p>
              <p className="text-xs text-gray-500 mt-1">
                Prueba ajustando los filtros de búsqueda o registra un nuevo responsable en el formulario lateral.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredResponsables.map(resp => {
                const initials = resp.nombre
                  .split(' ')
                  .map(n => n[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();

                return (
                  <div
                    key={resp.id}
                    className={`bg-white border rounded-2xl p-5 shadow-xs transition hover:shadow-md flex flex-col justify-between ${
                      resp.activo ? 'border-gray-200 hover:border-teal-300' : 'border-gray-200 bg-gray-50/60 opacity-75'
                    }`}
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-xs ${
                            resp.activo
                              ? 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-teal-500/20'
                              : 'bg-gray-200 text-gray-600'
                          }`}>
                            {initials}
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 text-sm leading-tight">
                              {resp.nombre}
                            </h3>
                            <p className="text-xs text-teal-700 font-semibold mt-0.5">
                              {resp.cargo}
                            </p>
                          </div>
                        </div>

                        {/* UP badge */}
                        <div className="text-right">
                          <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-bold text-[11px] inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-blue-500" />
                            {resp.up}
                          </span>
                        </div>
                      </div>

                      {/* Contact details */}
                      <div className="space-y-1.5 py-2.5 border-t border-b border-gray-100 text-xs text-gray-600">
                        {resp.telefono && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                            <span>{resp.telefono}</span>
                          </div>
                        )}
                        {resp.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-gray-400" />
                            <span className="truncate">{resp.email}</span>
                          </div>
                        )}
                        {resp.notas && (
                          <div className="flex items-start gap-2 pt-1 text-[11px] text-gray-500 italic">
                            <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                            <span>{resp.notas}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom action controls */}
                    <div className="flex items-center justify-between gap-2 mt-4 pt-1">
                      <button
                        type="button"
                        onClick={() => handleToggleActivo(resp)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                          resp.activo
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                        }`}
                      >
                        {resp.activo ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Activo
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-gray-400" /> Inactivo
                          </>
                        )}
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingResp(resp)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                          title="Editar responsable"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTargetId(resp.id)}
                          className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Eliminar responsable"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick link to Solicitudes */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
            <div>
              <p className="font-bold text-sm">¿Deseas generar una Solicitud o Vale de Insumos?</p>
              <p className="text-xs text-slate-300 mt-0.5">
                Utiliza a los responsables asignados para emitir comprobantes membretados e imprimibles.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('solicitudes')}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl transition shadow-md whitespace-nowrap cursor-pointer"
            >
              Ir a Solicitudes / Recibos
            </button>
          </div>

        </div>

      </div>

      {/* Edit Modal */}
      {editingResp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                  <Pencil className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-gray-900 text-base">
                  Editar Responsable de Almacén
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingResp(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  value={editingResp.nombre}
                  onChange={e => setEditingResp({ ...editingResp, nombre: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl font-medium focus:ring-2 focus:ring-teal-500 outline-none text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                  UP Asignada *
                </label>
                <select
                  value={editingResp.up}
                  onChange={e => setEditingResp({ ...editingResp, up: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl font-semibold text-gray-800 focus:ring-2 focus:ring-teal-500 outline-none text-xs"
                >
                  {effectiveUps.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Cargo / Puesto *
                </label>
                <input
                  type="text"
                  value={editingResp.cargo}
                  onChange={e => setEditingResp({ ...editingResp, cargo: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl font-medium focus:ring-2 focus:ring-teal-500 outline-none text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={editingResp.telefono || ''}
                    onChange={e => setEditingResp({ ...editingResp, telefono: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl font-medium focus:ring-2 focus:ring-teal-500 outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Correo
                  </label>
                  <input
                    type="email"
                    value={editingResp.email || ''}
                    onChange={e => setEditingResp({ ...editingResp, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl font-medium focus:ring-2 focus:ring-teal-500 outline-none text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Notas
                </label>
                <textarea
                  value={editingResp.notas || ''}
                  onChange={e => setEditingResp({ ...editingResp, notas: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl font-medium focus:ring-2 focus:ring-teal-500 outline-none text-xs resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editActivo"
                  checked={editingResp.activo}
                  onChange={e => setEditingResp({ ...editingResp, activo: e.target.checked })}
                  className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                />
                <label htmlFor="editActivo" className="font-semibold text-gray-800 text-xs cursor-pointer">
                  Responsable en funciones (Activo)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingResp(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium text-xs transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs shadow-md shadow-teal-600/25 transition cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTargetId)}
        title="Eliminar Responsable de Almacén"
        message="¿Estás seguro de eliminar permanentemente a este responsable? Si ya cuenta con documentos emitidos, se recomienda conservarlo o marcarlo como inactivo."
        confirmText="Sí, Eliminar"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};
