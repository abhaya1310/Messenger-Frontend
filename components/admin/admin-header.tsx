"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { clearAuth } from "@/lib/auth";
import { clearSelectedOrgId } from "@/lib/selected-org";

export function AdminHeader() {
    const pathname = usePathname();
    const router = useRouter();

    const onLogout = async () => {
        try {
            await fetch("/api/admin/auth/logout", { method: "POST" });
            clearSelectedOrgId();
            clearAuth();
        } finally {
            router.replace("/login");
        }
    };

    const linkClass = (href: string) => {
        const isActive = pathname === href;
        return isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground";
    };

    return (
        <div className="w-full border-b bg-background">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
                <div className="flex items-center gap-4">
                    <Link href="/admin/orgs/new" className="font-semibold">
                        Admin Console
                    </Link>
                    <Link href="/admin/orgs/new" className={linkClass("/admin/orgs/new")}>
                        Add Client
                    </Link>
                    <Link href="/admin/templates" className={linkClass("/admin/templates")}>
                        Templates
                    </Link>
                    <Link href="/admin/campaigns" className={linkClass("/admin/campaigns")}>
                        Campaigns
                    </Link>
                </div>
                <Button variant="outline" onClick={onLogout}>
                    Logout
                </Button>
            </div>
        </div>
    );
}
