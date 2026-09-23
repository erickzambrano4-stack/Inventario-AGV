import React from 'react';
import {
  LayoutDashboard,
  ArrowDownLeft,
  ArrowUpRight,
  Package,
  MapPin,
  Search,
  Download,
  AlertTriangle,
  FileSpreadsheet,
  Users,
  Shield,
  CheckCircle2,
  Calendar,
  Cloud,
  Layers,
  Sparkles
} from 'lucide-react';

interface MockupWindowProps {
  title: string;
  url: string;
  children: React.ReactNode;
}

export const MockupWindow: React.FC<MockupWindowProps> = ({ title, url, children }) => {
  return (
    <div className="my-6 rounded-2xl border border-slate-300/80 bg-slate-900 shadow-xl overflow-hidden text-slate-800 transition-all">
      {/* Window Chrome / Titlebar */}
      <div className="bg-slate-800/90 px-4 py-2.5 flex items-center justify-between border-b border-slate-700 select-none">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500/90 inline-block border border-rose-600" />
            <span className="w-3 h-3 rounded-full bg-amber-500/90 inline-block border border-amber-600" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/90 inline-block border border-emerald-600" />
          </div>
          <span className="text-xs font-semibold text-slate-300 ml-2 truncate max-w-[200px] sm:max-w-xs">{title}</span>
        </div>

        {/* Address Bar */}
        <div className="hidden sm:flex items-center gap-1.5 bg-slate-950/60 border border-slate-700/80 px-3 py-1 rounded-lg text-[11px] text-slate-400 font-mono max-w-sm w-full mx-4 truncate">
          <span className="text-emerald-400 font-bold">https://</span>
          <span className="text-slate-300 truncate">{url}</span>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-blue-400 font-medium bg-blue-950/40 px-2 py-0.5 rounded border border-blue-800/50">
          <Sparkles className="w-3 h-3" />
          <span>Captura del Sistema</span>
        </div>
      </div>

      {/* Screen Canvas */}
      <div className="bg-slate-50 p-3 sm:p-5 overflow-x-auto">
        {children}
      </div>
    </div>
  );
};

/* Callout Marker badge */
export const Pin: React.FC<{ number: number; label: string }> = ({ number, label }) => (
  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-600 text-white shadow-md shadow-blue-500/30 border border-blue-400">
    <span className="w-4 h-4 rounded-full bg-white text-blue-700 text-[10px] font-black flex items-center justify-center">
      {number}
    </span>
    <span>{label}</span>
  </span>
);

/* 1. DASHBOARD SCREENSHOT */
export const DashboardScreenshot: React.FC = () => {
  return (
    <MockupWindow title="Dashboard de Inventario y Control por UP" url="app.inventario.com/dashboard">
      <div className="space-y-4 max-w-5xl mx-auto text-xs">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-gray-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-gray-900">Panel Principal</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5" /> UP: LUPITA
              </span>
            </div>
            <p className="text-[11px] text-gray-500">Monitoreo en tiempo real con filtro por subacopio</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold flex items-center gap-1">
              <FileSpreadsheet className="w-3.5 h-3.5" /> Reportes por UP
            </span>
            <span className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1">
              <Download className="w-3.5 h-3.5" /> Exportar CSV
            </span>
          </div>
        </div>

        {/* 1. UP Filter Bar Mockup */}
        <div className="relative p-3 bg-white border-2 border-blue-400 rounded-xl shadow-sm">
          <div className="absolute -top-3 left-4">
            <Pin number={1} label="Selector Dinámico de UP" />
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="font-bold text-gray-700 text-xs flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-blue-600" /> Subacopio (UP):
            </span>
            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600">Todas las UPs</span>
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-600 text-white shadow-xs flex items-center gap-1">
              <span>LUPITA</span>
              <span className="bg-blue-700 text-white text-[9px] px-1 rounded-full">14</span>
            </span>
            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600">ANITA</span>
            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600">SORAYA</span>
            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600">YASMINE</span>
            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600">PACKING TEPA</span>
            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600">BC CAMALU</span>
          </div>
        </div>

        {/* 2. KPI Cards Mockup */}
        <div className="relative">
          <div className="absolute -top-3 left-4 z-10">
            <Pin number={2} label="Tarjetas de Métricas en UP LUPITA" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2">
            <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
              <p className="text-[10px] font-bold text-gray-400 uppercase">Productos en LUPITA</p>
              <p className="text-xl font-black text-gray-900">14</p>
              <span className="text-[10px] text-gray-500">Con existencias &gt; 0</span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
              <p className="text-[10px] font-bold text-gray-400 uppercase">Entradas en LUPITA</p>
              <p className="text-xl font-black text-emerald-600">38</p>
              <span className="text-[10px] text-emerald-700 font-semibold">Recepciones</span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
              <p className="text-[10px] font-bold text-gray-400 uppercase">Salidas en LUPITA</p>
              <p className="text-xl font-black text-rose-600">29</p>
              <span className="text-[10px] text-rose-700 font-semibold">Despachos</span>
            </div>
            <div className="bg-rose-50 p-3 rounded-xl border-2 border-rose-300 shadow-2xs">
              <p className="text-[10px] font-bold text-rose-700 uppercase">Alertas Reorden</p>
              <p className="text-xl font-black text-rose-800">2</p>
              <span className="text-[10px] text-rose-600 font-bold">Stock crítico en UP</span>
            </div>
          </div>
        </div>

        {/* 3. Horizontal Chart Mockup */}
        <div className="relative bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
          <div className="absolute -top-3 left-4">
            <Pin number={3} label="Gráfica de Existencias vs Punto de Reorden" />
          </div>
          <div className="flex justify-between items-center mb-2 pt-1 text-xs">
            <span className="font-bold text-gray-800">Existencias en UP: LUPITA vs Reorden Mínimo</span>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-blue-600 font-semibold"><span className="w-2 h-2 rounded-full bg-blue-600" /> Stock Actual</span>
              <span className="flex items-center gap-1 text-amber-600 font-semibold"><span className="w-2 h-2 rotate-45 bg-amber-500" /> Punto Reorden</span>
              <span className="flex items-center gap-1 text-rose-600 font-bold"><span className="w-2 h-2 rounded-full bg-rose-600" /> Alerta Crítica</span>
            </div>
          </div>
          {/* Simulated Horizontal Bars */}
          <div className="space-y-2 py-1">
            <div>
              <div className="flex justify-between text-[10px] mb-0.5 font-medium">
                <span className="truncate max-w-[200px] text-gray-700">FORMATO CONTROL DE PRE-FRIO (PZ)</span>
                <span className="text-blue-700 font-bold">250 PZ / Reorden: 100</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 relative overflow-hidden">
                <div className="bg-blue-600 h-3 rounded-full" style={{ width: '70%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] mb-0.5 font-medium">
                <span className="truncate max-w-[200px] text-rose-700 font-bold">ETIQUETA PTI 4X6 (ROLLOS) - ¡ALERTA!</span>
                <span className="text-rose-700 font-black">4 PZ / Reorden: 10</span>
              </div>
              <div className="w-full bg-rose-100 rounded-full h-3 relative overflow-hidden border border-rose-300">
                <div className="bg-rose-600 h-3 rounded-full animate-pulse" style={{ width: '25%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] mb-0.5 font-medium">
                <span className="truncate max-w-[200px] text-gray-700">CLORALEX EL RENDIDOR 10 LT</span>
                <span className="text-blue-700 font-bold">12 PZ / Reorden: 5</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 relative overflow-hidden">
                <div className="bg-blue-600 h-3 rounded-full" style={{ width: '60%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* 4. Table Mockup with Highlighted UP Column */}
        <div className="relative bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
          <div className="absolute -top-3 left-4 z-10">
            <Pin number={4} label="Tabla con Columna de UP LUPITA Destacada" />
          </div>
          <table className="w-full text-left border-collapse text-[11px] pt-2">
            <thead>
              <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                <th className="p-2 font-bold">Código</th>
                <th className="p-2 font-bold">Descripción</th>
                <th className="p-2 text-center font-bold">Reorden</th>
                <th className="p-2 text-center font-bold">Total</th>
                <th className="p-2 text-center font-black bg-blue-600 text-white shadow-xs">
                  <span className="flex items-center justify-center gap-0.5">
                    <MapPin className="w-2.5 h-2.5" /> LUPITA
                  </span>
                </th>
                <th className="p-2 text-center font-bold text-gray-400">ANITA</th>
                <th className="p-2 text-center font-bold text-gray-400">SORAYA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="p-2 font-mono font-bold text-gray-900">MX-F-001</td>
                <td className="p-2 font-semibold text-gray-800">FORMATO PRE-FRIO</td>
                <td className="p-2 text-center font-bold text-amber-600">100</td>
                <td className="p-2 text-center font-bold text-blue-700">450</td>
                <td className="p-2 text-center font-black bg-blue-100 text-blue-900 border-x-2 border-blue-400">250</td>
                <td className="p-2 text-center text-gray-500">100</td>
                <td className="p-2 text-center text-gray-500">100</td>
              </tr>
              <tr className="bg-rose-50/40">
                <td className="p-2 font-mono font-bold text-rose-800 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-rose-600" /> ET4X6
                </td>
                <td className="p-2 font-semibold text-rose-900">ETIQUETA PTI 4X6</td>
                <td className="p-2 text-center font-bold text-amber-600">10</td>
                <td className="p-2 text-center font-bold text-gray-700">18</td>
                <td className="p-2 text-center font-black bg-rose-200 text-rose-900 border-x-2 border-rose-400">4</td>
                <td className="p-2 text-center text-gray-500">8</td>
                <td className="p-2 text-center text-gray-500">6</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </MockupWindow>
  );
};

/* 2. ENTRADAS SCREENSHOT */
export const EntradasScreenshot: React.FC = () => {
  return (
    <MockupWindow title="Formulario de Registro de Entradas" url="app.inventario.com/entrada">
      <div className="max-w-xl mx-auto bg-white p-5 rounded-2xl border border-gray-200 shadow-sm text-xs space-y-3.5">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Registrar Entrada de Mercancía</h3>
              <p className="text-[11px] text-gray-500">Recepción de insumos y actualización inmediata de existencias</p>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
            Recepción Activa
          </span>
        </div>

        {/* Step 1: Producto */}
        <div className="space-y-1 relative">
          <div className="flex items-center justify-between">
            <label className="font-bold text-gray-700 flex items-center gap-1">
              <Pin number={1} label="Selección de Producto" />
            </label>
            <span className="text-[10px] text-blue-600 font-semibold">Búsqueda rápida por código</span>
          </div>
          <div className="flex items-center bg-gray-50 border-2 border-blue-400 rounded-xl p-2.5 text-gray-900 font-semibold">
            <Search className="w-4 h-4 text-blue-600 mr-2 shrink-0" />
            <span className="truncate">MX-F-PCK-003 - FORMATO CONTROL DE PRE-FRIO (PZ)</span>
          </div>
        </div>

        {/* Step 2: Cantidad y Unidad */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Pin number={2} label="Cantidad" />
            <div className="bg-white border-2 border-blue-400 rounded-xl p-2 text-center">
              <span className="text-base font-black text-gray-900">150</span>
            </div>
          </div>
          <div className="space-y-1">
            <span className="font-bold text-gray-700 block text-[11px]">Unidad de Medida</span>
            <div className="bg-gray-100 border border-gray-300 rounded-xl p-2 text-center text-gray-600 font-bold">
              PZ (Piezas)
            </div>
          </div>
        </div>

        {/* Step 3: UP Receptora */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Pin number={3} label="Subacopio de Destino (UP)" />
            <span className="text-[10px] text-amber-700 font-semibold">¿Dónde se almacena?</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <span className="px-2 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-center border border-emerald-700 shadow-xs flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> LUPITA
            </span>
            <span className="px-2 py-1.5 rounded-lg bg-gray-50 text-gray-600 font-semibold text-center border border-gray-200">ANITA</span>
            <span className="px-2 py-1.5 rounded-lg bg-gray-50 text-gray-600 font-semibold text-center border border-gray-200">SORAYA</span>
            <span className="px-2 py-1.5 rounded-lg bg-gray-50 text-gray-600 font-semibold text-center border border-gray-200">YASMINE</span>
            <span className="px-2 py-1.5 rounded-lg bg-gray-50 text-gray-600 font-semibold text-center border border-gray-200">PACKING TEPA</span>
            <span className="px-2 py-1.5 rounded-lg bg-gray-50 text-gray-600 font-semibold text-center border border-gray-200">BC CAMALU</span>
          </div>
        </div>

        {/* Step 4: Confirmación */}
        <div className="pt-2">
          <div className="bg-emerald-600 text-white py-2.5 px-4 rounded-xl font-bold text-center flex items-center justify-center gap-2 shadow-sm cursor-default">
            <Pin number={4} label="Confirmar Recepción" />
          </div>
        </div>
      </div>
    </MockupWindow>
  );
};

/* 3. SALIDAS SCREENSHOT */
export const SalidasScreenshot: React.FC = () => {
  return (
    <MockupWindow title="Formulario de Despacho y Registro de Salidas" url="app.inventario.com/salida">
      <div className="max-w-xl mx-auto bg-white p-5 rounded-2xl border border-gray-200 shadow-sm text-xs space-y-3.5">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Registrar Salida de Mercancía</h3>
              <p className="text-[11px] text-gray-500">Despacho, consumo interno o transferencia entre almacenes</p>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
            Salida de Almacén
          </span>
        </div>

        {/* Verification of Stock */}
        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pin number={1} label="Validación de Existencia" />
            <span className="font-semibold text-amber-900">Stock disponible en LUPITA:</span>
          </div>
          <span className="text-sm font-black text-blue-700 bg-white px-2 py-0.5 rounded-md border border-blue-200">
            250 PZ
          </span>
        </div>

        <div className="space-y-1">
          <label className="font-bold text-gray-700">Producto a Despachar</label>
          <div className="p-2 bg-gray-50 border border-gray-300 rounded-xl text-gray-800 font-semibold truncate">
            MX-F-PCK-003 - FORMATO CONTROL DE PRE-FRIO
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Pin number={2} label="Cantidad a Despachar" />
            <div className="bg-white border-2 border-rose-400 rounded-xl p-2 text-center">
              <span className="text-base font-black text-rose-700">50</span>
            </div>
          </div>
          <div className="space-y-1">
            <span className="font-bold text-gray-700 block text-[11px]">Nuevo Saldo en UP</span>
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-2 text-center text-emerald-800 font-black text-sm">
              200 PZ Restantes
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <label className="font-bold text-gray-700 flex items-center gap-1">
            <Pin number={3} label="Motivo o Destinatario" />
          </label>
          <div className="p-2 bg-gray-50 border border-gray-300 rounded-xl text-gray-600 text-[11px]">
            Entrega a cuadrilla de cosecha línea 4 / Responsable: Ing. Carlos Gómez
          </div>
        </div>

        <div className="pt-2">
          <div className="bg-rose-600 text-white py-2.5 px-4 rounded-xl font-bold text-center flex items-center justify-center gap-2 shadow-sm cursor-default">
            <Pin number={4} label="Registrar Salida" />
          </div>
        </div>
      </div>
    </MockupWindow>
  );
};

/* 4. REPORTES SCREENSHOT */
export const ReportesScreenshot: React.FC = () => {
  return (
    <MockupWindow title="Módulo de Reportes Independientes por UP" url="app.inventario.com/reportes-modal">
      <div className="max-w-2xl mx-auto bg-white p-5 rounded-2xl border-2 border-blue-400 shadow-lg text-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Generar y Exportar Reportes por UP</h3>
              <p className="text-[11px] text-gray-500">Descarga reportes específicos sin cambiar los filtros activos del Dashboard</p>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
            Exportador CSV
          </span>
        </div>

        {/* 1. Report Type Selector */}
        <div className="space-y-1.5">
          <Pin number={1} label="Paso 1: Tipo de Reporte" />
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="p-2.5 rounded-xl border-2 border-blue-600 bg-blue-50/70 text-blue-900 font-bold flex flex-col items-center text-center">
              <Package className="w-4 h-4 text-blue-600 mb-1" />
              <span>Inventario por UP</span>
            </div>
            <div className="p-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-600 font-medium flex flex-col items-center text-center">
              <Calendar className="w-4 h-4 text-gray-500 mb-1" />
              <span>Historial Movimientos</span>
            </div>
            <div className="p-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-600 font-medium flex flex-col items-center text-center">
              <AlertTriangle className="w-4 h-4 text-gray-500 mb-1" />
              <span>Alertas de Reorden</span>
            </div>
          </div>
        </div>

        {/* 2. UP Selector */}
        <div className="space-y-1.5">
          <Pin number={2} label="Paso 2: Subacopio a Auditar" />
          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 font-medium">Todas las UPs</span>
            <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold shadow-xs">UP LUPITA</span>
            <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 font-medium">UP ANITA</span>
            <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 font-medium">UP SORAYA</span>
            <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 font-medium">UP YASMINE</span>
            <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 font-medium">PACKING TEPA</span>
            <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 font-medium">BC CAMALU</span>
          </div>
        </div>

        {/* 3. Preview Area */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
          <div className="flex justify-between items-center text-[11px] font-bold text-slate-700">
            <Pin number={3} label="Paso 3: Previsualización de Datos" />
            <span className="text-blue-700">14 registros encontrados</span>
          </div>
          <div className="text-[10px] font-mono text-slate-600 bg-white p-2 rounded border border-slate-200 overflow-x-auto">
            Codigo, Descripcion, Area, Stock_en_LUPITA, Reorden, Estado<br />
            MX-F-001, FORMATO CONTROL PRE-FRIO, FORMATOS, 250, 100, OPTIMO<br />
            ET4X6, ETIQUETA PTI 4X6, ETIQUETAS, 4, 10, ALERTA_CRITICA
          </div>
        </div>

        {/* 4. Download Action */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-gray-500 font-medium">Formato compatible con Excel (.CSV)</span>
          <div className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-sm">
            <Pin number={4} label="Descargar Reporte CSV" />
          </div>
        </div>
      </div>
    </MockupWindow>
  );
};
