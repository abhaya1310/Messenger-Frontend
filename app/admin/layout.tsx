import type { ReactNode } from "react";
import { AdminRouteGuard } from "@/components/admin/admin-route-guard";
import { AdminLayoutWrapper } from "@/components/admin/admin-layout-wrapper";

export default function AdminLayout({ children }: { children: ReactNode }) {
    return (
        <AdminRouteGuard>
            <AdminLayoutWrapper>{children}</AdminLayoutWrapper>
        </AdminRouteGuard>
    );
}
