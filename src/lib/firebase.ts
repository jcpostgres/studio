
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const missingConfig = Object.entries(firebaseConfig).find(([key, value]) => !value);

let app;
let auth;
let db;

try {
  if (missingConfig) {
    const varName = `NEXT_PUBLIC_FIREBASE_${missingConfig[0].replace(/([A-Z])/g, '_$1').toUpperCase()}`;
    throw new Error(`Missing Firebase config. Please create a .env file (or copy .env.example) and set the ${varName} variable.`);
  }
  
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);

} catch (error) {
    console.error("Firebase initialization error:", (error as Error).message);
    app = null;
    auth = null;
    db = null;
}


export { app, auth, db };
