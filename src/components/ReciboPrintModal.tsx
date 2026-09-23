import React from 'react';
import { SolicitudInsumo, AppSettings } from '../types';
import {
  Printer,
  X,
  FileSpreadsheet,
  Building2,
  Calendar,
  User,
  ShieldCheck,
  ClipboardList
} from 'lucide-react';

interface ReciboPrintModalProps {
  solicitud: SolicitudInsumo | null;
  appSettings: AppSettings;
  onClose: () => void;
}

export const ReciboPrintModal: React.FC<ReciboPrintModalProps> = ({
  solicitud,
  appSettings,
  onClose
}) => {
  if (!solicitud) return null;

  const totalCantidad = solicitud.items.reduce((acc, i) => acc + (Number(i.cantidad) || 0), 0);
  const totalRenglones = solicitud.items.length;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = [
      'FOLIO',
      'TIPO_DOCUMENTO',
      'UP_ALMACEN',
      'FECHA',
      'SOLICITANTE',
      'RESPONSABLE_ALMACEN',
      'CARGO_RESPONSABLE',
      'ESTADO',
      'AREA_DESTINO',
      'CODIGO_ITEM',
      'DESCRIPCION_ITEM',
      'UNIDAD',
      'CANTIDAD_INGRESADA',
      'NOTAS_LINEA'
    ];

    const rows = solicitud.items.map(i => [
      `"${solicitud.folio}"`,
      `"SOLICITUD_INSUMOS"`,
      `"${solicitud.up}"`,
      `"${solicitud.fecha}"`,
      `"${solicitud.solicitante}"`,
      `"${solicitud.responsableAlmacen}"`,
      `"${solicitud.responsableCargo || ''}"`,
      `"${solicitud.estado.toUpperCase()}"`,
      `"${solicitud.areaAplicacion || ''}"`,
      `"${i.itemId}"`,
      `"${i.desc.replace(/"/g, '""')}"`,
      `"${i.unidad}"`,
      i.cantidad,
      `"${(i.notas || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${solicitud.folio}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Container */}
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[96vh] flex flex-col shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Control Bar (Hidden on print) */}
        <div className="p-4 sm:px-6 bg-slate-900 text-white rounded-t-3xl flex items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl text-white bg-blue-600">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-wide">{solicitud.folio}</span>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                  solicitud.estado === 'entregada' || solicitud.estado === 'aprobada'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                    : solicitud.estado === 'pendiente'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                }`}>
                  {solicitud.estado === 'entregada' || solicitud.estado === 'aprobada' ? 'Ingresada / Aprobada' : solicitud.estado}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Formato Oficial de Solicitud de Insumos con Ingreso Automático a Inventario
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
              title="Descargar datos en CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">CSV</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-md shadow-blue-600/30 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100 print:bg-white print:p-0">
          <div
            id="print-area"
            className="max-w-3xl mx-auto bg-white p-6 sm:p-10 rounded-2xl shadow-sm border border-gray-200 text-gray-900 print:shadow-none print:border-none print:p-0 print:max-w-none"
          >
            {/* Document Header */}
            <div className="border-b-2 border-slate-900 pb-5 mb-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  {appSettings.logoUrl ? (
                    <img
                      src={appSettings.logoUrl}
                      alt="Logo"
                      className="w-14 h-14 object-contain rounded-xl border border-gray-200 p-1"
                      onError={e => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-xl shadow-xs">
                      {solicitud.up.substring(0, 2)}
                    </div>
                  )}
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight uppercase leading-tight">
                      {appSettings.appName}
                    </h1>
                    <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-gray-500" />
                      Unidad de Producción / Almacén: <strong className="text-blue-700">{solicitud.up}</strong>
                    </p>
                  </div>
                </div>

                {/* Folio & Doc Type Box */}
                <div className="text-right">
                  <div className="inline-block px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider mb-1.5 bg-blue-100 text-blue-800">
                    SOLICITUD OFICIAL DE INSUMOS
                  </div>
                  <div className="font-mono text-xl sm:text-2xl font-black text-gray-900 tracking-wider">
                    {solicitud.folio}
                  </div>
                  <div className="text-[11px] text-gray-500 font-medium flex items-center justify-end gap-1 mt-0.5">
                    <Calendar className="w-3 h-3 text-gray-400" />
                    Fecha: <strong>{solicitud.fecha}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Metadata Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-gray-200 mb-6 text-xs">
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                  Responsable de Almacén (Custodio):
                </span>
                <span className="font-bold text-gray-900 text-sm block mt-0.5">
                  {solicitud.responsableAlmacen}
                </span>
                {solicitud.responsableCargo && (
                  <span className="text-[11px] text-gray-600 block">
                    {solicitud.responsableCargo}
                  </span>
                )}
              </div>

              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                  Solicitante:
                </span>
                <span className="font-bold text-gray-900 text-sm block mt-0.5">
                  {solicitud.solicitante}
                </span>
                {solicitud.areaAplicacion && (
                  <span className="text-[11px] text-blue-700 font-medium block">
                    Destino / Área: {solicitud.areaAplicacion}
                  </span>
                )}
              </div>

              <div className="sm:col-span-2 lg:col-span-1 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                    Sede / Prioridad:
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-gray-200 text-gray-800 rounded font-bold text-[11px]">
                      UP: {solicitud.up}
                    </span>
                    <span className={`px-2 py-0.5 rounded font-bold text-[11px] uppercase ${
                      solicitud.prioridad === 'urgente' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {solicitud.prioridad}
                    </span>
                  </div>
                </div>
                <div className="text-[10px] text-gray-500 mt-1">
                  Registrado por: <strong>@{solicitud.usuarioCreador}</strong>
                </div>
              </div>
            </div>

            {/* Observations if any */}
            {solicitud.observaciones && (
              <div className="mb-6 p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl text-xs text-amber-900">
                <span className="font-bold uppercase tracking-wider text-[10px] text-amber-700 block mb-0.5">
                  Observaciones / Justificación de la Solicitud:
                </span>
                <p className="italic">{solicitud.observaciones}</p>
              </div>
            )}

            {/* Insumos Table */}
            <div className="mb-6">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Relación de Insumos Solicitados para la Sede</span>
                <span className="text-[11px] text-gray-500 normal-case font-normal">
                  Total renglones: <strong>{totalRenglones}</strong>
                </span>
              </h3>

              <div className="border border-gray-300 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-gray-700 font-bold border-b border-gray-300 text-[10px] uppercase">
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3">Código</th>
                      <th className="py-2.5 px-3">Descripción del Insumo / Producto</th>
                      <th className="py-2.5 px-3 text-center">Unidad</th>
                      <th className="py-2.5 px-3 text-right">Cant. Solicitada</th>
                      <th className="py-2.5 px-3 text-right text-emerald-800">Ingreso a Stock</th>
                      <th className="py-2.5 px-3">Observaciones / Lote</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {solicitud.items.map((item, idx) => (
                      <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                        <td className="py-2.5 px-3 text-center font-bold text-gray-500 text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-gray-900 text-[11px]">
                          {item.itemId}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-gray-800">
                          {item.desc}
                          {item.area && (
                            <span className="text-[10px] text-gray-500 ml-1.5 font-normal">
                              ({item.area})
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-semibold text-gray-600 uppercase text-[11px]">
                          {item.unidad}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-gray-900 text-sm">
                          {item.cantidad}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-emerald-700 text-sm">
                          {item.cantidad}
                        </td>
                        <td className="py-2.5 px-3 text-gray-600 text-[11px] italic">
                          {item.notas || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t-2 border-gray-300 text-gray-900">
                      <td colSpan={4} className="py-2.5 px-3 text-right uppercase text-[11px]">
                        Totales ({totalRenglones} renglones):
                      </td>
                      <td className="py-2.5 px-3 text-right text-sm">
                        {totalCantidad}
                      </td>
                      <td className="py-2.5 px-3 text-right text-sm text-emerald-800 font-black">
                        {totalCantidad}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Inventory impact notice */}
            {solicitud.aplicadoInventario && (
              <div className="p-3 mb-6 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Ingreso a Inventario Confirmado:</strong> Cada uno de los productos y cantidades anteriores fue agregado automáticamente como ENTRADA de inventario en la UP {solicitud.up}.
                </span>
              </div>
            )}

            {/* Formal Signatures Section */}
            <div className="pt-6 mt-6 border-t-2 border-gray-300">
              <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-8 text-center">
                Constancia y Firmas de Solicitud de Insumos
              </h4>

              <div className="grid grid-cols-3 gap-6 text-center text-xs">
                {/* Signature 1: Requester */}
                <div className="flex flex-col items-center">
                  <div className="w-full border-b border-gray-800 mb-2 h-14"></div>
                  <span className="font-bold text-gray-900 block leading-tight">
                    {solicitud.solicitante}
                  </span>
                  <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mt-0.5">
                    Solicitante / Cuadrilla
                  </span>
                  <span className="text-[9px] text-gray-400 mt-0.5">(Solicitó)</span>
                </div>

                {/* Signature 2: Warehouse Keeper */}
                <div className="flex flex-col items-center">
                  <div className="w-full border-b border-gray-800 mb-2 h-14"></div>
                  <span className="font-bold text-gray-900 block leading-tight">
                    {solicitud.responsableAlmacen}
                  </span>
                  <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mt-0.5">
                    {solicitud.responsableCargo || 'Responsable de Almacén'}
                  </span>
                  <span className="text-[9px] text-gray-400 mt-0.5">(Recepción y Custodia UP)</span>
                </div>

                {/* Signature 3: Administration / Supervisor */}
                <div className="flex flex-col items-center">
                  <div className="w-full border-b border-gray-800 mb-2 h-14"></div>
                  <span className="font-bold text-gray-900 block leading-tight">
                    Administración / Supervisión
                  </span>
                  <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mt-0.5">
                    Visto Bueno
                  </span>
                  <span className="text-[9px] text-gray-400 mt-0.5">(Autorizado)</span>
                </div>
              </div>
            </div>

            {/* Document Footer */}
            <div className="mt-8 pt-4 border-t border-gray-200 text-center text-[10px] text-gray-400 flex items-center justify-between">
              <span>{appSettings.appName} — Sistema de Control de Inventarios y Almacenes</span>
              <span>Folio: {solicitud.folio}</span>
              <span>Impresión: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
