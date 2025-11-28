"use client";

import { FormEvent, useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth-provider";
import csatLogo from "@/csat logo.jpeg";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, login } = useAuth();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, router]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setIsSubmitting(true);

    const ok = login({ id, password });
    setIsSubmitting(false);

    if (!ok) {
      setError("Invalid ID or password.");
      if (typeof window !== "undefined") {
        window.alert("Incorrect ID or password. Please try again.");
      }
      return;
    }

    if (typeof window !== "undefined") {
      window.alert("Login successful!");
    }

    router.replace("/");
  };

  const handleSignUpClick = () => {
    setInfo("Sign up is not available yet. Please use the admin credentials to log in.");
  };

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
            WhatsApp Manager Login
          </CardTitle>
          <p className="text-sm text-muted-foreground text-center">
            Sign in with your admin credentials to access templates, campaigns, and more.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="id">ID</Label>
              <Input
                id="id"
                autoComplete="username"
                value={id}
                onChange={(event) => setId(event.target.value)}
                placeholder="Enter your ID"
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
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


