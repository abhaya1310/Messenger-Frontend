"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminLoginClient() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const reason = useMemo(() => searchParams.get('reason'), [searchParams]);

    const nextPath = useMemo(() => {
        const next = searchParams.get("next");
        return next && next.startsWith("/") ? next : "/admin/orgs/new";
    }, [searchParams]);

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const res = await fetch("/api/admin/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                setError((data as any)?.error || "Login failed");
                return;
            }

            router.replace(nextPath);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Login failed");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-100 to-sky-200 px-4">
            <Card className="w-full max-w-md shadow-xl">
                <CardHeader className="space-y-2">
                    <CardTitle className="text-center text-2xl font-semibold">Admin Login</CardTitle>
                    <p className="text-sm text-muted-foreground text-center">
                        Sign in to onboard a new client.
                    </p>
                </CardHeader>
                <CardContent>
                    {reason === 'session_expired' && (
                        <p className="text-sm text-muted-foreground" role="status">
                            Session expired, please login again.
                        </p>
                    )}
                    <form onSubmit={onSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                autoComplete="username"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="current-password"
                                required
                            />
                        </div>

                        {error && (
                            <p className="text-sm text-destructive" role="alert">
                                {error}
                            </p>
                        )}

                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? "Logging in..." : "Log in"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
