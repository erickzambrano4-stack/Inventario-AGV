import React, { useState, useMemo, useRef } from 'react';
import { useInventory } from '../context/InventoryContext';
import {
  FileSpreadsheet,
  Download,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  X,
  RefreshCw,
  Info,
  ChevronRight,
  Database,
  ArrowRight,
  Sliders
} from 'lucide-react';
import {
  downloadMasterTemplate,
  parseMasterDocumentText,
  generateMasterTemplateCSV,
  MasterRowParsed
} from '../lib/masterDocumentTemplate';

interface MasterDataModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MasterDataModal: React.FC<MasterDataModalProps> = ({ isOpen, onClose }) => {
  const { items, ups, bulkImportMasterData, showToast } = useInventory();

  const [activeStep, setActiveStep] = useState<'template' | 'upload' | 'preview'>('template');
  const [rawContent, setRawContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [overwriteExisting, setOverwriteExisting] = useState<boolean>(true);
  const [includeInitialStock, setIncludeInitialStock] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const existingItemIds = useMemo(() => new Set(items.map(i => i.id)), [items]);

  const parsedResult = useMemo(() => {
    return parseMasterDocumentText(rawContent, existingItemIds, ups);
  }, [rawContent, existingItemIds, ups]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = event => {
      const text = event.target?.result as string;
      if (text) {
        setRawContent(text);
        setActiveStep('preview');
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = event => {
      const text = event.target?.result as string;
      if (text) {
        setRawContent(text);
        setActiveStep('preview');
      }
    };
    reader.readAsText(file);
  };

  const handleLoadSampleData = () => {
    const sampleCsv = generateMasterTemplateCSV();
    setRawContent(sampleCsv);
    setFileName('ejemplo_documento_maestro.csv');
    setActiveStep('preview');
    showToast('Datos de muestra cargados en la vista previa', 'info');
  };

  const handleExecuteImport = async () => {
    const validRows = parsedResult.rows.filter(r => r.isValid);
    if (validRows.length === 0) {
      showToast('No hay filas válidas para importar en este documento', 'warning');
      return;
    }

    setIsProcessing(true);
    try {
      const itemsToImport = validRows.map(r => ({
        id: r.id,
        desc: r.desc,
        area: r.area,
        reorden: r.reorden
      }));

      const initialTransactions = includeInitialStock
        ? validRows
            .filter(r => r.stockInicial !== undefined && r.stockInicial > 0)
            .map(r => ({
              itemId: r.id,
              qty: r.stockInicial!,
              up: r.up || 'LUPITA',
              notas: 'Carga Inicial - Documento Maestro'
            }))
        : [];

      await bulkImportMasterData({
        itemsToImport,
        initialTransactions,
        overwriteExisting
      });

      onClose();
      // Reset state for next use
      setRawContent('');
      setFileName('');
      setActiveStep('template');
    } catch (err: any) {
      showToast(`Error al importar: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9995] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 sm:px-7 border-b border-gray-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/10 text-blue-700 rounded-2xl border border-blue-600/20">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-gray-900">Documento Maestro de Importación</h3>
                <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200 uppercase">
                  Excel / CSV
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Carga masiva de catálogo de productos y existencias de apertura a la base de datos
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

        {/* Stepper Tabs */}
        <div className="grid grid-cols-3 border-b border-gray-100 bg-gray-50/30 text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setActiveStep('template')}
            className={`py-3 px-4 flex items-center justify-center gap-2 border-b-2 transition ${
              activeStep === 'template'
                ? 'border-blue-600 text-blue-700 bg-blue-50/40 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">
              1
            </span>
            <span>Plantilla & Guía</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveStep('upload')}
            className={`py-3 px-4 flex items-center justify-center gap-2 border-b-2 transition ${
              activeStep === 'upload'
                ? 'border-blue-600 text-blue-700 bg-blue-50/40 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">
              2
            </span>
            <span>Cargar o Pegar</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveStep('preview')}
            className={`py-3 px-4 flex items-center justify-center gap-2 border-b-2 transition ${
              activeStep === 'preview'
                ? 'border-blue-600 text-blue-700 bg-blue-50/40 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">
              3
            </span>
            <span>
              Vista Previa {parsedResult.rows.length > 0 && `(${parsedResult.rows.length})`}
            </span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* STEP 1: TEMPLATE & GUIDE */}
          {activeStep === 'template' && (
            <div className="space-y-6">
              {/* Download Action Card */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50/60 border border-blue-200/80 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-blue-950 flex items-center gap-2">
                    <Download className="w-4 h-4 text-blue-700" />
                    Descargar Plantilla Oficial (.CSV para Excel)
                  </h4>
                  <p className="text-xs text-blue-800/80 mt-1 max-w-xl">
                    Descarga el documento maestro prediseñado con las columnas oficiales y codificación UTF-8 compatible con Microsoft Excel, Google Sheets y LibreOffice.
                  </p>
                </div>
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => downloadMasterTemplate()}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-600/20 flex items-center justify-center gap-2 transition active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Descargar Plantilla
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadSampleData}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-white hover:bg-slate-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition active:scale-95"
                  >
                    Ver Ejemplo
                  </button>
                </div>
              </div>

              {/* Specification Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-blue-600" />
                  Estructura y Columnas del Documento Maestro
                </h4>

                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-gray-600 font-semibold border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2.5">Columna</th>
                        <th className="px-3 py-2.5">Tipo</th>
                        <th className="px-4 py-2.5">Descripción y Reglas</th>
                        <th className="px-4 py-2.5">Ejemplo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      <tr>
                        <td className="px-4 py-2.5 font-mono font-bold text-blue-700">CODIGO_ID</td>
                        <td className="px-3 py-2.5">
                          <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 rounded text-[10px] font-bold">
                            Obligatorio
                          </span>
                        </td>
                        <td className="px-4 py-2.5">Código único del producto en el catálogo. No se distingue entre mayúsculas y minúsculas.</td>
                        <td className="px-4 py-2.5 font-mono text-gray-500">MX-F-PCK-001</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 font-mono font-bold text-blue-700">DESCRIPCION</td>
                        <td className="px-3 py-2.5">
                          <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 rounded text-[10px] font-bold">
                            Obligatorio
                          </span>
                        </td>
                        <td className="px-4 py-2.5">Nombre descriptivo completo del artículo o insumo.</td>
                        <td className="px-4 py-2.5 font-medium text-gray-800">ETIQUETA PTI 4X6 ROLLO (1000 PZ)</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 font-mono font-bold text-blue-700">AREA</td>
                        <td className="px-3 py-2.5">
                          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-semibold">
                            Opcional
                          </span>
                        </td>
                        <td className="px-4 py-2.5">Categoría o área de destino (FORMATOS, EMPAQUE, LIMPIEZA, ETIQUETAS, etc.). Si está vacía, se asigna GENERAL.</td>
                        <td className="px-4 py-2.5 text-gray-600">EMPAQUE</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 font-mono font-bold text-blue-700">PUNTO_REORDEN</td>
                        <td className="px-3 py-2.5">
                          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-semibold">
                            Opcional
                          </span>
                        </td>
                        <td className="px-4 py-2.5">Número entero. Nivel de stock mínimo que activa las alertas amarillas en el Dashboard.</td>
                        <td className="px-4 py-2.5 font-mono text-amber-700 font-bold">100</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 font-mono font-bold text-blue-700">STOCK_INICIAL</td>
                        <td className="px-3 py-2.5">
                          <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-semibold">
                            Opcional
                          </span>
                        </td>
                        <td className="px-4 py-2.5">Cantidad física existente inicial. Generará automáticamente un registro de entrada de apertura en el historial.</td>
                        <td className="px-4 py-2.5 font-mono text-emerald-700 font-bold">250</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 font-mono font-bold text-blue-700">UBICACION_UP</td>
                        <td className="px-3 py-2.5">
                          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-semibold">
                            Opcional
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          Ubicación de Producción para el stock inicial:
                          <div className="flex flex-wrap gap-1 mt-1 font-mono text-[10px]">
                            {ups.map(up => (
                              <span key={up} className="px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded border border-slate-200">
                                {up}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-indigo-600 font-semibold">LUPITA</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Next step button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActiveStep('upload')}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition"
                >
                  Siguiente: Cargar Archivo
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: UPLOAD OR PASTE */}
          {activeStep === 'upload' && (
            <div className="space-y-6">
              {/* Drag & Drop Area */}
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/40 hover:bg-blue-50/80 rounded-3xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt,.tsv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-2xl bg-white shadow-md text-blue-600 flex items-center justify-center group-hover:scale-110 transition">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">
                    Arrastra y suelta tu archivo maestro aquí
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    O haz clic para seleccionar desde tu computadora (.CSV, .TSV o .TXT)
                  </p>
                </div>
                {fileName && (
                  <span className="px-3 py-1 bg-white text-blue-700 rounded-lg text-xs font-bold border border-blue-200 shadow-xs flex items-center gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    {fileName}
                  </span>
                )}
              </div>

              {/* Alternative: Copy-Paste Text Area */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    O pega directamente el contenido copiado de Excel / Google Sheets:
                  </label>
                  {rawContent && (
                    <button
                      type="button"
                      onClick={() => {
                        setRawContent('');
                        setFileName('');
                      }}
                      className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
                    >
                      Limpiar texto
                    </button>
                  )}
                </div>
                <textarea
                  value={rawContent}
                  onChange={e => setRawContent(e.target.value)}
                  placeholder={`CODIGO_ID,DESCRIPCION,AREA,PUNTO_REORDEN,STOCK_INICIAL,UBICACION_UP\nMX-F-PCK-001,FORMATO RECEPCION DE FRUTA EN COOLER,FORMATOS,200,150,LUPITA\nET4X6-PTI,ETIQUETA PTI 4X6 ROLLO (1000 PZ),ETIQUETAS,15,25,LUPITA`}
                  rows={6}
                  className="w-full px-4 py-3 text-xs font-mono rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveStep('template')}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900"
                >
                  Volver a Guía
                </button>
                <button
                  type="button"
                  disabled={!rawContent.trim()}
                  onClick={() => setActiveStep('preview')}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition"
                >
                  Analizar y Previsualizar ({parsedResult.rows.length})
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW & IMPORT */}
          {activeStep === 'preview' && (
            <div className="space-y-5">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5">
                  <span className="text-[10px] uppercase font-bold text-gray-500">Filas Totales</span>
                  <p className="text-xl font-extrabold text-gray-900 mt-0.5">{parsedResult.rows.length}</p>
                </div>
                <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-3.5">
                  <span className="text-[10px] uppercase font-bold text-emerald-700">Ítems Nuevos</span>
                  <p className="text-xl font-extrabold text-emerald-700 mt-0.5">{parsedResult.newCount}</p>
                </div>
                <div className="bg-blue-50/80 border border-blue-200/80 rounded-2xl p-3.5">
                  <span className="text-[10px] uppercase font-bold text-blue-700">Ya en Catálogo</span>
                  <p className="text-xl font-extrabold text-blue-700 mt-0.5">{parsedResult.existingCount}</p>
                </div>
                <div className="bg-rose-50/80 border border-rose-200/80 rounded-2xl p-3.5">
                  <span className="text-[10px] uppercase font-bold text-rose-700">Filas Inválidas</span>
                  <p className="text-xl font-extrabold text-rose-700 mt-0.5">{parsedResult.invalidCount}</p>
                </div>
              </div>

              {/* Import Configuration Options */}
              <div className="bg-slate-50/80 border border-gray-200 rounded-2xl p-4 space-y-3">
                <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-blue-600" />
                  Opciones de Carga e Integración
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none bg-white p-2.5 rounded-xl border border-gray-200/70">
                    <input
                      type="checkbox"
                      checked={overwriteExisting}
                      onChange={e => setOverwriteExisting(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 mt-0.5 cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-gray-800 block">Actualizar datos de ítems existentes</span>
                      <span className="text-gray-500 text-[11px]">
                        Si el código ya existe, actualiza su descripción, área y reorden con los datos del documento.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer select-none bg-white p-2.5 rounded-xl border border-gray-200/70">
                    <input
                      type="checkbox"
                      checked={includeInitialStock}
                      onChange={e => setIncludeInitialStock(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 mt-0.5 cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-gray-800 block">Registrar stock inicial en historial</span>
                      <span className="text-gray-500 text-[11px]">
                        Genera automáticamente una entrada de apertura para cada producto que tenga cantidad inicial &gt; 0.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Preview Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-800">
                    Previsualización de Filas ({parsedResult.validCount} válidas para procesar)
                  </span>
                  {parsedResult.invalidCount > 0 && (
                    <span className="text-rose-600 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Las {parsedResult.invalidCount} filas con error serán ignoradas
                    </span>
                  )}
                </div>

                <div className="border border-gray-200 rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-gray-600 sticky top-0 font-semibold z-10 border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-2">Estado</th>
                        <th className="px-3 py-2">Código ID</th>
                        <th className="px-3 py-2">Descripción</th>
                        <th className="px-3 py-2">Área</th>
                        <th className="px-3 py-2 text-center">Reorden</th>
                        <th className="px-3 py-2 text-center">Stock Inicial</th>
                        <th className="px-3 py-2">UP Destino</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {parsedResult.rows.length > 0 ? (
                        parsedResult.rows.map((row, idx) => (
                          <tr
                            key={idx}
                            className={`hover:bg-slate-50 transition ${
                              !row.isValid
                                ? 'bg-rose-50/50'
                                : row.isExisting
                                ? 'bg-blue-50/30'
                                : ''
                            }`}
                          >
                            <td className="px-3 py-2 whitespace-nowrap">
                              {!row.isValid ? (
                                <span
                                  className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md text-[10px] font-bold inline-flex items-center gap-1"
                                  title={row.error}
                                >
                                  <AlertCircle className="w-3 h-3" />
                                  Error
                                </span>
                              ) : row.isExisting ? (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md text-[10px] font-bold">
                                  Existe
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-bold inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Nuevo
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 font-mono font-bold text-gray-900">{row.id || '-'}</td>
                            <td className="px-3 py-2 text-gray-700 max-w-xs truncate">{row.desc || '-'}</td>
                            <td className="px-3 py-2">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-medium">
                                {row.area}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center font-bold text-amber-700">{row.reorden}</td>
                            <td className="px-3 py-2 text-center font-bold text-emerald-700">
                              {row.stockInicial !== undefined ? row.stockInicial.toLocaleString() : '-'}
                            </td>
                            <td className="px-3 py-2 font-semibold text-gray-600">{row.up || 'LUPITA'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-gray-400">
                            No hay datos cargados aún. Carga un archivo o pega el texto en el paso anterior.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setActiveStep('upload')}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900"
                >
                  Volver a cargar/pegar
                </button>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    disabled={parsedResult.validCount === 0 || isProcessing}
                    onClick={handleExecuteImport}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-600/25 flex items-center gap-2 transition active:scale-95"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Importando a Base de Datos...
                      </>
                    ) : (
                      <>
                        <Database className="w-3.5 h-3.5" />
                        Confirmar e Importar ({parsedResult.validCount} ítems)
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
