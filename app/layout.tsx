import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "../components/ProtectedRoute";
import Sidebar from "@/components/Sidebar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Garuda Hacks Admin",
  description: "Admin panel for Garuda Hacks",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">
        <AuthProvider>
          <ProtectedRoute>
            <div className="min-h-screen bg-background">
              <Sidebar />
              <main
                className="min-h-screen transition-all duration-300 ease-in-out"
                style={{ marginLeft: "var(--sidebar-width, 16rem)" }}
              >
                <div className="p-6">{children}</div>
              </main>
            </div>
          </ProtectedRoute>
        </AuthProvider>
      </body>
    </html>
  );
}
