"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import DashboardTabs from "@/components/dashboard/dashboard-tabs";
// Import komponen baru OperatorDashboard
import OperatorDashboard from "@/components/dashboard/operator-dashboard";
import { AccountProvider } from "@/contexts/account-context";
import LoadingSpinner from "@/components/shared/loading-spinner";

export default function DashboardClientPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  // State untuk menyimpan role user
  const [userRole, setUserRole] = useState<"admin" | "operator" | null>(null);

  useEffect(() => {
    const currentUser = localStorage.getItem("currentUser");

    if (!currentUser) {
      router.push("/");
      return;
    }

    try {
      const user = JSON.parse(currentUser);

      if (user && user.username && user.role) {
        setIsAuthenticated(true);
        setUserRole(user.role); // Simpan role user
      } else {
        localStorage.removeItem("currentUser");
        router.push("/");
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
      localStorage.removeItem("currentUser");
      router.push("/");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <LoadingSpinner />;
  }

  return (
    <AccountProvider>
      <div className="min-h-screen bg-zenith-bg relative overflow-hidden">
        {/* Floating background elements */}
        <div className="floating-elements"></div>
        <div className="absolute top-10 right-10 w-20 h-20 bg-zenith-gradient-light rounded-full opacity-10 animate-float"></div>
        <div
          className="absolute bottom-10 left-10 w-16 h-16 bg-zenith-gradient-purple rounded-full opacity-10 animate-float"
          style={{ animationDelay: "3s" }}
        ></div>

        {/* Header tetap ada untuk kedua role (untuk Logout & Refresh) */}
        <DashboardHeader />

        <main className="container mx-auto py-8 px-4 relative z-10">
          {/* Judul Dashboard */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold gradient-text mb-2">
              TrustDigital.ID
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              {userRole === "admin"
                ? "Administrator Panel"
                : "Operator Workspace"}
            </p>
          </div>

          {/* LOGIC SWITCHING TAMPILAN BERDASARKAN ROLE */}
          {userRole === "admin" ? <DashboardTabs /> : <OperatorDashboard />}
        </main>
      </div>
    </AccountProvider>
  );
}
