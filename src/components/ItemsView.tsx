import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Item } from '../types';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  HelpCircle,
  X,
  Save,
  FileSpreadsheet,
  Download
} from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { MasterDataModal } from './MasterDataModal';
import { downloadMasterTemplate, downloadMasterExportCSV } from '../lib/masterDocumentTemplate';

export const ItemsView: React.FC = () => {
  const {
    items,
    inventario,
    ups,
    addItem,
    updateItem,
    deleteItem,
    deleteMultipleItems,
    showToast
  } = useInventory();

  // Master Document import modal state
  const [isMasterModalOpen, setIsMasterModalOpen] = useState(false);

  // Master Document export modal state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportUp, setExportUp] = useState<string>('ALL');
  const [exportScope, setExportScope] = useState<'all' | 'selected' | 'with_stock'>('all');

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Add Item form state
  const [newId, setNewId] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newArea, setNewArea] = useState('');
  const [newReorden, setNewReorden] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search & Pagination
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Edit Modal state
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editArea, setEditArea] = useState('');
  const [editReorden, setEditReorden] = useState('');

  // Delete modal state
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Filtered items
  const filtered = useMemo(() => {
    return items.filter(
      i =>
        i.id.toLowerCase().includes(search.toLowerCase()) ||
        i.desc.toLowerCase().includes(search.toLowerCase()) ||
        (i.area && i.area.toLowerCase().includes(search.toLowerCase()))
    );
  }, [items, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  // Handle Add Item
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newId.trim() || !newDesc.trim()) {
      showToast('El código y la descripción son obligatorios', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await addItem({
        id: newId,
        desc: newDesc,
        area: newArea,
        reorden: newReorden ? parseInt(newReorden) : 0
      });

      if (ok) {
        setNewId('');
        setNewDesc('');
        setNewArea('');
        setNewReorden('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (item: Item) => {
    setEditingItem(item);
    setEditDesc(item.desc);
    setEditArea(item.area || '');
    setEditReorden(String(item.reorden || 0));
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    if (!editDesc.trim()) {
      showToast('La descripción no puede estar vacía', 'warning');
      return;
    }

    await updateItem(editingItem.id, {
      desc: editDesc,
      area: editArea,
      reorden: editReorden ? parseInt(editReorden) : 0
    });

    setEditingItem(null);
  };

  // Handle Delete Item
  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    await deleteItem(deleteTargetId);
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(deleteTargetId);
      return next;
    });
    setDeleteTargetId(null);
  };

  // Multi-selection handlers
  const isAllPageSelected = pageItems.length > 0 && pageItems.every(i => selectedIds.has(i.id));
  const isSomePageSelected = pageItems.some(i => selectedIds.has(i.id)) && !isAllPageSelected;

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllPage = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (isAllPageSelected) {
        pageItems.forEach(i => next.delete(i.id));
      } else {
        pageItems.forEach(i => next.add(i.id));
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    setSelectedIds(new Set(filtered.map(i => i.id)));
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleConfirmBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    await deleteMultipleItems(ids);
    setSelectedIds(new Set());
    setIsBulkDeleteModalOpen(false);
  };

  // Filter items to export based on selected scope
  const itemsToExport = useMemo(() => {
    if (exportScope === 'selected' && selectedIds.size > 0) {
      return items.filter(i => selectedIds.has(i.id));
    }
    if (exportScope === 'with_stock') {
      const invMap = new Map<string, number>(inventario.map(inv => [inv.id, inv.stockTotal]));
      return items.filter(i => (invMap.get(i.id) ?? 0) > 0);
    }
    return items;
  }, [items, inventario, exportScope, selectedIds]);

  const handleExecuteExport = () => {
    if (itemsToExport.length === 0) {
      showToast('No hay productos que coincidan con los criterios de exportación', 'warning');
      return;
    }
    downloadMasterExportCSV(itemsToExport, inventario, exportUp);
    showToast(`Base de ${itemsToExport.length} ítems exportada exitosamente en formato maestro`, 'success');
    setIsExportModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Add Item Card */}
      <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Plus className="w-5 h-5" />
            </div>
            Agregar Nuevo Producto al Catálogo
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setExportScope('all');
                setIsExportModalOpen(true);
              }}
              className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-xs cursor-pointer"
              title="Exportar base completa de ítems con formato de Documento Maestro"
            >
              <Download className="w-3.5 h-3.5 text-emerald-700" />
              Exportar Formato Maestro
            </button>
            <button
              type="button"
              onClick={() => setIsMasterModalOpen(true)}
              className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/90 rounded-xl text-xs font-bold flex items-center gap-2 transition active:scale-95 shadow-xs cursor-pointer"
              title="Cargar documento maestro CSV/Excel para importar en lote"
            >
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              Documento Maestro / Importar
            </button>
            <button
              type="button"
              onClick={() => downloadMasterTemplate()}
              className="px-3 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="Descargar plantilla maestra (.CSV para Excel)"
            >
              <Download className="w-3.5 h-3.5 text-gray-500" />
              Plantilla CSV
            </button>
          </div>
        </div>

        <form onSubmit={handleAddItem} className="bg-slate-50/70 p-5 rounded-2xl border border-gray-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
            <div className="lg:col-span-3">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                Código ID *
              </label>
              <input
                type="text"
                maxLength={40}
                value={newId}
                onChange={e => setNewId(e.target.value)}
                placeholder="Ej. MX-F-PCK-005"
                className="w-full border border-gray-200 rounded-xl p-2.5 bg-white text-sm focus:ring-2 focus:ring-blue-600 outline-none uppercase font-mono font-medium"
                required
              />
            </div>

            <div className="lg:col-span-4">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                Descripción *
              </label>
              <input
                type="text"
                maxLength={150}
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="Nombre del producto o insumo"
                className="w-full border border-gray-200 rounded-xl p-2.5 bg-white text-sm focus:ring-2 focus:ring-blue-600 outline-none uppercase"
                required
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                Área
              </label>
              <input
                type="text"
                maxLength={60}
                value={newArea}
                onChange={e => setNewArea(e.target.value)}
                placeholder="Ej. EMPAQUE"
                className="w-full border border-gray-200 rounded-xl p-2.5 bg-white text-sm focus:ring-2 focus:ring-blue-600 outline-none uppercase"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block text-xs font-semibold text-amber-700 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                Pto. Reorden
                <span title="Nivel mínimo de stock para alertar necesidad de compra">
                  <HelpCircle className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                </span>
              </label>
              <input
                type="number"
                min="0"
                value={newReorden}
                onChange={e => setNewReorden(e.target.value)}
                placeholder="100"
                className="w-full border border-amber-200 bg-amber-50/40 rounded-xl p-2.5 text-sm font-bold text-amber-900 focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div className="lg:col-span-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 font-semibold text-sm transition shadow-md shadow-blue-500/25 flex items-center justify-center gap-1 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>Crear</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Bulk Actions Banner when items are selected */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200/90 rounded-2xl p-4 px-5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            <span className="text-sm font-bold text-blue-900">
              {selectedIds.size} {selectedIds.size === 1 ? 'producto seleccionado' : 'productos seleccionados'}
            </span>
            {selectedIds.size < filtered.length && (
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="text-xs font-semibold text-blue-700 hover:text-blue-900 underline underline-offset-2 transition"
              >
                Seleccionar los {filtered.length} productos filtrados
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={() => {
                setExportScope('selected');
                setIsExportModalOpen(true);
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200/80 border border-emerald-300 transition flex items-center gap-1.5 cursor-pointer"
              title="Exportar ítems seleccionados en formato Documento Maestro"
            >
              <Download className="w-3.5 h-3.5 text-emerald-700" />
              Exportar ({selectedIds.size})
            </button>
            <button
              type="button"
              onClick={handleClearSelection}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-white transition cursor-pointer"
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

      {/* Catalog Table */}
      <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gray-50/40">
          <div>
            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600" />
              Catálogo de Productos ({items.length})
            </h3>
            <p className="text-xs text-gray-500">Base maestra de artículos disponibles para el sistema de inventario</p>
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
              placeholder="Buscar ítem..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-600 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] text-gray-500 uppercase tracking-wider bg-slate-50 border-b border-gray-100 font-semibold">
              <tr>
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
                <th className="px-6 py-3.5 min-w-[140px]">Código ID</th>
                <th className="px-6 py-3.5 min-w-[240px]">Descripción</th>
                <th className="px-6 py-3.5">Área</th>
                <th className="px-6 py-3.5 text-center">Punto de Reorden</th>
                <th className="px-6 py-3.5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pageItems.length > 0 ? (
                pageItems.map(item => {
                  const isSelected = selectedIds.has(item.id);
                  return (
                    <tr
                      key={item.id}
                      className={`transition group ${
                        isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50/60'
                      }`}
                    >
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(item.id)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                        />
                      </td>

                      <td className="px-6 py-4 font-mono font-bold text-gray-900">{item.id}</td>

                      <td className="px-6 py-4 text-gray-700 font-medium">{item.desc}</td>

                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold border border-blue-100">
                          {item.area || 'GENERAL'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center font-bold text-amber-700">
                        {item.reorden || 0}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="text-blue-600 hover:text-blue-800 p-1.5 rounded-lg hover:bg-blue-50 transition"
                            title="Editar producto"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setDeleteTargetId(item.id)}
                            className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition"
                            title="Eliminar producto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-gray-400 text-sm">
                    No se encontraron productos en el catálogo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-3.5 border-t border-gray-100 bg-gray-50/40 gap-3">
            <div className="flex items-center gap-3">
              <p className="text-xs text-gray-500">
                Mostrando {Math.min((currentPage - 1) * pageSize + 1, filtered.length)} a{' '}
                {Math.min(currentPage * pageSize, filtered.length)} de {filtered.length} productos
              </p>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span>Por página:</span>
                <select
                  value={pageSize}
                  onChange={e => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-gray-200 text-gray-700 py-1 px-2 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
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

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-[9990] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Edit2 className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Editar Información del Ítem</h3>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Código ID (Fijo)</label>
                <input
                  type="text"
                  disabled
                  value={editingItem.id}
                  className="w-full border border-gray-200 rounded-xl p-2.5 bg-gray-100 text-gray-500 text-sm font-mono cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Descripción *</label>
                <input
                  type="text"
                  maxLength={150}
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-600 outline-none uppercase"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Área</label>
                  <input
                    type="text"
                    maxLength={60}
                    value={editArea}
                    onChange={e => setEditArea(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-600 outline-none uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-700 mb-1">Pto. Reorden</label>
                  <input
                    type="number"
                    min="0"
                    value={editReorden}
                    onChange={e => setEditReorden(e.target.value)}
                    className="w-full border border-amber-200 bg-amber-50/40 rounded-xl p-2.5 text-sm font-bold text-amber-900 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm shadow-md shadow-blue-500/25 transition flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
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
        title="Eliminar Producto del Catálogo"
        message={`¿Estás seguro de eliminar el producto ${deleteTargetId} del catálogo maestro? Esta acción es permanente.`}
        confirmText="Sí, Eliminar Producto"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isBulkDeleteModalOpen}
        title={`Eliminar ${selectedIds.size} Producto${selectedIds.size === 1 ? '' : 's'} del Catálogo`}
        message={`¿Estás seguro de que deseas eliminar los ${selectedIds.size} productos seleccionados? Nota: Cualquier producto que tenga movimientos registrados en el historial de entradas o salidas se protegerá automáticamente y no será eliminado.`}
        confirmText={`Sí, Eliminar (${selectedIds.size})`}
        cancelText="Cancelar"
        isDestructive={true}
        onConfirm={handleConfirmBulkDelete}
        onCancel={() => setIsBulkDeleteModalOpen(false)}
      />

      {/* Master Data Import Modal */}
      <MasterDataModal
        isOpen={isMasterModalOpen}
        onClose={() => setIsMasterModalOpen(false)}
      />

      {/* Master Data Export Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-5 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">
                    Exportar Base de Ítems
                  </h3>
                  <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Formato oficial compatible con el Documento Maestro
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Information Banner */}
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl mb-5 text-xs text-emerald-900 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <span>✓ Estructura 100% compatible para respaldo o re-importación</span>
              </p>
              <p className="text-[11px] text-emerald-800">
                El archivo generado incluirá los encabezados oficiales: <code className="bg-emerald-100/70 px-1 py-0.5 rounded font-mono text-[10px]">CODIGO_ITEM</code>, <code className="bg-emerald-100/70 px-1 py-0.5 rounded font-mono text-[10px]">DESCRIPCION</code>, <code className="bg-emerald-100/70 px-1 py-0.5 rounded font-mono text-[10px]">AREA_CATEGORIA</code>, <code className="bg-emerald-100/70 px-1 py-0.5 rounded font-mono text-[10px]">STOCK_MINIMO</code>, <code className="bg-emerald-100/70 px-1 py-0.5 rounded font-mono text-[10px]">STOCK_INICIAL</code>, <code className="bg-emerald-100/70 px-1 py-0.5 rounded font-mono text-[10px]">UBICACION_UP</code>, <code className="bg-emerald-100/70 px-1 py-0.5 rounded font-mono text-[10px]">NOTAS</code>.
              </p>
            </div>

            {/* Form controls */}
            <div className="space-y-4 mb-6">
              {/* Scope */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Productos a Incluir
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer text-xs font-medium text-gray-800">
                    <input
                      type="radio"
                      name="exportScope"
                      checked={exportScope === 'all'}
                      onChange={() => setExportScope('all')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Todo el catálogo activo ({items.length} productos)</span>
                  </label>

                  {selectedIds.size > 0 && (
                    <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 cursor-pointer text-xs font-medium text-emerald-900">
                      <input
                        type="radio"
                        name="exportScope"
                        checked={exportScope === 'selected'}
                        onChange={() => setExportScope('selected')}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Únicamente los {selectedIds.size} productos seleccionados</span>
                    </label>
                  )}

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer text-xs font-medium text-gray-800">
                    <input
                      type="radio"
                      name="exportScope"
                      checked={exportScope === 'with_stock'}
                      onChange={() => setExportScope('with_stock')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Solo productos con existencias físicas (Stock total &gt; 0)</span>
                  </label>
                </div>
              </div>

              {/* UP Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Ubicación / Unidad de Producción (UP)
                </label>
                <select
                  value={exportUp}
                  onChange={e => setExportUp(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-2.5 bg-white text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="ALL">ALL — Todas las UPs (Desglose individual por sede con stock)</option>
                  {ups.map(loc => (
                    <option key={loc} value={loc}>
                      {loc} — Exportar existencias exclusivas de esta sede
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-500 mt-1">
                  Al elegir "ALL", el exportador crea filas detalladas para cada sede que mantenga stock del producto.
                </p>
              </div>

              {/* Summary pill */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between text-xs">
                <span className="text-gray-500 font-medium">Total de ítems a procesar:</span>
                <span className="font-bold text-gray-900 text-sm">{itemsToExport.length} productos</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2.5 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteExport}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/25 transition flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Download className="w-4 h-4" />
                Descargar Archivo CSV Maestro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
