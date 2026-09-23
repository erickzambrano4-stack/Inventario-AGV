export type Role = 'admin' | 'supervisor' | 'operador';

export type UPLocation = string;

export const INITIAL_UPS: string[] = ['LUPITA', 'ANITA', 'SORAYA', 'YASMINE', 'PACKING TEPA', 'BC CAMALU'];

export interface Item {
  id: string;
  desc: string;
  unidad: string;
  area: string;
  reorden: number;
}

export interface Transaccion {
  idDoc: string;
  tipo: 'entrada' | 'salida';
  itemId: string;
  qty: number;
  up: string;
  fecha: string;
  notas?: string;
  usuario: string;
  timestamp: number;
}

export interface Usuario {
  username: string;
  password?: string; // Hashed string sha256:...
  name: string;
  role: Role;
  up: string; // UP principal (ej: 'LUPITA' o 'ALL')
  allowedUps?: string[]; // Lista explícita de UPs autorizadas para este usuario
}

export interface AppSettings {
  appName: string;
  logoUrl: string;
}

export interface InventarioItem extends Item {
  stockTotal: number;
  upStock: Record<string, number>;
}

export interface ResponsableAlmacen {
  id: string;
  nombre: string;
  cargo: string;
  up: string;
  telefono?: string;
  email?: string;
  activo: boolean;
  notas?: string;
  fechaCreacion?: string;
}

export const INITIAL_RESPONSABLES: ResponsableAlmacen[] = [
  {
    id: 'resp-lupita-1',
    nombre: 'Juan Carlos Mendoza',
    cargo: 'Encargado de Almacén General',
    up: 'LUPITA',
    telefono: '(616) 102-3344',
    activo: true,
    notas: 'Responsable titular de recepción y despacho de insumos'
  },
  {
    id: 'resp-anita-1',
    nombre: 'Roberto Silva Morales',
    cargo: 'Jefe de Bodega Agrícola',
    up: 'ANITA',
    telefono: '(616) 105-8822',
    activo: true,
    notas: 'Encargado de insumos fitosanitarios y fertilizantes'
  },
  {
    id: 'resp-soraya-1',
    nombre: 'María Elena Gómez',
    cargo: 'Supervisora de Almacén e Inventarios',
    up: 'SORAYA',
    telefono: '(616) 110-4499',
    activo: true,
    notas: 'Custodio de bodega de herramientas y agroquímicos'
  },
  {
    id: 'resp-yasmine-1',
    nombre: 'Francisco Javier Soto',
    cargo: 'Encargado de Suministros',
    up: 'YASMINE',
    telefono: '(616) 124-7711',
    activo: true,
    notas: 'Responsable de entrega y control de stock'
  },
  {
    id: 'resp-packing-1',
    nombre: 'Carlos Alberto Vega',
    cargo: 'Jefe de Almacén y Empaque',
    up: 'PACKING TEPA',
    telefono: '(616) 118-9900',
    activo: true,
    notas: 'Control de materiales de empaque y tarimas'
  },
  {
    id: 'resp-camalu-1',
    nombre: 'David Morales Castro',
    cargo: 'Responsable de Bodega Camalú',
    up: 'BC CAMALU',
    telefono: '(616) 130-2211',
    activo: true,
    notas: 'Sede Camalú - Suministro general y campo'
  }
];

export type TipoDocumentoInsumos = 'solicitud' | 'recibo';
export type EstadoSolicitud = 'pendiente' | 'aprobada' | 'entregada' | 'cancelada';

export interface SolicitudInsumoItem {
  itemId: string;
  desc: string;
  unidad: string;
  area?: string;
  cantidad: number;
  stockActualUp?: number;
  notas?: string;
}

export interface SolicitudInsumo {
  id: string;
  folio: string;
  tipo: TipoDocumentoInsumos;
  up: string;
  fecha: string;
  solicitante: string;
  responsableAlmacen: string;
  responsableCargo?: string;
  prioridad: 'normal' | 'urgente';
  areaAplicacion?: string;
  observaciones?: string;
  items: SolicitudInsumoItem[];
  estado: EstadoSolicitud;
  usuarioCreador: string;
  fechaCreacion: number;
  fechaModificacion?: number;
  aplicadoInventario?: boolean;
}

export type ActiveTab =
  | 'dashboard'
  | 'entrada'
  | 'salida'
  | 'solicitudes'
  | 'historial'
  | 'items'
  | 'responsables'
  | 'usuarios'
  | 'manual';

export interface ToastMessage {
  id: string;
  text: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

