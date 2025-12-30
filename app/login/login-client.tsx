"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth-provider";
import csatLogo from "@/csat logo.jpeg";
import { Loader2 } from "lucide-react";

export default function LoginClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { isAuthenticated, isLoading, login, loginLegacy, user } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            router.replace(user?.role === 'admin' ? "/admin" : "/dashboard");
        }
    }, [isAuthenticated, isLoading, router, user?.role]);

    useEffect(() => {
        const registered = searchParams.get("registered");
        if (registered === "1") {
            setInfo("Account created successfully. Please log in.");
        }
    }, [searchParams]);

    useEffect(() => {
        const reason = searchParams.get("reason");
        if (reason === "session_expired") {
            setError(null);
            setInfo("Your session has expired. Please log in again.");
        }
    }, [searchParams]);

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);
        setInfo(null);
        setIsSubmitting(true);

        try {
            const ok = await login({ identifier: email, password });

            if (!ok) {
                const legacyOk = loginLegacy({ id: email, password });

                if (!legacyOk) {
                    setError("Invalid email or password.");
                    setIsSubmitting(false);
                    return;
                }
            }
        } catch (err) {
            console.error("Login error:", err);

            const legacyOk = loginLegacy({ id: email, password });
            if (legacyOk) {
                router.replace("/dashboard");
                return;
            }

            setError("Login failed. Please check your credentials.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSignUpClick = () => {
        router.push("/onboarding");
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-100 to-sky-200">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-100 to-sky-200 px-4">
            <Card className="w-full max-w-md shadow-xl">
                <CardHeader className="items-center space-y-4">
                    <div className="w-32 h-16 relative">
                        <Image
                            src={csatLogo}
                            alt="CSAT Logo"
                            fill
                            sizes="128px"
                            className="object-contain"
                            priority
                        />
                    </div>
                    <CardTitle className="text-center text-2xl font-semibold">ConnectNow Login</CardTitle>
                    <p className="text-sm text-muted-foreground text-center">
                        Sign in to access templates, campaigns, and more.
                    </p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email / ID</Label>
                            <Input
                                id="email"
                                type="text"
                                autoComplete="username"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                placeholder="Enter your email or ID"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                autoComplete="current-password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                placeholder="Enter your password"
                                required
                            />
                        </div>

                        {error && (
                            <p className="text-sm text-destructive" role="alert">
                                {error}
                            </p>
                        )}

                        {info && !error && (
                            <p className="text-sm text-muted-foreground" role="status">
                                {info}
                            </p>
                        )}

                        <div className="space-y-3 pt-2">
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <span className="inline-flex items-center justify-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Logging in...
                                    </span>
                                ) : (
                                    "Log in"
                                )}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={handleSignUpClick}
                            >
                                Sign up
                            </Button>
                            <p className="text-xs text-center text-muted-foreground pt-2">
                                <Link href="/privacy-policy" className="underline">
                                    Privacy Policy
                                </Link>
                            </p>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
