"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  User,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdminDomain = () => {
    if (typeof window === "undefined") return false;
    return (
      window.location.hostname === "admin.garudahacks.com" ||
      window.location.hostname === "localhost" // TODO: Add flag for dev to toggle this
    );
  };

  const isAllowedDomain = (email: string): boolean => {
    if (!isAdminDomain()) return true;
    return email.endsWith("@garudahacks.com");
  };

  const signIn = async (email: string, password: string) => {
    if (!isAllowedDomain(email)) {
      throw new Error(
        "Only @garudahacks.com email addresses are allowed for admin access"
      );
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const resetPassword = async (email: string) => {
    if (!isAllowedDomain(email)) {
      throw new Error(
        "Only @garudahacks.com email addresses are allowed for admin access"
      );
    }

    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);

      // Double-check the domain after sign-in
      if (!isAllowedDomain(result.user.email || "")) {
        await firebaseSignOut(auth);
        throw new Error("Only @garudahacks.com email addresses are allowed");
      }

      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential) {
      }
    } catch (error: any) {
      if (error.code === "auth/popup-closed-by-user") {
        throw new Error("Sign-in was cancelled");
      } else if (error.code === "auth/popup-blocked") {
        throw new Error("Popup was blocked. Please allow popups and try again");
      } else {
        throw new Error(error.message);
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && !isAllowedDomain(user.email || "")) {
        firebaseSignOut(auth);
        setUser(null);
        console.error("User signed out: invalid domain");
      } else {
        setUser(user);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signOut,
        resetPassword,
        signInWithGoogle,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
