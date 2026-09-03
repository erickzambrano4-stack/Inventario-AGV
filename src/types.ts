export type Role = 'admin' | 'operador';

export type UPLocation = 'LUPITA' | 'ANITA' | 'SORAYA' | 'YASMINE' | 'PACKING TEPA' | 'BC CAMALU' | 'ALL';

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
  up: string;
}

export interface AppSettings {
  appName: string;
  logoUrl: string;
}

export interface InventarioItem extends Item {
  stockTotal: number;
  upStock: Record<string, number>;
}

export type ActiveTab = 'dashboard' | 'entrada' | 'salida' | 'historial' | 'items' | 'usuarios';

export interface ToastMessage {
  id: string;
  text: string;
  type: 'info' | 'success' | 'warning' | 'error';
}
