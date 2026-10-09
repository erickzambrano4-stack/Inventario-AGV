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
  CheckCircle2
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

  const handleSubmit = async (e: React.FormEvent) => {
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
        `Stock insuficiente en UP ${cleanCurrentUp}. Existencias disponibles: ${stockInSelectedUp.toLocaleString()} PZ`,
        'error'
      );
      return;
    }

    setLoading(true);

    try {
      const ok = await addTransaction({
        tipo,
        itemId: selectedItem.id,
        qty: parsedQtyNum,
        up: cleanCurrentUp,
        fecha,
        notas: notas.trim()
      });

      if (ok) {
        setItemId('');
        setItemSearch('');
        setQty('');
        setNotas('');
        setActiveTab('historial');
      }
    } finally {
      setLoading(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-3xl mx-auto">
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
                  ? 'Registra el ingreso de producto o insumo al almacén y actualiza el inventario en vivo'
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
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
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
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 self-start sm:self-auto">
                    {selectedItem.area || 'GENERAL'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
                  <div className="flex items-center gap-3">
                    <span className="text-blue-700 font-semibold">
                      Stock Total Global: <strong>{selectedItem.stockTotal.toLocaleString()} PZ</strong>
                    </span>
                    <span className="text-slate-300">|</span>
                    <span
                      className={`font-semibold ${
                        stockInSelectedUp > 0 ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      Stock en UP {cleanCurrentUp}: <strong>{stockInSelectedUp.toLocaleString()} PZ</strong>
                    </span>
                  </div>

                  {/* Projected stock calculation */}
                  {isQtyValid && (
                    <div className="text-[11px] font-bold flex items-center gap-1.5">
                      <span className="text-gray-500">Proyección:</span>
                      {isEntrada ? (
                        <span className="text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                          ➔ {(stockInSelectedUp + parsedQtyNum).toLocaleString()} PZ en UP {cleanCurrentUp}
                        </span>
                      ) : (
                        <span
                          className={`px-2 py-0.5 rounded-md ${
                            isInsufficientStock
                              ? 'text-rose-700 bg-rose-100'
                              : 'text-blue-700 bg-blue-100/70'
                          }`}
                        >
                          ➔ {(stockInSelectedUp - parsedQtyNum).toLocaleString()} PZ en UP {cleanCurrentUp}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quantity */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Cantidad a {isEntrada ? 'Ingresar' : 'Despachar'} *
              </label>
              <div className="relative">
                <Hash className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={qty}
                  onChange={e => setQty(e.target.value)}
                  placeholder="0.00"
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
                        Stock insuficiente: solo hay {stockInSelectedUp.toLocaleString()} PZ en UP {cleanCurrentUp}
                      </span>
                    </p>
                  ) : (
                    <p className="text-gray-500">
                      Disponible para salida en UP {cleanCurrentUp}:{' '}
                      <strong className="text-gray-800">{stockInSelectedUp.toLocaleString()} PZ</strong>
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
                placeholder="Ej. Llegada de lote 4410, factura 8820, material para empaque..."
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
              disabled={loading || isInsufficientStock}
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
    </div>
  );
};
