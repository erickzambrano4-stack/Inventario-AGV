import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import {
  Search,
  FileSpreadsheet,
  Package,
  PackageCheck,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  CircleDot,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  MapPin,
  X,
  Layers,
  Lock,
  Shield,
  Download
} from 'lucide-react';
import { downloadCsv, csvEscape } from '../lib/security';
import { ReportModal } from './ReportModal';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';

export const DashboardView: React.FC = () => {
  const {
    inventario,
    transacciones,
    stats,
    ups,
    currentUser,
    userAllowedUps,
    isGlobalAccess,
    primaryUp,
    showToast
  } = useInventory();

  // UP Filter state for the Dashboard - restricted users default to their authorized UP
  const [selectedUp, setSelectedUp] = useState<string>(() => {
    return isGlobalAccess ? 'all' : primaryUp;
  });
  // Option to only show products with active inventory / stock > 0
  const [onlyWithStock, setOnlyWithStock] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Sync selectedUp if user permissions or userAllowedUps change
  React.useEffect(() => {
    if (!isGlobalAccess) {
      if (selectedUp === 'all' || !userAllowedUps.includes(selectedUp.toUpperCase())) {
        setSelectedUp(primaryUp);
      }
    }
  }, [isGlobalAccess, userAllowedUps, primaryUp, selectedUp]);

  // Table search & pagination state
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [filterAlertsOnly, setFilterAlertsOnly] = useState(false);

  // Chart configuration state (Horizontal layout with product names)
  const [chartSort, setChartSort] = useState<'alertas' | 'menor_stock' | 'mayor_stock' | 'nombre'>('alertas');
  const [chartAreaFilter, setChartAreaFilter] = useState<string>('all');
  const [chartType, setChartType] = useState<'points' | 'bars'>('points');

  // Dynamic available UPs (filtered strictly by user authorization)
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

  // Distinct areas for filters
  const uniqueAreas = useMemo(() => {
    const areas = new Set<string>();
    inventario.forEach(i => {
      if (i.area) areas.add(i.area.trim().toUpperCase());
    });
    return Array.from(areas).sort();
  }, [inventario]);

  // Total items with inventory (> 0) in the currently active view
  const currentTotalWithStock = useMemo(() => {
    const effectiveUp = (!isGlobalAccess && selectedUp === 'all') ? primaryUp : selectedUp;
    return inventario.filter(i => {
      const stock = (effectiveUp === 'all' && isGlobalAccess)
        ? i.stockTotal
        : (i.upStock[effectiveUp] || 0);
      return stock > 0;
    }).length;
  }, [inventario, selectedUp, isGlobalAccess, primaryUp]);

  // Dynamic KPI Stats adapted strictly to authorized UP and onlyWithStock filter
  const dashboardStats = useMemo(() => {
    const effectiveUp = (!isGlobalAccess && selectedUp === 'all') ? primaryUp : selectedUp;
    const isFilteredByUp = effectiveUp !== 'all' || !isGlobalAccess;

    const withStockGlobal = inventario.filter(i => i.stockTotal > 0).length;
    const withStockUp = inventario.filter(i => (i.upStock[effectiveUp] || 0) > 0).length;

    if (!isFilteredByUp) {
      return {
        totalItems: onlyWithStock ? withStockGlobal : stats.totalItems,
        catalogTotal: stats.totalItems,
        withStockCount: withStockGlobal,
        totalEntradas: stats.totalEntradas,
        totalSalidas: stats.totalSalidas,
        alertas: stats.alertas,
        isUpFiltered: false,
        upName: 'Todas las UPs'
      };
    }

    const currentTargetUp = effectiveUp;
    const entradasInUp = transacciones.filter(
      t => t.tipo === 'entrada' && t.up.toUpperCase() === currentTargetUp.toUpperCase()
    ).length;
    const salidasInUp = transacciones.filter(
      t => t.tipo === 'salida' && t.up.toUpperCase() === currentTargetUp.toUpperCase()
    ).length;
    const alertasInUp = inventario.filter(
      i => (i.upStock[currentTargetUp] || 0) <= (i.reorden || 0)
    ).length;

    return {
      totalItems: onlyWithStock ? withStockUp : inventario.length,
      catalogTotal: inventario.length,
      withStockCount: withStockUp,
      totalEntradas: entradasInUp,
      totalSalidas: salidasInUp,
      alertas: alertasInUp,
      isUpFiltered: true,
      upName: currentTargetUp
    };
  }, [selectedUp, isGlobalAccess, primaryUp, stats, inventario, transacciones, onlyWithStock]);

  // Filter products for table
  const filtered = useMemo(() => {
    const effectiveUp = (!isGlobalAccess && selectedUp === 'all') ? primaryUp : selectedUp;

    return inventario.filter(item => {
      const matchQuery =
        item.id.toLowerCase().includes(search.toLowerCase()) ||
        item.desc.toLowerCase().includes(search.toLowerCase()) ||
        (item.area && item.area.toLowerCase().includes(search.toLowerCase()));

      const currentStock = (effectiveUp === 'all' && isGlobalAccess)
        ? item.stockTotal
        : (item.upStock[effectiveUp] || 0);

      const isAlert = currentStock <= (item.reorden || 0);
      const matchesAlert = filterAlertsOnly ? isAlert : true;
      const matchesStock = onlyWithStock ? currentStock > 0 : true;

      return matchQuery && matchesAlert && matchesStock;
    });
  }, [inventario, search, filterAlertsOnly, selectedUp, onlyWithStock, isGlobalAccess, primaryUp]);

  // Table Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  // Process and sort products for the Horizontal Chart using Product Names
  const chartData = useMemo(() => {
    let items = [...inventario];

    // Optional area filter in chart
    if (chartAreaFilter !== 'all') {
      items = items.filter(i => (i.area || 'GENERAL').toUpperCase() === chartAreaFilter.toUpperCase());
    }

    // Optional text search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(i =>
        i.id.toLowerCase().includes(q) ||
        i.desc.toLowerCase().includes(q) ||
        (i.area && i.area.toLowerCase().includes(q))
      );
    }

    // Option to only display products with stock > 0
    if (onlyWithStock) {
      const effectiveUp = (!isGlobalAccess && selectedUp === 'all') ? primaryUp : selectedUp;
      items = items.filter(i => {
        const stock = (effectiveUp === 'all' && isGlobalAccess)
          ? i.stockTotal
          : (i.upStock[effectiveUp] || 0);
        return stock > 0;
      });
    }

    // Sorting logic based on active UP stock or total stock
    items.sort((a, b) => {
      const stockA = selectedUp === 'all' ? a.stockTotal : (a.upStock[selectedUp] || 0);
      const stockB = selectedUp === 'all' ? b.stockTotal : (b.upStock[selectedUp] || 0);
      const reordenA = a.reorden || 0;
      const reordenB = b.reorden || 0;

      if (chartSort === 'alertas') {
        const aCrit = stockA <= reordenA ? 1 : 0;
        const bCrit = stockB <= reordenB ? 1 : 0;
        if (aCrit !== bCrit) return bCrit - aCrit;
        return stockA - stockB;
      }
      if (chartSort === 'menor_stock') {
        return stockA - stockB;
      }
      if (chartSort === 'mayor_stock') {
        return stockB - stockA;
      }
      // Por nombre de producto
      return a.desc.localeCompare(b.desc);
    });

    return items.map(item => {
      const stockToDisplay = selectedUp === 'all' ? item.stockTotal : (item.upStock[selectedUp] || 0);
      const isAlert = stockToDisplay <= (item.reorden || 0);
      // Format short display name for X-axis while preserving full name in tooltip
      const truncatedName =
        item.desc.length > 24 ? `${item.desc.substring(0, 22)}...` : item.desc;

      return {
        name: truncatedName,
        fullName: item.desc,
        id: item.id,
        area: item.area || 'GENERAL',
        unidad: item.unidad || 'PZ',
        stock: stockToDisplay,
        stockTotalGlobal: item.stockTotal,
        reorden: item.reorden || 0,
        isAlert,
        upStock: item.upStock,
        activeUp: selectedUp
      };
    });
  }, [inventario, chartAreaFilter, search, chartSort, selectedUp, onlyWithStock, isGlobalAccess, primaryUp]);

  // Dynamic minimum width so all product names have sufficient room horizontally
  const chartMinWidth = useMemo(() => {
    return Math.max(700, chartData.length * 130);
  }, [chartData.length]);

  // Export to CSV directly matching current filter
  const handleExportCSV = () => {
    const effectiveUp = (!isGlobalAccess && selectedUp === 'all') ? primaryUp : selectedUp;
    const itemsToExport = onlyWithStock
      ? inventario.filter(item => {
          if (effectiveUp === 'all' && isGlobalAccess) return item.stockTotal > 0;
          return (item.upStock[effectiveUp] || 0) > 0;
        })
      : inventario;

    if (itemsToExport.length === 0) {
      showToast('No hay datos de inventario para exportar con los filtros seleccionados', 'warning');
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    if (selectedUp === 'all') {
      const headers = ['Codigo', 'Descripcion', 'Area', 'Punto_Reorden', isGlobalAccess ? 'Stock_Total_Consolidado' : 'Stock_Sedes_Autorizadas'];
      availableUps.forEach(up => headers.push(`Stock_${up.replace(/\s+/g, '_')}`));

      const rows: string[] = [headers.join(',')];

      itemsToExport.forEach(item => {
        const row = [
          csvEscape(item.id),
          csvEscape(item.desc),
          csvEscape(item.area || 'GENERAL'),
          item.reorden || 0,
          isGlobalAccess
            ? item.stockTotal
            : availableUps.reduce((acc, u) => acc + (item.upStock[u] || 0), 0)
        ];
        availableUps.forEach(up => {
          row.push(item.upStock[up] !== undefined ? String(item.upStock[up]) : '0');
        });
        rows.push(row.join(','));
      });

      downloadCsv(`Inventario_Consolidado_${onlyWithStock ? 'ConStock_' : ''}${today}.csv`, rows.join('\n'));
      showToast(`Archivo CSV exportado con éxito (${itemsToExport.length} productos)`, 'success');
    } else {
      const upTag = selectedUp.replace(/\s+/g, '_');
      const headers = [
        'Codigo',
        'Descripcion',
        'Area',
        'Ubicacion_UP',
        `Stock_en_${upTag}`,
        'Punto_Reorden',
        'Estado'
      ];
      if (isGlobalAccess) {
        headers.push('Stock_Total_Global');
      }
      const rows: string[] = [headers.join(',')];

      itemsToExport.forEach(item => {
        const upQty = item.upStock[selectedUp] || 0;
        const reorden = item.reorden || 0;
        const estado = upQty <= reorden ? 'ALERTA' : 'OPTIMO';

        const row = [
          csvEscape(item.id),
          csvEscape(item.desc),
          csvEscape(item.area || 'GENERAL'),
          csvEscape(selectedUp),
          upQty,
          reorden,
          estado
        ];
        if (isGlobalAccess) {
          row.push(item.stockTotal);
        }
        rows.push(row.join(','));
      });

      downloadCsv(`Inventario_${upTag}_${onlyWithStock ? 'ConStock_' : ''}${today}.csv`, rows.join('\n'));
      showToast(`Archivo CSV de ${selectedUp} exportado con éxito (${itemsToExport.length} productos)`, 'success');
    }
  };

  // Custom rich tooltip for horizontal chart displaying product names
  const CustomChartTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0]?.payload;
    if (!data) return null;

    const diff = data.stock - data.reorden;

    return (
      <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-2xl border border-slate-700 text-xs min-w-[260px] max-w-[340px] z-50 pointer-events-none">
        {/* Header with Product Name */}
        <div className="border-b border-slate-800 pb-2 mb-2">
          <p className="font-bold text-sm text-white leading-snug">
            {data.fullName}
          </p>
          <div className="flex items-center justify-between gap-2 mt-1">
            <span className="text-[11px] text-slate-400 font-mono">
              Código: {data.id}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
              {data.area}
            </span>
          </div>
        </div>

        {/* Stock & Reorder quantities */}
        <div className="space-y-1.5 bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60 mb-2.5">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full inline-block shadow-sm ${data.isAlert ? 'bg-rose-500' : 'bg-blue-500'}`} />
              {data.activeUp === 'all' ? 'Stock Total:' : `Stock en ${data.activeUp}:`}
            </span>
            <span className={`font-black text-sm ${data.isAlert ? 'text-rose-400' : 'text-blue-400'}`}>
              {Number(data.stock).toLocaleString()} {data.unidad}
            </span>
          </div>

          {data.activeUp !== 'all' && isGlobalAccess && (
            <div className="flex justify-between items-center text-[11px] text-slate-400">
              <span>Total Global Consolidado:</span>
              <span className="font-semibold text-slate-300">
                {Number(data.stockTotalGlobal).toLocaleString()} {data.unidad}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-slate-400 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-amber-500 rotate-45 inline-block shadow-sm" />
              Punto Reorden:
            </span>
            <span className="font-semibold text-amber-400">
              {Number(data.reorden).toLocaleString()} {data.unidad}
            </span>
          </div>

          <div className="flex justify-between items-center pt-1.5 border-t border-slate-700/80 text-[11px]">
            <span className="text-slate-400">Estado:</span>
            <span className={`font-bold flex items-center gap-1 ${data.isAlert ? 'text-rose-400' : 'text-emerald-400'}`}>
              {data.isAlert ? (
                <>
                  <AlertTriangle className="w-3 h-3 text-rose-400 inline" />
                  Alerta ({diff} {data.unidad})
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 inline" />
                  Óptimo (+{diff} {data.unidad})
                </>
              )}
            </span>
          </div>
        </div>

        {/* Subacopios Breakdown */}
        {data.upStock && (
          <div className="text-[10px] text-slate-400">
            <p className="font-semibold text-slate-300 mb-1">Existencias en Subacopios (UP):</p>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 bg-slate-950/50 p-2 rounded border border-slate-800">
              {Object.entries(data.upStock).map(([up, qty]) => (
                <div
                  key={up}
                  className={`flex justify-between px-1 rounded ${
                    data.activeUp === up ? 'bg-blue-900/60 text-blue-200 font-bold' : ''
                  }`}
                >
                  <span className="text-slate-400 truncate max-w-[85px]">{up}:</span>
                  <span className={Number(qty) > 0 ? 'text-emerald-400 font-semibold' : 'text-slate-600'}>
                    {Number(qty) > 0 ? Number(qty).toLocaleString() : '-'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Security Scope Banner for restricted users */}
      {!isGlobalAccess && (
        <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent border border-blue-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <span>Información Filtrada por Permisos</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-200/80 text-blue-900">
                  UP Autorizada: {availableUps.join(', ')}
                </span>
              </h4>
              <p className="text-xs text-gray-600 mt-0.5">
                Por tu perfil de acceso ({currentUser?.name}), estás visualizando exclusivamente las existencias, movimientos y alertas de tu sede asignada.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-800 bg-white px-3 py-1.5 rounded-xl border border-blue-100 shrink-0 self-start sm:self-auto shadow-2xs">
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            <span>Acceso Exclusivo Sede</span>
          </div>
        </div>
      )}

      {/* Top Header Card */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard de Inventario</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
              {inventario.length} Productos
            </span>
            {selectedUp !== 'all' && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> UP: {selectedUp}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {isGlobalAccess
              ? 'Monitoreo consolidado con filtro por subacopio (UP), reportes independientes y gráfica de existencias'
              : `Monitoreo de existencias y niveles de reorden para la UP ${primaryUp}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar código, nombre o área..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50/70 border border-gray-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition active:scale-95 shadow-2xs"
            title="Generar y exportar reportes independientes por UP"
          >
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
            <span>Reportes por UP</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm shadow-emerald-600/20 flex items-center justify-center gap-2 transition active:scale-95"
            title={selectedUp === 'all' && isGlobalAccess ? 'Exportar CSV consolidado' : `Exportar CSV de ${selectedUp === 'all' ? primaryUp : selectedUp}`}
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* UP Selection and Subacopio Filter Bar */}
      <div className="bg-white border border-gray-150 rounded-2xl shadow-sm p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 text-gray-900 font-bold text-sm shrink-0">
            <div className="p-1.5 bg-blue-100/70 text-blue-700 rounded-lg">
              <MapPin className="w-4 h-4" />
            </div>
            <span>{isGlobalAccess ? 'Filtrar por UP (Subacopio):' : 'Sede Asignada:'}</span>
          </div>

          {/* Quick UP Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {isGlobalAccess && (
              <button
                type="button"
                onClick={() => {
                  setSelectedUp('all');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                  selectedUp === 'all'
                    ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                    : 'bg-slate-50 text-gray-700 border-gray-200 hover:bg-slate-100'
                }`}
              >
                <span>Todas las UPs</span>
                {selectedUp === 'all' && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
              </button>
            )}

            {availableUps.map(up => {
              const isSelected = selectedUp === up || (!isGlobalAccess && availableUps.length === 1);
              const countWithStock = inventario.filter(i => (i.upStock[up] || 0) > 0).length;

              return (
                <button
                  key={up}
                  type="button"
                  onClick={() => {
                    setSelectedUp(up);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                      : 'bg-slate-50 text-gray-700 border-gray-200 hover:bg-slate-100'
                  }`}
                >
                  {!isGlobalAccess && <Lock className="w-3 h-3 text-blue-200" />}
                  <span>{up}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-semibold ${
                      isSelected ? 'bg-blue-700/80 text-blue-100' : 'bg-gray-200/80 text-gray-600'
                    }`}
                  >
                    {countWithStock}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Options: Solo con inventario toggle & Reports */}
        <div className="flex flex-wrap items-center gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100">
          <button
            type="button"
            onClick={() => {
              setOnlyWithStock(!onlyWithStock);
              setCurrentPage(1);
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer select-none shadow-2xs ${
              onlyWithStock
                ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-500/20 shadow-xs'
                : 'bg-emerald-50/70 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
            }`}
            title="Mostrar únicamente productos que tienen existencias disponibles (> 0)"
          >
            <PackageCheck className={`w-4 h-4 ${onlyWithStock ? 'text-white' : 'text-emerald-700'}`} />
            <span>
              {selectedUp === 'all'
                ? 'Solo con inventario'
                : `Solo con stock en ${selectedUp}`}
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                onlyWithStock ? 'bg-emerald-700 text-emerald-100' : 'bg-emerald-200/80 text-emerald-900'
              }`}
            >
              {onlyWithStock ? `${currentTotalWithStock} activos` : `${currentTotalWithStock}`}
            </span>
          </button>

          {isGlobalAccess && selectedUp !== 'all' && (
            <button
              type="button"
              onClick={() => {
                setSelectedUp('all');
                setCurrentPage(1);
              }}
              className="text-xs text-gray-500 hover:text-rose-600 font-semibold flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-rose-50 transition"
              title="Quitar filtro de UP"
            >
              <X className="w-3.5 h-3.5" />
              <span>Ver Todas</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ml-auto shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-blue-700" />
            <span>Reportes Avanzados</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => {
            setOnlyWithStock(!onlyWithStock);
            setCurrentPage(1);
          }}
          className={`cursor-pointer p-5 rounded-2xl border transition shadow-sm flex items-center justify-between ${
            onlyWithStock
              ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20'
              : 'bg-white border-gray-100 hover:border-gray-200'
          }`}
          title="Haz clic para alternar entre ver todo el catálogo o solo productos con existencias"
        >
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {dashboardStats.isUpFiltered
                  ? `Productos en ${dashboardStats.upName}`
                  : onlyWithStock
                  ? 'Con Inventario Activo'
                  : 'Catálogo Total'}
              </p>
              {onlyWithStock && (
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded-full bg-emerald-600 text-white">
                  Filtrado
                </span>
              )}
            </div>
            <p className="text-2xl font-black text-gray-900">{dashboardStats.totalItems}</p>
            <span className="text-[11px] text-gray-500 font-medium">
              {onlyWithStock
                ? `${dashboardStats.withStockCount} de ${dashboardStats.catalogTotal} con stock (Click para ver todos)`
                : `${dashboardStats.withStockCount} de ${dashboardStats.catalogTotal} con existencias > 0`}
            </span>
          </div>
          <div className={`p-3 rounded-2xl ${onlyWithStock ? 'bg-emerald-600 text-white shadow-xs' : 'bg-blue-50 text-blue-600'}`}>
            <PackageCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              {dashboardStats.isUpFiltered ? `Entradas en ${dashboardStats.upName}` : 'Entradas'}
            </p>
            <p className="text-2xl font-black text-gray-900">{dashboardStats.totalEntradas}</p>
            <span className="text-[11px] text-emerald-600 font-semibold">
              {dashboardStats.isUpFiltered ? 'Recepciones en esta UP' : 'Recepciones registradas'}
            </span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              {dashboardStats.isUpFiltered ? `Salidas en ${dashboardStats.upName}` : 'Salidas'}
            </p>
            <p className="text-2xl font-black text-gray-900">{dashboardStats.totalSalidas}</p>
            <span className="text-[11px] text-rose-600 font-semibold">
              {dashboardStats.isUpFiltered ? 'Despachos en esta UP' : 'Despachos totales'}
            </span>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>

        <div
          onClick={() => {
            setFilterAlertsOnly(!filterAlertsOnly);
            setCurrentPage(1);
          }}
          className={`cursor-pointer p-5 rounded-2xl border transition shadow-sm flex items-center justify-between ${
            filterAlertsOnly
              ? 'bg-rose-600 text-white border-rose-700 shadow-rose-500/25'
              : dashboardStats.alertas > 0
              ? 'bg-rose-50/70 border-rose-200 hover:bg-rose-100/70'
              : 'bg-white border-gray-100'
          }`}
        >
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${filterAlertsOnly ? 'text-white/80' : 'text-rose-600'}`}>
              {dashboardStats.isUpFiltered ? `Alertas en ${dashboardStats.upName}` : 'Alertas Reorden'}
            </p>
            <p className={`text-2xl font-black ${filterAlertsOnly ? 'text-white' : 'text-rose-700'}`}>
              {dashboardStats.alertas}
            </p>
            <span className={`text-[11px] font-medium flex items-center gap-1 ${filterAlertsOnly ? 'text-white/90 font-bold' : 'text-rose-600'}`}>
              {filterAlertsOnly
                ? 'Filtro activo (Click para ver todos)'
                : dashboardStats.isUpFiltered
                ? 'Stock <= reorden en UP'
                : 'Click para filtrar alertas'}
            </span>
          </div>
          <div className={`p-3 rounded-2xl ${filterAlertsOnly ? 'bg-white/20 text-white' : 'bg-white text-rose-500 shadow-sm'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Stock Chart: Horizontal Layout with Product Names */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">
        {/* Chart Header & Title */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <CircleDot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
                  Gráfica Horizontal:{' '}
                  {selectedUp === 'all' ? 'Existencias Consolidadas' : `Existencias en UP: ${selectedUp}`} vs. Reorden
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedUp === 'all'
                    ? 'Visualización horizontal de stock global. Puntos rojos señalan existencias por debajo del reorden mínimo.'
                    : `Visualizando existencias particulares de ${selectedUp}. Puntos rojos indican stock crítico o reorden para esta ubicación.`}
                </p>
              </div>
            </div>
          </div>

          {/* Legend indicators */}
          <div className="flex flex-wrap items-center gap-3 text-xs bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-100">
            <span className="flex items-center gap-1.5 font-medium text-gray-700">
              <span className="w-3 h-3 rounded-full bg-blue-600 inline-block shadow-sm" />
              Stock Normal (●)
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-rose-600">
              <span className="w-3 h-3 rounded-full bg-rose-500 inline-block shadow-sm" />
              Stock Crítico (●)
            </span>
            <span className="flex items-center gap-1.5 font-medium text-amber-700">
              <span className="w-2.5 h-2.5 bg-amber-500 rotate-45 inline-block shadow-sm" />
              Reorden (◆)
            </span>
          </div>
        </div>

        {/* Chart Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50/70 p-3 rounded-xl border border-gray-200/80 text-xs">
          {/* Left Controls: Sorting & Filter */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Sorting Selector */}
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={chartSort}
                onChange={e => setChartSort(e.target.value as any)}
                className="bg-white border border-gray-200 text-gray-700 py-1 px-2.5 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
              >
                <option value="alertas">Alertas primero (Críticos)</option>
                <option value="menor_stock">Menor Stock primero</option>
                <option value="mayor_stock">Mayor Stock primero</option>
                <option value="nombre">Por Nombre (A - Z)</option>
              </select>
            </div>

            {/* Area Filter */}
            {uniqueAreas.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-gray-400" />
                <select
                  value={chartAreaFilter}
                  onChange={e => setChartAreaFilter(e.target.value)}
                  className="bg-white border border-gray-200 text-gray-700 py-1 px-2.5 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                >
                  <option value="all">Todas las áreas ({inventario.length})</option>
                  {uniqueAreas.map(area => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Quick toggle in chart: Solo con inventario */}
            <button
              type="button"
              onClick={() => setOnlyWithStock(!onlyWithStock)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition border cursor-pointer ${
                onlyWithStock
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
              title="Filtrar gráfica solo a productos con existencias disponibles (> 0)"
            >
              <PackageCheck className={`w-3.5 h-3.5 ${onlyWithStock ? 'text-white' : 'text-emerald-600'}`} />
              <span>Solo con inventario</span>
              {onlyWithStock && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
            </button>
          </div>

          {/* Right Controls: Chart Type Toggle */}
          <div className="flex items-center gap-2 ml-auto">
            <div className="flex items-center bg-white border border-gray-200 rounded-lg p-0.5 shadow-2xs">
              <button
                onClick={() => setChartType('points')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition text-xs ${
                  chartType === 'points'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                title="Gráfica de Puntos"
              >
                <CircleDot className="w-3.5 h-3.5" />
                <span>Puntos</span>
              </button>
              <button
                onClick={() => setChartType('bars')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition text-xs ${
                  chartType === 'bars'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                title="Gráfica de Barras"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Barras</span>
              </button>
            </div>
          </div>
        </div>

        {/* Counter Summary */}
        <div className="flex items-center justify-between text-xs text-gray-500 px-1">
          <span>
            Mostrando <strong>{chartData.length}</strong> productos ordenados horizontalmente
            {selectedUp !== 'all' ? ` (Filtrando por UP: ${selectedUp})` : ''}
            {chartAreaFilter !== 'all' ? ` (Área: ${chartAreaFilter})` : ''}
          </span>
          <span className="text-[11px] text-gray-400">
            Pase el cursor sobre cualquier elemento para ver detalles completos
          </span>
        </div>

        {/* Horizontal Chart Viewport with horizontal scrolling when many products */}
        <div className="w-full rounded-xl border border-gray-100 bg-white p-2 overflow-x-auto">
          {chartData.length > 0 ? (
            <div style={{ minWidth: `${chartMinWidth}px`, height: '420px' }} className="w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  layout="horizontal"
                  data={chartData}
                  margin={{ top: 25, right: 30, left: 10, bottom: 85 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={true}
                    vertical={false}
                    stroke="#f1f5f9"
                  />

                  {/* Horizontal Axis: Product Names */}
                  <XAxis
                    type="category"
                    dataKey="name"
                    interval={0}
                    angle={-28}
                    textAnchor="end"
                    height={85}
                    tick={{ fontSize: 11, fill: '#1e293b', fontWeight: 600 }}
                  />

                  {/* Vertical Axis: Quantities */}
                  <YAxis
                    type="number"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    domain={[0, 'auto']}
                    allowDecimals={false}
                  />

                  <Tooltip
                    content={<CustomChartTooltip />}
                    cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />

                  {/* Render based on selected chart type */}
                  {chartType === 'points' ? (
                    <>
                      {/* Vertical lollipop guide stem from 0 to stock */}
                      <Bar
                        dataKey="stock"
                        barSize={3}
                        fill="#e2e8f0"
                        isAnimationActive={false}
                      />

                      {/* Stock Actual Point (Circle) - Red if alert, Blue if normal */}
                      <Scatter
                        dataKey="stock"
                        name={selectedUp === 'all' ? 'Stock Total' : `Stock en ${selectedUp}`}
                        shape="circle"
                      >
                        {chartData.map((entry, index) => (
                          <Cell
                            key={`cell-stock-${index}`}
                            fill={entry.isAlert ? '#f43f5e' : '#2563eb'}
                            stroke={entry.isAlert ? '#be123c' : '#1d4ed8'}
                            strokeWidth={2}
                            r={6.5}
                          />
                        ))}
                      </Scatter>

                      {/* Punto de Reorden Point (Diamond) */}
                      <Scatter
                        dataKey="reorden"
                        name="Punto de Reorden"
                        shape="diamond"
                        fill="#f59e0b"
                      >
                        {chartData.map((_, index) => (
                          <Cell
                            key={`cell-reorder-${index}`}
                            fill="#f59e0b"
                            stroke="#b45309"
                            strokeWidth={2}
                          />
                        ))}
                      </Scatter>
                    </>
                  ) : (
                    <>
                      {/* Comparative Bars */}
                      <Bar
                        dataKey="stock"
                        name={selectedUp === 'all' ? 'Stock Total' : `Stock en ${selectedUp}`}
                        radius={[4, 4, 0, 0]}
                      >
                        {chartData.map((entry, index) => (
                          <Cell
                            key={`cell-bar-${index}`}
                            fill={entry.isAlert ? '#f43f5e' : '#3b82f6'}
                          />
                        ))}
                      </Bar>
                      <Bar
                        dataKey="reorden"
                        name="Punto de Reorden"
                        fill="#f59e0b"
                        radius={[4, 4, 0, 0]}
                        opacity={0.7}
                      />
                    </>
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-gray-400 text-sm gap-2">
              <Package className="w-8 h-8 text-gray-300" />
              <span>No hay productos que coincidan con los filtros para graficar.</span>
            </div>
          )}
        </div>
      </div>

      {/* Inventory Table by Location (UP) */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/40">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-gray-900 text-base">Detalle de Inventario por Ubicación (UP)</h4>
              {selectedUp !== 'all' && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  Columna {selectedUp} Destacada
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">Desglose exacto de existencias en cada subacopio</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Quick filter in table */}
            <button
              type="button"
              onClick={() => {
                setOnlyWithStock(!onlyWithStock);
                setCurrentPage(1);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition border cursor-pointer ${
                onlyWithStock
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
              title="Filtrar tabla para mostrar únicamente productos con stock > 0"
            >
              <PackageCheck className={`w-3.5 h-3.5 ${onlyWithStock ? 'text-white' : 'text-emerald-600'}`} />
              <span>{onlyWithStock ? 'Filtrado: Con Inventario' : 'Solo con inventario'}</span>
            </button>

            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span>Filas:</span>
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
              </select>
            </div>

            <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-3 py-1 rounded-full whitespace-nowrap">
              {filtered.length} productos
              {onlyWithStock ? ' (con stock)' : ''}
              {filterAlertsOnly ? ' (alertas)' : ''}
              {selectedUp !== 'all' ? ` (${selectedUp})` : ''}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] text-gray-500 uppercase tracking-wider bg-slate-50 border-b border-gray-100 font-semibold">
              <tr>
                <th className="px-5 py-3.5 min-w-[220px]">Producto</th>
                <th className="px-4 py-3.5">Área</th>
                <th className="px-4 py-3.5 text-center bg-amber-50/40 text-amber-800">Reorden</th>
                {isGlobalAccess ? (
                  <>
                    <th className="px-4 py-3.5 text-center bg-blue-50/50 text-blue-800 font-bold">Stock Total</th>
                    {availableUps.map(up => {
                      const isCurrentUp = selectedUp === up;
                      return (
                        <th
                          key={up}
                          className={`px-4 py-3.5 text-center whitespace-nowrap transition ${
                            isCurrentUp ? 'bg-blue-600 text-white font-black shadow-xs' : ''
                          }`}
                        >
                          <div className="flex items-center justify-center gap-1">
                            {isCurrentUp && <MapPin className="w-3 h-3 text-white" />}
                            <span>{up}</span>
                          </div>
                        </th>
                      );
                    })}
                  </>
                ) : availableUps.length === 1 ? (
                  <>
                    <th className="px-4 py-3.5 text-center bg-blue-600 text-white font-black shadow-xs">
                      <div className="flex items-center justify-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Stock en {availableUps[0]}</span>
                      </div>
                    </th>
                    <th className="px-4 py-3.5 text-center">Estado de Stock</th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-3.5 text-center bg-blue-50/50 text-blue-800 font-bold">Stock Mis Sedes</th>
                    {availableUps.map(up => (
                      <th
                        key={up}
                        className={`px-4 py-3.5 text-center whitespace-nowrap transition ${
                          selectedUp === up ? 'bg-blue-600 text-white font-black shadow-xs' : ''
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <MapPin className="w-3 h-3 text-white" />
                          <span>{up}</span>
                        </div>
                      </th>
                    ))}
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pageItems.length > 0 ? (
                pageItems.map(item => {
                  const effectiveUp = (!isGlobalAccess && selectedUp === 'all') ? primaryUp : selectedUp;
                  const currentStock = (effectiveUp === 'all' && isGlobalAccess)
                    ? item.stockTotal
                    : (item.upStock[effectiveUp] || 0);
                  const isAlert = currentStock <= (item.reorden || 0);

                  return (
                    <tr
                      key={item.id}
                      className={`transition group ${
                        isAlert ? 'bg-rose-50/30 hover:bg-rose-50/60' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          {isAlert && (
                            <span
                              className="text-rose-500 shrink-0"
                              title={
                                effectiveUp === 'all'
                                  ? 'Stock consolidado en o por debajo del reorden'
                                  : `Stock en ${effectiveUp} en o por debajo del reorden`
                              }
                            >
                              <AlertTriangle className="w-4 h-4 fill-rose-100" />
                            </span>
                          )}
                          <span className="font-bold text-gray-900">{item.desc}</span>
                        </div>
                        <div className="text-xs text-gray-500 font-mono mt-0.5">
                          Código: {item.id}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700">
                          {item.area || 'GENERAL'}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center font-semibold text-amber-700 bg-amber-50/20">
                        {item.reorden || 0}
                      </td>

                      {isGlobalAccess ? (
                        <>
                          <td
                            className={`px-4 py-3.5 text-center text-base font-black border-x border-gray-100 ${
                              item.stockTotal <= (item.reorden || 0)
                                ? 'text-rose-600 bg-rose-50/40'
                                : 'text-blue-600 bg-blue-50/20'
                            }`}
                          >
                            {item.stockTotal.toLocaleString()}
                          </td>

                          {availableUps.map(up => {
                            const qty = item.upStock[up] || 0;
                            const isCurrentUp = selectedUp === up;
                            let textClass = 'text-gray-300 font-normal';
                            if (qty > 0) textClass = isCurrentUp ? 'text-blue-900 font-black' : 'text-emerald-700 font-bold';
                            else if (qty < 0) textClass = 'text-rose-600 font-bold';

                            return (
                              <td
                                key={up}
                                className={`px-4 py-3.5 text-center transition ${
                                  isCurrentUp ? 'bg-blue-100/60 border-x-2 border-blue-400 font-bold' : ''
                                } ${textClass}`}
                              >
                                {qty === 0 ? '-' : qty.toLocaleString()}
                              </td>
                            );
                          })}
                        </>
                      ) : availableUps.length === 1 ? (
                        <>
                          <td
                            className={`px-4 py-3.5 text-center text-base font-black border-x border-gray-100 ${
                              isAlert ? 'text-rose-600 bg-rose-50/50' : 'text-blue-700 bg-blue-50/30'
                            }`}
                          >
                            {(item.upStock[availableUps[0]] || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            {isAlert ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                <AlertTriangle className="w-3 h-3" /> Reorden Crítico
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" /> Óptimo
                              </span>
                            )}
                          </td>
                        </>
                      ) : (
                        <>
                          <td
                            className="px-4 py-3.5 text-center text-base font-black border-x border-gray-100 text-blue-700 bg-blue-50/30"
                          >
                            {availableUps.reduce((sum, u) => sum + (item.upStock[u] || 0), 0).toLocaleString()}
                          </td>
                          {availableUps.map(up => {
                            const qty = item.upStock[up] || 0;
                            return (
                              <td
                                key={up}
                                className={`px-4 py-3.5 text-center font-bold ${
                                  qty > 0 ? 'text-gray-900' : 'text-gray-300'
                                }`}
                              >
                                {qty === 0 ? '-' : qty.toLocaleString()}
                              </td>
                            );
                          })}
                        </>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={isGlobalAccess ? 4 + availableUps.length : availableUps.length === 1 ? 5 : 4 + availableUps.length}
                    className="p-10 text-center text-gray-500 text-sm"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Package className="w-8 h-8 text-gray-300" />
                      <span>
                        No se encontraron productos que coincidan con los filtros
                        {onlyWithStock ? ' (solo productos con inventario)' : ''}
                        {selectedUp !== 'all' ? ` y la UP (${selectedUp}).` : '.'}
                      </span>
                      {onlyWithStock && (
                        <button
                          type="button"
                          onClick={() => setOnlyWithStock(false)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline mt-1"
                        >
                          Mostrar todos los productos del catálogo
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {filtered.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-3.5 border-t border-gray-100 bg-gray-50/40 gap-3">
            <p className="text-xs text-gray-500">
              Mostrando {Math.min((currentPage - 1) * pageSize + 1, filtered.length)} a{' '}
              {Math.min(currentPage * pageSize, filtered.length)} de {filtered.length} productos
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

      {/* Advanced Reports by Independent UP Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        defaultUp={selectedUp}
        defaultReportType="inventario"
      />
    </div>
  );
};
