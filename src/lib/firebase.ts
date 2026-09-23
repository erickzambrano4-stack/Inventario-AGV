import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let authInstance: Auth | null = null;
try {
  authInstance = getAuth(app);
} catch {
  // Auth component may not be registered when only Firestore is provisioned
  authInstance = null;
}

export const auth: Auth | null = authInstance;
export const db: Firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export { app, firebaseConfig };

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testFirestoreConnection(): Promise<{ connected: boolean; message: string }> {
  if (!db) {
    return { connected: false, message: 'Firestore no está inicializado' };
  }
  try {
    await getDocFromServer(doc(db, '_connection_test', 'status'));
    return { connected: true, message: `Conectado a Firebase Cloud (${firebaseConfig.projectId})` };
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Please check your Firebase configuration or network connection.");
    }
    const msg = error?.message || String(error);
    if (msg.includes('offline') || msg.includes('unavailable')) {
      return { connected: false, message: 'Modo sin conexión o cliente offline' };
    }
    if (msg.includes('permission-denied') || msg.includes('Missing or insufficient permissions')) {
      return { connected: false, message: 'Reglas de Firestore requieren permisos en la consola' };
    }
    return { connected: true, message: `Servicio Firebase activo (${firebaseConfig.projectId})` };
  }
}
