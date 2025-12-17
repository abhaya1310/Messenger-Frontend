"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { SidebarProvider, useSidebar } from "@/components/sidebar-provider";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

function AdminMainContent({ children }: { children: React.ReactNode }) {
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

export function AdminLayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    if (pathname === "/admin/login") {
        return <div className="min-h-screen w-full">{children}</div>;
    }

    return (
        <SidebarProvider>
            <div className="flex min-h-screen">
                <AdminSidebar />
                <AdminMainContent>{children}</AdminMainContent>
            </div>
        </SidebarProvider>
    );
}
