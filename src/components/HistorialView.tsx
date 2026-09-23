import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import {
  History,
  FileSpreadsheet,
  Plus,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
  MapPin,
  User,
  Filter,
  Download,
  Lock,
  Shield,
  X
} from 'lucide-react';
import { downloadCsv, csvEscape } from '../lib/security';
import { ConfirmModal } from './ConfirmModal';
import { ReportModal } from './ReportModal';

const PAGE_SIZE = 10;

export const HistorialView: React.FC = () => {
  const {
    transacciones,
    items,
    currentUser,
    ups,
    userAllowedUps,
    isGlobalAccess,
    primaryUp,
    deleteTransaction,
    deleteMultipleTransactions,
    setActiveTab,
    showToast
  } = useInventory();

  const [typeFilter, setTypeFilter] = useState<'todos' | 'entrada' | 'salida'>('todos');
  const [upFilter, setUpFilter] = useState<string>(() => {
    return isGlobalAccess ? 'todos' : primaryUp;
  });
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Sync upFilter if permissions change
  React.useEffect(() => {
    if (!isGlobalAccess) {
      if (upFilter === 'todos' || !userAllowedUps.includes(upFilter.toUpperCase())) {
        setUpFilter(primaryUp);
      }
    }
  }, [isGlobalAccess, userAllowedUps, primaryUp, upFilter]);

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  // Available UPs restricted strictly to permissions
  const availableUps = useMemo(() => {
    if (!isGlobalAccess) {
      return userAllowedUps;
    }
    const upsSet = new Set<string>(ups);
    transacciones.forEach(t => {
      if (t.up) upsSet.add(t.up.trim().toUpperCase());
    });
    return Array.from(upsSet);
  }, [ups, transacciones, isGlobalAccess, userAllowedUps]);

  // Base authorized transactions for counts and filtering
  const authorizedTransactions = useMemo(() => {
    if (isGlobalAccess) return transacciones;
    return transacciones.filter(t => userAllowedUps.includes((t.up || '').trim().toUpperCase()));
  }, [transacciones, isGlobalAccess, userAllowedUps]);

  // Filtered transactions
  const filtered = useMemo(() => {
    return authorizedTransactions.filter(t => {
      const matchType = typeFilter === 'todos' ? true : t.tipo === typeFilter;
      const matchUp = (upFilter === 'todos' && isGlobalAccess)
        ? true
        : t.up.trim().toUpperCase() === upFilter.trim().toUpperCase();
      const itemObj = items.find(i => i.id === t.itemId);
      const desc = itemObj ? itemObj.desc.toLowerCase() : '';

      const matchSearch =
        t.itemId.toLowerCase().includes(search.toLowerCase()) ||
        desc.includes(search.toLowerCase()) ||
        t.up.toLowerCase().includes(search.toLowerCase()) ||
        t.usuario.toLowerCase().includes(search.toLowerCase()) ||
        (t.notas && t.notas.toLowerCase().includes(search.toLowerCase()));

      return matchType && matchUp && matchSearch;
    });
  }, [authorizedTransactions, typeFilter, upFilter, search, items, isGlobalAccess]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const handleExportCSV = () => {
    if (transacciones.length === 0) {
      showToast('No hay transacciones para exportar', 'warning');
      return;
    }

    const headers = [
      'ID_Registro',
      'Fecha',
      'Tipo',
      'Codigo_Item',
      'Descripcion_Item',
      'Usuario',
      'Ubicacion_UP',
      'Cantidad',
      'Notas'
    ];

    const rows: string[] = [headers.join(',')];

    filtered.forEach(t => {
      const itemObj = items.find(i => i.id === t.itemId);
      const desc = itemObj ? itemObj.desc : 'Desconocido';
      const row = [
        csvEscape(t.idDoc),
        t.fecha,
        t.tipo.toUpperCase(),
        csvEscape(t.itemId),
        csvEscape(desc),
        csvEscape(t.usuario),
        csvEscape(t.up),
        t.qty,
        csvEscape(t.notas || '')
      ];
      rows.push(row.join(','));
    });

    const csvContent = rows.join('\n');
    const upTag = upFilter === 'todos' ? 'Consolidado' : upFilter.replace(/\s+/g, '_');
    downloadCsv(`Reporte_Historial_${upTag}_${new Date().toISOString().split('T')[0]}.csv`, csvContent);
    showToast(`Reporte de historial (${upFilter === 'todos' ? 'Todas las UPs' : upFilter}) exportado exitosamente`, 'success');
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    await deleteTransaction(deleteTargetId);
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(deleteTargetId);
      return next;
    });
    setDeleteTargetId(null);
  };

  // Multi-selection handlers
  const isAllPageSelected = pageItems.length > 0 && pageItems.every(t => selectedIds.has(t.idDoc));
  const isSomePageSelected = pageItems.some(t => selectedIds.has(t.idDoc)) && !isAllPageSelected;

  const handleToggleSelect = (idDoc: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(idDoc)) next.delete(idDoc);
      else next.add(idDoc);
      return next;
    });
  };

  const handleSelectAllPage = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (isAllPageSelected) {
        pageItems.forEach(t => next.delete(t.idDoc));
      } else {
        pageItems.forEach(t => next.add(t.idDoc));
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    setSelectedIds(new Set(filtered.map(t => t.idDoc)));
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleConfirmBulkDelete = async () => {
    const idDocs = Array.from(selectedIds);
    await deleteMultipleTransactions(idDocs);
    setSelectedIds(new Set());
    setIsBulkDeleteModalOpen(false);
  };

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
                <span>Historial Filtrado por Permisos</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-200/80 text-blue-900">
                  UP: {availableUps.join(', ')}
                </span>
              </h4>
              <p className="text-xs text-gray-600 mt-0.5">
                Visualizando exclusivamente los movimientos de entrada y salida registrados para tu sede autorizada ({currentUser?.name}).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-800 bg-white px-3 py-1.5 rounded-xl border border-blue-100 shrink-0 self-start sm:self-auto shadow-2xs">
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            <span>Auditoría de Sede</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-blue-600" />
            Historial de Movimientos
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {isGlobalAccess
              ? 'Bitácora general de auditoría de todas las entradas y salidas registradas en todas las sedes'
              : `Bitácora de auditoría de entradas y salidas de la UP ${primaryUp}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="px-4 py-2.5 rounded-xl text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            title="Generar y exportar reportes independientes por UP"
          >
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
            <span>Reportes por UP</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-xl text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            title="Exportar vista actual a CSV"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={() => setActiveTab('entrada')}
            className="px-4 py-2.5 rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Entrada</span>
          </button>

          <button
            onClick={() => setActiveTab('salida')}
            className="px-4 py-2.5 rounded-xl text-white bg-rose-600 hover:bg-rose-700 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm shadow-rose-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Salida</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Type Toggle Tabs */}
          <div className="flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setTypeFilter('todos');
                setCurrentPage(1);
              }}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 text-xs font-semibold rounded-lg transition ${
                typeFilter === 'todos'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Todos ({authorizedTransactions.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setTypeFilter('entrada');
                setCurrentPage(1);
              }}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1 ${
                typeFilter === 'entrada'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-emerald-700'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              Entradas ({authorizedTransactions.filter(t => t.tipo === 'entrada').length})
            </button>
            <button
              type="button"
              onClick={() => {
                setTypeFilter('salida');
                setCurrentPage(1);
              }}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1 ${
                typeFilter === 'salida'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-rose-700'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              Salidas ({authorizedTransactions.filter(t => t.tipo === 'salida').length})
            </button>
          </div>

          {/* UP Filter Dropdown Selector */}
          {isGlobalAccess ? (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-gray-200 px-3 py-1.5 rounded-xl text-xs">
              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="font-semibold text-gray-500">UP:</span>
              <select
                value={upFilter}
                onChange={e => {
                  setUpFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent font-bold text-gray-800 outline-none cursor-pointer"
              >
                <option value="todos">Todas las UPs</option>
                {availableUps.map(up => (
                  <option key={up} value={up}>
                    {up}
                  </option>
                ))}
              </select>
              {upFilter !== 'todos' && (
                <button
                  type="button"
                  onClick={() => {
                    setUpFilter('todos');
                    setCurrentPage(1);
                  }}
                  className="text-gray-400 hover:text-rose-600 ml-1 p-0.5"
                  title="Limpiar filtro de UP"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : availableUps.length > 1 ? (
            <div className="flex items-center gap-1.5 bg-blue-50/80 border border-blue-200 px-3 py-1.5 rounded-xl text-xs">
              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="font-semibold text-blue-700">UP Autorizada:</span>
              <select
                value={upFilter}
                onChange={e => {
                  setUpFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent font-bold text-blue-900 outline-none cursor-pointer"
              >
                {availableUps.map(up => (
                  <option key={up} value={up}>
                    {up}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl text-xs text-blue-900 font-bold">
              <Lock className="w-3.5 h-3.5 text-blue-600" />
              <span>UP: {availableUps[0] || primaryUp}</span>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Buscar por ítem, notas, UP o usuario..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition"
          />
        </div>
      </div>

      {/* Bulk Actions Banner when transactions are selected */}
      {isAdmin && selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200/90 rounded-2xl p-4 px-5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            <span className="text-sm font-bold text-blue-900">
              {selectedIds.size} {selectedIds.size === 1 ? 'movimiento seleccionado' : 'movimientos seleccionados'}
            </span>
            {selectedIds.size < filtered.length && (
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="text-xs font-semibold text-blue-700 hover:text-blue-900 underline underline-offset-2 transition"
              >
                Seleccionar los {filtered.length} movimientos filtrados
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={handleClearSelection}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-white transition"
            >
              Cancelar selección
            </button>
            <button
              type="button"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-rose-600/20 flex items-center gap-2 transition active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Eliminar seleccionados ({selectedIds.size})
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-100 font-semibold">
              <tr>
                {isAdmin && (
                  <th className="px-4 py-3.5 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={isAllPageSelected}
                      ref={el => {
                        if (el) el.indeterminate = isSomePageSelected;
                      }}
                      onChange={handleSelectAllPage}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                      title={isAllPageSelected ? 'Deseleccionar página' : 'Seleccionar página'}
                    />
                  </th>
                )}
                <th className="px-5 py-3.5">Fecha</th>
                <th className="px-5 py-3.5 min-w-[200px]">Ítem</th>
                <th className="px-4 py-3.5 text-center">Tipo</th>
                <th className="px-4 py-3.5">Responsable</th>
                <th className="px-4 py-3.5">Ubicación (UP)</th>
                <th className="px-5 py-3.5 text-right">Cantidad</th>
                <th className="px-5 py-3.5 min-w-[160px]">Notas</th>
                {isAdmin && <th className="px-4 py-3.5 text-center">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pageItems.length > 0 ? (
                pageItems.map(row => {
                  const isEntrada = row.tipo === 'entrada';
                  const itemObj = items.find(i => i.id === row.itemId);
                  const desc = itemObj ? itemObj.desc : 'Ítem no encontrado';
                  const isSelected = selectedIds.has(row.idDoc);

                  return (
                    <tr
                      key={row.idDoc}
                      className={`transition ${
                        isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      {isAdmin && (
                        <td className="px-4 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(row.idDoc)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                          />
                        </td>
                      )}

                      <td className="px-5 py-4 whitespace-nowrap text-xs text-gray-500 font-medium">
                        {row.fecha}
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-bold text-gray-900">{row.itemId}</div>
                        <div className="text-xs text-gray-500 line-clamp-1 max-w-xs">{desc}</div>
                      </td>

                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isEntrada
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isEntrada ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          {isEntrada ? 'Entrada' : 'Salida'}
                        </span>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium">
                          <User className="w-3 h-3 text-slate-400" /> {row.usuario}
                        </span>
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                          <MapPin className="w-3 h-3 text-blue-500" /> {row.up}
                        </span>
                      </td>

                      <td
                        className={`px-5 py-4 text-right whitespace-nowrap font-black text-base ${
                          isEntrada ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {isEntrada ? '+' : '-'}{row.qty.toLocaleString()}
                      </td>

                      <td className="px-5 py-4 text-xs text-gray-600 max-w-xs truncate" title={row.notas || ''}>
                        {row.notas || <span className="text-gray-300 italic">Sin notas</span>}
                      </td>

                      {isAdmin && (
                        <td className="px-4 py-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => setDeleteTargetId(row.idDoc)}
                            className="text-gray-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition"
                            title="Eliminar este movimiento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={isAdmin ? 9 : 7} className="p-12 text-center text-gray-400 text-sm">
                    No se encontraron transacciones registradas.
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
              {Math.min(currentPage * PAGE_SIZE, filtered.length)} de {filtered.length} movimientos
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

      {/* Confirmation Modal for Delete */}
      <ConfirmModal
        isOpen={Boolean(deleteTargetId)}
        title="Eliminar Registro de Movimiento"
        message="¿Estás seguro de eliminar este registro del historial? El stock del producto se recalculará automáticamente de forma inmediata."
        confirmText="Sí, Eliminar Movimiento"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />

      {/* Confirmation Modal for Bulk Delete */}
      <ConfirmModal
        isOpen={isBulkDeleteModalOpen}
        title={`Eliminar ${selectedIds.size} Registro${selectedIds.size === 1 ? '' : 's'} de Movimientos`}
        message={`¿Estás seguro de eliminar los ${selectedIds.size} movimientos seleccionados del historial? Las existencias y stock de los productos involucrados se recalcularán automáticamente de forma inmediata.`}
        confirmText={`Sí, Eliminar (${selectedIds.size})`}
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={handleConfirmBulkDelete}
        onCancel={() => setIsBulkDeleteModalOpen(false)}
      />

      {/* Advanced Reports by Independent UP Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        defaultUp={upFilter === 'todos' ? 'all' : upFilter}
        defaultReportType="historial"
      />
    </div>
  );
};
