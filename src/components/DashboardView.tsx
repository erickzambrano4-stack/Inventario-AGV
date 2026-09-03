import React, { useState, useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { INITIAL_UPS } from '../types';
import {
  Search,
  FileSpreadsheet,
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  CircleDot,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Filter,
  CheckCircle2
} from 'lucide-react';
import { downloadCsv, csvEscape } from '../lib/security';
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
  const { inventario, stats, showToast } = useInventory();

  // Table search & pagination state
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [filterAlertsOnly, setFilterAlertsOnly] = useState(false);

  // Chart configuration state (Horizontal layout with product names)
  const [chartSort, setChartSort] = useState<'alertas' | 'menor_stock' | 'mayor_stock' | 'nombre'>('alertas');
  const [chartAreaFilter, setChartAreaFilter] = useState<string>('all');
  const [chartType, setChartType] = useState<'points' | 'bars'>('points');

  // Distinct areas for filters
  const uniqueAreas = useMemo(() => {
    const areas = new Set<string>();
    inventario.forEach(i => {
      if (i.area) areas.add(i.area.trim().toUpperCase());
    });
    return Array.from(areas).sort();
  }, [inventario]);

  // Filter products for table
  const filtered = useMemo(() => {
    return inventario.filter(item => {
      const matchQuery =
        item.id.toLowerCase().includes(search.toLowerCase()) ||
        item.desc.toLowerCase().includes(search.toLowerCase()) ||
        (item.area && item.area.toLowerCase().includes(search.toLowerCase()));

      const isAlert = item.stockTotal <= (item.reorden || 0);
      return filterAlertsOnly ? matchQuery && isAlert : matchQuery;
    });
  }, [inventario, search, filterAlertsOnly]);

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

    // Sorting logic
    items.sort((a, b) => {
      if (chartSort === 'alertas') {
        const aCrit = a.stockTotal <= (a.reorden || 0) ? 1 : 0;
        const bCrit = b.stockTotal <= (b.reorden || 0) ? 1 : 0;
        if (aCrit !== bCrit) return bCrit - aCrit;
        return a.stockTotal - b.stockTotal;
      }
      if (chartSort === 'menor_stock') {
        return a.stockTotal - b.stockTotal;
      }
      if (chartSort === 'mayor_stock') {
        return b.stockTotal - a.stockTotal;
      }
      // Por nombre de producto
      return a.desc.localeCompare(b.desc);
    });

    return items.map(item => {
      const isAlert = item.stockTotal <= (item.reorden || 0);
      // Format short display name for X-axis while preserving full name in tooltip
      const truncatedName =
        item.desc.length > 24 ? `${item.desc.substring(0, 22)}...` : item.desc;

      return {
        name: truncatedName,
        fullName: item.desc,
        id: item.id,
        area: item.area || 'GENERAL',
        unidad: item.unidad || 'PZ',
        stock: item.stockTotal,
        reorden: item.reorden || 0,
        isAlert,
        upStock: item.upStock
      };
    });
  }, [inventario, chartAreaFilter, search, chartSort]);

  // Dynamic minimum width so all product names have sufficient room horizontally
  const chartMinWidth = useMemo(() => {
    return Math.max(700, chartData.length * 130);
  }, [chartData.length]);

  // Export to CSV
  const handleExportCSV = () => {
    if (inventario.length === 0) {
      showToast('No hay datos de inventario para exportar', 'warning');
      return;
    }

    const headers = ['Codigo', 'Descripcion', 'Area', 'Punto_Reorden', 'Stock_Total'];
    INITIAL_UPS.forEach(up => headers.push(`UP_${up.replace(/\s+/g, '_')}`));

    const rows: string[] = [headers.join(',')];

    inventario.forEach(item => {
      const row = [
        csvEscape(item.id),
        csvEscape(item.desc),
        csvEscape(item.area || 'GENERAL'),
        item.reorden || 0,
        item.stockTotal
      ];
      INITIAL_UPS.forEach(up => {
        row.push(item.upStock[up] !== undefined ? String(item.upStock[up]) : '0');
      });
      rows.push(row.join(','));
    });

    const csvContent = rows.join('\n');
    downloadCsv(`Inventario_General_${new Date().toISOString().split('T')[0]}.csv`, csvContent);
    showToast('Archivo CSV de inventario exportado con éxito', 'success');
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
              Stock Actual:
            </span>
            <span className={`font-black text-sm ${data.isAlert ? 'text-rose-400' : 'text-blue-400'}`}>
              {Number(data.stock).toLocaleString()} {data.unidad}
            </span>
          </div>

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
                <div key={up} className="flex justify-between">
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
      {/* Top Header Card */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard de Inventario</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
              {inventario.length} Productos
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Monitoreo en tiempo real con nombres de productos, gráfica horizontal y control por subacopio
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
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm shadow-emerald-600/20 flex items-center justify-center gap-2 transition active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Catálogo Total</p>
            <p className="text-2xl font-black text-gray-900">{stats.totalItems}</p>
            <span className="text-[11px] text-gray-400 font-medium">Productos registrados</span>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Entradas</p>
            <p className="text-2xl font-black text-gray-900">{stats.totalEntradas}</p>
            <span className="text-[11px] text-emerald-600 font-semibold">Recepciones registradas</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Salidas</p>
            <p className="text-2xl font-black text-gray-900">{stats.totalSalidas}</p>
            <span className="text-[11px] text-rose-600 font-semibold">Despachos totales</span>
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
              : stats.alertas > 0
              ? 'bg-rose-50/70 border-rose-200 hover:bg-rose-100/70'
              : 'bg-white border-gray-100'
          }`}
        >
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${filterAlertsOnly ? 'text-white/80' : 'text-rose-600'}`}>
              Alertas Reorden
            </p>
            <p className={`text-2xl font-black ${filterAlertsOnly ? 'text-white' : 'text-rose-700'}`}>
              {stats.alertas}
            </p>
            <span className={`text-[11px] font-medium flex items-center gap-1 ${filterAlertsOnly ? 'text-white/90 font-bold' : 'text-rose-600'}`}>
              {filterAlertsOnly ? 'Filtro activo (Click para ver todos)' : 'Click para filtrar alertas'}
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
                  Gráfica Horizontal: Nombres de Productos vs. Existencias
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Visualización horizontal por nombres de productos. Puntos rojos señalan existencias en o por debajo del reorden mínimo.
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
            Mostrando <strong>{chartData.length}</strong> productos ordenados horizontalmente por nombre
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
                        name="Stock Actual"
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
                      <Bar dataKey="stock" name="Stock Actual" radius={[4, 4, 0, 0]}>
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
            <h4 className="font-bold text-gray-900 text-base">Detalle de Inventario por Ubicación (UP)</h4>
            <p className="text-xs text-gray-500">Desglose exacto de existencias en cada subacopio</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span>Filas por página:</span>
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
              {filtered.length} productos {filterAlertsOnly ? '(alertas)' : ''}
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
                <th className="px-4 py-3.5 text-center bg-blue-50/50 text-blue-800 font-bold">Stock Total</th>
                {INITIAL_UPS.map(up => (
                  <th key={up} className="px-4 py-3.5 text-center whitespace-nowrap">
                    {up}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pageItems.length > 0 ? (
                pageItems.map(item => {
                  const isAlert = item.stockTotal <= (item.reorden || 0);

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
                              title="Stock en nivel crítico (menor o igual a reorden)"
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

                      <td
                        className={`px-4 py-3.5 text-center text-base font-black border-x border-gray-100 ${
                          isAlert ? 'text-rose-600 bg-rose-50/40' : 'text-blue-600 bg-blue-50/20'
                        }`}
                      >
                        {item.stockTotal.toLocaleString()}
                      </td>

                      {INITIAL_UPS.map(up => {
                        const qty = item.upStock[up] || 0;
                        let textClass = 'text-gray-300 font-normal';
                        if (qty > 0) textClass = 'text-emerald-700 font-bold';
                        else if (qty < 0) textClass = 'text-rose-600 font-bold';

                        return (
                          <td key={up} className={`px-4 py-3.5 text-center ${textClass}`}>
                            {qty === 0 ? '-' : qty.toLocaleString()}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={4 + INITIAL_UPS.length}
                    className="p-10 text-center text-gray-400 text-sm"
                  >
                    No se encontraron productos que coincidan con la búsqueda.
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
    </div>
  );
};
