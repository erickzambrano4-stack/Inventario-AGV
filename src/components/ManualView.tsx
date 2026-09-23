import React, { useState } from 'react';
import {
  BookOpen,
  Printer,
  Search,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  FileSpreadsheet,
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  Users,
  Settings,
  Shield,
  Cloud,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Info,
  Layers,
  Sparkles,
  Download,
  LayoutDashboard
} from 'lucide-react';
import {
  DashboardScreenshot,
  EntradasScreenshot,
  SalidasScreenshot,
  ReportesScreenshot
} from './ManualScreenshots';

export const ManualView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<string>('intro');

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadTextManual = () => {
    const textContent = `
========================================================================
           MANUAL DE USUARIO Y OPERACIÓN DEL SISTEMA DE INVENTARIO
========================================================================
Versión: 2.5 - Sistema Multi-UP y Control de Subacopios
Fecha de Emisión: ${new Date().toLocaleDateString('es-MX')}

ÍNDICE DE CONTENIDOS:
1. Introducción y Arquitectura Multi-UP
2. Acceso al Sistema y Perfiles de Usuario (Roles)
3. Dashboard y Monitoreo de Existencias en Tiempo Real
4. Procedimiento de Registro de Entradas (Recepciones)
5. Procedimiento de Registro de Salidas (Despachos y Consumos)
6. Historial de Transacciones y Auditoría de Movimientos
7. Módulo de Reportes Independientes por Subacopio (UP)
8. Administración del Catálogo de Ítems (Productos)
9. Gestión de Usuarios y Seguridad de Accesos
10. Configuración del Sistema y Sincronización en la Nube
11. Preguntas Frecuentes y Solución de Problemas (FAQ)

------------------------------------------------------------------------
1. INTRODUCCIÓN Y ARQUITECTURA MULTI-UP
------------------------------------------------------------------------
El Sistema de Inventario está diseñado para gestionar el abastecimiento,
custodia y despacho de materiales, herramientas, formatos y consumibles
a lo largo de múltiples ubicaciones físicas denominadas Unidades de
Producción o Subacopios (UPs):
- LUPITA
- ANITA
- SORAYA
- YASMINE
- PACKING TEPA
- BC CAMALU

Stock Total = Suma de existencias de todas las UPs registradas.

------------------------------------------------------------------------
2. ACCESO AL SISTEMA Y ROLES
------------------------------------------------------------------------
- ADMINISTRADOR (ADMIN): Acceso total. Puede crear/editar productos,
  administrar usuarios, depurar historial, configurar el sistema y
  descargar reportes.
- SUPERVISOR: Enfocado en supervisar existencias, registrar recepciones (entradas),
  despachos (salidas) y generar solicitudes/recibos de insumos en su sede física asignada.

------------------------------------------------------------------------
3. DASHBOARD Y FILTRO POR UP
------------------------------------------------------------------------
- Permite alternar entre "Todas las UPs" o una UP particular.
- Al seleccionar una UP:
  * Las 4 tarjetas de KPI calculan el inventario exclusivo de esa UP.
  * La gráfica horizontal muestra el stock de la UP vs su Punto de Reorden.
  * Los puntos rojos identifican existencias críticas en o por debajo del reorden.
  * La tabla resalta en color azul la columna correspondiente a la UP activa.

------------------------------------------------------------------------
4. REGISTRO DE ENTRADAS
------------------------------------------------------------------------
Paso 1: Localice el producto por su código (SKU) o nombre.
Paso 2: Digite la cantidad exacta recibida.
Paso 3: Seleccione la UP receptora donde ingresa físicamente la mercancía.
Paso 4: Escriba notas relevantes (remisión, proveedor o factura).
Paso 5: Presione "Registrar Entrada".

------------------------------------------------------------------------
5. REGISTRO DE SALIDAS
------------------------------------------------------------------------
Paso 1: Seleccione el producto a despachar.
Paso 2: Verifique en la pantalla el stock disponible en la UP emisora.
Paso 3: Digite la cantidad a despachar. El sistema calcula el nuevo saldo.
Paso 4: Indique el motivo, lote o persona que recibe el material.
Paso 5: Presione "Registrar Salida".

------------------------------------------------------------------------
6. GENERADOR DE REPORTES INDEPENDIENTES POR UP
------------------------------------------------------------------------
Accesible desde el botón "Reportes por UP" en Dashboard e Historial.
Permite descargar archivos CSV estructurados con 3 variantes:
1. Inventario por UP: Stock específico o consolidado.
2. Historial de Movimientos: Filtro por rango de fechas (7, 30 días o libre).
3. Alertas de Reorden: Filtro exclusivo de insumos en nivel crítico.
    `.trim();

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Manual_de_Usuario_Inventario_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const sections = [
    { id: 'intro', title: '1. Introducción y Arquitectura Multi-UP', icon: Layers },
    { id: 'roles', title: '2. Acceso y Perfiles de Usuario', icon: Users },
    { id: 'dashboard', title: '3. Dashboard y Filtro por UP', icon: LayoutDashboard },
    { id: 'entradas', title: '4. Registro de Entradas (Recepciones)', icon: ArrowDownLeft },
    { id: 'salidas', title: '5. Registro de Salidas (Despachos)', icon: ArrowUpRight },
    { id: 'historial', title: '6. Historial y Auditoría de Movimientos', icon: History },
    { id: 'reportes', title: '7. Reportes Independientes por UP', icon: FileSpreadsheet },
    { id: 'catalogo', title: '8. Catálogo Base de Ítems', icon: Package },
    { id: 'usuarios', title: '9. Gestión de Usuarios y Permisos', icon: Shield },
    { id: 'configuracion', title: '10. Configuración y Nube Firebase', icon: Cloud },
    { id: 'faq', title: '11. Preguntas Frecuentes (FAQ)', icon: HelpCircle }
  ];

  const filteredSections = sections.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-400/30">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Documentación Oficial del Sistema</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Manual de Usuario y Operación
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
            Guía integral detallada paso a paso con capturas visuales, procedimientos de registro de entradas y salidas,
            monitoreo de existencias por subacopio (UP) y generación de reportes independientes.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 pt-2 md:pt-0">
          <button
            type="button"
            onClick={handleDownloadTextManual}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition active:scale-95 shadow-sm"
            title="Descargar manual en formato de texto (.TXT)"
          >
            <Download className="w-4 h-4 text-blue-400" />
            <span>Descargar Guía (.TXT)</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition active:scale-95 shadow-md shadow-blue-600/30"
            title="Imprimir o guardar como PDF"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / Guardar PDF</span>
          </button>
        </div>
      </div>

      {/* Interactive Navigation Chips & Search */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Navegación Rápida por Capítulos</span>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar en el manual..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1">
          {filteredSections.map(sec => {
            const Icon = sec.icon;
            const isCurrent = activeSection === sec.id;
            return (
              <a
                key={sec.id}
                href={`#${sec.id}`}
                onClick={() => setActiveSection(sec.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                  isCurrent
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-50 text-gray-700 border border-gray-200 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{sec.title}</span>
              </a>
            );
          })}
        </div>
      </div>

      {/* CHAPTER 1: INTRODUCCIÓN Y ARQUITECTURA */}
      <section id="intro" className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <div className="p-3 bg-blue-100 text-blue-700 rounded-2xl">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">1. Introducción y Arquitectura Multi-UP</h2>
            <p className="text-xs text-gray-500">Concepto de subacopios, custodia de materiales y balance de existencias</p>
          </div>
        </div>

        <div className="prose prose-slate max-w-none text-sm text-gray-600 space-y-3 leading-relaxed">
          <p>
            El <strong>Sistema de Inventario</strong> es una plataforma de alta precisión diseñada para controlar
            las operaciones de abastecimiento, custodia física y despacho de materiales, herramientas, formatos y consumibles
            a lo largo de diferentes sedes o almacenes satélites conocidos como <strong>Unidades de Producción (UP)</strong> o <strong>Subacopios</strong>.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
            <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200 space-y-2">
              <h4 className="font-bold text-blue-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-blue-600" /> Sedes Físicas (UPs) Soportadas
              </h4>
              <p className="text-xs text-blue-800">
                El sistema distribuye y audita los saldos en las siguientes ubicaciones:
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['LUPITA', 'ANITA', 'SORAYA', 'YASMINE', 'PACKING TEPA', 'BC CAMALU'].map(up => (
                  <span key={up} className="px-2.5 py-1 bg-white text-blue-900 rounded-lg text-xs font-bold border border-blue-300 shadow-2xs">
                    {up}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 space-y-2">
              <h4 className="font-bold text-emerald-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Modelo Matemático de Saldos
              </h4>
              <p className="text-xs text-emerald-800 leading-relaxed">
                <strong>Stock Total Consolidado:</strong> Corresponde a la sumatoria exacta de las existencias presentes en todas las UPs.
                Cada movimiento (entrada o salida) se vincula obligatoriamente a una UP particular, asegurando trazabilidad por almacén.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CHAPTER 2: ACCESO Y ROLES */}
      <section id="roles" className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">2. Acceso al Sistema y Perfiles de Usuario</h2>
            <p className="text-xs text-gray-500">Credenciales, privilegios y responsabilidades operativas</p>
          </div>
        </div>

        <div className="text-sm text-gray-600 space-y-3 leading-relaxed">
          <p>
            El sistema cuenta con un control de acceso por roles (RBAC) para salvaguardar la integridad de los datos:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl border-2 border-amber-300 bg-amber-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-900 text-sm">Perfil Administrador (ADMIN)</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-amber-950 uppercase">Control Total</span>
              </div>
              <ul className="text-xs text-amber-800 space-y-1.5 list-disc list-inside">
                <li>Acceso irrestricto al Dashboard y a todas las UPs.</li>
                <li>Alta, modificación y eliminación de productos en el Catálogo de Ítems.</li>
                <li>Creación y administración de usuarios, asignación de roles y sedes.</li>
                <li>Depuración y eliminación individual o masiva de transacciones en el Historial.</li>
                <li>Configuración de la marca (Nombre de empresa, Logotipo) y conexión Cloud.</li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-900 text-sm">Perfil Supervisor (SUPERVISOR)</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 uppercase">Supervisión y Almacén</span>
              </div>
              <ul className="text-xs text-gray-700 space-y-1.5 list-disc list-inside">
                <li>Consulta en tiempo real de existencias en el Dashboard de su UP asignada.</li>
                <li>Registro de Recepciones de mercancía (Entradas) en su sede.</li>
                <li>Registro de Despachos y Consumos (Salidas) en su sede.</li>
                <li>Generación de Solicitudes de Insumos con ingreso automático al inventario de su sede.</li>
                <li>Consulta de auditoría en el Historial de Transacciones de su UP.</li>
                <li>Generación y descarga de Reportes por UP en formato CSV.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CHAPTER 3: DASHBOARD Y FILTRO POR UP */}
      <section id="dashboard" className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <div className="p-3 bg-blue-100 text-blue-700 rounded-2xl">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">3. Dashboard y Monitoreo de Existencias por UP</h2>
            <p className="text-xs text-gray-500">Métricas dinámicas, gráfica de existencias y alertas de reorden</p>
          </div>
        </div>

        <div className="text-sm text-gray-600 space-y-3 leading-relaxed">
          <p>
            El Dashboard es el centro de comando del sistema. Permite evaluar en tiempo real la salud de los inventarios
            tanto de forma global como de manera individual para cada subacopio.
          </p>

          {/* Screenshot Component of Dashboard */}
          <DashboardScreenshot />

          <h3 className="font-bold text-gray-900 text-base pt-2">Elementos Clave del Dashboard (Consulte los números en la captura):</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-blue-50/50 border border-blue-100">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
              <div className="text-xs space-y-1">
                <strong className="text-blue-950 font-bold text-sm">Barra de Selección de UP (Subacopio):</strong>
                <p className="text-blue-900">
                  Haga clic en cualquiera de los botones de subacopio (ej. <em>LUPITA, ANITA, SORAYA</em>) para aislar la visualización.
                  Al hacerlo, todas las tarjetas de métricas, la gráfica horizontal y la tabla de datos recalcularán automáticamente sus cifras
                  para mostrar <strong>únicamente los datos de la UP seleccionada</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-blue-50/50 border border-blue-100">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
              <div className="text-xs space-y-1">
                <strong className="text-blue-950 font-bold text-sm">Tarjetas Dinámicas de KPI:</strong>
                <p className="text-blue-900">
                  Reflejan el total de productos con stock &gt; 0 en la UP, número de entradas registradas en esa ubicación, salidas despachadas
                  y las <strong>Alertas de Reorden</strong> (insumos cuyo saldo en esa UP se encuentra en nivel crítico o agotado).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-blue-50/50 border border-blue-100">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
              <div className="text-xs space-y-1">
                <strong className="text-blue-950 font-bold text-sm">Gráfica Horizontal con Nombres de Productos:</strong>
                <p className="text-blue-900">
                  Muestra la comparativa de existencias reales frente al Punto de Reorden mínimo.
                  Los puntos o barras de color <strong className="text-rose-600">rojo</strong> alertan que el insumo requiere reposición urgente.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-blue-50/50 border border-blue-100">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">4</span>
              <div className="text-xs space-y-1">
                <strong className="text-blue-950 font-bold text-sm">Tabla Desglosada con Columna Destacada:</strong>
                <p className="text-blue-900">
                  Presenta el código, descripción, reorden, stock total consolidado y las existencias en cada UP.
                  Cuando hay una UP filtrada, el encabezado de su columna se resalta en azul rey con el icono de ubicación y los saldos se enfatizan.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CHAPTER 4: REGISTRO DE ENTRADAS */}
      <section id="entradas" className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">4. Procedimiento de Registro de Entradas (Recepciones)</h2>
            <p className="text-xs text-gray-500">Paso a paso para el ingreso de mercancía a los almacenes</p>
          </div>
        </div>

        <div className="text-sm text-gray-600 space-y-3 leading-relaxed">
          <p>
            Utilice la pestaña <strong>Entradas</strong> cada vez que un proveedor entregue insumos, se reciban compras,
            o ingrese mercancía a cualquiera de las sedes.
          </p>

          {/* Screenshot Component of Entradas */}
          <EntradasScreenshot />

          <h3 className="font-bold text-gray-900 text-base pt-2">Guía de Operación Paso a Paso:</h3>
          <ol className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
              <div>
                <strong className="text-gray-900 font-bold">Seleccionar el Producto:</strong> Escriba en el buscador el código (SKU) o el nombre del insumo.
                Al seleccionarlo, el sistema mostrará automáticamente su unidad de medida y el stock existente.
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
              <div>
                <strong className="text-gray-900 font-bold">Ingresar la Cantidad Recibida:</strong> Digite el número exacto de piezas, kilogramos, rollos o litros recibidos. Solo se admiten valores positivos.
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
              <div>
                <strong className="text-gray-900 font-bold">Elegir la UP Receptora:</strong> Seleccione la sede física donde se guardará físicamente el material (ej. <em>LUPITA</em> o <em>PACKING TEPA</em>).
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">4</span>
              <div>
                <strong className="text-gray-900 font-bold">Notas y Confirmación:</strong> Ingrese el número de remisión, factura o proveedor en el campo de observaciones y presione <strong>"Registrar Entrada"</strong>. El stock se sumará al instante.
              </div>
            </li>
          </ol>
        </div>
      </section>

      {/* CHAPTER 5: REGISTRO DE SALIDAS */}
      <section id="salidas" className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <div className="p-3 bg-rose-100 text-rose-700 rounded-2xl">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">5. Procedimiento de Registro de Salidas (Despachos)</h2>
            <p className="text-xs text-gray-500">Control de consumo interno, transferencias y prevención de negativos</p>
          </div>
        </div>

        <div className="text-sm text-gray-600 space-y-3 leading-relaxed">
          <p>
            Utilice la pestaña <strong>Salidas</strong> cada vez que se entregue material a cuadrillas de campo,
            líneas de empaque o se realice un consumo de insumos.
          </p>

          {/* Screenshot Component of Salidas */}
          <SalidasScreenshot />

          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs space-y-1">
            <p className="font-bold flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              Regla de Oro: Control de Existencias en Salidas
            </p>
            <p>
              El sistema verifica en tiempo real la existencia en la UP seleccionada. Si intenta registrar una salida
              por una cantidad superior a la disponible en ese subacopio, el sistema le alertará para prevenir inconsistencias.
            </p>
          </div>

          <h3 className="font-bold text-gray-900 text-base pt-2">Pasos para Realizar un Despacho:</h3>
          <ol className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-rose-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
              <div>
                <strong className="text-gray-900 font-bold">Seleccionar el Producto y UP:</strong> Elija el insumo y la UP emisora. El sistema mostrará en pantalla el saldo actual disponible en esa ubicación.
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-rose-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
              <div>
                <strong className="text-gray-900 font-bold">Indicar la Cantidad a Salir:</strong> Al escribir la cantidad, el sistema proyectará de forma inmediata el saldo remanente que quedará en el almacén.
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-rose-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
              <div>
                <strong className="text-gray-900 font-bold">Destinatario y Motivo:</strong> Especifique quién recibe el material (ej. <em>Cuadrilla 2 de Cosecha, Ing. Gómez</em>).
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-rose-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">4</span>
              <div>
                <strong className="text-gray-900 font-bold">Confirmar Salida:</strong> Presione el botón <strong>"Registrar Salida"</strong>. La transacción quedará grabada con fecha, hora y usuario.
              </div>
            </li>
          </ol>
        </div>
      </section>

      {/* CHAPTER 6: HISTORIAL Y AUDITORÍA */}
      <section id="historial" className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <div className="p-3 bg-indigo-100 text-indigo-700 rounded-2xl">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">6. Historial y Auditoría de Movimientos</h2>
            <p className="text-xs text-gray-500">Trazabilidad completa, filtros cruzados y depuración de registros</p>
          </div>
        </div>

        <div className="text-sm text-gray-600 space-y-3 leading-relaxed">
          <p>
            El módulo de <strong>Historial</strong> almacena el registro inmutable de cada transacción efectuada en la plataforma.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-2">
            <div className="p-3.5 bg-slate-50 border border-gray-200 rounded-2xl space-y-1">
              <span className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> Filtro por Tipo
              </span>
              <p className="text-[11px] text-gray-600">
                Alterne rápidamente entre ver <strong>Todos</strong> los movimientos, solo <strong>Entradas</strong> o solo <strong>Salidas</strong>.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 border border-gray-200 rounded-2xl space-y-1">
              <span className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600" /> Selector de UP
              </span>
              <p className="text-[11px] text-gray-600">
                Filtre las transacciones para auditar los despachos y recepciones de un subacopio específico.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 border border-gray-200 rounded-2xl space-y-1">
              <span className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-emerald-600" /> Exportar Vista a CSV
              </span>
              <p className="text-[11px] text-gray-600">
                Haga clic en <strong>"Exportar CSV"</strong> para descargar exactamente los registros que tiene filtrados en pantalla.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CHAPTER 7: REPORTES INDEPENDIENTES POR UP */}
      <section id="reportes" className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <div className="p-3 bg-blue-100 text-blue-700 rounded-2xl">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">7. Generador de Reportes Independientes por UP</h2>
            <p className="text-xs text-gray-500">Módulo especializado para generación y exportación masiva a Excel</p>
          </div>
        </div>

        <div className="text-sm text-gray-600 space-y-3 leading-relaxed">
          <p>
            La herramienta <strong>Reportes por UP</strong> (disponible en el encabezado tanto del Dashboard como del Historial)
            permite generar y exportar archivos CSV sin afectar los filtros visuales que tenga activos en pantalla.
          </p>

          {/* Screenshot Component of Reportes */}
          <ReportesScreenshot />

          <h3 className="font-bold text-gray-900 text-base pt-2">Tipos de Reportes Disponibles:</h3>
          <div className="space-y-3">
            <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50 space-y-1">
              <strong className="text-gray-900 text-xs font-bold uppercase tracking-wider text-blue-700 block">
                1. Reporte de Inventario por UP
              </strong>
              <p className="text-xs text-gray-600">
                Genera una sábana de datos con Código, Descripción, Familia, Stock existente en la UP seleccionada (o consolidado),
                Punto de Reorden y el Estatus actual (ÓPTIMO o ALERTA).
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50 space-y-1">
              <strong className="text-gray-900 text-xs font-bold uppercase tracking-wider text-emerald-700 block">
                2. Reporte de Historial de Movimientos
              </strong>
              <p className="text-xs text-gray-600">
                Auditoría detallada con selector de rango de fechas: <em>Últimos 7 días, Últimos 30 días, Mes en curso o Rango personalizado</em>.
                Permite auditar consumos por subacopio para cierres mensuales o semanales.
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50 space-y-1">
              <strong className="text-gray-900 text-xs font-bold uppercase tracking-wider text-rose-700 block">
                3. Reporte de Alertas de Reorden
              </strong>
              <p className="text-xs text-gray-600">
                Genera una lista depurada que contiene únicamente aquellos productos cuyo saldo en la UP está por debajo del reorden mínimo.
                Ideal para compras y requisición de suministros.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CHAPTER 8: CATÁLOGO DE ÍTEMS */}
      <section id="catalogo" className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <div className="p-3 bg-purple-100 text-purple-700 rounded-2xl">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">8. Administración del Catálogo Base de Ítems</h2>
            <p className="text-xs text-gray-500">Alta de códigos, unidades de medida y puntos de reorden (Exclusivo Administrador)</p>
          </div>
        </div>

        <div className="text-sm text-gray-600 space-y-3 leading-relaxed">
          <p>
            En la sección <strong>Base de Ítems</strong> el Administrador define el catálogo maestro de insumos.
          </p>

          <div className="bg-slate-50 border border-gray-200 p-4 rounded-2xl space-y-2 text-xs">
            <h4 className="font-bold text-gray-900">Campos Obligatorios de un Producto:</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li><strong>Código / SKU:</strong> Identificador único del insumo (ej. <code>ET4X6</code>, <code>CLX10</code>). No se puede duplicar.</li>
              <li><strong>Descripción:</strong> Nombre completo, medidas y especificaciones del producto.</li>
              <li><strong>Unidad:</strong> Unidad de medida (ej. <em>PZ, KG, LT, ROLLO, CAJA</em>).</li>
              <li><strong>Área / Familia:</strong> Clasificación para análisis (ej. <em>FORMATOS, EMBARQUES, LIMPIEZA, ETIQUETAS</em>).</li>
              <li><strong>Punto de Reorden:</strong> Cantidad mínima de seguridad antes de que el sistema detone las alertas visuales.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* CHAPTER 9: USUARIOS Y PERMISOS */}
      <section id="usuarios" className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <div className="p-3 bg-teal-100 text-teal-700 rounded-2xl">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">9. Gestión de Usuarios y Seguridad</h2>
            <p className="text-xs text-gray-500">Cuentas, contraseñas seguras y asignación de subacopios</p>
          </div>
        </div>

        <div className="text-sm text-gray-600 space-y-3 leading-relaxed">
          <p>
            Desde la pestaña <strong>Gestión Usuarios</strong>, los administradores pueden crear nuevos accesos, auditar las cuentas existentes
            y <strong>editar los permisos de los demás usuarios</strong> en cualquier momento.
          </p>

          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs space-y-2">
            <h4 className="font-bold text-amber-900 flex items-center gap-1.5 text-xs uppercase tracking-wider">
              <Shield className="w-4 h-4 text-amber-600" />
              Edición de Permisos y Roles de Usuarios
            </h4>
            <p className="text-amber-800 leading-relaxed">
              Al hacer clic en el botón con icono de lápiz (o en el botón de rol) de cualquier usuario de la tabla, se abre la ventana modal de edición con los siguientes controles:
            </p>
            <ul className="list-disc list-inside space-y-1 text-amber-900 ml-1">
              <li><strong>Cambio de Rol:</strong> Alternar entre <em>Operador</em> (acceso limitado a entradas/salidas de su UP) y <em>Administrador</em> (control total del sistema).</li>
              <li><strong>Sede Asignada (UP):</strong> Modificar la ubicación por defecto del usuario (LUPITA, ANITA, SORAYA, YASMINE, PACKING TEPA, BC CAMALU o ALL).</li>
              <li><strong>Actualización de Nombre:</strong> Corregir el nombre y apellido visible.</li>
              <li><strong>Restablecimiento de Contraseña:</strong> Asignar una nueva clave de acceso directamente en caso de olvido (se guarda automáticamente con cifrado seguro SHA-256).</li>
              <li><strong>Regla de Seguridad:</strong> El sistema previene revocar permisos de administrador si solo queda un administrador activo, garantizando que el sistema nunca quede sin supervisión.</li>
            </ul>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 text-slate-200 text-xs space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <Shield className="w-4 h-4" />
              <span>Seguridad Criptográfica Incorporada</span>
            </div>
            <p className="text-slate-300">
              Todas las contraseñas de los usuarios se almacenan cifradas utilizando el algoritmo <strong>SHA-256</strong> con sal de seguridad.
              Nunca se guardan en texto plano en la base de datos o almacenamiento local.
            </p>
          </div>
        </div>
      </section>

      {/* CHAPTER 10: CONFIGURACIÓN Y CLOUD */}
      <section id="configuracion" className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <div className="p-3 bg-cyan-100 text-cyan-700 rounded-2xl">
            <Cloud className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">10. Configuración del Sistema y Firebase Cloud</h2>
            <p className="text-xs text-gray-500">Personalización corporativa y sincronización en la nube</p>
          </div>
        </div>

        <div className="text-sm text-gray-600 space-y-3 leading-relaxed">
          <p>
            Al hacer clic en el botón <strong>Configuración</strong> en la barra lateral, el Administrador puede:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-xs text-gray-700">
            <li><strong>Personalizar la Marca:</strong> Modificar el nombre de la empresa y colocar la URL del logotipo oficial.</li>
            <li><strong>Sincronización en Tiempo Real:</strong> El sistema se conecta a Firebase Firestore, permitiendo que múltiples usuarios en diferentes computadoras o tablets vean las existencias actualizadas en tiempo real.</li>
            <li><strong>Modo Contingencia (Offline):</strong> Si se interrumpe la conexión a internet, el sistema almacena temporalmente los datos en el navegador local y los sincroniza al restablecerse el servicio.</li>
          </ul>
        </div>
      </section>

      {/* CHAPTER 11: FAQ Y RESOLUCIÓN DE PROBLEMAS */}
      <section id="faq" className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <div className="p-3 bg-slate-100 text-slate-700 rounded-2xl">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">11. Preguntas Frecuentes (FAQ) y Solución de Problemas</h2>
            <p className="text-xs text-gray-500">Respuestas directas a las dudas operativas más comunes</p>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-1.5">
            <h4 className="font-bold text-gray-900 text-sm">¿Qué hago si no veo un producto en mi UP?</h4>
            <p className="text-gray-600 leading-relaxed">
              Verifique si en el Dashboard tiene activada la casilla <em>"Solo con stock en UP"</em>.
              Si el producto tiene saldo 0 en esa sede, estará oculto mientras esa casilla permanezca marcada.
              Desmárquela para visualizar todo el catálogo.
            </p>
          </div>

          <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-1.5">
            <h4 className="font-bold text-gray-900 text-sm">¿Cómo se determina cuándo un producto está en ALERTA?</h4>
            <p className="text-gray-600 leading-relaxed">
              Cuando el stock disponible es menor o igual al <strong>Punto de Reorden</strong> definido para ese insumo.
              Si está filtrando por una UP específica, el cálculo evaluará si las existencias en esa UP particular han alcanzado el umbral.
            </p>
          </div>

          <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-1.5">
            <h4 className="font-bold text-gray-900 text-sm">¿Cómo exportar las existencias a Microsoft Excel?</h4>
            <p className="text-gray-600 leading-relaxed">
              Presione el botón <strong>"Exportar CSV"</strong> en el Dashboard o ingrese a <strong>"Reportes por UP"</strong>.
              El archivo descargado se abre automáticamente con Excel, respetando columnas, acentos y formatos numéricos.
            </p>
          </div>
        </div>
      </section>

      {/* Footer Acknowledgement */}
      <div className="text-center text-xs text-gray-400 py-6 border-t border-gray-200 space-y-1">
        <p className="font-semibold text-gray-500">Sistema de Control de Inventario Multi-UP • Documentación y Manual de Operación</p>
        <p>Para asistencia técnica o incorporación de nuevos subacopios, consulte con el Administrador del Sistema.</p>
      </div>
    </div>
  );
};
