import React, { useState, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { INITIAL_UPS } from '../types';
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
  Package
} from 'lucide-react';

interface TransactionViewProps {
  tipo: 'entrada' | 'salida';
}

export const TransactionView: React.FC<TransactionViewProps> = ({ tipo }) => {
  const {
    items,
    inventario,
    currentUser,
    addTransaction,
    setActiveTab,
    showToast
  } = useInventory();

  const isEntrada = tipo === 'entrada';

  const [itemId, setItemId] = useState('');
  const [qty, setQty] = useState('');
  const [up, setUp] = useState('');
  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0]);
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);

  // Set default UP based on current user
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'operador' && currentUser.up !== 'ALL') {
        setUp(currentUser.up);
      } else if (!up && INITIAL_UPS.length > 0) {
        setUp(INITIAL_UPS[0]);
      }
    }
  }, [currentUser, up]);

  // Selected item info
  const selectedItem = inventario.find(i => i.id === itemId);
  const stockInSelectedUp = selectedItem && up ? selectedItem.upStock[up] || 0 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!itemId) {
      showToast('Por favor selecciona un producto (ítem)', 'warning');
      return;
    }

    const parsedQty = parseFloat(qty);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      showToast('La cantidad debe ser un número mayor a cero', 'warning');
      return;
    }

    if (!up) {
      showToast('Por favor selecciona la Ubicación Productora (UP)', 'warning');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    if (fecha > today) {
      showToast('La fecha del movimiento no puede ser futura', 'warning');
      return;
    }

    // Salida stock validation
    if (!isEntrada && parsedQty > stockInSelectedUp) {
      showToast(`Stock insuficiente en ${up}. Existencias disponibles: ${stockInSelectedUp.toLocaleString()}`, 'error');
      return;
    }

    setLoading(true);

    try {
      const ok = await addTransaction({
        tipo,
        itemId,
        qty: parsedQty,
        up,
        fecha,
        notas: notas.trim()
      });

      if (ok) {
        setItemId('');
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
        <div className={`p-6 sm:p-8 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isEntrada ? 'bg-emerald-50/40' : 'bg-rose-50/40'
        }`}>
          <div className="flex items-center gap-3.5">
            <div className={`p-3 rounded-2xl ${
              isEntrada ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}>
              {isEntrada ? <ArrowDownLeft className="w-7 h-7" /> : <ArrowUpRight className="w-7 h-7" />}
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                {isEntrada ? 'Recepción de Material (Entrada)' : 'Despacho de Material (Salida)'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {isEntrada
                  ? 'Registra el ingreso de producto o insumo al almacén'
                  : 'Registra la salida o consumo de material desde una UP específica'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('historial')}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
          >
            <History className="w-4 h-4" />
            <span>Ver Historial</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {/* Item Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Producto (Ítem de Catálogo) *
            </label>
            <div className="relative">
              <Package className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={itemId}
                onChange={e => setItemId(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition appearance-none cursor-pointer"
                required
              >
                <option value="">-- Selecciona un Producto --</option>
                {items.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.id} - {item.desc} ({item.area || 'GENERAL'})
                  </option>
                ))}
              </select>
            </div>

            {/* Selected item stock preview box */}
            {selectedItem && (
              <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-2 animate-in fade-in duration-150">
                <div>
                  <span className="font-bold text-gray-800">{selectedItem.id}: </span>
                  <span className="text-gray-600">{selectedItem.desc}</span>
                </div>
                <div className="flex items-center gap-3 font-semibold">
                  <span className="text-blue-700">Stock Total: {selectedItem.stockTotal.toLocaleString()}</span>
                  <span className="text-slate-300">|</span>
                  <span className={`${stockInSelectedUp > 0 ? 'text-emerald-700' : 'text-rose-600 font-bold'}`}>
                    Stock en {up || 'UP'}: {stockInSelectedUp.toLocaleString()}
                  </span>
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
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition"
                  required
                />
              </div>
              {!isEntrada && selectedItem && up && (
                <p className={`text-[11px] mt-1.5 ${parseFloat(qty) > stockInSelectedUp ? 'text-rose-600 font-bold' : 'text-gray-500'}`}>
                  Disponible en {up}: <strong>{stockInSelectedUp.toLocaleString()}</strong>
                </p>
              )}
            </div>

            {/* UP Location */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Ubicación Productora (UP) *
              </label>
              <div className="relative">
                <MapPin className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={up}
                  onChange={e => setUp(e.target.value)}
                  disabled={currentUser?.role === 'operador' && currentUser.up !== 'ALL'}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition appearance-none cursor-pointer disabled:opacity-75 disabled:bg-gray-100"
                  required
                >
                  {currentUser?.role === 'operador' && currentUser.up !== 'ALL' ? (
                    <option value={currentUser.up}>{currentUser.up}</option>
                  ) : (
                    INITIAL_UPS.map(loc => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))
                  )}
                </select>
              </div>
              {currentUser?.role === 'operador' && currentUser.up !== 'ALL' && (
                <p className="text-[11px] text-gray-500 mt-1">
                  Tu usuario está asignado exclusivamente a <strong>{currentUser.up}</strong>.
                </p>
              )}
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
              disabled={loading}
              className={`w-full py-4 px-6 rounded-2xl text-white font-bold text-base shadow-lg transition-all flex items-center justify-center gap-2.5 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 ${
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
              <span>{isEntrada ? 'Confirmar Entrada de Material' : 'Confirmar Salida de Material'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
