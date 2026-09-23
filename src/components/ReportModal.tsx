import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import {
  FileSpreadsheet,
  Download,
  X,
  MapPin,
  Calendar,
  Filter,
  CheckCircle2,
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  Layers,
  Lock,
  Shield
} from 'lucide-react';
import { downloadCsv, csvEscape } from '../lib/security';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultUp?: string;
  defaultReportType?: 'inventario' | 'historial' | 'alertas';
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  defaultUp = 'all',
  defaultReportType = 'inventario'
}) => {
  const {
    inventario,
    transacciones,
    items,
    ups,
    userAllowedUps,
    isGlobalAccess,
    primaryUp,
    showToast
  } = useInventory();

  // Dynamic available UPs (defaults + custom + any UP in transactions, restricted to authorized UPs)
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

  // Report configuration state
  const [reportType, setReportType] = useState<'inventario' | 'historial' | 'alertas'>(defaultReportType);
  const [selectedUp, setSelectedUp] = useState<string>(() => {
    if (!isGlobalAccess) {
      return userAllowedUps.includes(defaultUp) ? defaultUp : primaryUp;
    }
    return defaultUp;
  });
  const [transactionType, setTransactionType] = useState<'all' | 'entrada' | 'salida'>('all');
  const [dateRange, setDateRange] = useState<'all' | '7days' | '30days' | 'thisMonth' | 'custom'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [onlyWithStock, setOnlyWithStock] = useState<boolean>(false);

  // Available unique areas
  const uniqueAreas = useMemo(() => {
    const areas = new Set<string>();
    inventario.forEach(i => {
      if (i.area) areas.add(i.area.trim().toUpperCase());
    });
    return Array.from(areas).sort();
  }, [inventario]);

  // Reset or initialize state when opened
  React.useEffect(() => {
    if (isOpen) {
      if (!isGlobalAccess) {
        setSelectedUp(userAllowedUps.includes(defaultUp) ? defaultUp : primaryUp);
      } else {
        setSelectedUp(defaultUp);
      }
      setReportType(defaultReportType);
    }
  }, [isOpen, defaultUp, defaultReportType, isGlobalAccess, userAllowedUps, primaryUp]);

  // Preview Count & Data Calculation
  const previewData = useMemo(() => {
    const effectiveUp = (!isGlobalAccess && selectedUp === 'all') ? primaryUp : selectedUp;

    if (reportType === 'inventario') {
      let filtered = [...inventario];

      if (areaFilter !== 'all') {
        filtered = filtered.filter(i => (i.area || 'GENERAL').toUpperCase() === areaFilter.toUpperCase());
      }

      if (effectiveUp !== 'all') {
        if (onlyWithStock) {
          filtered = filtered.filter(i => (i.upStock[effectiveUp] || 0) > 0);
        }
      }

      return {
        count: filtered.length,
        items: filtered
      };
    }

    if (reportType === 'alertas') {
      let filtered = [...inventario];

      if (areaFilter !== 'all') {
        filtered = filtered.filter(i => (i.area || 'GENERAL').toUpperCase() === areaFilter.toUpperCase());
      }

      if (effectiveUp === 'all' && isGlobalAccess) {
        filtered = filtered.filter(i => i.stockTotal <= (i.reorden || 0));
      } else {
        filtered = filtered.filter(i => {
          const upQty = i.upStock[effectiveUp] || 0;
          return upQty <= (i.reorden || 0);
        });
      }

      return {
        count: filtered.length,
        items: filtered
      };
    }

    if (reportType === 'historial') {
      let filtered = [...transacciones];

      if (!isGlobalAccess) {
        filtered = filtered.filter(t => userAllowedUps.includes((t.up || '').trim().toUpperCase()));
      }

      if (effectiveUp !== 'all') {
        filtered = filtered.filter(t => t.up.toUpperCase() === effectiveUp.toUpperCase());
      }

      if (transactionType !== 'all') {
        filtered = filtered.filter(t => t.tipo === transactionType);
      }

      // Date filtering
      if (dateRange !== 'all') {
        const now = new Date();
        if (dateRange === '7days') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(now.getDate() - 7);
          const threshold = sevenDaysAgo.toISOString().split('T')[0];
          filtered = filtered.filter(t => t.fecha >= threshold);
        } else if (dateRange === '30days') {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(now.getDate() - 30);
          const threshold = thirtyDaysAgo.toISOString().split('T')[0];
          filtered = filtered.filter(t => t.fecha >= threshold);
        } else if (dateRange === 'thisMonth') {
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const prefix = `${year}-${month}`;
          filtered = filtered.filter(t => t.fecha.startsWith(prefix));
        } else if (dateRange === 'custom') {
          if (startDate) {
            filtered = filtered.filter(t => t.fecha >= startDate);
          }
          if (endDate) {
            filtered = filtered.filter(t => t.fecha <= endDate);
          }
        }
      }

      return {
        count: filtered.length,
        transactions: filtered
      };
    }

    return { count: 0 };
  }, [
    reportType,
    inventario,
    transacciones,
    selectedUp,
    areaFilter,
    onlyWithStock,
    transactionType,
    dateRange,
    startDate,
    endDate
  ]);

  if (!isOpen) return null;

  const handleGenerateReport = () => {
    const today = new Date().toISOString().split('T')[0];
    const effectiveUp = (!isGlobalAccess && selectedUp === 'all') ? primaryUp : selectedUp;
    const upTag = effectiveUp === 'all' ? 'CONSOLIDADO' : effectiveUp.replace(/\s+/g, '_');

    if (reportType === 'inventario') {
      const itemsList = previewData.items || [];
      if (itemsList.length === 0) {
        showToast('No hay datos que coincidan con los filtros seleccionados', 'warning');
        return;
      }

      let headers: string[] = [];
      let rows: string[] = [];

      if (effectiveUp === 'all' && isGlobalAccess) {
        headers = ['Codigo', 'Descripcion', 'Area', 'Punto_Reorden', 'Stock_Total_Consolidado'];
        availableUps.forEach(up => headers.push(`Stock_${up.replace(/\s+/g, '_')}`));
        rows.push(headers.join(','));

        itemsList.forEach(item => {
          const r = [
            csvEscape(item.id),
            csvEscape(item.desc),
            csvEscape(item.area || 'GENERAL'),
            item.reorden || 0,
            item.stockTotal
          ];
          availableUps.forEach(up => {
            r.push(item.upStock[up] !== undefined ? String(item.upStock[up]) : '0');
          });
          rows.push(r.join(','));
        });
      } else {
        headers = [
          'Codigo',
          'Descripcion',
          'Area',
          'Ubicacion_UP',
          `Stock_en_${upTag}`,
          'Punto_Reorden_Referencial',
          'Estado_Stock'
        ];
        if (isGlobalAccess) {
          headers.push('Stock_Total_Global');
        }
        rows.push(headers.join(','));

        itemsList.forEach(item => {
          const upQty = item.upStock[effectiveUp] || 0;
          const reorden = item.reorden || 0;
          const estado = upQty <= reorden ? 'ALERTA_REORDEN' : 'OPTIMO';

          const r = [
            csvEscape(item.id),
            csvEscape(item.desc),
            csvEscape(item.area || 'GENERAL'),
            csvEscape(effectiveUp),
            upQty,
            reorden,
            estado
          ];
          if (isGlobalAccess) {
            r.push(item.stockTotal);
          }
          rows.push(r.join(','));
        });
      }

      const fileName = `Reporte_Inventario_${upTag}_${today}.csv`;
      downloadCsv(fileName, rows.join('\n'));
      showToast(`Reporte generado: ${fileName}`, 'success');
      onClose();
      return;
    }

    if (reportType === 'alertas') {
      const itemsList = previewData.items || [];
      if (itemsList.length === 0) {
        showToast('No hay alertas de stock para los filtros seleccionados', 'warning');
        return;
      }

      const headers = [
        'Codigo',
        'Descripcion',
        'Area',
        'Ubicacion_Evaluada',
        'Stock_Actual',
        'Punto_Reorden',
        'Deficit_Faltante'
      ];
      if (isGlobalAccess) {
        headers.push('Stock_Total_Consolidado');
      }
      const rows: string[] = [headers.join(',')];

      itemsList.forEach(item => {
        const stockEvaluado = (effectiveUp === 'all' && isGlobalAccess) ? item.stockTotal : item.upStock[effectiveUp] || 0;
        const reorden = item.reorden || 0;
        const deficit = Math.max(0, reorden - stockEvaluado);

        const r = [
          csvEscape(item.id),
          csvEscape(item.desc),
          csvEscape(item.area || 'GENERAL'),
          csvEscape(effectiveUp === 'all' ? 'CONSOLIDADO' : effectiveUp),
          stockEvaluado,
          reorden,
          deficit
        ];
        if (isGlobalAccess) {
          r.push(item.stockTotal);
        }
        rows.push(r.join(','));
      });

      const fileName = `Reporte_Alertas_Reorden_${upTag}_${today}.csv`;
      downloadCsv(fileName, rows.join('\n'));
      showToast(`Reporte de alertas generado: ${fileName}`, 'success');
      onClose();
      return;
    }

    if (reportType === 'historial') {
      const transList = previewData.transactions || [];
      if (transList.length === 0) {
        showToast('No hay movimientos que coincidan con los filtros seleccionados', 'warning');
        return;
      }

      const headers = [
        'ID_Registro',
        'Fecha',
        'Tipo_Movimiento',
        'Codigo_Item',
        'Descripcion_Item',
        'Area',
        'Ubicacion_UP',
        'Cantidad',
        'Usuario_Responsable',
        'Notas'
      ];
      const rows: string[] = [headers.join(',')];

      transList.forEach(t => {
        const itemObj = items.find(i => i.id === t.itemId);
        const desc = itemObj ? itemObj.desc : 'Desconocido';
        const area = itemObj ? itemObj.area || 'GENERAL' : 'GENERAL';

        const r = [
          csvEscape(t.idDoc),
          t.fecha,
          t.tipo.toUpperCase(),
          csvEscape(t.itemId),
          csvEscape(desc),
          csvEscape(area),
          csvEscape(t.up),
          t.qty,
          csvEscape(t.usuario),
          csvEscape(t.notas || '')
        ];
        rows.push(r.join(','));
      });

      const fileName = `Reporte_Historial_${upTag}_${today}.csv`;
      downloadCsv(fileName, rows.join('\n'));
      showToast(`Reporte de historial generado: ${fileName}`, 'success');
      onClose();
      return;
    }
  };

  return (
    <div className="fixed inset-0 z-[9995] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 sm:px-7 border-b border-gray-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600/10 text-emerald-700 rounded-2xl border border-emerald-600/20">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-gray-900">Generador de Reportes</h3>
                <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider bg-blue-100 text-blue-800 rounded-full border border-blue-200 uppercase">
                  Filtro UP Independiente
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Exporta datos consolidados o segmentados por cada Unidad de Producción (UP)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-xl hover:bg-gray-100 transition"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Step 1: Report Type Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              1. Selecciona el Tipo de Reporte
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setReportType('inventario')}
                className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                  reportType === 'inventario'
                    ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Package
                    className={`w-5 h-5 ${reportType === 'inventario' ? 'text-blue-600' : 'text-gray-400'}`}
                  />
                  {reportType === 'inventario' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                </div>
                <div className="mt-2">
                  <span className="text-xs font-bold text-gray-900 block">Inventario de Stock</span>
                  <span className="text-[11px] text-gray-500">Existencias físicas y niveles de reorden</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setReportType('historial')}
                className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                  reportType === 'historial'
                    ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <ArrowDownLeft
                      className={`w-4 h-4 ${reportType === 'historial' ? 'text-emerald-600' : 'text-gray-400'}`}
                    />
                    <ArrowUpRight
                      className={`w-4 h-4 ${reportType === 'historial' ? 'text-rose-600' : 'text-gray-400'}`}
                    />
                  </div>
                  {reportType === 'historial' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                </div>
                <div className="mt-2">
                  <span className="text-xs font-bold text-gray-900 block">Historial de Movimientos</span>
                  <span className="text-[11px] text-gray-500">Registro de entradas y salidas</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setReportType('alertas')}
                className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                  reportType === 'alertas'
                    ? 'border-rose-600 bg-rose-50/70 shadow-xs'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <AlertTriangle
                    className={`w-5 h-5 ${reportType === 'alertas' ? 'text-rose-600' : 'text-gray-400'}`}
                  />
                  {reportType === 'alertas' && <CheckCircle2 className="w-4 h-4 text-rose-600" />}
                </div>
                <div className="mt-2">
                  <span className="text-xs font-bold text-gray-900 block">Alertas de Reorden</span>
                  <span className="text-[11px] text-gray-500">Productos en nivel crítico o por agotarse</span>
                </div>
              </button>
            </div>
          </div>

          {/* Step 2: UP Selector */}
          <div className="bg-slate-50 border border-gray-200/80 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-blue-600" />
                2. Ubicación / Sede (UP)
              </label>
              {isGlobalAccess && selectedUp !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedUp('all')}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold"
                >
                  Restablecer a Todas
                </button>
              )}
            </div>

            {isGlobalAccess ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedUp('all')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold text-center border transition flex items-center justify-center gap-1.5 ${
                    selectedUp === 'all'
                      ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <span>Todas las UPs</span>
                </button>

                {availableUps.map(up => (
                  <button
                    key={up}
                    type="button"
                    onClick={() => setSelectedUp(up)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold text-center border transition truncate ${
                      selectedUp === up
                        ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                    title={up}
                  >
                    {up}
                  </button>
                ))}
              </div>
            ) : availableUps.length === 1 ? (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                  <Lock className="w-4 h-4 text-blue-700" />
                  <span>Reporte Exclusivo para: UP {availableUps[0]}</span>
                </div>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-blue-200/80 text-blue-800">
                  Sede Asignada
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {availableUps.map(up => (
                  <button
                    key={up}
                    type="button"
                    onClick={() => setSelectedUp(up)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold text-center border transition truncate flex items-center justify-center gap-1 ${
                      selectedUp === up
                        ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                    title={up}
                  >
                    <Lock className="w-3 h-3 text-blue-500" />
                    <span>{up}</span>
                  </button>
                ))}
              </div>
            )}

            <p className="text-[11px] text-gray-500 mt-1">
              {isGlobalAccess && selectedUp === 'all'
                ? 'El reporte incluirá el stock global consolidado y el desglose de cada subacopio.'
                : `El reporte se centrará exclusivamente en los datos de ${selectedUp === 'all' ? primaryUp : selectedUp}.`}
            </p>
          </div>

          {/* Step 3: Specific Options according to Report Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Filter Area (Category) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-gray-400" />
                Filtrar por Área / Categoría:
              </label>
              <select
                value={areaFilter}
                onChange={e => setAreaFilter(e.target.value)}
                className="w-full bg-white border border-gray-200 text-gray-800 py-2 px-3 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todas las Áreas</option>
                {uniqueAreas.map(area => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>

            {/* Condition: If Inventario, option to show only with stock */}
            {reportType === 'inventario' && selectedUp !== 'all' && (
              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-700 font-medium">
                  <input
                    type="checkbox"
                    checked={onlyWithStock}
                    onChange={e => setOnlyWithStock(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                  />
                  <span>Solo incluir productos con existencias &gt; 0 en {selectedUp}</span>
                </label>
              </div>
            )}

            {/* Condition: If Historial, Type of transaction and Date range */}
            {reportType === 'historial' && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                    Tipo de Movimiento:
                  </label>
                  <select
                    value={transactionType}
                    onChange={e => setTransactionType(e.target.value as any)}
                    className="w-full bg-white border border-gray-200 text-gray-800 py-2 px-3 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Entradas y Salidas</option>
                    <option value="entrada">Solo Entradas (Recepciones)</option>
                    <option value="salida">Solo Salidas (Despachos)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    Rango de Fechas:
                  </label>
                  <select
                    value={dateRange}
                    onChange={e => setDateRange(e.target.value as any)}
                    className="w-full bg-white border border-gray-200 text-gray-800 py-2 px-3 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Todo el Historial</option>
                    <option value="7days">Últimos 7 días</option>
                    <option value="30days">Últimos 30 días</option>
                    <option value="thisMonth">Mes Actual</option>
                    <option value="custom">Rango Personalizado</option>
                  </select>
                </div>

                {dateRange === 'custom' && (
                  <div className="sm:col-span-2 grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs">
                    <div>
                      <label className="text-gray-600 block mb-1">Desde fecha:</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded-lg p-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-gray-600 block mb-1">Hasta fecha:</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded-lg p-1.5 text-xs"
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Preview Banner */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-600 text-white rounded-xl">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-emerald-900 font-bold">
                  {previewData.count}{' '}
                  {reportType === 'historial' ? 'movimientos encontrados' : 'productos encontrados'}
                </p>
                <p className="text-[11px] text-emerald-700">
                  Ubicación:{' '}
                  <strong className="underline">
                    {selectedUp === 'all' ? 'Todas las UPs (Consolidado)' : selectedUp}
                  </strong>
                </p>
              </div>
            </div>

            <span className="text-[10px] font-bold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300 uppercase">
              Listo para Exportar
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-gray-100 bg-slate-50/70 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 rounded-xl transition"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={previewData.count === 0}
            onClick={handleGenerateReport}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-600/20 flex items-center gap-2 transition active:scale-95"
          >
            <Download className="w-4 h-4" />
            Descargar Reporte CSV ({previewData.count})
          </button>
        </div>
      </div>
    </div>
  );
};
