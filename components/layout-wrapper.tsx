"use client";

import { Sidebar } from "@/components/sidebar";
import { SidebarProvider, useSidebar } from "@/components/sidebar-provider";
import { useAuth } from "@/components/auth-provider";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

function MainContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return (
    <main
      className={`flex-1 transition-all duration-300 ${isMobile ? "ml-0" : isCollapsed ? "md:ml-16" : "md:ml-64"
        }`}
    >
      <div className="min-h-screen w-full">{children}</div>
    </main>
  );
}

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Login & public pages have their own layout, no sidebar or auth gate.
  if (pathname === "/login" || pathname === "/privacy-policy") {
    return <div className="min-h-screen w-full">{children}</div>;
  }

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-600">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <MainContent>{children}</MainContent>
      </div>
    </SidebarProvider>
  );
}

