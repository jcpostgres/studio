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
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  userId: string | null;
  userName: string;
  userEmail: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        setUserId(user.uid);
        // Load user profile
        const appId = process.env.NEXT_PUBLIC_APP_ID || 'default-app-id';
        const userDocRef = doc(db, `artifacts/${appId}/users/${user.uid}/profile`, 'userProfile');
        try {
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                const profile = userDocSnap.data();
                setUserName(profile.name || '');
                setUserEmail(profile.email || '');
            }
        } catch (error) {
            console.error("Error loading user profile:", error);
        }
      } else {
        // No user, attempt anonymous sign-in
        signInAnonymously(auth).catch((error) => {
          console.error("Anonymous sign-in failed:", error);
        });
        setUser(null);
        setUserId(null);
        setUserName('');
        setUserEmail('');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = { user, loading, userId, userName, userEmail };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
