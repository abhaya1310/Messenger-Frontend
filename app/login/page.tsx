"use client";

import { FormEvent, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth-provider";
import csatLogo from "@/csat logo.jpeg";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, login, loginLegacy } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setIsSubmitting(true);

    try {
      // Try new API-based login first
      const ok = await login({ email, password });

      if (!ok) {
        // Fallback to legacy login for backwards compatibility
        // This supports the old ID/password format
        const legacyOk = loginLegacy({ id: email, password });

        if (!legacyOk) {
          setError("Invalid email or password.");
          setIsSubmitting(false);
          return;
        }
      }

      router.replace("/dashboard");
    } catch (err) {
      console.error('Login error:', err);

      // Try legacy login as fallback
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
    setInfo("Sign up is not available yet. Please contact your administrator for access.");
  };

  // Show loading while checking auth
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
          <CardTitle className="text-center text-2xl font-semibold">
            ConnectNow Login
          </CardTitle>
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
                {isSubmitting ? "Logging in..." : "Log in"}
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
