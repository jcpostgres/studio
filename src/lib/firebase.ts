
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getMessaging, Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

// Check for missing configuration values
const missingConfig = Object.entries(firebaseConfig)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let messaging: Messaging | null = null;

// Try to initialize Firebase. If env vars are missing we still initialize with empty strings
// so TypeScript sees non-null values; runtime will fail early if config is invalid.
if (missingConfig.length > 0) {
  const missingKeys = missingConfig.join(", ");
  console.warn(`Firebase configuration is missing the following keys: ${missingKeys}. Create a .env file (copy .env.example) and add Firebase config.`);
}

try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
  if (typeof window !== 'undefined') {
    messaging = getMessaging(app);
  }
} catch (error) {
  // If initialization fails, rethrow to make the failure obvious at runtime
  console.error('Firebase initialization error:', error);
  throw error;
}

function assertDb(): Firestore {
  if (!db) {
    throw new Error('Firestore has not been initialized. Please provide Firebase config in .env');
  }
  return db;
}

function assertAuth(): Auth {
  if (!auth) {
    throw new Error('Auth has not been initialized. Please provide Firebase config in .env');
  }
  return auth;
}

function assertMessaging(): Messaging {
  if (!messaging) {
    throw new Error('Messaging is not available in this environment or not initialized.');
  }
  return messaging;
}

export { app, auth, db, messaging, assertDb, assertAuth, assertMessaging };
