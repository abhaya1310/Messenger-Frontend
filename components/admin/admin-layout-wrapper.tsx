"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SidebarProvider, useSidebar } from "@/components/sidebar-provider";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { clearAuth, getAuthToken } from "@/lib/auth";

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

type AdminWhatsappHealthResponse = {
    success: true;
    data: {
        status: "ok" | "degraded" | string;
        reason?: string;
    };
};

export function AdminLayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [whatsappHealth, setWhatsappHealth] = useState<AdminWhatsappHealthResponse["data"] | null>(null);

    if (pathname === "/admin/login") {
        return <div className="min-h-screen w-full">{children}</div>;
    }

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const token = getAuthToken();
                if (!token) return;

                const res = await fetch("/api/admin/whatsapp/health", {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                const data = (await res.json().catch(() => ({}))) as any;

                if (!res.ok) {
                    if (res.status === 401) {
                        clearAuth();
                        router.replace(`/login?reason=session_expired&next=${encodeURIComponent(pathname || "/admin")}`);
                        return;
                    }

                    if (!cancelled) {
                        setWhatsappHealth(null);
                    }
                    return;
                }

                const parsed = data as AdminWhatsappHealthResponse;
                if (!cancelled) {
                    setWhatsappHealth(parsed?.data || null);
                }
            } catch {
                if (!cancelled) {
                    setWhatsappHealth(null);
                }
            }
        };

        load();
        const id = window.setInterval(load, 45_000);
        return () => {
            cancelled = true;
            window.clearInterval(id);
        };
    }, [pathname, router]);

    return (
        <SidebarProvider>
            <div className="flex min-h-screen">
                <AdminSidebar />
                <AdminMainContent>
                    {whatsappHealth?.status === "degraded" && (
                        <div className="w-full bg-amber-100 text-amber-900 border-b border-amber-200 px-4 py-2 text-sm" role="status">
                            WhatsApp system token missing — sending will fail for all orgs
                        </div>
                    )}
                    {children}
                </AdminMainContent>
            </div>
        </SidebarProvider>
    );
}
