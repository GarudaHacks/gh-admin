"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import LoginForm from "./LoginForm";
import LoadingSpinner from "./LoadingSpinner";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Ushers (non-admin staff) may only use the check-in scanner and its history.
const USHER_ALLOWED_PATHS = ["/check-in", "/check-in/history"];

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const usherBlocked =
    role === "usher" && !USHER_ALLOWED_PATHS.includes(pathname);

  useEffect(() => {
    if (!loading && usherBlocked) {
      router.replace("/check-in");
    }
  }, [loading, usherBlocked, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner text="Loading..." />
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  // Avoid flashing a forbidden page
  if (usherBlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner text="Redirecting…" />
      </div>
    );
  }

  return <>{children}</>;
}
