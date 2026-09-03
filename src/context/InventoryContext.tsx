import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Item,
  Transaccion,
  Usuario,
  AppSettings,
  InventarioItem,
  INITIAL_UPS,
  ToastMessage,
  ActiveTab
} from '../types';
import { db, testFirestoreConnection } from '../lib/firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs
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
  { username: 'admin', password: 'admin123', name: 'Administrador Principal', role: 'admin' as const, up: 'ALL' },
  { username: 'operador1', password: '123456', name: 'Operador de Almacén', role: 'operador' as const, up: 'LUPITA' }
];

interface InventoryContextType {
  currentUser: Usuario | null;
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
  toasts: ToastMessage[];
  showToast: (text: string, type?: ToastMessage['type']) => void;
  dismissToast: (id: string) => void;
  login: (user: string, pass: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  addItem: (item: Omit<Item, 'unidad'>) => Promise<boolean>;
  updateItem: (id: string, updates: Partial<Omit<Item, 'id'>>) => Promise<boolean>;
  deleteItem: (id: string) => Promise<boolean>;
  deleteMultipleItems: (ids: string[]) => Promise<{ deleted: number; skipped: number; skippedIds: string[] }>;
  addTransaction: (trans: Omit<Transaccion, 'idDoc' | 'timestamp' | 'usuario'>) => Promise<boolean>;
  deleteTransaction: (idDoc: string) => Promise<boolean>;
  deleteMultipleTransactions: (idDocs: string[]) => Promise<boolean>;
  addUser: (user: Omit<Usuario, 'password'> & { password: string }) => Promise<boolean>;
  deleteUser: (username: string) => Promise<boolean>;
  updateSettings: (newSettings: AppSettings) => Promise<void>;
  forceCloudSync: () => Promise<void>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<Usuario | null>(() => {
    const saved = localStorage.getItem('inv_current_user');
    return saved ? JSON.parse(saved) : null;
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
    return saved ? JSON.parse(saved) : [];
  });

  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('invSettings_Pro');
    return saved ? JSON.parse(saved) : { appName: 'InvControl Pro', logoUrl: '' };
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [cloudConnected, setCloudConnected] = useState<boolean>(false);
  const [syncStatusText, setSyncStatusText] = useState<string>('Conectando a Firebase...');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

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
            up: u.up
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

    testFirestoreConnection().then(status => {
      setCloudConnected(status.connected);
      setSyncStatusText(status.connected ? 'Conectado a Firebase: inventarios-subacopios' : status.message);
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
              remoteItems.push({ ...data, id: docSnap.id });
            });
            setItems(remoteItems);
          } else {
            // If remote is empty, seed with initial items
            DEFAULT_ITEMS.forEach(async it => {
              try {
                if (db) await setDoc(doc(db, 'items', it.id), it);
              } catch (e) {
                // Ignore seed errors if rules block it
              }
            });
          }
          setCloudConnected(true);
          setSyncStatusText('Conectado a Firebase: inventarios-subacopios');
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
            remoteTrans.push({ ...data, idDoc: docSnap.id });
          });
          if (remoteTrans.length > 0 || snapshot.metadata.fromCache === false) {
            setTransacciones(remoteTrans);
          }
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
              remoteUsers.push({ ...data, username: docSnap.id });
            });
            setUsuarios(remoteUsers);
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
          }
        },
        error => {
          console.warn("Firestore config listener notice:", error.message);
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
      // Sync settings
      await setDoc(doc(db, 'configuracion', 'general'), appSettings, { merge: true });
      setCloudConnected(true);
      setSyncStatusText('Conectado a Firebase: inventarios-subacopios');
      showToast('Sincronización completa con Firebase Cloud exitosa', 'success');
    } catch (e: any) {
      showToast('Error de sincronización con la nube: ' + (e?.message || 'Permisos'), 'error');
    } finally {
      setIsSyncing(false);
    }
  }, [items, transacciones, appSettings, showToast]);

  // Inventory calculation
  const inventario = useMemo<InventarioItem[]>(() => {
    return items.map(item => {
      const upStock: Record<string, number> = {};
      INITIAL_UPS.forEach(up => {
        upStock[up] = 0;
      });

      let totalEntradas = 0;
      let totalSalidas = 0;

      transacciones.forEach(t => {
        if (t.itemId === item.id) {
          if (t.tipo === 'entrada') {
            totalEntradas += t.qty;
            if (upStock[t.up] !== undefined) upStock[t.up] += t.qty;
            else upStock[t.up] = (upStock[t.up] || 0) + t.qty;
          } else if (t.tipo === 'salida') {
            totalSalidas += t.qty;
            if (upStock[t.up] !== undefined) upStock[t.up] -= t.qty;
            else upStock[t.up] = (upStock[t.up] || 0) - t.qty;
          }
        }
      });

      return {
        ...item,
        stockTotal: totalEntradas - totalSalidas,
        upStock
      };
    });
  }, [items, transacciones]);

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
    const candidate = usuarios.find(u => u.username.toLowerCase() === username);

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
      setUsuarios([...usuarios]);
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
      up: candidate.up
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
      area: itemData.area.trim().toUpperCase() || 'GENERAL',
      reorden: Math.max(0, itemData.reorden || 0)
    };

    setItems(prev => [...prev, newItem]);

    if (db) {
      try {
        await setDoc(doc(db, 'items', newItem.id), newItem);
      } catch (err: any) {
        console.warn("Firestore item write notice:", err.message);
      }
    }

    showToast(`Producto ${newItem.id} agregado al catálogo`, 'success');
    return true;
  };

  // Update Item
  const updateItem = async (id: string, updates: Partial<Omit<Item, 'id'>>): Promise<boolean> => {
    setItems(prev =>
      prev.map(i => {
        if (i.id === id) {
          return {
            ...i,
            desc: updates.desc !== undefined ? updates.desc.trim().toUpperCase() : i.desc,
            area: updates.area !== undefined ? updates.area.trim().toUpperCase() : i.area,
            reorden: updates.reorden !== undefined ? Math.max(0, updates.reorden) : i.reorden
          };
        }
        return i;
      })
    );

    if (db) {
      try {
        const updated = items.find(i => i.id === id);
        if (updated) {
          await setDoc(doc(db, 'items', id), {
            ...updated,
            ...updates
          }, { merge: true });
        }
      } catch (err: any) {
        console.warn("Firestore update item notice:", err.message);
      }
    }

    showToast(`Producto ${id} actualizado correctamente`, 'success');
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
      } catch (err: any) {
        console.warn("Firestore delete item notice:", err.message);
      }
    }

    showToast(`Producto ${id} eliminado del catálogo`, 'success');
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
        } catch (err: any) {
          console.warn("Firestore delete multiple items notice:", err.message);
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

  // Add Transaction (Entrada or Salida)
  const addTransaction = async (trans: Omit<Transaccion, 'idDoc' | 'timestamp' | 'usuario'>): Promise<boolean> => {
    if (!currentUser) {
      showToast('Debes iniciar sesión para registrar movimientos', 'error');
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
      idDoc,
      usuario: currentUser.username,
      timestamp: Date.now()
    };

    setTransacciones(prev => [newTrans, ...prev]);

    if (db) {
      try {
        await setDoc(doc(db, 'transacciones', idDoc), newTrans);
      } catch (err: any) {
        console.warn("Firestore transaction write notice:", err.message);
      }
    }

    showToast(`${trans.tipo === 'entrada' ? 'Recepción' : 'Despacho'} registrado con éxito`, 'success');
    return true;
  };

  // Delete Transaction
  const deleteTransaction = async (idDoc: string): Promise<boolean> => {
    setTransacciones(prev => prev.filter(t => t.idDoc !== idDoc));

    if (db) {
      try {
        await deleteDoc(doc(db, 'transacciones', idDoc));
      } catch (err: any) {
        console.warn("Firestore delete transaction notice:", err.message);
      }
    }

    showToast('Movimiento eliminado y stock recalculado', 'success');
    return true;
  };

  // Delete Multiple Transactions
  const deleteMultipleTransactions = async (idDocs: string[]): Promise<boolean> => {
    if (idDocs.length === 0) return true;

    const toDeleteSet = new Set(idDocs);
    setTransacciones(prev => prev.filter(t => !toDeleteSet.has(t.idDoc)));

    if (db) {
      try {
        await Promise.all(idDocs.map(idDoc => deleteDoc(doc(db, 'transacciones', idDoc))));
      } catch (err: any) {
        console.warn("Firestore delete multiple transactions notice:", err.message);
      }
    }

    showToast(`${idDocs.length} movimiento(s) eliminado(s) y existencias recalculadas`, 'success');
    return true;
  };

  // Add User
  const addUser = async (userData: Omit<Usuario, 'password'> & { password: string }): Promise<boolean> => {
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
      up: userData.up
    };

    setUsuarios(prev => [...prev, newUser]);

    if (db) {
      try {
        await setDoc(doc(db, 'usuarios', newUser.username), newUser);
      } catch (err: any) {
        console.warn("Firestore add user notice:", err.message);
      }
    }

    showToast(`Usuario ${newUser.username} creado exitosamente`, 'success');
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
      } catch (err: any) {
        console.warn("Firestore delete user notice:", err.message);
      }
    }

    showToast(`Usuario ${username} eliminado`, 'success');
    return true;
  };

  // Update App Settings
  const updateSettings = async (newSettings: AppSettings): Promise<void> => {
    setAppSettings(newSettings);
    if (db) {
      try {
        await setDoc(doc(db, 'configuracion', 'general'), newSettings, { merge: true });
      } catch (err: any) {
        console.warn("Firestore update settings notice:", err.message);
      }
    }
    showToast('Configuración del sistema guardada', 'success');
  };

  return (
    <InventoryContext.Provider
      value={{
        currentUser,
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
        toasts,
        showToast,
        dismissToast,
        login,
        logout,
        addItem,
        updateItem,
        deleteItem,
        deleteMultipleItems,
        addTransaction,
        deleteTransaction,
        deleteMultipleTransactions,
        addUser,
        deleteUser,
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
