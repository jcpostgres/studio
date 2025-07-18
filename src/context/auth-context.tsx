
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { doc, getDoc, DocumentData } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

interface UserProfile extends DocumentData {
  name?: string;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  userId: string | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAuthReady: boolean;
  configError: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Mocked user data for development without login
  const [user] = useState<User | null>({ uid: "dev_user" } as User);
  const [userId] = useState<string | null>("dev_user_id");
  const [userProfile] = useState<UserProfile | null>({ name: "Desarrollador", email: "dev@example.com" });
  const [loading] = useState(false);
  const [configError] = useState(false);
  const [isAuthReady] = useState(true);

  // The original Firebase logic is commented out below to bypass login.
  // To re-enable login, uncomment the useEffect block and remove the mocked state above.
  /*
  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState(false);

  useEffect(() => {
    // If Firebase config is invalid, auth and db will be null.
    if (!auth || !db) {
        console.error("Firebase Auth or Firestore is not initialized. Check your Firebase config in .env file.");
        setConfigError(true);
        setLoading(false);
        return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      if (currentUser) {
        setUser(currentUser);
        setUserId(currentUser.uid);
        
        const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
        const userDocRef = doc(db, `artifacts/${appId}/users/${currentUser.uid}/profile/userProfile`);
        
        try {
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            setUserProfile(userDocSnap.data());
          } else {
            setUserProfile(null);
          }
        } catch (error) {
          console.error("Error loading user profile:", error);
          setUserProfile(null);
        }
        setLoading(false);
      } else {
        try {
          await signInAnonymously(auth);
          // The listener will catch the new anonymous user and re-run this logic
        } catch (error) {
          console.error("Anonymous sign-in failed:", error);
          // If sign-in fails, it might be due to network or config issues.
          // We set loading to false to stop the loading state.
          setConfigError(true); // Treat this as a config error for the UI
          setLoading(false); 
        }
      }
    });

    return () => unsubscribe();
  }, []);
  */

  const value = { user, userId, userProfile, loading, isAuthReady, configError };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
