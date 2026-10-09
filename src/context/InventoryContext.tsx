import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Item,
  Transaccion,
  Usuario,
  AppSettings,
  InventarioItem,
  INITIAL_UPS,
  ToastMessage,
  ActiveTab,
  Role,
  ResponsableAlmacen,
  INITIAL_RESPONSABLES,
  SolicitudInsumo,
  EstadoSolicitud
} from '../types';
import { db, testFirestoreConnection, firebaseConfig, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  getDoc
} from 'firebase/firestore';
import { hashPassword, verifyPassword } from '../lib/security';

const DEFAULT_ITEMS: Item[] = [
  { id: 'MX-F-PCK-003', desc: 'FORMATO CONTROL DE PRE-FRIO', unidad: 'PZ', area: 'FORMATOS', reorden: 100 },
  { id: 'MX-F-PCK-001', desc: 'FORMATO RECEPCIÓN DE FRUTA EN COOLER', unidad: 'PZ', area: 'FORMATOS', reorden: 200 },
  { id: 'ET4X6', desc: 'ETIQUETA PTI 4X6 (1000 PZ X ROLLO)', unidad: 'PZ', area: 'ETIQUETAS', reorden: 10 },
  { id: 'SS-PV', desc: 'SELLO DE SEGURIDAD PLASTICO VERDE', unidad: 'PZ', area: 'EMBARQUES', reorden: 500 },
  { id: 'CLX10', desc: 'CLORALEX EL RENDIDOR 10 LT', unidad: 'PZ', area: 'LIMPIEZA', reorden: 5 }
];

const isDemoItem = (id: string) => /^(AGR|EMP|SEG|FER|LIM|OF)-\d+$/.test(id);

const DEFAULT_USERS_RAW = [
  { username: 'admin', password: 'admin123', name: 'Administrador Principal', role: 'admin' as const, up: 'ALL', allowedUps: ['ALL'] },
  { username: 'supervisor1', password: '123456', name: 'Supervisor de Sede', role: 'supervisor' as const, up: 'LUPITA', allowedUps: ['LUPITA'] },
  { username: 'operador1', password: '123456', name: 'Supervisor de Almacén', role: 'supervisor' as const, up: 'LUPITA', allowedUps: ['LUPITA'] }
];

interface InventoryContextType {
  currentUser: Usuario | null;
  userAllowedUps: string[];
  isGlobalAccess: boolean;
  primaryUp: string;
  isUpAuthorized: (upName: string) => boolean;
  items: Item[];
  transacciones: Transaccion[];
  usuarios: Usuario[];
  appSettings: AppSettings;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  inventario: InventarioItem[];
  stats: {
    totalItems: number;
    totalEntradas: number;
    totalSalidas: number;
    alertas: number;
  };
  cloudConnected: boolean;
  syncStatusText: string;
  isSyncing: boolean;
  lastSyncTime: Date | null;
  toasts: ToastMessage[];
  showToast: (text: string, type?: ToastMessage['type']) => void;
  dismissToast: (id: string) => void;
  login: (user: string, pass: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  addItem: (item: Omit<Item, 'unidad'>) => Promise<boolean>;
  updateItem: (id: string, updates: Partial<Omit<Item, 'id'>>) => Promise<boolean>;
  deleteItem: (id: string) => Promise<boolean>;
  deleteMultipleItems: (ids: string[]) => Promise<{ deleted: number; skipped: number; skippedIds: string[] }>;
  bulkImportMasterData: (payload: {
    itemsToImport: Omit<Item, 'unidad'>[];
    initialTransactions?: Array<{ itemId: string; qty: number; up: string; fecha?: string; notas?: string }>;
    overwriteExisting: boolean;
  }) => Promise<{ created: number; updated: number; transactionsCreated: number }>;
  addTransaction: (trans: Omit<Transaccion, 'idDoc' | 'timestamp' | 'usuario'>) => Promise<boolean>;
  deleteTransaction: (idDoc: string) => Promise<boolean>;
  deleteMultipleTransactions: (idDocs: string[]) => Promise<boolean>;
  addUser: (user: Omit<Usuario, 'password'> & { password: string; allowedUps?: string[] }) => Promise<boolean>;
  updateUser: (username: string, updates: { role?: Role; up?: string; allowedUps?: string[]; name?: string; newPassword?: string }) => Promise<boolean>;
  deleteUser: (username: string) => Promise<boolean>;
  ups: string[];
  addUp: (newUp: string) => Promise<boolean>;
  deleteUp: (upName: string) => Promise<boolean>;
  responsables: ResponsableAlmacen[];
  addResponsable: (data: Omit<ResponsableAlmacen, 'id' | 'fechaCreacion'>) => Promise<boolean>;
  updateResponsable: (id: string, updates: Partial<ResponsableAlmacen>) => Promise<boolean>;
  deleteResponsable: (id: string) => Promise<boolean>;
  solicitudes: SolicitudInsumo[];
  addSolicitud: (
    data: Omit<SolicitudInsumo, 'id' | 'folio' | 'fechaCreacion'>,
    afectarInventario?: boolean,
    tipoMovimiento?: 'salida' | 'entrada'
  ) => Promise<SolicitudInsumo | null>;
  updateSolicitudEstado: (
    id: string,
    nuevoEstado: EstadoSolicitud,
    afectarInventario?: boolean,
    tipoMovimiento?: 'salida' | 'entrada'
  ) => Promise<boolean>;
  deleteSolicitud: (id: string) => Promise<boolean>;
  updateSettings: (newSettings: AppSettings) => Promise<void>;
  forceCloudSync: () => Promise<void>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<Usuario | null>(() => {
    const saved = localStorage.getItem('inv_current_user');
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved);
      if (parsed && (parsed.role as string) === 'operador') {
        parsed.role = 'supervisor';
      }
      return parsed;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [items, setItems] = useState<Item[]>(() => {
    const saved = localStorage.getItem('invItems_Pro');
    if (saved) {
      try {
        const parsed: Item[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(i => !isDemoItem(i.id));
          if (cleaned.length > 0) {
            localStorage.setItem('invItems_Pro', JSON.stringify(cleaned));
            return cleaned;
          }
        }
      } catch {
        // Fallback
      }
    }
    localStorage.setItem('invItems_Pro', JSON.stringify(DEFAULT_ITEMS));
    return DEFAULT_ITEMS;
  });

  const [transacciones, setTransacciones] = useState<Transaccion[]>(() => {
    const saved = localStorage.getItem('invTrans_Pro');
    if (saved) {
      try {
        const parsed: Transaccion[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(t => !isDemoItem(t.itemId));
          localStorage.setItem('invTrans_Pro', JSON.stringify(cleaned));
          return cleaned;
        }
      } catch {
        // Fallback
      }
    }
    return [];
  });

  const [usuarios, setUsuarios] = useState<Usuario[]>(() => {
    const saved = localStorage.getItem('invUsers_Pro');
    if (saved) {
      try {
        const parsed: Usuario[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map(u => ({
            ...u,
            role: (u.role as string) === 'operador' ? 'supervisor' : u.role
          }));
        }
      } catch {
        // Fallback
      }
    }
    return [];
  });

  const [ups, setUps] = useState<string[]>(() => {
    const saved = localStorage.getItem('invUps_Pro');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const combined = Array.from(
            new Set([...INITIAL_UPS, ...parsed.map((u: string) => String(u).trim().toUpperCase())])
          );
          return combined;
        }
      } catch {
        // Fallback
      }
    }
    return [...INITIAL_UPS];
  });

  // Calculate permissions and UP scope for the logged-in user
  const isGlobalAccess = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    if (currentUser.up === 'ALL') return true;
    if (currentUser.allowedUps && currentUser.allowedUps.includes('ALL')) return true;
    return false;
  }, [currentUser]);

  const userAllowedUps = useMemo(() => {
    if (!currentUser) return ups;
    if (isGlobalAccess) return ups;

    if (currentUser.allowedUps && currentUser.allowedUps.length > 0) {
      const explicit = currentUser.allowedUps
        .map(u => u.trim().toUpperCase())
        .filter(u => u && u !== 'ALL');
      if (explicit.length > 0) return explicit;
    }

    if (currentUser.up && currentUser.up !== 'ALL') {
      return [currentUser.up.trim().toUpperCase()];
    }

    return ups;
  }, [currentUser, isGlobalAccess, ups]);

  const primaryUp = useMemo(() => {
    if (!currentUser) return ups[0] || 'LUPITA';
    if (currentUser.up && currentUser.up !== 'ALL') return currentUser.up.toUpperCase();
    if (userAllowedUps.length > 0) return userAllowedUps[0];
    return ups[0] || 'LUPITA';
  }, [currentUser, userAllowedUps, ups]);

  const isUpAuthorized = useCallback(
    (upName: string) => {
      if (!upName) return false;
      if (isGlobalAccess) return true;
      const cleanTarget = upName.trim().toUpperCase().replace(/^UP\s+/, '');
      return userAllowedUps.some(u => u.trim().toUpperCase().replace(/^UP\s+/, '') === cleanTarget);
    },
    [isGlobalAccess, userAllowedUps]
  );

  const [responsables, setResponsables] = useState<ResponsableAlmacen[]>(() => {
    const saved = localStorage.getItem('invResponsables_Pro');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {
        // Fallback
      }
    }
    return INITIAL_RESPONSABLES;
  });

  const [solicitudes, setSolicitudes] = useState<SolicitudInsumo[]>(() => {
    const saved = localStorage.getItem('invSolicitudes_Pro');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        // Fallback
      }
    }
    return [];
  });

  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('invSettings_Pro');
    return saved ? JSON.parse(saved) : { appName: 'InvControl Pro', logoUrl: '' };
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [cloudConnected, setCloudConnected] = useState<boolean>(false);
  const [syncStatusText, setSyncStatusText] = useState<string>('Conectando a Firebase...');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(() => new Date());

  const showToast = useCallback((text: string, type: ToastMessage['type'] = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Save to LocalStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('invItems_Pro', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem('invTrans_Pro', JSON.stringify(transacciones));
  }, [transacciones]);

  useEffect(() => {
    localStorage.setItem('invUsers_Pro', JSON.stringify(usuarios));
  }, [usuarios]);

  useEffect(() => {
    localStorage.setItem('invSettings_Pro', JSON.stringify(appSettings));
  }, [appSettings]);

  useEffect(() => {
    localStorage.setItem('invUps_Pro', JSON.stringify(ups));
  }, [ups]);

  useEffect(() => {
    localStorage.setItem('invResponsables_Pro', JSON.stringify(responsables));
  }, [responsables]);

  useEffect(() => {
    localStorage.setItem('invSolicitudes_Pro', JSON.stringify(solicitudes));
  }, [solicitudes]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('inv_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('inv_current_user');
    }
  }, [currentUser]);

  // Initialize Default Users with SHA-256 hashes if empty
  useEffect(() => {
    const initUsers = async () => {
      if (usuarios.length === 0) {
        const hashedUsers: Usuario[] = [];
        for (const u of DEFAULT_USERS_RAW) {
          const hashed = await hashPassword(u.password);
          hashedUsers.push({
            username: u.username,
            name: u.name,
            password: hashed,
            role: u.role,
            up: u.up,
            allowedUps: u.allowedUps
          });
        }
        setUsuarios(hashedUsers);
      }
    };
    initUsers();
  }, [usuarios.length]);

  // Firestore Sync Listeners
  useEffect(() => {
    if (!db) {
      setCloudConnected(false);
      setSyncStatusText('Firebase SDK no disponible (Modo Local)');
      return;
    }

    let unsubItems: (() => void) | null = null;
    let unsubTrans: (() => void) | null = null;
    let unsubUsers: (() => void) | null = null;
    let unsubConfig: (() => void) | null = null;
    let unsubLocations: (() => void) | null = null;
    let unsubSolicitudes: (() => void) | null = null;
    let unsubResponsables: (() => void) | null = null;

    testFirestoreConnection().then(status => {
      setCloudConnected(status.connected);
      setSyncStatusText(status.connected ? `Conectado a Firebase: ${firebaseConfig.projectId}` : status.message);
    });

    try {
      // 1. Items Listener
      unsubItems = onSnapshot(
        collection(db, 'items'),
        snapshot => {
          if (!snapshot.empty) {
            const remoteItems: Item[] = [];
            snapshot.forEach(docSnap => {
              const data = docSnap.data() as Item;
              remoteItems.push({
                id: docSnap.id,
                desc: data.desc || '',
                unidad: data.unidad || 'PZ',
                area: data.area || 'GENERAL',
                reorden: typeof data.reorden === 'number' ? data.reorden : 0
              });
            });
            remoteItems.sort((a, b) => a.id.localeCompare(b.id));
            setItems(remoteItems);
            localStorage.setItem('invItems_Pro', JSON.stringify(remoteItems));
          } else {
            // If remote is empty, seed with initial items
            DEFAULT_ITEMS.forEach(async it => {
              try {
                if (db) await setDoc(doc(db, 'items', it.id), it);
              } catch (e) {
                // Ignore seed errors
              }
            });
          }
          setCloudConnected(true);
          setLastSyncTime(new Date());
          setSyncStatusText(`Conectado a Firebase Cloud (${firebaseConfig.projectId})`);
        },
        error => {
          console.warn("Firestore items listener notice:", error.message);
          setCloudConnected(false);
          setSyncStatusText('Modo Local Activo (Fallback seguro)');
        }
      );

      // 2. Transacciones Listener
      unsubTrans = onSnapshot(
        collection(db, 'transacciones'),
        snapshot => {
          const remoteTrans: Transaccion[] = [];
          snapshot.forEach(docSnap => {
            const data = docSnap.data() as Transaccion;
            remoteTrans.push({
              ...data,
              idDoc: docSnap.id
            });
          });

          setTransacciones(prevLocal => {
            const transMap = new Map<string, Transaccion>();
            // Remote transactions are authoritative
            remoteTrans.forEach(t => transMap.set(t.idDoc, t));
            // Keep local transactions that haven't synced to Firestore yet
            prevLocal.forEach(localT => {
              if (!transMap.has(localT.idDoc) && !isDemoItem(localT.itemId)) {
                transMap.set(localT.idDoc, localT);
                if (db) {
                  setDoc(doc(db, 'transacciones', localT.idDoc), localT).catch(console.warn);
                }
              }
            });
            const mergedList = Array.from(transMap.values());
            // Sort by timestamp descending
            mergedList.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            localStorage.setItem('invTrans_Pro', JSON.stringify(mergedList));
            return mergedList;
          });
          setLastSyncTime(new Date());
        },
        error => {
          console.warn("Firestore transacciones listener notice:", error.message);
        }
      );

      // 3. Usuarios Listener
      unsubUsers = onSnapshot(
        collection(db, 'usuarios'),
        snapshot => {
          if (!snapshot.empty) {
            const remoteUsers: Usuario[] = [];
            snapshot.forEach(docSnap => {
              const data = docSnap.data() as Usuario;
              remoteUsers.push({
                username: docSnap.id,
                name: data.name || docSnap.id,
                role: (data.role as string) === 'operador' ? 'supervisor' : data.role,
                up: data.up || 'LUPITA',
                allowedUps: data.allowedUps || (data.up === 'ALL' ? ['ALL'] : [data.up]),
                password: data.password
              });
            });
            setUsuarios(remoteUsers);
            localStorage.setItem('invUsers_Pro', JSON.stringify(remoteUsers));

            // Keep active session aligned if user's role or assigned UPs changed from another device
            setCurrentUser(prev => {
              if (!prev) return null;
              const match = remoteUsers.find(u => u.username.toLowerCase() === prev.username.toLowerCase());
              if (!match) return prev;
              const merged: Usuario = {
                ...prev,
                name: match.name,
                role: match.role,
                up: match.up,
                allowedUps: match.allowedUps
              };
              localStorage.setItem('inv_current_user', JSON.stringify(merged));
              return merged;
            });
            setLastSyncTime(new Date());
          }
        },
        error => {
          console.warn("Firestore usuarios listener notice:", error.message);
        }
      );

      // 4. Config Listener
      unsubConfig = onSnapshot(
        doc(db, 'configuracion', 'general'),
        docSnap => {
          if (docSnap.exists()) {
            const data = docSnap.data() as AppSettings;
            setAppSettings(prev => ({ ...prev, ...data }));
            setLastSyncTime(new Date());
          }
        },
        error => {
          console.warn("Firestore config listener notice:", error.message);
        }
      );

      // 5. Locations / UPs Listener
      unsubLocations = onSnapshot(
        doc(db, 'configuracion', 'locations'),
        docSnap => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (Array.isArray(data?.ups) && data.ups.length > 0) {
              const cleanUps = data.ups.map((u: string) => String(u).trim().toUpperCase());
              setUps(cleanUps);
              localStorage.setItem('invUps_Pro', JSON.stringify(cleanUps));
              setLastSyncTime(new Date());
            }
          }
        },
        error => {
          console.warn("Firestore locations listener notice:", error.message);
        }
      );

      // 6. Solicitudes de Insumos Listener
      unsubSolicitudes = onSnapshot(
        collection(db, 'solicitudes'),
        snapshot => {
          const remoteDocs: SolicitudInsumo[] = [];
          snapshot.forEach(docSnap => {
            remoteDocs.push({
              ...(docSnap.data() as SolicitudInsumo),
              id: docSnap.id
            });
          });
          remoteDocs.sort((a, b) => (b.fechaCreacion || 0) - (a.fechaCreacion || 0));
          setSolicitudes(remoteDocs);
          localStorage.setItem('invSolicitudes_Pro', JSON.stringify(remoteDocs));
          setLastSyncTime(new Date());
        },
        error => {
          console.warn("Firestore solicitudes listener notice:", error.message);
        }
      );

      // 7. Responsables de Almacén Listener
      unsubResponsables = onSnapshot(
        doc(db, 'configuracion', 'responsables'),
        async docSnap => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (Array.isArray(data?.responsables) && data.responsables.length > 0) {
              setResponsables(prev => {
                const map = new Map<string, ResponsableAlmacen>();
                // Keep local first
                prev.forEach(r => map.set(r.id, r));
                // Remote overrides or adds
                data.responsables.forEach((r: ResponsableAlmacen) => map.set(r.id, r));
                const merged = Array.from(map.values());
                localStorage.setItem('invResponsables_Pro', JSON.stringify(merged));
                return merged;
              });
              setLastSyncTime(new Date());
            } else {
              // Remote document exists but is empty: seed with local data
              const saved = localStorage.getItem('invResponsables_Pro');
              const toSeed = saved ? JSON.parse(saved) : INITIAL_RESPONSABLES;
              if (Array.isArray(toSeed) && toSeed.length > 0 && db) {
                setDoc(doc(db, 'configuracion', 'responsables'), { responsables: toSeed }, { merge: true }).catch(console.warn);
              }
            }
          } else {
            // Document does not exist yet: seed with local/initial data
            const saved = localStorage.getItem('invResponsables_Pro');
            const toSeed = saved ? JSON.parse(saved) : INITIAL_RESPONSABLES;
            if (Array.isArray(toSeed) && toSeed.length > 0 && db) {
              setDoc(doc(db, 'configuracion', 'responsables'), { responsables: toSeed }, { merge: true }).catch(console.warn);
            }
          }
        },
        error => {
          console.warn("Firestore responsables listener notice:", error.message);
        }
      );
    } catch (err) {
      console.warn("Error setting up Firestore listeners:", err);
    }

    return () => {
      if (unsubItems) unsubItems();
      if (unsubTrans) unsubTrans();
      if (unsubUsers) unsubUsers();
      if (unsubConfig) unsubConfig();
      if (unsubLocations) unsubLocations();
      if (unsubSolicitudes) unsubSolicitudes();
      if (unsubResponsables) unsubResponsables();
    };
  }, []);

  // Force sync from local to cloud or vice versa
  const forceCloudSync = useCallback(async () => {
    if (!db) {
      showToast('Firebase no está configurado para sincronizar', 'warning');
      return;
    }
    setIsSyncing(true);
    try {
      // Sync items
      for (const item of items) {
        await setDoc(doc(db, 'items', item.id), item, { merge: true });
      }
      // Sync transactions
      for (const trans of transacciones) {
        await setDoc(doc(db, 'transacciones', trans.idDoc), trans, { merge: true });
      }
      // Sync users
      for (const u of usuarios) {
        await setDoc(doc(db, 'usuarios', u.username), u, { merge: true });
      }
      // Sync settings & locations
      await setDoc(doc(db, 'configuracion', 'general'), appSettings, { merge: true });
      await setDoc(doc(db, 'configuracion', 'locations'), { ups }, { merge: true });
      await setDoc(doc(db, 'configuracion', 'responsables'), { responsables }, { merge: true });
      for (const resp of responsables) {
        await setDoc(doc(db, 'responsables', resp.id), resp, { merge: true });
      }
      for (const sol of solicitudes) {
        await setDoc(doc(db, 'solicitudes', sol.id), sol, { merge: true });
      }
      setCloudConnected(true);
      setLastSyncTime(new Date());
      setSyncStatusText(`Conectado a Firebase Cloud (${firebaseConfig.projectId})`);
      showToast('Sincronización completa con Firebase Cloud exitosa en todos los equipos', 'success');
    } catch (e: any) {
      showToast('Error de sincronización con la nube: ' + (e?.message || 'Permisos'), 'error');
    } finally {
      setIsSyncing(false);
    }
  }, [items, transacciones, usuarios, appSettings, ups, responsables, solicitudes, showToast]);

  // Inventory calculation
  const inventario = useMemo<InventarioItem[]>(() => {
    return items.map(item => {
      const upStock: Record<string, number> = {};
      ups.forEach(up => {
        const clean = up.trim().toUpperCase().replace(/^UP\s+/, '');
        upStock[up] = 0;
        upStock[clean] = 0;
        upStock[`UP ${clean}`] = 0;
      });

      let totalEntradas = 0;
      let totalSalidas = 0;
      const cleanItemId = item.id.trim().toUpperCase();

      transacciones.forEach(t => {
        const tItemId = (t.itemId || '').trim().toUpperCase();
        if (tItemId === cleanItemId) {
          const tUpClean = (t.up || '').trim().toUpperCase().replace(/^UP\s+/, '');
          const matchedUpKey = ups.find(u => u.trim().toUpperCase().replace(/^UP\s+/, '') === tUpClean) || t.up;

          if (t.tipo === 'entrada') {
            totalEntradas += t.qty;
            upStock[matchedUpKey] = (upStock[matchedUpKey] || 0) + t.qty;
            upStock[tUpClean] = (upStock[tUpClean] || 0) + t.qty;
            upStock[`UP ${tUpClean}`] = (upStock[`UP ${tUpClean}`] || 0) + t.qty;
          } else if (t.tipo === 'salida') {
            totalSalidas += t.qty;
            upStock[matchedUpKey] = (upStock[matchedUpKey] || 0) - t.qty;
            upStock[tUpClean] = (upStock[tUpClean] || 0) - t.qty;
            upStock[`UP ${tUpClean}`] = (upStock[`UP ${tUpClean}`] || 0) - t.qty;
          }
        }
      });

      return {
        ...item,
        stockTotal: totalEntradas - totalSalidas,
        upStock
      };
    });
  }, [items, transacciones, ups]);

  // Dashboard quick stats
  const stats = useMemo(() => {
    const totalItems = items.length;
    const totalEntradas = transacciones.filter(t => t.tipo === 'entrada').length;
    const totalSalidas = transacciones.filter(t => t.tipo === 'salida').length;
    const alertas = inventario.filter(i => i.stockTotal <= (i.reorden || 0)).length;
    return { totalItems, totalEntradas, totalSalidas, alertas };
  }, [items.length, transacciones, inventario]);

  // Login handler
  const login = async (user: string, pass: string): Promise<{ success: boolean; message: string }> => {
    const username = user.trim().toLowerCase();
    let candidate = usuarios.find(u => u.username.toLowerCase() === username);

    // If candidate not found in memory (e.g. initial connection on a new device), check Firestore directly
    if (!candidate && db) {
      try {
        const userDoc = await getDoc(doc(db, 'usuarios', username));
        if (userDoc.exists()) {
          const data = userDoc.data() as Usuario;
          candidate = {
            username: userDoc.id,
            name: data.name || userDoc.id,
            role: (data.role as string) === 'operador' ? 'supervisor' : data.role,
            up: data.up || 'LUPITA',
            allowedUps: data.allowedUps || (data.up === 'ALL' ? ['ALL'] : [data.up]),
            password: data.password
          };
          setUsuarios(prev => [...prev.filter(u => u.username.toLowerCase() !== username), candidate!]);
        }
      } catch (e) {
        // Fallback
      }
    }

    if (!candidate) {
      return { success: false, message: 'Usuario no encontrado' };
    }

    const isValid = await verifyPassword(pass, candidate.password);
    if (!isValid) {
      return { success: false, message: 'Contraseña incorrecta' };
    }

    // If password was stored in plain text, migrate it to SHA-256
    if (candidate.password && !candidate.password.startsWith('sha256:')) {
      const hashed = await hashPassword(pass);
      candidate.password = hashed;
      setUsuarios(prev => prev.map(u => u.username.toLowerCase() === candidate!.username.toLowerCase() ? candidate! : u));
      if (db) {
        try {
          await setDoc(doc(db, 'usuarios', candidate.username), candidate, { merge: true });
        } catch {
          // Ignore
        }
      }
    }

    const loggedUser: Usuario = {
      username: candidate.username,
      name: candidate.name,
      role: candidate.role,
      up: candidate.up,
      allowedUps: candidate.allowedUps
    };

    setCurrentUser(loggedUser);
    return { success: true, message: `¡Bienvenido, ${loggedUser.name}!` };
  };

  const logout = () => {
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  // Add Item
  const addItem = async (itemData: Omit<Item, 'unidad'>): Promise<boolean> => {
    const id = itemData.id.trim().toUpperCase();
    if (items.some(i => i.id === id)) {
      showToast('Ya existe un producto con este código ID', 'error');
      return false;
    }

    const newItem: Item = {
      id,
      desc: itemData.desc.trim().toUpperCase(),
      unidad: 'PZ',
      area: itemData.area ? itemData.area.trim().toUpperCase() : 'GENERAL',
      reorden: Math.max(0, itemData.reorden || 0)
    };

    setItems(prev => [...prev, newItem]);

    if (db) {
      try {
        await setDoc(doc(db, 'items', newItem.id), newItem);
        setLastSyncTime(new Date());
      } catch (err: any) {
        handleFirestoreError(err, OperationType.CREATE, `items/${newItem.id}`);
      }
    }

    showToast(`Producto ${newItem.id} guardado y sincronizado`, 'success');
    return true;
  };

  // Update Item
  const updateItem = async (id: string, updates: Partial<Omit<Item, 'id'>>): Promise<boolean> => {
    const existing = items.find(i => i.id === id);
    if (!existing) {
      showToast('Producto no encontrado', 'error');
      return false;
    }

    const updatedItem: Item = {
      id,
      desc: updates.desc !== undefined ? updates.desc.trim().toUpperCase() : existing.desc,
      unidad: updates.unidad !== undefined ? updates.unidad.trim().toUpperCase() : (existing.unidad || 'PZ'),
      area: updates.area !== undefined ? updates.area.trim().toUpperCase() : existing.area,
      reorden: updates.reorden !== undefined ? Math.max(0, updates.reorden) : existing.reorden
    };

    setItems(prev => prev.map(i => (i.id === id ? updatedItem : i)));

    if (db) {
      try {
        await setDoc(doc(db, 'items', id), updatedItem);
        setLastSyncTime(new Date());
      } catch (err: any) {
        handleFirestoreError(err, OperationType.UPDATE, `items/${id}`);
      }
    }

    showToast(`Producto ${id} actualizado y sincronizado en todos los equipos`, 'success');
    return true;
  };

  // Delete Item
  const deleteItem = async (id: string): Promise<boolean> => {
    const hasMovements = transacciones.some(t => t.itemId === id);
    if (hasMovements) {
      showToast('No se puede eliminar un ítem con movimientos registrados en el historial.', 'error');
      return false;
    }

    setItems(prev => prev.filter(i => i.id !== id));

    if (db) {
      try {
        await deleteDoc(doc(db, 'items', id));
        setLastSyncTime(new Date());
      } catch (err: any) {
        handleFirestoreError(err, OperationType.DELETE, `items/${id}`);
      }
    }

    showToast(`Producto ${id} eliminado y sincronizado`, 'success');
    return true;
  };

  // Delete Multiple Items
  const deleteMultipleItems = async (ids: string[]): Promise<{ deleted: number; skipped: number; skippedIds: string[] }> => {
    if (ids.length === 0) return { deleted: 0, skipped: 0, skippedIds: [] };

    const skippedIds: string[] = [];
    const toDelete: string[] = [];

    ids.forEach(id => {
      const hasMovements = transacciones.some(t => t.itemId === id);
      if (hasMovements) {
        skippedIds.push(id);
      } else {
        toDelete.push(id);
      }
    });

    if (toDelete.length > 0) {
      const toDeleteSet = new Set(toDelete);
      setItems(prev => prev.filter(i => !toDeleteSet.has(i.id)));

      if (db) {
        try {
          await Promise.all(toDelete.map(id => deleteDoc(doc(db, 'items', id))));
          setLastSyncTime(new Date());
        } catch (err: any) {
          handleFirestoreError(err, OperationType.DELETE, 'items');
        }
      }
    }

    if (toDelete.length > 0 && skippedIds.length === 0) {
      showToast(`${toDelete.length} producto(s) eliminado(s) del catálogo`, 'success');
    } else if (toDelete.length > 0 && skippedIds.length > 0) {
      showToast(`${toDelete.length} eliminado(s). ${skippedIds.length} protegido(s) por tener movimientos.`, 'warning');
    } else if (toDelete.length === 0 && skippedIds.length > 0) {
      showToast(`No se eliminó ningún producto: los ${skippedIds.length} tienen movimientos en el historial.`, 'error');
    }

    return { deleted: toDelete.length, skipped: skippedIds.length, skippedIds };
  };

  // Bulk Import Master Data (Items & Initial Balances)
  const bulkImportMasterData = async (payload: {
    itemsToImport: Omit<Item, 'unidad'>[];
    initialTransactions?: Array<{ itemId: string; qty: number; up: string; fecha?: string; notas?: string }>;
    overwriteExisting: boolean;
  }): Promise<{ created: number; updated: number; transactionsCreated: number }> => {
    const { itemsToImport, initialTransactions = [], overwriteExisting } = payload;
    if (itemsToImport.length === 0) {
      return { created: 0, updated: 0, transactionsCreated: 0 };
    }

    const existingMap = new Map<string, Item>(items.map(i => [i.id, i]));
    let createdCount = 0;
    let updatedCount = 0;
    const finalItemsToSave: Item[] = [];

    itemsToImport.forEach(itemData => {
      const cleanId = itemData.id.trim().toUpperCase();
      const cleanDesc = itemData.desc.trim().toUpperCase();
      const cleanArea = (itemData.area || 'GENERAL').trim().toUpperCase();
      const cleanReorden = Math.max(0, itemData.reorden || 0);

      const exists = existingMap.has(cleanId);
      if (exists) {
        if (overwriteExisting) {
          const updatedItem: Item = {
            id: cleanId,
            desc: cleanDesc,
            unidad: 'PZ',
            area: cleanArea,
            reorden: cleanReorden
          };
          existingMap.set(cleanId, updatedItem);
          finalItemsToSave.push(updatedItem);
          updatedCount++;
        }
      } else {
        const newItem: Item = {
          id: cleanId,
          desc: cleanDesc,
          unidad: 'PZ',
          area: cleanArea,
          reorden: cleanReorden
        };
        existingMap.set(cleanId, newItem);
        finalItemsToSave.push(newItem);
        createdCount++;
      }
    });

    const newItemsArray = Array.from(existingMap.values());
    setItems(newItemsArray);

    // Initial stock transactions
    const newTransactionsToSave: Transaccion[] = [];
    const todayStr = new Date().toISOString().split('T')[0];

    if (initialTransactions.length > 0) {
      initialTransactions.forEach(t => {
        if (t.qty > 0) {
          const idDoc = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
          const newTrans: Transaccion = {
            idDoc,
            tipo: 'entrada',
            itemId: t.itemId.trim().toUpperCase(),
            qty: t.qty,
            up: t.up || 'LUPITA',
            fecha: t.fecha || todayStr,
            notas: t.notas || 'Carga Inicial - Documento Maestro',
            usuario: currentUser?.username || 'admin',
            timestamp: Date.now()
          };
          newTransactionsToSave.push(newTrans);
        }
      });

      if (newTransactionsToSave.length > 0) {
        setTransacciones(prev => [...newTransactionsToSave, ...prev]);
      }
    }

    // Save to Firestore if connected
    if (db) {
      try {
        const itemWrites = finalItemsToSave.map(item =>
          setDoc(doc(db, 'items', item.id), item, { merge: true })
        );
        const transWrites = newTransactionsToSave.map(trans =>
          setDoc(doc(db, 'transacciones', trans.idDoc), trans)
        );
        await Promise.all([...itemWrites, ...transWrites]);
      } catch (err: any) {
        console.warn("Firestore bulk import write notice:", err.message);
      }
    }

    showToast(
      `Carga maestra completada: ${createdCount} creados, ${updatedCount} actualizados, ${newTransactionsToSave.length} movimientos de stock`,
      'success'
    );

    return {
      created: createdCount,
      updated: updatedCount,
      transactionsCreated: newTransactionsToSave.length
    };
  };

  // Add Transaction (Entrada or Salida)
  const addTransaction = async (trans: Omit<Transaccion, 'idDoc' | 'timestamp' | 'usuario'>): Promise<boolean> => {
    if (!currentUser) {
      showToast('Debes iniciar sesión para registrar movimientos', 'error');
      return false;
    }

    const upClean = trans.up.trim().toUpperCase();
    if (!isGlobalAccess && !isUpAuthorized(upClean)) {
      showToast(`No tienes permisos para registrar movimientos en ${upClean}`, 'error');
      return false;
    }

    // Validation for Salida: UP stock check
    if (trans.tipo === 'salida') {
      const currentItem = inventario.find(i => i.id === trans.itemId);
      const stockInUp = currentItem?.upStock[trans.up] || 0;
      if (trans.qty > stockInUp) {
        showToast(`Stock insuficiente en ${trans.up}. Disponible: ${stockInUp.toLocaleString()}`, 'error');
        return false;
      }
    }

    const idDoc = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    const newTrans: Transaccion = {
      ...trans,
      up: upClean,
      idDoc,
      usuario: currentUser.username,
      timestamp: Date.now()
    };

    setTransacciones(prev => {
      const updated = [newTrans, ...prev];
      localStorage.setItem('invTrans_Pro', JSON.stringify(updated));
      return updated;
    });

    if (db) {
      try {
        await setDoc(doc(db, 'transacciones', idDoc), newTrans);
        setLastSyncTime(new Date());
      } catch (err: any) {
        handleFirestoreError(err, OperationType.CREATE, `transacciones/${idDoc}`);
      }
    }

    showToast(`${trans.tipo === 'entrada' ? 'Recepción' : 'Despacho'} registrado con éxito en ${upClean}`, 'success');
    return true;
  };

  // Delete Transaction
  const deleteTransaction = async (idDoc: string): Promise<boolean> => {
    setTransacciones(prev => {
      const updated = prev.filter(t => t.idDoc !== idDoc);
      localStorage.setItem('invTrans_Pro', JSON.stringify(updated));
      return updated;
    });

    if (db) {
      try {
        await deleteDoc(doc(db, 'transacciones', idDoc));
        setLastSyncTime(new Date());
      } catch (err: any) {
        handleFirestoreError(err, OperationType.DELETE, `transacciones/${idDoc}`);
      }
    }

    showToast('Movimiento eliminado y stock recalculado', 'success');
    return true;
  };

  // Delete Multiple Transactions
  const deleteMultipleTransactions = async (idDocs: string[]): Promise<boolean> => {
    if (idDocs.length === 0) return true;

    const toDeleteSet = new Set(idDocs);
    setTransacciones(prev => {
      const updated = prev.filter(t => !toDeleteSet.has(t.idDoc));
      localStorage.setItem('invTrans_Pro', JSON.stringify(updated));
      return updated;
    });

    if (db) {
      try {
        await Promise.all(idDocs.map(idDoc => deleteDoc(doc(db, 'transacciones', idDoc))));
        setLastSyncTime(new Date());
      } catch (err: any) {
        handleFirestoreError(err, OperationType.DELETE, 'transacciones');
      }
    }

    showToast(`${idDocs.length} movimiento(s) eliminado(s) y existencias recalculadas`, 'success');
    return true;
  };

  // Add User
  const addUser = async (userData: Omit<Usuario, 'password'> & { password: string; allowedUps?: string[] }): Promise<boolean> => {
    const username = userData.username.trim().toLowerCase();
    if (usuarios.some(u => u.username.toLowerCase() === username)) {
      showToast('El nombre de usuario ya existe', 'error');
      return false;
    }

    const hashedPassword = await hashPassword(userData.password);
    const newUser: Usuario = {
      username,
      name: userData.name.trim(),
      password: hashedPassword,
      role: userData.role,
      up: userData.up,
      allowedUps: userData.allowedUps && userData.allowedUps.length > 0 ? userData.allowedUps : (userData.up === 'ALL' ? ['ALL'] : [userData.up])
    };

    setUsuarios(prev => [...prev, newUser]);

    if (db) {
      try {
        await setDoc(doc(db, 'usuarios', newUser.username), newUser);
        setLastSyncTime(new Date());
      } catch (err: any) {
        handleFirestoreError(err, OperationType.CREATE, `usuarios/${newUser.username}`);
      }
    }

    showToast(`Usuario ${newUser.username} creado exitosamente`, 'success');
    return true;
  };

  // Update User permissions/data
  const updateUser = async (
    username: string,
    updates: {
      role?: Role;
      up?: string;
      allowedUps?: string[];
      name?: string;
      newPassword?: string;
    }
  ): Promise<boolean> => {
    if (!currentUser || currentUser.role !== 'admin') {
      showToast('No tienes permisos de administrador', 'error');
      return false;
    }

    const targetUser = usuarios.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!targetUser) {
      showToast('Usuario no encontrado', 'error');
      return false;
    }

    // Protection: do not leave system without any admin
    if (updates.role && updates.role !== 'admin' && targetUser.role === 'admin') {
      const adminCount = usuarios.filter(u => u.role === 'admin').length;
      if (adminCount <= 1) {
        showToast('No puedes remover los permisos de administrador al único administrador del sistema', 'error');
        return false;
      }
    }

    let hashedPassword = targetUser.password;
    if (updates.newPassword && updates.newPassword.trim()) {
      if (updates.newPassword.trim().length < 6) {
        showToast('La contraseña debe tener al menos 6 caracteres', 'warning');
        return false;
      }
      hashedPassword = await hashPassword(updates.newPassword.trim());
    }

    const nextRole = updates.role ?? targetUser.role;
    const nextUp = nextRole === 'admin' ? (updates.up || 'ALL') : (updates.up ?? targetUser.up ?? 'LUPITA');
    const nextName = updates.name ? updates.name.trim() : targetUser.name;
    const nextAllowedUps = updates.allowedUps ?? (nextUp === 'ALL' ? ['ALL'] : (targetUser.allowedUps || [nextUp]));

    const updatedUser: Usuario = {
      ...targetUser,
      name: nextName,
      role: nextRole,
      up: nextUp,
      allowedUps: nextAllowedUps,
      password: hashedPassword
    };

    setUsuarios(prev => prev.map(u => (u.username.toLowerCase() === username.toLowerCase() ? updatedUser : u)));

    // Keep active session in sync if admin updated themselves
    if (currentUser.username.toLowerCase() === username.toLowerCase()) {
      setCurrentUser(updatedUser);
      localStorage.setItem('inv_current_user', JSON.stringify(updatedUser));
    }

    if (db) {
      try {
        await setDoc(doc(db, 'usuarios', targetUser.username), updatedUser, { merge: true });
        setLastSyncTime(new Date());
      } catch (err: any) {
        handleFirestoreError(err, OperationType.UPDATE, `usuarios/${targetUser.username}`);
      }
    }

    showToast(`Permisos del usuario "${targetUser.username}" actualizados`, 'success');
    return true;
  };

  // Delete User
  const deleteUser = async (username: string): Promise<boolean> => {
    if (!currentUser || currentUser.role !== 'admin') {
      showToast('No tienes permisos de administrador', 'error');
      return false;
    }

    if (username === currentUser.username) {
      showToast('No puedes eliminar tu propio usuario actual', 'error');
      return false;
    }

    const adminsCount = usuarios.filter(u => u.role === 'admin').length;
    const target = usuarios.find(u => u.username === username);
    if (target?.role === 'admin' && adminsCount <= 1) {
      showToast('No puedes eliminar al único administrador del sistema', 'error');
      return false;
    }

    setUsuarios(prev => prev.filter(u => u.username !== username));

    if (db) {
      try {
        await deleteDoc(doc(db, 'usuarios', username));
        setLastSyncTime(new Date());
      } catch (err: any) {
        handleFirestoreError(err, OperationType.DELETE, `usuarios/${username}`);
      }
    }

    showToast(`Usuario ${username} eliminado`, 'success');
    return true;
  };

  // Add a new UP (Subacopio / Location) - Admin Only
  const addUp = async (newUpName: string): Promise<boolean> => {
    if (!currentUser || currentUser.role !== 'admin') {
      showToast('Solo los usuarios con rol de Administrador pueden agregar nuevas UPs', 'error');
      return false;
    }

    const clean = newUpName.trim().toUpperCase();
    if (!clean || clean.length < 2) {
      showToast('El nombre de la UP debe tener al menos 2 caracteres', 'warning');
      return false;
    }

    if (clean === 'ALL' || clean === 'TODAS' || clean === 'TODO') {
      showToast('"ALL" es una palabra reservada del sistema', 'warning');
      return false;
    }

    if (ups.some(u => u.toUpperCase() === clean)) {
      showToast(`La UP "${clean}" ya existe en el sistema`, 'warning');
      return false;
    }

    const updated = [...ups, clean];
    setUps(updated);
    localStorage.setItem('invUps_Pro', JSON.stringify(updated));

    if (db) {
      try {
        await setDoc(doc(db, 'configuracion', 'locations'), { ups: updated }, { merge: true });
        setLastSyncTime(new Date());
      } catch (err: any) {
        handleFirestoreError(err, OperationType.UPDATE, 'configuracion/locations');
      }
    }

    showToast(`Unidad de Producción "${clean}" agregada exitosamente`, 'success');
    return true;
  };

  // Delete an unused UP - Admin Only
  const deleteUp = async (upNameToDelete: string): Promise<boolean> => {
    if (!currentUser || currentUser.role !== 'admin') {
      showToast('Solo los administradores pueden eliminar UPs', 'error');
      return false;
    }

    const clean = upNameToDelete.trim().toUpperCase();

    // Check if in use
    const hasMovements = transacciones.some(t => t.up.toUpperCase() === clean);
    if (hasMovements) {
      showToast(`No se puede eliminar "${clean}": tiene movimientos registrados en el historial.`, 'error');
      return false;
    }

    const hasUsers = usuarios.some(u => u.up.toUpperCase() === clean);
    if (hasUsers) {
      showToast(`No se puede eliminar "${clean}": hay usuarios asignados a esta sede.`, 'error');
      return false;
    }

    const updated = ups.filter(u => u.toUpperCase() !== clean);
    setUps(updated);
    localStorage.setItem('invUps_Pro', JSON.stringify(updated));

    if (db) {
      try {
        await setDoc(doc(db, 'configuracion', 'locations'), { ups: updated }, { merge: true });
        setLastSyncTime(new Date());
      } catch (err: any) {
        handleFirestoreError(err, OperationType.UPDATE, 'configuracion/locations');
      }
    }

    showToast(`Unidad de Producción "${clean}" eliminada`, 'success');
    return true;
  };

  // Update App Settings
  const updateSettings = async (newSettings: AppSettings): Promise<void> => {
    setAppSettings(newSettings);
    if (db) {
      try {
        await setDoc(doc(db, 'configuracion', 'general'), newSettings, { merge: true });
        setLastSyncTime(new Date());
      } catch (err: any) {
        handleFirestoreError(err, OperationType.UPDATE, 'configuracion/general');
      }
    }
    showToast('Configuración del sistema guardada', 'success');
  };

  // Add a new Responsable de Almacén - Accessible to supervisors and admins
  const addResponsable = async (data: Omit<ResponsableAlmacen, 'id' | 'fechaCreacion'>): Promise<boolean> => {
    if (!currentUser) {
      showToast('Debes iniciar sesión para registrar responsables de almacén', 'error');
      return false;
    }

    const cleanNombre = data.nombre.trim();
    if (!cleanNombre) {
      showToast('El nombre del responsable de almacén es obligatorio', 'warning');
      return false;
    }

    const cleanUp = data.up.trim().toUpperCase().replace(/^UP\s+/, '');
    if (!isGlobalAccess && !isUpAuthorized(cleanUp)) {
      showToast(`No tienes permisos para registrar responsables en la UP ${cleanUp}`, 'error');
      return false;
    }

    const newResp: ResponsableAlmacen = {
      ...data,
      id: 'resp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      nombre: cleanNombre,
      cargo: data.cargo.trim() || 'Encargado de Almacén',
      up: cleanUp,
      fechaCreacion: new Date().toISOString()
    };

    const updated = [...responsables, newResp];
    setResponsables(updated);
    localStorage.setItem('invResponsables_Pro', JSON.stringify(updated));

    if (db) {
      try {
        await Promise.all([
          setDoc(doc(db, 'configuracion', 'responsables'), { responsables: updated }, { merge: true }),
          setDoc(doc(db, 'responsables', newResp.id), newResp, { merge: true })
        ]);
        setLastSyncTime(new Date());
      } catch (err: any) {
        handleFirestoreError(err, OperationType.UPDATE, 'configuracion/responsables');
      }
    }

    showToast(`Responsable ${cleanNombre} asignado a UP ${newResp.up}`, 'success');
    return true;
  };

  // Update Responsable de Almacén
  const updateResponsable = async (id: string, updates: Partial<ResponsableAlmacen>): Promise<boolean> => {
    if (!currentUser) {
      showToast('Debes iniciar sesión para editar responsables', 'error');
      return false;
    }

    const target = responsables.find(r => r.id === id);
    if (!target) return false;

    if (!isGlobalAccess && !isUpAuthorized(target.up)) {
      showToast(`No tienes permisos para editar responsables en la UP ${target.up}`, 'error');
      return false;
    }

    const updated = responsables.map(r => r.id === id ? { ...r, ...updates } : r);
    setResponsables(updated);
    localStorage.setItem('invResponsables_Pro', JSON.stringify(updated));

    if (db) {
      try {
        const mergedObj = { ...target, ...updates };
        await Promise.all([
          setDoc(doc(db, 'configuracion', 'responsables'), { responsables: updated }, { merge: true }),
          setDoc(doc(db, 'responsables', id), mergedObj, { merge: true })
        ]);
        setLastSyncTime(new Date());
      } catch (err: any) {
        handleFirestoreError(err, OperationType.UPDATE, 'configuracion/responsables');
      }
    }

    showToast('Responsable de almacén actualizado', 'success');
    return true;
  };

  // Delete Responsable de Almacén
  const deleteResponsable = async (id: string): Promise<boolean> => {
    if (!currentUser) {
      showToast('Debes iniciar sesión para eliminar responsables', 'error');
      return false;
    }

    const target = responsables.find(r => r.id === id);
    if (!target) return false;

    if (!isGlobalAccess && !isUpAuthorized(target.up)) {
      showToast(`No tienes permisos para eliminar responsables en la UP ${target.up}`, 'error');
      return false;
    }

    // Check if responsible has issued documents
    const inUse = solicitudes.some(
      s => s.responsableAlmacen.toLowerCase().trim() === target.nombre.toLowerCase().trim()
    );
    if (inUse) {
      showToast(
        `No se puede eliminar a "${target.nombre}" porque figura como responsable en vales o solicitudes. Puedes marcarlo como "Inactivo".`,
        'warning'
      );
      return false;
    }

    const updated = responsables.filter(r => r.id !== id);
    setResponsables(updated);
    localStorage.setItem('invResponsables_Pro', JSON.stringify(updated));

    if (db) {
      try {
        await Promise.all([
          setDoc(doc(db, 'configuracion', 'responsables'), { responsables: updated }, { merge: true }),
          deleteDoc(doc(db, 'responsables', id)).catch(() => {})
        ]);
        setLastSyncTime(new Date());
      } catch (err: any) {
        handleFirestoreError(err, OperationType.UPDATE, 'configuracion/responsables');
      }
    }

    showToast(`Responsable ${target.nombre} eliminado`, 'success');
    return true;
  };

  // Add Solicitud de Insumos (agrega al inventario cuando se ingresa / aprueba)
  const addSolicitud = async (
    data: Omit<SolicitudInsumo, 'id' | 'folio' | 'fechaCreacion'>,
    afectarInventario: boolean = true,
    tipoMovimiento: 'salida' | 'entrada' = 'entrada'
  ): Promise<SolicitudInsumo | null> => {
    if (!currentUser) return null;

    const upClean = (data.up || primaryUp).trim().toUpperCase().replace(/^UP\s+/, '');
    if (!isGlobalAccess && !isUpAuthorized(upClean)) {
      showToast(`No tienes permisos para emitir solicitudes en la UP ${upClean}`, 'error');
      return null;
    }

    if (!data.items || data.items.length === 0) {
      showToast('Debes agregar al menos un insumo a la solicitud', 'warning');
      return null;
    }

    // Generate Folio (e.g. SOL-LUP-2026-0001)
    const cleanUp = upClean.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase() || 'ALM';
    const year = new Date().getFullYear();
    const countForType = solicitudes.length + 1;
    const folioNumber = String(countForType).padStart(4, '0');
    const folio = `SOL-${cleanUp}-${year}-${folioNumber}`;

    const newId = 'doc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);

    // Rule: Apply to inventory if status is 'aprobada' or 'entregada', or if afectarInventario is true
    const isApprovedOrIngresada = data.estado === 'aprobada' || data.estado === 'entregada';
    const shouldApplyStock = isApprovedOrIngresada && (afectarInventario !== false);

    // 1. Ensure all requested items exist in master catalog IF applying to inventory
    if (shouldApplyStock) {
      const newCatalogItems: Item[] = [];
      const currentItems = [...items];

      for (const line of data.items) {
        const cleanItemId = line.itemId.trim().toUpperCase();
        const exists = currentItems.some(i => i.id.trim().toUpperCase() === cleanItemId) ||
                       newCatalogItems.some(i => i.id.trim().toUpperCase() === cleanItemId);
        if (!exists) {
          const newItem: Item = {
            id: cleanItemId,
            desc: (line.desc || cleanItemId).trim().toUpperCase(),
            unidad: line.unidad || 'PZ',
            area: line.area ? line.area.trim().toUpperCase() : 'GENERAL',
            reorden: 0
          };
          newCatalogItems.push(newItem);
        }
      }

      if (newCatalogItems.length > 0) {
        const updatedItems = [...items, ...newCatalogItems];
        setItems(updatedItems);
        localStorage.setItem('invItems_Pro', JSON.stringify(updatedItems));
        if (db) {
          newCatalogItems.forEach(async it => {
            try {
              await setDoc(doc(db, 'items', it.id), it);
            } catch (err) {
              console.warn("Firestore item notice:", err);
            }
          });
        }
      }

      // 2. Automatically register 'entrada' movements to increase UP stock in batch
      const newTransList: Transaccion[] = data.items.map((item, idx) => {
        const idDoc = Date.now().toString(36) + '-' + idx + '-' + Math.random().toString(36).substring(2, 6);
        return {
          idDoc,
          tipo: tipoMovimiento,
          itemId: item.itemId.trim().toUpperCase(),
          qty: Math.max(1, Number(item.cantidad) || 1),
          up: upClean,
          fecha: data.fecha || new Date().toISOString().split('T')[0],
          notas: `Ingreso Solicitud ${folio}: Solicitado por ${data.solicitante}${data.areaAplicacion ? ` (${data.areaAplicacion})` : ''}`,
          usuario: currentUser.username,
          timestamp: Date.now() + idx
        };
      });

      const updatedTrans = [...newTransList, ...transacciones];
      setTransacciones(updatedTrans);
      localStorage.setItem('invTrans_Pro', JSON.stringify(updatedTrans));

      if (db) {
        newTransList.forEach(async tr => {
          try {
            await setDoc(doc(db, 'transacciones', tr.idDoc), tr);
          } catch (err) {
            console.warn("Firestore transaccion notice:", err);
          }
        });
      }
    }

    const newSolicitud: SolicitudInsumo = {
      ...data,
      tipo: 'solicitud',
      up: upClean,
      id: newId,
      folio,
      usuarioCreador: currentUser.username,
      fechaCreacion: Date.now(),
      aplicadoInventario: shouldApplyStock,
      estado: data.estado || 'aprobada'
    };

    const updated = [newSolicitud, ...solicitudes];
    setSolicitudes(updated);
    localStorage.setItem('invSolicitudes_Pro', JSON.stringify(updated));

    if (db) {
      try {
        await setDoc(doc(db, 'solicitudes', newId), newSolicitud, { merge: true });
        setLastSyncTime(new Date());
      } catch (err: any) {
        console.warn("Firestore solicitud error:", err);
      }
    }

    if (shouldApplyStock) {
      showToast(`Solicitud ${folio} generada e ingresada: Se agregaron ${data.items.length} insumos al inventario de UP ${upClean}.`, 'success');
    } else {
      showToast(`Solicitud ${folio} registrada en estatus PENDIENTE.`, 'info');
    }

    return newSolicitud;
  };

  // Update Solicitud Estado (con aplicación estricta o reversión de inventario según el estatus)
  const updateSolicitudEstado = async (
    id: string,
    nuevoEstado: EstadoSolicitud,
    _afectarInventario?: boolean,
    tipoMovimiento: 'salida' | 'entrada' = 'entrada'
  ): Promise<boolean> => {
    const target = solicitudes.find(s => s.id === id);
    if (!target) return false;

    const isTargetApproved = nuevoEstado === 'entregada' || nuevoEstado === 'aprobada';
    const targetFolio = target.folio || '';
    const hasTransactions = transacciones.some(t =>
      Boolean(targetFolio && (t.notas || '').includes(targetFolio))
    );
    const willApplyStock = isTargetApproved && (!target.aplicadoInventario || !hasTransactions);
    const willRevertStock = target.aplicadoInventario && !isTargetApproved;

    const updatedSolicitud: SolicitudInsumo = {
      ...target,
      estado: nuevoEstado,
      fechaModificacion: Date.now(),
      aplicadoInventario: isTargetApproved ? true : false
    };

    const updated = solicitudes.map(s => s.id === id ? updatedSolicitud : s);
    setSolicitudes(updated);
    localStorage.setItem('invSolicitudes_Pro', JSON.stringify(updated));

    if (db) {
      try {
        await setDoc(doc(db, 'solicitudes', id), updatedSolicitud, { merge: true });
        setLastSyncTime(new Date());
      } catch (err: any) {
        console.warn("Firestore solicitud update notice:", err);
      }
    }

    const targetUpClean = (target.up || primaryUp).trim().toUpperCase().replace(/^UP\s+/, '');

    if (willApplyStock) {
      // 1. Ensure all requested items exist in catalog
      const newCatalogItems: Item[] = [];
      const currentItems = [...items];

      for (const line of target.items) {
        const cleanItemId = line.itemId.trim().toUpperCase();
        const exists = currentItems.some(i => i.id.trim().toUpperCase() === cleanItemId) ||
                       newCatalogItems.some(i => i.id.trim().toUpperCase() === cleanItemId);
        if (!exists) {
          const newItem: Item = {
            id: cleanItemId,
            desc: (line.desc || cleanItemId).trim().toUpperCase(),
            unidad: line.unidad || 'PZ',
            area: line.area ? line.area.trim().toUpperCase() : 'GENERAL',
            reorden: 0
          };
          newCatalogItems.push(newItem);
        }
      }

      if (newCatalogItems.length > 0) {
        const updatedItems = [...items, ...newCatalogItems];
        setItems(updatedItems);
        localStorage.setItem('invItems_Pro', JSON.stringify(updatedItems));
        if (db) {
          newCatalogItems.forEach(async it => {
            try {
              await setDoc(doc(db, 'items', it.id), it);
            } catch (err) {
              console.warn("Firestore item notice:", err);
            }
          });
        }
      }

      // 2. Add 'entrada' transactions in batch
      const newTransList: Transaccion[] = target.items.map((item, idx) => {
        const idDoc = Date.now().toString(36) + '-' + idx + '-' + Math.random().toString(36).substring(2, 6);
        return {
          idDoc,
          tipo: tipoMovimiento,
          itemId: item.itemId.trim().toUpperCase(),
          qty: Math.max(1, Number(item.cantidad) || 1),
          up: targetUpClean,
          fecha: new Date().toISOString().split('T')[0],
          notas: `Ingreso Solicitud Aprobada ${target.folio}: ${target.solicitante}`,
          usuario: currentUser?.username || 'sistema',
          timestamp: Date.now() + idx
        };
      });

      const updatedTrans = [...newTransList, ...transacciones];
      setTransacciones(updatedTrans);
      localStorage.setItem('invTrans_Pro', JSON.stringify(updatedTrans));

      if (db) {
        newTransList.forEach(async tr => {
          try {
            await setDoc(doc(db, 'transacciones', tr.idDoc), tr);
          } catch (err) {
            console.warn("Firestore transaccion notice:", err);
          }
        });
      }

      showToast(`Solicitud ${target.folio} APROBADA: Se sumaron ${target.items.length} insumos al inventario de UP ${targetUpClean}.`, 'success');
    } else if (willRevertStock) {
      // Revert previous entrada if cancelled or changed to pending
      const revertTransList: Transaccion[] = target.items.map((item, idx) => {
        const idDoc = Date.now().toString(36) + '-rev-' + idx + '-' + Math.random().toString(36).substring(2, 6);
        return {
          idDoc,
          tipo: 'salida',
          itemId: item.itemId.trim().toUpperCase(),
          qty: Number(item.cantidad) || 0,
          up: targetUpClean,
          fecha: new Date().toISOString().split('T')[0],
          notas: `Reversión Solicitud ${target.folio} por cambio a ${nuevoEstado.toUpperCase()}`,
          usuario: currentUser?.username || 'sistema',
          timestamp: Date.now() + idx
        };
      });

      const updatedTrans = [...revertTransList, ...transacciones];
      setTransacciones(updatedTrans);
      localStorage.setItem('invTrans_Pro', JSON.stringify(updatedTrans));

      if (db) {
        revertTransList.forEach(async tr => {
          try {
            await setDoc(doc(db, 'transacciones', tr.idDoc), tr);
          } catch (err) {
            console.warn("Firestore revert notice:", err);
          }
        });
      }

      showToast(`Solicitud ${target.folio} en estatus "${nuevoEstado.toUpperCase()}": Se revirtió el ingreso en UP ${targetUpClean}.`, 'warning');
    } else {
      showToast(`Estado de solicitud ${target.folio} actualizado a "${nuevoEstado.toUpperCase()}"`, 'info');
    }

    return true;
  };

  // Delete Solicitud
  const deleteSolicitud = async (id: string): Promise<boolean> => {
    if (!currentUser || currentUser.role !== 'admin') {
      showToast('Solo los administradores pueden eliminar comprobantes', 'error');
      return false;
    }

    const updated = solicitudes.filter(s => s.id !== id);
    setSolicitudes(updated);
    localStorage.setItem('invSolicitudes_Pro', JSON.stringify(updated));

    if (db) {
      try {
        await deleteDoc(doc(db, 'solicitudes', id));
        setLastSyncTime(new Date());
      } catch (err: any) {
        handleFirestoreError(err, OperationType.DELETE, `solicitudes/${id}`);
      }
    }

    showToast('Comprobante eliminado', 'success');
    return true;
  };

  return (
    <InventoryContext.Provider
      value={{
        currentUser,
        userAllowedUps,
        isGlobalAccess,
        primaryUp,
        isUpAuthorized,
        items,
        transacciones,
        usuarios,
        appSettings,
        activeTab,
        setActiveTab,
        inventario,
        stats,
        cloudConnected,
        syncStatusText,
        isSyncing,
        lastSyncTime,
        toasts,
        showToast,
        dismissToast,
        login,
        logout,
        addItem,
        updateItem,
        deleteItem,
        deleteMultipleItems,
        bulkImportMasterData,
        addTransaction,
        deleteTransaction,
        deleteMultipleTransactions,
        addUser,
        updateUser,
        deleteUser,
        ups,
        addUp,
        deleteUp,
        responsables,
        addResponsable,
        updateResponsable,
        deleteResponsable,
        solicitudes,
        addSolicitud,
        updateSolicitudEstado,
        deleteSolicitud,
        updateSettings,
        forceCloudSync
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};
