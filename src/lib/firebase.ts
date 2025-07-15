
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Validate that all required environment variables are present
const missingConfig = Object.entries(firebaseConfig).find(([key, value]) => !value);

if (missingConfig) {
  const errorMessage = `Missing Firebase config: NEXT_PUBLIC_FIREBASE_${missingConfig[0].toUpperCase()}. Please add it to your .env file.`;
  console.error(errorMessage);
  // Throw an error to stop initialization if config is missing
  // This prevents the app from running with an invalid configuration
  throw new Error(errorMessage);
}


const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
