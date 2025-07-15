
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if auth is even available. If firebase.ts threw an error, auth will be null.
    if (!auth) {
        console.error("Firebase Auth is not initialized. Check your Firebase config.");
        setLoading(false);
        return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setUserId(currentUser.uid);
        
        const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "default-app-id";
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
        } catch (error) {
          console.error("Anonymous sign-in failed:", error);
          setLoading(false); 
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const value = { user, userId, userProfile, loading, isAuthReady: !loading && !!user };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
