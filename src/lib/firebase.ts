import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, Firestore, doc, getDocFromServer } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyCvmqaXaIr_OmNi6wtiQIHfSOjkR3ppvnA",
  authDomain: "inventarios-subacopios.firebaseapp.com",
  projectId: "inventarios-subacopios",
  storageBucket: "inventarios-subacopios.firebasestorage.app",
  messagingSenderId: "858502206477",
  appId: "1:858502206477:web:8588baeaafe184d74df144"
};

let dbInstance: Firestore | null = null;
let firebaseAppInstance = null;

try {
  firebaseAppInstance = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  dbInstance = getFirestore(firebaseAppInstance);
} catch (error) {
  console.warn("Firebase initialization notice:", error);
}

export const app = firebaseAppInstance;
export const db = dbInstance;

export async function testFirestoreConnection(): Promise<{ connected: boolean; message: string }> {
  if (!db) {
    return { connected: false, message: 'Firestore no está inicializado' };
  }
  try {
    await getDocFromServer(doc(db, '_connection_test', 'status'));
    return { connected: true, message: 'Conectado exitosamente a Firebase Cloud' };
  } catch (error: any) {
    const msg = error?.message || String(error);
    if (msg.includes('offline') || msg.includes('unavailable')) {
      return { connected: false, message: 'Modo sin conexión o cliente offline' };
    }
    if (msg.includes('permission-denied') || msg.includes('Missing or insufficient permissions')) {
      return { connected: false, message: 'Reglas de Firestore requieren permisos en la consola' };
    }
    return { connected: true, message: 'Servicio Firebase activo' };
  }
}
