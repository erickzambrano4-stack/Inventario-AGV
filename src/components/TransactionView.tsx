import React, { useState, useEffect, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Hash,
  MapPin,
  FileText,
  Save,
  History,
  AlertCircle,
  Package,
  Lock,
  ShieldCheck,
  Search,
  CheckCircle2,
  Sparkles,
  X,
  LayoutDashboard,
  PlusCircle
} from 'lucide-react';

interface TransactionViewProps {
  tipo: 'entrada' | 'salida';
}

export const TransactionView: React.FC<TransactionViewProps> = ({ tipo }) => {
  const {
    items,
    inventario,
    currentUser,
    userAllowedUps,
    isGlobalAccess,
    primaryUp,
    ups,
    addTransaction,
    setActiveTab,
    showToast
  } = useInventory();

  const isEntrada = tipo === 'entrada';
  const isAdmin = (currentUser?.role || '').trim().toLowerCase() === 'admin';
  const hasGlobalUpAccess = isAdmin || isGlobalAccess;

  // Compute available UPs list for the selector
  const availableUpList = useMemo(() => {
    if (hasGlobalUpAccess) {
      const set = new Set<string>();
      ups.forEach(u => {
        const clean = u.trim().toUpperCase().replace(/^UP\s+/, '');
        if (clean) set.add(clean);
      });
      return Array.from(set).sort();
    }
    const set = new Set<string>();
    userAllowedUps.forEach(u => {
      const clean = u.trim().toUpperCase().replace(/^UP\s+/, '');
      if (clean && clean !== 'ALL') set.add(clean);
    });
    return Array.from(set).sort();
  }, [hasGlobalUpAccess, ups, userAllowedUps]);

  const [itemId, setItemId] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [qty, setQty] = useState('');
  const [up, setUp] = useState<string>(() => {
    if (primaryUp && primaryUp !== 'ALL') return primaryUp.trim().toUpperCase().replace(/^UP\s+/, '');
    if (ups.length > 0) return ups[0].trim().toUpperCase().replace(/^UP\s+/, '');
    return 'LUPITA';
  });
  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0]);
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);

  // Confirmation Modal state
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Success summary banner state
  const [lastConfirmedResult, setLastConfirmedResult] = useState<{
    itemId: string;
    desc: string;
    unidad: string;
    qty: number;
    up: string;
    newUpStock: number;
    newGlobalStock: number;
    tipo: 'entrada' | 'salida';
    timestamp: number;
  } | null>(null);

  // Sync UP selection if user scope changes
  useEffect(() => {
    if (!hasGlobalUpAccess) {
      const cleanPrimary = (primaryUp || '').trim().toUpperCase().replace(/^UP\s+/, '');
      if (!availableUpList.includes(up)) {
        setUp(cleanPrimary || (availableUpList[0] || 'LUPITA'));
      }
    } else if (!up && availableUpList.length > 0) {
      setUp(availableUpList[0]);
    }
  }, [hasGlobalUpAccess, availableUpList, primaryUp, up]);

  // Filter items for quick selector
  const filteredCatalogItems = useMemo(() => {
    if (!itemSearch.trim()) return items;
    const q = itemSearch.trim().toLowerCase();
    return items.filter(
      i =>
        i.id.toLowerCase().includes(q) ||
        i.desc.toLowerCase().includes(q) ||
        (i.area && i.area.toLowerCase().includes(q))
    );
  }, [items, itemSearch]);

  // Selected item info and real-time UP stock
  const selectedItem = useMemo(() => {
    if (!itemId) return undefined;
    const clean = itemId.trim().toUpperCase();
    return inventario.find(i => i.id.trim().toUpperCase() === clean);
  }, [inventario, itemId]);

  const itemUnit = selectedItem?.unidad || 'PZ';

  const cleanCurrentUp = useMemo(() => {
    return (up || '').trim().toUpperCase().replace(/^UP\s+/, '');
  }, [up]);

  const stockInSelectedUp = useMemo(() => {
    if (!selectedItem || !cleanCurrentUp) return 0;
    return (
      selectedItem.upStock[cleanCurrentUp] ??
      selectedItem.upStock[`UP ${cleanCurrentUp}`] ??
      selectedItem.upStock[up] ??
      0
    );
  }, [selectedItem, cleanCurrentUp, up]);

  const parsedQtyNum = parseFloat(qty);
  const isQtyValid = !isNaN(parsedQtyNum) && parsedQtyNum > 0;
  const isInsufficientStock = !isEntrada && isQtyValid && parsedQtyNum > stockInSelectedUp;

  // Real projection calculations
  const projectedUpStock = useMemo(() => {
    if (!isQtyValid) return stockInSelectedUp;
    return isEntrada ? stockInSelectedUp + parsedQtyNum : stockInSelectedUp - parsedQtyNum;
  }, [isQtyValid, isEntrada, stockInSelectedUp, parsedQtyNum]);

  const projectedGlobalStock = useMemo(() => {
    const currentGlobal = selectedItem?.stockTotal ?? 0;
    if (!isQtyValid) return currentGlobal;
    return isEntrada ? currentGlobal + parsedQtyNum : currentGlobal - parsedQtyNum;
  }, [isQtyValid, isEntrada, selectedItem, parsedQtyNum]);

  // Validate form and open confirmation modal
  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedItem) {
      showToast('Por favor selecciona un producto válido del catálogo', 'warning');
      return;
    }

    if (!isQtyValid) {
      showToast('La cantidad debe ser un número mayor a cero', 'warning');
      return;
    }

    if (!cleanCurrentUp) {
      showToast('Por favor selecciona la Ubicación Productora (UP)', 'warning');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    if (fecha > today) {
      showToast('La fecha del movimiento no puede ser futura', 'warning');
      return;
    }

  // Salida stock validation
    if (!isEntrada && parsedQtyNum > stockInSelectedUp) {
      showToast(
        `Stock insuficiente en UP ${cleanCurrentUp}. Existencias disponibles: ${stockInSelectedUp.toLocaleString()} ${itemUnit}`,
        'error'
      );
      return;
    }

    // Form is valid, prompt confirmation modal
    setIsConfirmModalOpen(true);
  };

  // Reset confirmation banner when changing item, UP, or typing a new quantity
  useEffect(() => {
    if (lastConfirmedResult) {
      setLastConfirmedResult(null);
    }
  }, [itemId, cleanCurrentUp]);

  useEffect(() => {
    if (lastConfirmedResult && qty !== '') {
      setLastConfirmedResult(null);
    }
  }, [qty]);

  // Execute confirmed transaction
  const handleExecuteTransaction = async () => {
    if (!selectedItem || !isQtyValid || !cleanCurrentUp) return;

    // Snapshot exact values at confirmation time to prevent post-mutation double math
    const appliedItemId = selectedItem.id;
    const appliedDesc = selectedItem.desc;
    const appliedUnit = itemUnit;
    const appliedQty = parsedQtyNum;
    const appliedUp = cleanCurrentUp;
    const appliedTipo = tipo;
    const baseUpStock = stockInSelectedUp;
    const baseGlobalStock = selectedItem.stockTotal;
    const calculatedNewUpStock = isEntrada ? baseUpStock + appliedQty : baseUpStock - appliedQty;
    const calculatedNewGlobalStock = isEntrada ? baseGlobalStock + appliedQty : baseGlobalStock - appliedQty;

    setLoading(true);
    setIsConfirmModalOpen(false);

    try {
      const ok = await addTransaction({
        tipo: appliedTipo,
        itemId: appliedItemId,
        qty: appliedQty,
        up: appliedUp,
        fecha,
        notas: notas.trim()
      });

      if (ok) {
        // Clear inputs immediately so form and projection calculations are clean
        setQty('');
        setNotas('');

        // Set last confirmed result with exact pre-calculated post-transaction stock
        setLastConfirmedResult({
          itemId: appliedItemId,
          desc: appliedDesc,
          unidad: appliedUnit,
          qty: appliedQty,
          up: appliedUp,
          newUpStock: calculatedNewUpStock,
          newGlobalStock: calculatedNewGlobalStock,
          tipo: appliedTipo,
          timestamp: Date.now()
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Success Summary Banner */}
      {lastConfirmedResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-200/70">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-emerald-950 flex items-center gap-2">
                  <span>¡{lastConfirmedResult.tipo === 'entrada' ? 'Entrada' : 'Salida'} Confirmada y Registrada!</span>
                  <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-900">
                    En Vivo
                  </span>
                </h4>
                <p className="text-xs text-emerald-800 mt-0.5">
                  [{lastConfirmedResult.itemId}] {lastConfirmedResult.desc}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setLastConfirmedResult(null)}
              className="text-emerald-700 hover:text-emerald-900 p-1 rounded-lg hover:bg-emerald-100/60 self-start sm:self-auto transition"
              title="Cerrar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 text-xs">
            <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs">
              <span className="text-[10px] font-semibold text-gray-500 uppercase block">
                Cantidad Registrada:
              </span>
              <span className={`text-sm font-black ${lastConfirmedResult.tipo === 'entrada' ? 'text-emerald-700' : 'text-rose-700'}`}>
                {lastConfirmedResult.tipo === 'entrada' ? '+' : '-'}{lastConfirmedResult.qty.toLocaleString()} {lastConfirmedResult.unidad}
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs">
              <span className="text-[10px] font-semibold text-gray-500 uppercase block">
                Nuevo Stock en UP {lastConfirmedResult.up}:
              </span>
              <span className="text-sm font-black text-emerald-900">
                {lastConfirmedResult.newUpStock.toLocaleString()} {lastConfirmedResult.unidad}
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-blue-100 shadow-2xs">
              <span className="text-[10px] font-semibold text-gray-500 uppercase block">
                Nuevo Stock Global:
              </span>
              <span className="text-sm font-black text-blue-900">
                {lastConfirmedResult.newGlobalStock.toLocaleString()} {lastConfirmedResult.unidad}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-3">
            <button
              type="button"
              onClick={() => {
                setItemId('');
                setItemSearch('');
                setQty('');
                setNotas('');
                setLastConfirmedResult(null);
              }}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Registrar Otro Producto</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('historial')}
              className="px-3.5 py-1.5 bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
            >
              <History className="w-3.5 h-3.5 text-amber-600" />
              <span>Ver en Historial</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className="px-3.5 py-1.5 bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-blue-600" />
              <span>Ver en Dashboard</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Card */}
      <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
        {/* Header */}
        <div
          className={`p-6 sm:p-8 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            isEntrada ? 'bg-emerald-50/40' : 'bg-rose-50/40'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={`p-3 rounded-2xl ${
                isEntrada ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}
            >
              {isEntrada ? <ArrowDownLeft className="w-7 h-7" /> : <ArrowUpRight className="w-7 h-7" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  {isEntrada ? 'Recepción de Material (Entrada)' : 'Despacho de Material (Salida)'}
                </h2>
                {isAdmin && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                    <ShieldCheck className="w-3 h-3 text-blue-600" />
                    Admin
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {isEntrada
                  ? 'Registra el ingreso de producto al almacén con cálculo y proyección exacta de existencias'
                  : 'Registra el consumo o despacho de material verificando existencias de la UP'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('historial')}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition flex items-center gap-1.5 shadow-sm self-start sm:self-auto cursor-pointer"
          >
            <History className="w-4 h-4" />
            <span>Ver Historial</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleOpenConfirm} className="p-6 sm:p-8 space-y-6">
          {/* Item Selector & Search */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Producto (Ítem de Catálogo) *
              </label>
              {items.length > 5 && (
                <div className="relative w-44 sm:w-56">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filtrar por código o nombre..."
                    value={itemSearch}
                    onChange={e => setItemSearch(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>
              )}
            </div>

            <div className="relative">
              <Package className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={itemId}
                onChange={e => setItemId(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition appearance-none cursor-pointer"
                required
              >
                <option value="">-- Selecciona un Producto ({filteredCatalogItems.length} disponibles) --</option>
                {filteredCatalogItems.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.id} • {item.desc} ({item.area || 'GENERAL'})
                  </option>
                ))}
              </select>
            </div>

            {/* Selected item stock preview box */}
            {selectedItem && (
              <div className="mt-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2 animate-in fade-in duration-150">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                  <div>
                    <span className="font-mono font-bold text-gray-900">{selectedItem.id}</span>
                    <span className="text-gray-400 mx-1.5">•</span>
                    <span className="font-semibold text-gray-700">{selectedItem.desc}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                      {selectedItem.area || 'GENERAL'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                      Unidad: {itemUnit}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Stock en UP actual */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] font-semibold text-gray-500 uppercase block">
                      Existencias en UP {cleanCurrentUp}:
                    </span>
                    <span
                      className={`text-base font-black ${
                        stockInSelectedUp > 0 ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {stockInSelectedUp.toLocaleString()} {itemUnit}
                    </span>
                  </div>

                  {/* Stock Total Global */}
                  <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-2xs">
                    <span className="text-[10px] font-semibold text-gray-500 uppercase block">
                      Existencias Consolidadas (Todas las UPs):
                    </span>
                    <span className="text-base font-black text-blue-700">
                      {selectedItem.stockTotal.toLocaleString()} {itemUnit}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quantity */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Cantidad a {isEntrada ? 'Ingresar' : 'Despachar'} ({itemUnit}) *
              </label>
              <div className="relative">
                <Hash className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="0.001"
                  step="any"
                  value={qty}
                  onChange={e => setQty(e.target.value)}
                  placeholder={`0.00 ${itemUnit}`}
                  className={`w-full pl-11 pr-4 py-3 bg-gray-50 border rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:bg-white outline-none transition ${
                    isInsufficientStock
                      ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/30'
                      : 'border-gray-200 focus:ring-blue-600'
                  }`}
                  required
                />
              </div>

              {!isEntrada && selectedItem && (
                <div className="mt-1.5 text-[11px]">
                  {isInsufficientStock ? (
                    <p className="text-rose-600 font-bold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Stock insuficiente: solo hay {stockInSelectedUp.toLocaleString()} {itemUnit} en UP {cleanCurrentUp}
                      </span>
                    </p>
                  ) : (
                    <p className="text-gray-500">
                      Disponible para salida en UP {cleanCurrentUp}:{' '}
                      <strong className="text-gray-800">{stockInSelectedUp.toLocaleString()} {itemUnit}</strong>
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* UP Location */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Ubicación Productora (UP) *</span>
                {isAdmin ? (
                  <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-blue-600" />
                    Admin • Todas las UPs
                  </span>
                ) : !hasGlobalUpAccess ? (
                  <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    Sede Asignada
                  </span>
                ) : null}
              </label>

              {hasGlobalUpAccess ? (
                <div className="relative">
                  <MapPin className="w-5 h-5 text-blue-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={cleanCurrentUp}
                    onChange={e => setUp(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-blue-50/40 border border-blue-200 rounded-xl text-sm font-bold text-blue-900 focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition appearance-none cursor-pointer"
                    required
                  >
                    {availableUpList.map(loc => (
                      <option key={loc} value={loc}>
                        UP {loc}
                      </option>
                    ))}
                  </select>
                </div>
              ) : availableUpList.length > 1 ? (
                <div className="relative">
                  <MapPin className="w-5 h-5 text-blue-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={cleanCurrentUp}
                    onChange={e => setUp(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-blue-50/50 border border-blue-200 rounded-xl text-sm font-semibold text-blue-900 focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition appearance-none cursor-pointer"
                    required
                  >
                    {availableUpList.map(loc => (
                      <option key={loc} value={loc}>
                        UP {loc}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="w-full px-4 py-3 bg-blue-50/70 border border-blue-200 rounded-xl text-sm font-bold text-blue-900 flex items-center gap-2.5">
                  <Lock className="w-4 h-4 text-blue-600" />
                  <span>UP {cleanCurrentUp || primaryUp}</span>
                </div>
              )}

              <p className="text-[11px] text-gray-500 mt-1">
                {isAdmin
                  ? `Como administrador puedes operar en cualquiera de las ${availableUpList.length} UPs registradas.`
                  : `Movimiento asignado a la sede UP ${cleanCurrentUp}.`}
              </p>
            </div>
          </div>

          {/* DUAL PROJECTION BREAKDOWN (UP vs GLOBAL) */}
          {isQtyValid && selectedItem && (
            <div className={`p-4 rounded-2xl border text-xs animate-in fade-in duration-150 ${
              isEntrada
                ? 'bg-emerald-50/80 border-emerald-200'
                : isInsufficientStock
                ? 'bg-rose-50 border-rose-300'
                : 'bg-blue-50/80 border-blue-200'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2.5 border-b border-gray-200/70">
                <div className="flex items-center gap-2 font-bold text-gray-900 text-sm">
                  <Sparkles className={`w-4 h-4 ${isEntrada ? 'text-emerald-600' : 'text-blue-600'}`} />
                  <span>Proyección de Existencias tras {isEntrada ? 'Confirmar Entrada' : 'Confirmar Salida'}:</span>
                </div>
                <span className={`px-2.5 py-1 rounded-full font-black text-xs self-start sm:self-auto ${
                  isEntrada
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                }`}>
                  {isEntrada ? '+' : '-'}{parsedQtyNum.toLocaleString()} {itemUnit}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Proyección en UP */}
                <div className="bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-gray-500">
                    <span className="font-semibold flex items-center gap-1 text-gray-800">
                      <MapPin className="w-3.5 h-3.5 text-blue-500" />
                      <span>Sede UP {cleanCurrentUp}</span>
                    </span>
                    <span className="text-gray-400">Actual: {stockInSelectedUp.toLocaleString()} {itemUnit}</span>
                  </div>
                  <div className="flex items-baseline justify-between pt-1 border-t border-gray-100">
                    <span className="text-[10px] uppercase font-bold text-gray-500">Saldo Proyectado UP:</span>
                    <span className={`text-base font-black ${
                      isEntrada ? 'text-emerald-700' : projectedUpStock < 0 ? 'text-rose-600' : 'text-blue-700'
                    }`}>
                      ➔ {projectedUpStock.toLocaleString()} {itemUnit}
                    </span>
                  </div>
                </div>

                {/* 2. Proyección Global */}
                <div className="bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-gray-500">
                    <span className="font-semibold flex items-center gap-1 text-gray-800">
                      <Package className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Consolidado Global</span>
                    </span>
                    <span className="text-gray-400">Actual: {selectedItem.stockTotal.toLocaleString()} {itemUnit}</span>
                  </div>
                  <div className="flex items-baseline justify-between pt-1 border-t border-gray-100">
                    <span className="text-[10px] uppercase font-bold text-gray-500">Saldo Proyectado Global:</span>
                    <span className={`text-base font-black ${
                      isEntrada ? 'text-emerald-700' : 'text-blue-700'
                    }`}>
                      ➔ {projectedGlobalStock.toLocaleString()} {itemUnit}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Fecha de Movimiento *
              </label>
              <div className="relative">
                <Calendar className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  max={todayStr}
                  value={fecha}
                  onChange={e => setFecha(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition"
                  required
                />
              </div>
            </div>

            {/* Operator info (read only indicator) */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Responsable del Registro
              </label>
              <div className="py-3 px-4 bg-gray-100 rounded-xl text-sm font-medium text-gray-700 border border-gray-200 flex items-center justify-between">
                <span>{currentUser?.name || 'Usuario'}</span>
                <span className="text-xs uppercase font-bold text-gray-500">@{currentUser?.username}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Notas / Observaciones (Opcional)
            </label>
            <div className="relative">
              <FileText className="w-5 h-5 text-gray-400 absolute left-3.5 top-3.5" />
              <textarea
                rows={3}
                maxLength={300}
                value={notas}
                onChange={e => setNotas(e.target.value)}
                placeholder="Ej. Factura 8820, lote 4410, proveedor, remisión..."
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition resize-none"
              />
            </div>
            <div className="text-right text-[11px] text-gray-400 mt-1">
              {notas.length}/300 caracteres
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || isInsufficientStock || !selectedItem || !isQtyValid}
              className={`w-full py-4 px-6 rounded-2xl text-white font-bold text-base shadow-lg transition-all flex items-center justify-center gap-2.5 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                isEntrada
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
              }`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <Save className="w-5 h-5" />
              )}
              <span>
                {isEntrada
                  ? `Confirmar Entrada a UP ${cleanCurrentUp || ''}`
                  : `Confirmar Salida desde UP ${cleanCurrentUp || ''}`}
              </span>
            </button>
          </div>
        </form>
      </div>

      {/* CONFIRMATION MODAL */}
      {isConfirmModalOpen && selectedItem && (
        <div className="fixed inset-0 z-[9990] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 sm:p-7 space-y-5">
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl ${
                    isEntrada ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                  }`}>
                    {isEntrada ? <ArrowDownLeft className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900">
                      ¿Confirmar {isEntrada ? 'Entrada' : 'Salida'} de Material?
                    </h3>
                    <p className="text-xs text-gray-500">
                      Revisa las cantidades y la proyección de existencias antes de guardar
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Movement Details */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 text-xs">
                <div className="flex items-start justify-between gap-2 border-b border-slate-200/60 pb-2">
                  <span className="text-gray-500 font-semibold">Producto:</span>
                  <div className="text-right">
                    <span className="font-mono font-bold text-gray-900 block">{selectedItem.id}</span>
                    <span className="text-gray-700 font-medium text-[11px] block">{selectedItem.desc}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-gray-500 font-semibold">Ubicación (Sede UP):</span>
                  <span className="font-bold text-blue-900 bg-blue-100/70 px-2.5 py-0.5 rounded-lg">
                    UP {cleanCurrentUp}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-gray-500 font-semibold">Cantidad a {isEntrada ? 'Ingresar' : 'Despachar'}:</span>
                  <span className={`text-sm font-black ${isEntrada ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {isEntrada ? '+' : '-'}{parsedQtyNum.toLocaleString()} {itemUnit}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-gray-500 font-semibold">Fecha de Movimiento:</span>
                  <span className="font-medium text-gray-800">{fecha}</span>
                </div>

                {notas && (
                  <div className="pt-1 text-[11px] text-gray-600">
                    <span className="font-semibold text-gray-500 block mb-0.5">Notas:</span>
                    <p className="italic bg-white p-2 rounded-lg border border-slate-200">{notas}</p>
                  </div>
                )}
              </div>

              {/* Projections in Modal */}
              <div className={`${
                isEntrada ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'
              } border rounded-2xl p-4 text-xs space-y-2.5`}>
                <div className={`flex items-center gap-1.5 font-black text-xs ${
                  isEntrada ? 'text-emerald-950' : 'text-rose-950'
                }`}>
                  <Sparkles className={`w-3.5 h-3.5 ${isEntrada ? 'text-emerald-600' : 'text-rose-600'}`} />
                  <span>Proyección Final tras Confirmación:</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className={`bg-white p-2.5 rounded-xl border ${
                    isEntrada ? 'border-emerald-100' : 'border-rose-100'
                  }`}>
                    <span className="text-[10px] font-semibold text-gray-500 block">Saldo en UP {cleanCurrentUp}:</span>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-gray-400 line-through text-[11px]">
                        {stockInSelectedUp.toLocaleString()}
                      </span>
                      <span className={`text-sm font-black ${
                        isEntrada ? 'text-emerald-700' : projectedUpStock < 0 ? 'text-rose-600' : 'text-blue-700'
                      }`}>
                        ➔ {projectedUpStock.toLocaleString()} {itemUnit}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-blue-100">
                    <span className="text-[10px] font-semibold text-gray-500 block">Saldo Global Total:</span>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-gray-400 line-through text-[11px]">
                        {selectedItem.stockTotal.toLocaleString()}
                      </span>
                      <span className={`text-sm font-black ${
                        isEntrada ? 'text-emerald-700' : projectedGlobalStock < 0 ? 'text-rose-600' : 'text-blue-700'
                      }`}>
                        ➔ {projectedGlobalStock.toLocaleString()} {itemUnit}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold transition text-xs cursor-pointer"
                >
                  Regresar a Editar
                </button>
                <button
                  type="button"
                  onClick={handleExecuteTransaction}
                  disabled={loading}
                  className={`px-5 py-2.5 rounded-xl font-bold text-white text-xs shadow-md transition flex items-center gap-2 cursor-pointer ${
                    isEntrada
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                      : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                  }`}
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Sí, {isEntrada ? 'Confirmar Entrada' : 'Confirmar Salida'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
