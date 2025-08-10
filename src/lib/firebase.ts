
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check for missing configuration values
const missingConfig = Object.entries(firebaseConfig)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

let app;
let auth;
let db;
let messaging = null;

// Initialize Firebase only if all config values are present
if (missingConfig.length > 0) {
  const missingKeys = missingConfig.join(", ");
  const errorMessage = `Firebase configuration is missing the following keys: ${missingKeys}. Please create a .env file (you can copy .env.example) and add all the required environment variables from your Firebase project settings.`;
  console.error(errorMessage);
  
  // Set to null to prevent the app from trying to use a partially configured Firebase instance
  app = null;
  auth = null;
  db = null;
} else {
  try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    if (typeof window !== 'undefined') {
        messaging = getMessaging(app);
    }
  } catch (error) {
    console.error("Firebase initialization error:", error);
    app = null;
    auth = null;
    db = null;
  }
}

export { app, auth, db, messaging };
