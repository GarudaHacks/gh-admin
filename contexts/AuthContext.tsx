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

export type Role = "admin" | "usher";

interface AuthContextType {
  user: User | null;
  role: Role | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  // resetPassword: (email: string) => Promise<void>;
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
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdminDomain = () => {
    if (typeof window === "undefined") return false;
    return (
      window.location.hostname === "admin.garudahacks.com" ||
      window.location.hostname === "staging-admin.garudahacks.com" ||
      window.location.hostname === "localhost" // TODO: Add flag for dev to toggle this
    );
  };

  const isAllowedDomain = (email: string): boolean => {
    if (!isAdminDomain()) return true;
    return email.endsWith("@garudahacks.com");
  };

  /**
   * Determines a signed-in user's role:
   *  - "admin": a @garudahacks.com account (full access)
   *  - "usher": any account carrying the `usher: true` custom claim
   *             (check-in page only)
   *  - null: not authorized
   */
  const resolveRole = async (u: User): Promise<Role | null> => {
    if (isAllowedDomain(u.email || "")) return "admin";
    const { claims } = await u.getIdTokenResult();
    if (claims.usher === true) return "usher";
    return null;
  };

  const signIn = async (email: string, password: string) => {
    // Email/password login is reserved for non-@garudahacks.com accounts
    // (ushers). @garudahacks.com staff are Google Workspace accounts and must
    // use "Sign in with Google".
    if (email.trim().toLowerCase().endsWith("@garudahacks.com")) {
      throw new Error(
        'Please use "Sign in with Google" for @garudahacks.com accounts.'
      );
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const resolved = await resolveRole(cred.user);
      if (!resolved) {
        await firebaseSignOut(auth);
        throw new Error("This account is not authorized for access.");
      }
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

  // const resetPassword = async (email: string) => {
  //   if (!isAllowedDomain(email)) {
  //     throw new Error(
  //       "Only @garudahacks.com email addresses are allowed for admin access"
  //     );
  //   }

  //   try {
  //     await sendPasswordResetEmail(auth, email, {
  //       url: `${window.location.origin}/auth/login`,
  //       handleCodeInApp: false,
  //     });
  //   } catch (error: any) {
  //     throw new Error(error.message);
  //   }
  // };

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);

      // Check role after sign-in (domain admin or usher claim)
      const resolved = await resolveRole(result.user);
      if (!resolved) {
        await firebaseSignOut(auth);
        throw new Error("This account is not authorized for access");
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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }

      const resolved = await resolveRole(user);
      if (!resolved) {
        await firebaseSignOut(auth);
        setUser(null);
        setRole(null);
        console.error("User signed out: not authorized");
      } else {
        setUser(user);
        setRole(resolved);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        signIn,
        signOut,
        // resetPassword,
        signInWithGoogle,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
