"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completeRegistrationAccessCode, verifyRegistrationAccessCode } from "@/lib/auth";

type Step = "enter_code" | "set_credentials" | "success";

export default function OnboardingPage() {
    const router = useRouter();

    const [step, setStep] = useState<Step>("enter_code");
    const [accessCode, setAccessCode] = useState("");
    const [orgName, setOrgName] = useState<string | null>(null);
    const [expiresAt, setExpiresAt] = useState<string | null>(null);

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const expiresAtLabel = useMemo(() => {
        if (!expiresAt) return null;
        const date = new Date(expiresAt);
        if (Number.isNaN(date.getTime())) return expiresAt;
        return date.toLocaleString();
    }, [expiresAt]);

    useEffect(() => {
        if (step === "enter_code") {
            setInfo(null);
        }
    }, [step]);

    const handleVerify = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);
        setInfo(null);

        const trimmed = accessCode.trim();
        if (!trimmed) {
            setError("Please enter an access code.");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await verifyRegistrationAccessCode(trimmed);

            if (!res.ok) {
                if (res.error === "invalid_or_expired") {
                    setError("Invalid or expired access code.");
                    return;
                }
                if (res.error === "invalid_body") {
                    setError("Invalid request. Please try again.");
                    return;
                }
                setError("Unable to verify access code.");
                return;
            }

            setOrgName(res.orgName || null);
            setExpiresAt(res.expiresAt || null);
            setStep("set_credentials");
            setInfo("Access code verified. Please set your password.");
        } catch {
            setError("Failed to verify access code. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleComplete = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);
        setInfo(null);

        const trimmed = accessCode.trim();
        if (!trimmed) {
            setError("Missing access code. Please start again.");
            setStep("enter_code");
            return;
        }

        if (password.length < 10) {
            setError("Password must be at least 10 characters.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await completeRegistrationAccessCode({
                accessCode: trimmed,
                password,
                username: username.trim() ? username.trim() : undefined,
            });

            if (!res.success) {
                if (res.error === "invalid_or_expired") {
                    setError("Invalid or expired access code.");
                    setStep("enter_code");
                    return;
                }
                if (res.error === "username_taken") {
                    setError("That username is already taken.");
                    return;
                }
                if (res.error === "invalid_body") {
                    setError("Invalid request. Please check your details and try again.");
                    return;
                }
                setError("Registration failed. Please try again.");
                return;
            }

            setStep("success");
            router.replace("/login?registered=1");
        } catch {
            setError("Failed to complete registration. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-100 to-sky-200 px-4">
            <Card className="w-full max-w-md shadow-xl">
                <CardHeader className="items-center space-y-2">
                    <CardTitle className="text-center text-2xl font-semibold">Account Setup</CardTitle>
                    {orgName && (
                        <p className="text-sm text-muted-foreground text-center">Org: {orgName}</p>
                    )}
                    {expiresAtLabel && (
                        <p className="text-xs text-muted-foreground text-center">Code expires: {expiresAtLabel}</p>
                    )}
                </CardHeader>

                <CardContent>
                    {step === "enter_code" && (
                        <form onSubmit={handleVerify} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="accessCode">Access Code</Label>
                                <Input
                                    id="accessCode"
                                    type="text"
                                    value={accessCode}
                                    onChange={(e) => setAccessCode(e.target.value)}
                                    placeholder="Enter access code"
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

                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? "Verifying..." : "Verify Code"}
                            </Button>
                        </form>
                    )}

                    {step === "set_credentials" && (
                        <form onSubmit={handleComplete} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="username">Username (optional)</Label>
                                <Input
                                    id="username"
                                    type="text"
                                    autoComplete="username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Choose a username (optional)"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    autoComplete="new-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Create a password"
                                    required
                                />
                                <p className="text-xs text-muted-foreground">Minimum 10 characters.</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirm Password</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    autoComplete="new-password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Re-enter your password"
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
                                    {isSubmitting ? "Creating account..." : "Create Account"}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => {
                                        setStep("enter_code");
                                        setOrgName(null);
                                        setExpiresAt(null);
                                        setUsername("");
                                        setPassword("");
                                        setConfirmPassword("");
                                        setError(null);
                                        setInfo(null);
                                    }}
                                    disabled={isSubmitting}
                                >
                                    Start over
                                </Button>
                            </div>
                        </form>
                    )}

                    {step === "success" && (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground" role="status">
                                Account created successfully. Redirecting to login...
                            </p>
                            <Button type="button" className="w-full" onClick={() => router.replace("/login?registered=1")}
                                disabled={isSubmitting}
                            >
                                Continue to login
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
