"use client";

import { type ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearAuth, fetchMe, getAuthToken } from "@/lib/auth";

export function AdminRouteGuard({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [status, setStatus] = useState<"checking" | "allowed" | "blocked">("checking");

    useEffect(() => {
        const run = async () => {
            if (pathname === "/admin/login") {
                setStatus("allowed");
                return;
            }

            const token = getAuthToken();
            if (!token) {
                router.replace(`/login?next=${encodeURIComponent(pathname || "/admin")}`);
                setStatus("blocked");
                return;
            }

            const me = await fetchMe(token).catch(() => null);
            if (!me) {
                clearAuth();
                router.replace(`/login?reason=session_expired&next=${encodeURIComponent(pathname || "/admin")}`);
                setStatus("blocked");
                return;
            }

            if (me.role !== "admin") {
                router.replace("/dashboard");
                setStatus("blocked");
                return;
            }

            setStatus("allowed");
        };

        run();
    }, [pathname, router]);

    if (status !== "allowed") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <p className="text-sm text-muted-foreground">Checking admin access...</p>
            </div>
        );
    }

    return <>{children}</>;
}
