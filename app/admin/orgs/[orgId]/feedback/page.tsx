"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminOrgFeedbackPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/admin/feedback-definitions");
    }, [router]);

    return null;
}
