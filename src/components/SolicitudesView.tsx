import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import {
  SolicitudInsumo,
  SolicitudInsumoItem,
  EstadoSolicitud
} from '../types';
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  Printer,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  Calendar,
  User,
  ShieldCheck,
  Package,
  X,
  Lock,
  Shield,
  PlusCircle,
  Check
} from 'lucide-react';
import { ReciboPrintModal } from './ReciboPrintModal';
import { ConfirmModal } from './ConfirmModal';

export const SolicitudesView: React.FC = () => {
  const {
    solicitudes,
    items,
    inventario,
    ups,
    responsables,
    currentUser,
    userAllowedUps,
    isGlobalAccess,
    primaryUp,
    appSettings,
    addSolicitud,
    updateSolicitudEstado,
    deleteSolicitud,
    showToast,
    setActiveTab
  } = useInventory();

  const isAdmin = currentUser?.role === 'admin';

  // Filters
  const [filterEstado, setFilterEstado] = useState<'all' | EstadoSolicitud>('all');
  const [filterUp, setFilterUp] = useState<string>(() => {
    return isGlobalAccess ? 'ALL' : primaryUp;
  });
  const [search, setSearch] = useState('');

  // Sync filterUp if permissions update
  React.useEffect(() => {
    if (!isGlobalAccess) {
      if (filterUp === 'ALL' || !userAllowedUps.includes(filterUp.toUpperCase())) {
        setFilterUp(primaryUp);
      }
    }
  }, [isGlobalAccess, userAllowedUps, primaryUp, filterUp]);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewingSolicitud, setViewingSolicitud] = useState<SolicitudInsumo | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Form states for creating a new Solicitud
  const [formUp, setFormUp] = useState<string>(() => {
    if (!isGlobalAccess) return primaryUp;
    if (currentUser?.up && currentUser.up !== 'ALL' && ups.includes(currentUser.up)) {
      return currentUser.up;
    }
    return ups[0] || 'LUPITA';
  });
  const [formSolicitante, setFormSolicitante] = useState('');
  const [formResponsable, setFormResponsable] = useState('');
  const [formCargo, setFormCargo] = useState('');
  const [formFecha, setFormFecha] = useState(() => new Date().toISOString().split('T')[0]);
  const [formPrioridad, setFormPrioridad] = useState<'normal' | 'urgente'>('normal');
  const [formEstado, setFormEstado] = useState<EstadoSolicitud>('pendiente');
  const [formArea, setFormArea] = useState('');
  const [formObservaciones, setFormObservaciones] = useState('');

  // Dynamic Item lines in creation form
  const [lineItems, setLineItems] = useState<SolicitudInsumoItem[]>([]);
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<string>('');
  const [productSearch, setProductSearch] = useState('');
  const [qtyToAdd, setQtyToAdd] = useState<number>(1);
  const [itemNoteToAdd, setItemNoteToAdd] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mode for adding custom / brand-new item not in catalog yet
  const [isCustomItemMode, setIsCustomItemMode] = useState(false);
  const [customItemId, setCustomItemId] = useState('');
  const [customItemDesc, setCustomItemDesc] = useState('');
  const [customItemArea, setCustomItemArea] = useState('GENERAL');
  const [customItemUnidad, setCustomItemUnidad] = useState('PZA');

  // When form UP changes, auto-suggest the active responsable for that UP
  const upResponsables = useMemo(() => {
    return responsables.filter(r => r.up.toUpperCase() === formUp.toUpperCase() && r.activo);
  }, [responsables, formUp]);

  // Sync default responsable when form UP changes or opens
  const handleUpChange = (newUp: string) => {
    setFormUp(newUp);
    const available = responsables.filter(r => r.up.toUpperCase() === newUp.toUpperCase() && r.activo);
    if (available.length > 0) {
      setFormResponsable(available[0].nombre);
      setFormCargo(available[0].cargo);
    } else {
      setFormResponsable('');
      setFormCargo('');
    }
  };

  const openCreateModal = () => {
    const initialUp = !isGlobalAccess ? primaryUp : (ups[0] || 'LUPITA');
    
    setFormUp(initialUp);
    const available = responsables.filter(r => r.up.toUpperCase() === initialUp.toUpperCase() && r.activo);
    if (available.length > 0) {
      setFormResponsable(available[0].nombre);
      setFormCargo(available[0].cargo);
    } else {
      setFormResponsable('');
      setFormCargo('');
    }

    setFormSolicitante('');
    setFormArea('');
    setFormObservaciones('');
    setFormPrioridad('normal');
    setFormEstado('pendiente');
    setFormFecha(new Date().toISOString().split('T')[0]);
    setLineItems([]);
    setSelectedProductToAdd('');
    setProductSearch('');
    setQtyToAdd(1);
    setItemNoteToAdd('');
    setIsCustomItemMode(false);
    setCustomItemId('');
    setCustomItemDesc('');
    setIsCreateOpen(true);
  };

  // Add line item from catalog
  const handleAddLineItem = () => {
    if (isCustomItemMode) {
      // Adding a new product that will also be added to catalog and inventory
      const cleanId = customItemId.trim().toUpperCase();
      const cleanDesc = customItemDesc.trim();

      if (!cleanId) {
        showToast('Ingresa el código o SKU del nuevo producto', 'warning');
        return;
      }
      if (!cleanDesc) {
        showToast('Ingresa la descripción del nuevo producto', 'warning');
        return;
      }
      if (qtyToAdd <= 0) {
        showToast('La cantidad debe ser mayor a 0', 'warning');
        return;
      }

      // Check if already in lineItems
      const existingIndex = lineItems.findIndex(l => l.itemId.toUpperCase() === cleanId);
      if (existingIndex >= 0) {
        const updated = [...lineItems];
        updated[existingIndex].cantidad += qtyToAdd;
        if (itemNoteToAdd) updated[existingIndex].notas = itemNoteToAdd;
        setLineItems(updated);
      } else {
        setLineItems([
          ...lineItems,
          {
            itemId: cleanId,
            desc: cleanDesc,
            unidad: customItemUnidad,
            area: customItemArea,
            cantidad: qtyToAdd,
            stockActualUp: 0,
            notas: itemNoteToAdd.trim() || 'Nuevo producto a registrar'
          }
        ]);
      }

      // Reset custom inputs
      setCustomItemId('');
      setCustomItemDesc('');
      setQtyToAdd(1);
      setItemNoteToAdd('');
      setIsCustomItemMode(false);
      showToast(`Insumo [${cleanId}] preparado. Se dará de alta en catálogo e inventario al guardar.`, 'info');
      return;
    }

    if (!selectedProductToAdd) {
      showToast('Selecciona un producto del catálogo para agregar', 'warning');
      return;
    }
    if (qtyToAdd <= 0) {
      showToast('La cantidad debe ser mayor a 0', 'warning');
      return;
    }

    const catalogItem = items.find(i => i.id === selectedProductToAdd);
    if (!catalogItem) return;

    // Check current stock in this UP
    const inv = inventario.find(i => i.id === selectedProductToAdd);
    const stockActual = inv?.upStock[formUp] || 0;

    // Check if already in lineItems
    const existingIndex = lineItems.findIndex(l => l.itemId === selectedProductToAdd);
    if (existingIndex >= 0) {
      const updated = [...lineItems];
      updated[existingIndex].cantidad += qtyToAdd;
      if (itemNoteToAdd) {
        updated[existingIndex].notas = itemNoteToAdd;
      }
      setLineItems(updated);
    } else {
      setLineItems([
        ...lineItems,
        {
          itemId: catalogItem.id,
          desc: catalogItem.desc,
          unidad: catalogItem.unidad,
          area: catalogItem.area,
          cantidad: qtyToAdd,
          stockActualUp: stockActual,
          notas: itemNoteToAdd.trim() || undefined
        }
      ]);
    }

    // Reset line picker
    setSelectedProductToAdd('');
    setProductSearch('');
    setQtyToAdd(1);
    setItemNoteToAdd('');
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateLineQty = (index: number, newQty: number) => {
    if (newQty <= 0) return;
    setLineItems(prev => prev.map((item, idx) => idx === index ? { ...item, cantidad: newQty } : item));
  };

  // Submit creation: automatically adds products and stock to inventory
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSolicitante.trim()) {
      showToast('Ingresa el nombre del solicitante o cuadrilla', 'warning');
      return;
    }
    if (!formResponsable.trim()) {
      showToast('Especifica o selecciona el Responsable de Almacén', 'warning');
      return;
    }
    if (lineItems.length === 0) {
      showToast('Debes agregar al menos un insumo a la solicitud', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const isApproved = formEstado === 'aprobada' || formEstado === 'entregada';
      const created = await addSolicitud(
        {
          tipo: 'solicitud',
          up: formUp,
          fecha: formFecha,
          solicitante: formSolicitante.trim(),
          responsableAlmacen: formResponsable.trim(),
          responsableCargo: formCargo.trim() || undefined,
          prioridad: formPrioridad,
          areaAplicacion: formArea.trim() || undefined,
          observaciones: formObservaciones.trim() || undefined,
          items: lineItems,
          estado: formEstado,
          usuarioCreador: currentUser?.username || 'sistema'
        },
        isApproved, // Solo afecta inventario si el estatus es Ingresada / Aprobada
        'entrada'
      );

      if (created) {
        setIsCreateOpen(false);
        setViewingSolicitud(created); // Open print preview
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Authorized base solicitudes
  const authorizedSolicitudes = useMemo(() => {
    if (isGlobalAccess) return solicitudes;
    return solicitudes.filter(s => userAllowedUps.includes((s.up || '').trim().toUpperCase()));
  }, [solicitudes, isGlobalAccess, userAllowedUps]);

  // Filtered solicitudes
  const filteredSolicitudes = useMemo(() => {
    return authorizedSolicitudes.filter(s => {
      if (filterEstado !== 'all' && s.estado !== filterEstado) return false;
      if (filterUp !== 'ALL' && s.up.toUpperCase() !== filterUp.toUpperCase()) return false;

      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesFolio = s.folio.toLowerCase().includes(query);
        const matchesSolicitante = s.solicitante.toLowerCase().includes(query);
        const matchesResponsable = s.responsableAlmacen.toLowerCase().includes(query);
        const matchesArea = (s.areaAplicacion || '').toLowerCase().includes(query);
        const matchesItem = s.items.some(
          i => i.itemId.toLowerCase().includes(query) || i.desc.toLowerCase().includes(query)
        );
        if (!matchesFolio && !matchesSolicitante && !matchesResponsable && !matchesArea && !matchesItem) {
          return false;
        }
      }

      return true;
    });
  }, [authorizedSolicitudes, filterEstado, filterUp, search]);

  // Statistics
  const stats = useMemo(() => {
    const total = authorizedSolicitudes.length;
    const pendientes = authorizedSolicitudes.filter(s => s.estado === 'pendiente').length;
    const aprobadas = authorizedSolicitudes.filter(s => s.estado === 'aprobada' || s.estado === 'entregada').length;
    const totalInsumos = authorizedSolicitudes.reduce(
      (acc, s) => acc + s.items.reduce((sum, item) => sum + (Number(item.cantidad) || 0), 0),
      0
    );

    return {
      total,
      pendientes,
      aprobadas,
      totalInsumos
    };
  }, [authorizedSolicitudes]);

  const handleQuickStatusChange = async (sol: SolicitudInsumo, nuevoEstado: EstadoSolicitud) => {
    await updateSolicitudEstado(sol.id, nuevoEstado);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    await deleteSolicitud(deleteTargetId);
    setDeleteTargetId(null);
  };

  // Filter items in add picker
  const filteredCatalogItems = useMemo(() => {
    if (!productSearch.trim()) return items.slice(0, 35);
    const q = productSearch.toLowerCase();
    return items
      .filter(i => i.id.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q) || i.area.toLowerCase().includes(q))
      .slice(0, 35);
  }, [items, productSearch]);

  const currentSelectedItem = useMemo(() => {
    return items.find(i => i.id === selectedProductToAdd);
  }, [items, selectedProductToAdd]);

  const currentSelectedStock = useMemo(() => {
    if (!selectedProductToAdd) return 0;
    const inv = inventario.find(i => i.id === selectedProductToAdd);
    return inv?.upStock[formUp] || 0;
  }, [inventario, selectedProductToAdd, formUp]);

  return (
    <div className="space-y-6">
      {/* Security Banner for restricted users */}
      {!isGlobalAccess && (
        <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent border border-blue-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <span>Solicitudes Filtradas por Sede</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-200/80 text-blue-900">
                  UP: {userAllowedUps.join(', ')}
                </span>
              </h4>
              <p className="text-xs text-gray-600 mt-0.5">
                Emitiendo solicitudes e ingresando productos al inventario exclusivamente para tu sede autorizada ({currentUser?.name}).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-800 bg-white px-3 py-1.5 rounded-xl border border-blue-100 shrink-0 self-start sm:self-auto shadow-2xs">
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            <span>Sede Asignada</span>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                Solicitudes de Insumos por UP
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Genera solicitudes de insumos con ingreso automático de productos y existencias al inventario de cada sede.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('responsables')}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer"
              title="Gestionar encargados de bodega asignados"
            >
              <User className="w-4 h-4 text-slate-600" />
              <span>Ver Responsables UP</span>
            </button>
          )}

          <button
            type="button"
            onClick={openCreateModal}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-600/25 transition cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Solicitud de Insumos</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
            Total Solicitudes
          </span>
          <span className="text-2xl font-black text-gray-900 mt-1 block">
            {stats.total}
          </span>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
            Ingresadas / Aprobadas
          </span>
          <span className="text-2xl font-black text-emerald-700 mt-1 block">
            {stats.aprobadas}
          </span>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider block">
            Pendientes
          </span>
          <span className="text-2xl font-black text-amber-600 mt-1 block">
            {stats.pendientes}
          </span>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">
            Insumos Suministrados
          </span>
          <span className="text-2xl font-black text-blue-700 mt-1 block">
            {stats.totalInsumos}
          </span>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por folio, solicitante, custodio, insumo o destino..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-gray-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 outline-none text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* UP Filter */}
            {isGlobalAccess ? (
              <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-2.5 py-1.5">
                <Building2 className="w-3.5 h-3.5 text-gray-400" />
                <select
                  value={filterUp}
                  onChange={e => setFilterUp(e.target.value)}
                  className="font-semibold text-gray-700 outline-none text-xs bg-transparent cursor-pointer"
                >
                  <option value="ALL">Todas las UPs ({ups.length})</option>
                  {ups.map(u => (
                    <option key={u} value={u}>UP {u}</option>
                  ))}
                </select>
              </div>
            ) : userAllowedUps.length > 1 ? (
              <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-xl px-2.5 py-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <select
                  value={filterUp}
                  onChange={e => setFilterUp(e.target.value)}
                  className="font-semibold text-blue-900 outline-none text-xs bg-transparent cursor-pointer"
                >
                  {userAllowedUps.map(u => (
                    <option key={u} value={u}>UP {u}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-xl px-2.5 py-1.5 text-xs text-blue-900 font-bold">
                <Lock className="w-3.5 h-3.5 text-blue-600" />
                <span>UP {primaryUp}</span>
              </div>
            )}

            {/* Estado Filter */}
            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-2.5 py-1.5">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={filterEstado}
                onChange={e => setFilterEstado(e.target.value as any)}
                className="font-semibold text-gray-700 outline-none text-xs bg-transparent cursor-pointer"
              >
                <option value="all">Todos los Estados</option>
                <option value="aprobada">Aprobada / Ingresada</option>
                <option value="pendiente">Pendiente</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* List of Solicitudes Cards */}
      {filteredSolicitudes.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-3xl p-12 text-center shadow-xs">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <ClipboardList className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-gray-900">No se encontraron solicitudes</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
            {search || filterEstado !== 'all' || filterUp !== 'ALL'
              ? 'No hay registros que coincidan con los filtros seleccionados.'
              : 'Aún no se han generado solicitudes de insumos para esta sede.'}
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Primera Solicitud</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSolicitudes.map(sol => {
            const totalQty = sol.items.reduce((acc, i) => acc + (Number(i.cantidad) || 0), 0);

            return (
              <div
                key={sol.id}
                className="bg-white border border-gray-100 rounded-3xl p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800">
                          SOLICITUD
                        </span>
                        <span className="font-mono font-black text-gray-900 text-xs">
                          {sol.folio}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 font-medium flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3" /> {sol.fecha}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold text-[11px] rounded-lg border border-blue-100 flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-blue-500" />
                        UP {sol.up}
                      </span>
                    </div>
                  </div>

                  {/* Body Information */}
                  <div className="space-y-1.5 py-3 border-t border-b border-gray-100 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                        Solicitante:
                      </span>
                      <span className="font-bold text-gray-900 block truncate">
                        {sol.solicitante}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                        Responsable de Almacén (Custodio):
                      </span>
                      <span className="font-semibold text-gray-800 block truncate">
                        {sol.responsableAlmacen}
                      </span>
                      {sol.responsableCargo && (
                        <span className="text-[10px] text-gray-500 block truncate">
                          {sol.responsableCargo}
                        </span>
                      )}
                    </div>

                    {sol.areaAplicacion && (
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                          Destino / Área:
                        </span>
                        <span className="font-medium text-blue-700 block truncate">
                          {sol.areaAplicacion}
                        </span>
                      </div>
                    )}

                    {/* Items preview */}
                    <div className="pt-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                        Insumos ({sol.items.length} {sol.items.length === 1 ? 'renglón' : 'renglones'} - {totalQty} unidades):
                      </span>
                      <div className="space-y-1 bg-slate-50 p-2 rounded-xl text-[11px]">
                        {sol.items.slice(0, 2).map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-2 text-gray-700">
                            <span className="truncate font-medium">
                              • {item.desc}
                            </span>
                            <span className="font-bold text-gray-900 whitespace-nowrap">
                              {item.cantidad} {item.unidad}
                            </span>
                          </div>
                        ))}
                        {sol.items.length > 2 && (
                          <span className="text-[10px] text-gray-400 italic block">
                            +{sol.items.length - 2} insumos más...
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stock impact indicator */}
                    {sol.aplicadoInventario ? (
                      <div className="pt-1.5 flex items-center gap-1.5 text-[10px] font-bold text-emerald-700">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Ingresado a Inventario ({sol.up})</span>
                      </div>
                    ) : (
                      <div className="pt-1.5 flex items-center gap-1.5 text-[10px] font-bold text-amber-700">
                        <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>Pendiente de Ingreso a Inventario</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer: Status & Actions */}
                <div className="pt-3.5 mt-2 flex items-center justify-between gap-2">
                  {/* Status Dropdown */}
                  <select
                    value={sol.estado}
                    onChange={e => handleQuickStatusChange(sol, e.target.value as EstadoSolicitud)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border outline-none cursor-pointer ${
                      sol.estado === 'entregada' || sol.estado === 'aprobada'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : sol.estado === 'pendiente'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    <option value="aprobada">Ingresada / Aprobada</option>
                    <option value="pendiente">Pendiente (Sin ingreso)</option>
                    <option value="cancelada">Cancelada</option>
                  </select>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setViewingSolicitud(sol)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95"
                      title="Ver e imprimir solicitud formal"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Imprimir</span>
                    </button>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setDeleteTargetId(sol.id)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                        title="Eliminar solicitud"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 sm:px-7 border-b border-gray-100 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl text-white bg-blue-600">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900">
                    Nueva Solicitud de Insumos
                  </h3>
                  <p className="text-xs text-gray-500">
                    Genera la solicitud oficial y agrega automáticamente los productos y cantidades al inventario de la UP.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-5 text-xs">
              
              {/* UP and Responsable Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* UP */}
                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Unidad de Producción (UP / Sede) *</span>
                    {!isGlobalAccess && (
                      <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                        Sede Asignada
                      </span>
                    )}
                  </label>
                  {isGlobalAccess ? (
                    <select
                      value={formUp}
                      onChange={e => handleUpChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none text-xs cursor-pointer"
                    >
                      {ups.map(u => (
                        <option key={u} value={u}>UP {u}</option>
                      ))}
                    </select>
                  ) : userAllowedUps.length > 1 ? (
                    <select
                      value={formUp}
                      onChange={e => handleUpChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl font-semibold text-blue-900 focus:ring-2 focus:ring-blue-500 outline-none text-xs cursor-pointer"
                    >
                      {userAllowedUps.map(u => (
                        <option key={u} value={u}>UP {u}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full px-3.5 py-2.5 bg-blue-50/70 border border-blue-200 rounded-xl font-bold text-blue-900 flex items-center gap-2 text-xs">
                      <Lock className="w-3.5 h-3.5 text-blue-600" />
                      <span>UP {primaryUp}</span>
                    </div>
                  )}
                </div>

                {/* Responsable de Almacén */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-bold text-gray-700 uppercase tracking-wider">
                      Responsable de Almacén (Custodio) *
                    </label>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsCreateOpen(false);
                          setActiveTab('responsables');
                        }}
                        className="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer"
                      >
                        + Configurar
                      </button>
                    )}
                  </div>
                  
                  {upResponsables.length > 0 ? (
                    <select
                      value={formResponsable}
                      onChange={e => {
                        setFormResponsable(e.target.value);
                        const r = upResponsables.find(item => item.nombre === e.target.value);
                        if (r) setFormCargo(r.cargo);
                      }}
                      className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none text-xs cursor-pointer"
                    >
                      {upResponsables.map(r => (
                        <option key={r.id} value={r.nombre}>
                          {r.nombre} ({r.cargo})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div>
                      <input
                        type="text"
                        value={formResponsable}
                        onChange={e => setFormResponsable(e.target.value)}
                        placeholder="Nombre del custodio o encargado..."
                        required
                        className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                      />
                      <p className="text-[10px] text-amber-700 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        No hay responsable activo configurado para UP {formUp}. Puedes escribirlo manualmente.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Solicitante, Fecha, Prioridad, Estatus */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Solicitante / Cuadrilla *
                  </label>
                  <input
                    type="text"
                    value={formSolicitante}
                    onChange={e => setFormSolicitante(e.target.value)}
                    placeholder="Ej. Ing. Roberto Sánchez (Cuadrilla 2)"
                    required
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Fecha de Emisión *
                  </label>
                  <input
                    type="date"
                    value={formFecha}
                    onChange={e => setFormFecha(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Prioridad
                  </label>
                  <select
                    value={formPrioridad}
                    onChange={e => setFormPrioridad(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 outline-none text-xs cursor-pointer"
                  >
                    <option value="normal">Normal</option>
                    <option value="urgente">Urgente / Inmediata</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Estatus de Solicitud *
                  </label>
                  <select
                    value={formEstado}
                    onChange={e => setFormEstado(e.target.value as EstadoSolicitud)}
                    className={`w-full px-3.5 py-2.5 rounded-xl font-bold focus:ring-2 focus:ring-blue-500 outline-none text-xs cursor-pointer border ${
                      formEstado === 'aprobada'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}
                  >
                    <option value="pendiente">Pendiente (No ingresa a inventario aún)</option>
                    <option value="aprobada">Ingresada / Aprobada (Ingresa de inmediato)</option>
                  </select>
                </div>
              </div>

              {/* Destino y Observaciones */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Destino / Área de Aplicación
                  </label>
                  <input
                    type="text"
                    value={formArea}
                    onChange={e => setFormArea(e.target.value)}
                    placeholder="Ej. Invernadero 4, Riego Sector Sur, Mantenimiento..."
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Observaciones Generales
                  </label>
                  <input
                    type="text"
                    value={formObservaciones}
                    onChange={e => setFormObservaciones(e.target.value)}
                    placeholder="Ej. Insumos requeridos para jornada semanal..."
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                  />
                </div>
              </div>

              {/* Dynamic Insumos Picker */}
              <div className="p-4 bg-slate-50 border border-gray-200 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-blue-600" />
                    <span>Insumos de la Solicitud</span>
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCustomItemMode(!isCustomItemMode)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer flex items-center gap-1 ${
                        isCustomItemMode
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'
                      }`}
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>{isCustomItemMode ? 'Volver a Catálogo' : '+ Nuevo Insumo (no en catálogo)'}</span>
                    </button>
                    <span className="text-[11px] font-semibold text-gray-500 hidden sm:inline">
                      UP: <strong className="text-blue-700">{formUp}</strong>
                    </span>
                  </div>
                </div>

                {/* Line Item Form */}
                <div className="space-y-2">
                  {isCustomItemMode ? (
                    /* New item not in catalog */
                    <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2.5">
                      <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs">
                        <PlusCircle className="w-4 h-4 text-blue-600" />
                        <span>Registrar Nuevo Producto para esta Solicitud</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        <div className="sm:col-span-3">
                          <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                            Código / SKU *
                          </label>
                          <input
                            type="text"
                            value={customItemId}
                            onChange={e => setCustomItemId(e.target.value.toUpperCase())}
                            placeholder="Ej. FERT-992"
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div className="sm:col-span-5">
                          <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                            Descripción del Producto *
                          </label>
                          <input
                            type="text"
                            value={customItemDesc}
                            onChange={e => setCustomItemDesc(e.target.value)}
                            placeholder="Ej. Nitrato de Calcio Grado Agrícola 25kg"
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                            Unidad
                          </label>
                          <input
                            type="text"
                            value={customItemUnidad}
                            onChange={e => setCustomItemUnidad(e.target.value.toUpperCase())}
                            placeholder="PZA / SACO / L"
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-center focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                            Área / Rubro
                          </label>
                          <input
                            type="text"
                            value={customItemArea}
                            onChange={e => setCustomItemArea(e.target.value.toUpperCase())}
                            placeholder="Ej. FERTILIZANTES"
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end pt-1">
                        <div className="sm:col-span-3">
                          <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                            Cantidad a Ingresar *
                          </label>
                          <input
                            type="number"
                            min="0.1"
                            step="any"
                            value={qtyToAdd}
                            onChange={e => setQtyToAdd(Math.max(0, parseFloat(e.target.value) || 0))}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-bold text-center focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div className="sm:col-span-7">
                          <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                            Lote / Detalle Opcional
                          </label>
                          <input
                            type="text"
                            value={itemNoteToAdd}
                            onChange={e => setItemNoteToAdd(e.target.value)}
                            placeholder="Lote, presentación, etc."
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <button
                            type="button"
                            onClick={handleAddLineItem}
                            disabled={!customItemId.trim() || !customItemDesc.trim() || qtyToAdd <= 0}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl transition cursor-pointer text-xs flex items-center justify-center gap-1 shadow-xs"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Agregar</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Existing catalog product */
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                      {/* Item Select */}
                      <div className="sm:col-span-6">
                        <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                          Buscar Producto del Catálogo
                        </label>
                        <input
                          type="text"
                          value={productSearch}
                          onChange={e => setProductSearch(e.target.value)}
                          placeholder="Escribe código o nombre para filtrar catálogo..."
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none mb-1.5"
                        />
                        <select
                          value={selectedProductToAdd}
                          onChange={e => setSelectedProductToAdd(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                        >
                          <option value="">-- Seleccionar Producto ({filteredCatalogItems.length}) --</option>
                          {filteredCatalogItems.map(item => {
                            const inv = inventario.find(i => i.id === item.id);
                            const st = inv?.upStock[formUp] || 0;
                            return (
                              <option key={item.id} value={item.id}>
                                [{item.id}] {item.desc} (Stock actual en UP: {st} {item.unidad})
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Quantity */}
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                          Cantidad
                        </label>
                        <input
                          type="number"
                          min="0.1"
                          step="any"
                          value={qtyToAdd}
                          onChange={e => setQtyToAdd(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none text-center"
                        />
                      </div>

                      {/* Line Notes */}
                      <div className="sm:col-span-4">
                        <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                          Lote / Detalle
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={itemNoteToAdd}
                            onChange={e => setItemNoteToAdd(e.target.value)}
                            placeholder="Lote / Detalle..."
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleAddLineItem}
                            disabled={!selectedProductToAdd || qtyToAdd <= 0}
                            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold rounded-xl transition cursor-pointer shrink-0 shadow-xs"
                            title="Añadir a la lista"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Table of Added Items */}
                <div className="mt-3 border border-gray-200 rounded-xl overflow-hidden bg-white">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-gray-700 font-bold text-[10px] uppercase">
                        <th className="py-2 px-3">Código / Insumo</th>
                        <th className="py-2 px-2 text-center">Unidad</th>
                        <th className="py-2 px-2 text-center">Stock Actual</th>
                        <th className="py-2 px-3 text-center">Cantidad a Solicitar</th>
                        <th className="py-2 px-2">Notas</th>
                        <th className="py-2 px-2 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {lineItems.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-5 text-center text-gray-400 italic">
                            No se han agregado insumos a la lista. Selecciona o escribe un producto arriba.
                          </td>
                        </tr>
                      ) : (
                        lineItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60">
                            <td className="py-2 px-3">
                              <span className="font-mono font-bold text-gray-900 block text-[11px]">
                                {item.itemId}
                              </span>
                              <span className="text-gray-700 font-medium block truncate max-w-xs">
                                {item.desc}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-center font-semibold text-gray-600 uppercase">
                              {item.unidad}
                            </td>
                            <td className="py-2 px-2 text-center font-semibold text-blue-700">
                              {item.stockActualUp ?? 0}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <input
                                type="number"
                                min="0.1"
                                step="any"
                                value={item.cantidad}
                                onChange={e => handleUpdateLineQty(idx, parseFloat(e.target.value) || 0)}
                                className="w-20 px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-bold text-center"
                              />
                            </td>
                            <td className="py-2 px-2 text-gray-500 italic text-[11px]">
                              {item.notas || '—'}
                            </td>
                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveLineItem(idx)}
                                className="p-1 text-gray-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                                title="Eliminar insumo"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Automatic inventory entry notice */}
              {formEstado === 'aprobada' ? (
                <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-emerald-950 block text-xs">
                      Estatus: Ingresada / Aprobada (Afecta Inventario)
                    </span>
                    <span className="text-[11px] text-emerald-800 block mt-0.5 leading-relaxed">
                      Al guardar con estatus <strong>Aprobada</strong>, el sistema registrará automáticamente una <strong>ENTRADA de inventario</strong> para cada uno de los productos y cantidades en la <strong>UP {formUp}</strong>, actualizando las existencias de forma inmediata.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/90 flex items-start gap-3">
                  <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-950 block text-xs">
                      Estatus: Pendiente (Sin Ingreso a Inventario)
                    </span>
                    <span className="text-[11px] text-amber-800 block mt-0.5 leading-relaxed">
                      <strong>No se ingresará nada al inventario</strong> mientras la solicitud permanezca en estatus <strong>Pendiente</strong>. Los insumos se sumarán a las existencias de la UP únicamente cuando sea autorizada / aprobada.
                    </span>
                  </div>
                </div>
              )}

              {/* Footer actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold text-xs transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || lineItems.length === 0}
                  className={`px-6 py-2.5 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer active:scale-95 ${
                    formEstado === 'aprobada'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
                      : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/25'
                  }`}
                >
                  <Printer className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? 'Guardando...'
                      : formEstado === 'aprobada'
                      ? 'Generar Solicitud e Ingresar a Inventario'
                      : 'Generar Solicitud (Pendiente de Ingreso)'}
                  </span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Printable Modal Preview */}
      <ReciboPrintModal
        solicitud={viewingSolicitud}
        appSettings={appSettings}
        onClose={() => setViewingSolicitud(null)}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTargetId)}
        title="Eliminar Solicitud"
        message="¿Estás seguro de eliminar esta solicitud de insumos? Ten en cuenta que los movimientos registrados en el historial de inventario se conservan para auditoría."
        confirmText="Sí, Eliminar"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
};
