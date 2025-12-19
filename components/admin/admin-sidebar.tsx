"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    MessageSquare,
    Megaphone,
    Menu,
    X,
    ChevronLeft,
    ChevronRight,
    UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/sidebar-provider";
import { clearAuth } from "@/lib/auth";
import { clearSelectedOrgId } from "@/lib/selected-org";

interface NavItem {
    title: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
    {
        title: "Add Client",
        href: "/admin/orgs/new",
        icon: UserPlus,
    },
    {
        title: "Templates",
        href: "/admin/templates",
        icon: MessageSquare,
    },
    {
        title: "Campaigns",
        href: "/admin/campaigns",
        icon: Megaphone,
    },
];

export function AdminSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { isCollapsed, setIsCollapsed } = useSidebar();
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (!mobile) {
                setIsMobileOpen(false);
            }
        };

        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    const toggleMobile = () => {
        setIsMobileOpen(!isMobileOpen);
    };

    const closeMobile = () => {
        setIsMobileOpen(false);
    };

    const handleLogout = async () => {
        try {
            await fetch("/api/admin/auth/logout", { method: "POST" });
        } finally {
            clearSelectedOrgId();
            clearAuth();
            router.replace("/login");
        }
    };

    const normalizedPath = pathname || "";
    const isActiveHref = (href: string) => {
        if (href === "/admin/orgs/new") {
            return normalizedPath === "/admin/orgs/new" || normalizedPath.startsWith("/admin/orgs/");
        }
        return normalizedPath === href;
    };

    if (isMobile) {
        return (
            <>
                <button
                    onClick={toggleMobile}
                    className="fixed top-4 left-4 z-50 p-2 rounded-md bg-white border border-gray-200 shadow-lg hover:bg-gray-50 md:hidden"
                    aria-label="Toggle menu"
                >
                    {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>

                {isMobileOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-40 md:hidden"
                        onClick={closeMobile}
                        aria-hidden="true"
                    />
                )}

                <aside
                    className={cn(
                        "fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-50 transform transition-transform duration-300 ease-in-out md:hidden",
                        isMobileOpen ? "translate-x-0" : "-translate-x-full"
                    )}
                >
                    <div className="flex flex-col h-full">
                        <div className="flex items-center justify-between p-4 border-b border-gray-200">
                            <Link href="/admin" onClick={closeMobile} className="text-lg font-semibold text-gray-900">
                                Admin Console
                            </Link>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={closeMobile}
                                className="h-8 w-8"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <nav className="flex-1 overflow-y-auto p-4">
                            <ul className="space-y-1">
                                {navItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = isActiveHref(item.href);
                                    return (
                                        <li key={item.title}>
                                            <Link
                                                href={item.href}
                                                onClick={closeMobile}
                                                className={cn(
                                                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                                    isActive
                                                        ? "bg-[var(--connectnow-accent-soft)] text-[var(--connectnow-accent-strong)]"
                                                        : "text-gray-700 hover:bg-gray-100"
                                                )}
                                            >
                                                <Icon className="h-5 w-5 flex-shrink-0" />
                                                <span>{item.title}</span>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </nav>

                        <div className="border-t border-gray-200 p-4">
                            <Button
                                variant="outline"
                                className="w-full justify-center"
                                onClick={handleLogout}
                            >
                                Logout
                            </Button>
                        </div>
                    </div>
                </aside>
            </>
        );
    }

    return (
        <aside
            className={cn(
                "fixed left-0 top-0 h-full bg-white border-r border-gray-200 transition-all duration-300 z-30",
                isCollapsed ? "w-16" : "w-64"
            )}
        >
            <div className="flex flex-col h-full">
                <div
                    className={cn(
                        "flex items-center border-b border-gray-200",
                        isCollapsed ? "justify-center p-4" : "justify-between p-4"
                    )}
                >
                    {!isCollapsed && (
                        <Link href="/admin" className="text-lg font-semibold text-gray-900">
                            Admin Console
                        </Link>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleCollapse}
                        className="h-8 w-8"
                        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        {isCollapsed ? (
                            <ChevronRight className="h-4 w-4" />
                        ) : (
                            <ChevronLeft className="h-4 w-4" />
                        )}
                    </Button>
                </div>

                <nav className="flex-1 overflow-y-auto p-4">
                    <ul className="space-y-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = isActiveHref(item.href);
                            return (
                                <li key={item.title}>
                                    <Link
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                            isActive
                                                ? "bg-[var(--connectnow-accent-soft)] text-[var(--connectnow-accent-strong)]"
                                                : "text-gray-700 hover:bg-gray-100",
                                            isCollapsed && "justify-center"
                                        )}
                                        title={isCollapsed ? item.title : undefined}
                                    >
                                        <Icon className="h-5 w-5 flex-shrink-0" />
                                        {!isCollapsed && <span>{item.title}</span>}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                <div className="border-t border-gray-200 p-4">
                    <Button
                        variant="outline"
                        className="w-full justify-center"
                        onClick={handleLogout}
                    >
                        Logout
                    </Button>
                </div>
            </div>
        </aside>
    );
}
