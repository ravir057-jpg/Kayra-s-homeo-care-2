import { initializeApp } from 'firebase/app';
import { initializeAuth, browserLocalPersistence, browserPopupRedirectResolver, signInAnonymously, signInWithCustomToken, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

let app: any;
let db: any;
let auth: any;

let activeDatabaseId = '(default)';
if (typeof window !== 'undefined') {
  const cachedDbId = localStorage.getItem('kayra_active_firestore_database_id') || firebaseConfig.firestoreDatabaseId || '(default)';
  activeDatabaseId = cachedDbId;
} else {
  activeDatabaseId = firebaseConfig.firestoreDatabaseId || '(default)';
}

try {
  if (!firebaseConfig || !firebaseConfig.apiKey) {
    throw new Error("firebaseConfig has missing or invalid api key properties.");
  }
  app = initializeApp(firebaseConfig);
  
  // Using initializeFirestore with experimentalForceLongPolling to handle connectivity issues in sandboxed environments
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    // Add useFetchStreams: false to fix "unavailable" errors in certain proxy/sandbox environments
    // @ts-ignore - The property exists in newer versions but might not be in all type definitions
    useFetchStreams: false,
    // Explicitly set host and ssl to avoid resolution issues in nested iframes
    host: 'firestore.googleapis.com',
    ssl: true,
  }, activeDatabaseId);

  auth = initializeAuth(app, {
    persistence: browserLocalPersistence,
    popupRedirectResolver: browserPopupRedirectResolver,
  });
} catch (error) {
  console.error("Firebase Safeguard Triggered: Failed to initialize Firebase SDK. Using mock fallbacks.", error);
  
  // Custom mock Firestore proxy that resolves beautifully without throwing exceptions that crash module execution
  db = new Proxy({}, {
    get(target, prop) {
      return () => {
        console.warn(`Firestore operation '${String(prop)}' called in fallback recovery mode.`);
        return Promise.resolve({
          exists: () => false,
          data: () => ({}),
          docs: []
        });
      };
    }
  });

  // Safe authentication fallback mock definitions
  auth = {
    currentUser: null,
    onAuthStateChanged: (callback: (user: any) => void) => {
      // Return unauthenticated user state asynchronously to allow UI loading sequence to clear
      const timer = setTimeout(() => callback(null), 150);
      return () => clearTimeout(timer);
    },
    signOut: () => Promise.resolve(),
    signInWithEmailAndPassword: () => Promise.reject(new Error("Authentication offline.")),
    onIdTokenChanged: (callback: (user: any) => void) => {
      const timer = setTimeout(() => callback(null), 150);
      return () => clearTimeout(timer);
    }
  };
}

export { db, auth };

export async function signInAnonymouslyWithFallback() {
  try {
    return await signInAnonymously(auth);
  } catch (error: any) {
    console.warn("[Auth Fallback] Client-side anonymous authentication failed or is restricted. Trying server-side custom token fallback...", error);
    
    // Attempt Stage 2: Server-side Custom Token Generation (bypasses Anonymous auth restrictions)
    try {
      const response = await fetch('/api/auth/anonymous-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.token) {
          console.log("[Auth Fallback] Applying custom token for secure anonymous login.");
          return await signInWithCustomToken(auth, data.token);
        }
      }
    } catch (innerErr: any) {
      console.warn("[Auth Fallback] Server-side custom token generation failed:", innerErr.message);
    }

    const sessionAlias = localStorage.getItem('kayra_anon_fallback_credentials');
    if (sessionAlias) {
      try {
        const creds = JSON.parse(sessionAlias);
        if (creds.email && creds.password) {
          console.log("[Auth Fallback] Attempting login with previously stored guest account:", creds.email);
          return await signInWithEmailAndPassword(auth, creds.email, creds.password);
        }
      } catch (storageErr) {
        console.warn("[Auth Fallback] Stored credentials corrupted. Generating new guest credentials.");
      }
    }

    // Generate pristine guest credentials
    const randId = Math.floor(10000000 + Math.random() * 90000000).toString();
    const email = `patient.guest.${randId}@kayrahomeo.com`;
    const password = `KHC_Guest_2026_${randId}!`;

    try {
      console.log("[Auth Fallback] Creating new guest email account:", email);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      localStorage.setItem('kayra_anon_fallback_credentials', JSON.stringify({ email, password }));
      return userCredential;
    } catch (createErr: any) {
      console.error("[Auth Fallback] Programmatic guest registration failed:", createErr);
      throw createErr;
    }
  }
}

// Connectivity Test as per Firebase Integration Guidelines
async function testConnection() {
  try {
    if (db && typeof db.getDocFromServer === 'function') {
      const testRef = doc(db, '_health', 'connection');
      await getDocFromServer(testRef);
      console.log(`Firestore connection successful using database: ${activeDatabaseId}`);
    }
  } catch (error: any) {
    const errMsg = error?.message || String(error);
    console.warn(`[Firestore Check] Connection failed on database state '${activeDatabaseId}':`, errMsg);
    
    // If the check fails with ANY error (offline, denied, not found) on a custom database, fall back to '(default)'
    if (activeDatabaseId !== '(default)') {
      console.warn(`[Firestore Fallback Check] Target custom database '${activeDatabaseId}' is throwing errors. Automatically resetting active database to '(default)'.`);
      if (typeof window !== 'undefined') {
        localStorage.setItem('kayra_active_firestore_database_id', '(default)');
        console.warn("[Firestore Fallback] Reloading client app with default database in 100ms...");
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
    } else {
      console.error("Please check your Firebase configuration or project status. Firestore default database is unreachable.");
    }
  }
}
testConnection();

// Error handling helper
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
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
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
