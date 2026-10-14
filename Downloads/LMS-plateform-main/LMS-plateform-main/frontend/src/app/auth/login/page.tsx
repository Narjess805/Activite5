"use client";

import React, { useState } from "react";
import { ArrowRight, Brain, Lock, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { login } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import BrandLogo from "@/app/components/BrandLogo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await login(email, password);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      const userRole = data.user.role;
      window.location.href =
        userRole === "instructor" || userRole === "admin"
          ? "/dashboard/instructor"
          : "/dashboard";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell flex min-h-[82vh] items-center">
      <div className="grid w-full gap-6 lg:grid-cols-[1.02fr_0.98fr]">
        <Card className="overflow-hidden bg-[linear-gradient(145deg,hsl(var(--foreground)),hsl(214_52%_24%))] text-primary-foreground">
          <CardContent className="flex h-full flex-col justify-between p-8 sm:p-10">
            <div>
              <BrandLogo light className="mb-6" />
              <Badge variant="secondary" className="border-white/15 bg-white/10 text-white/80">
                <Sparkles className="h-3.5 w-3.5" />
                Second-brand pass
              </Badge>
              <h1 className="mt-6 max-w-lg font-display text-5xl leading-[0.9] text-white sm:text-6xl">
                Sign back into a platform that looks far more polished.
              </h1>
              <p className="mt-5 max-w-md text-sm leading-7 text-white/75">
                Re-enter the catalog, lesson flow, and dashboards through a cleaner, stronger product shell designed to feel more premium across every role.
              </p>
            </div>

            <div className="grid gap-3">
              {[
                { icon: Brain, text: "AI tutor and recommendations stay embedded in the product flow." },
                { icon: ShieldCheck, text: "More confident forms, cleaner hierarchy, and more trustworthy surfaces." },
              ].map((item) => (
                <div key={item.text} className="rounded-[1.5rem] border border-white/12 bg-white/8 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-white/10 p-2">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <p className="text-sm leading-6 text-white/75">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80">
          <CardHeader className="pb-6">
            <Badge variant="secondary" className="w-fit">
              Lunexa access
            </Badge>
            <CardTitle className="mt-5 text-4xl sm:text-5xl">Sign in</CardTitle>
            <CardDescription>Enter your credentials to continue into the refreshed workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-[1.3rem] border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="pl-11"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pl-11"
                    required
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Enter workspace
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center border-t border-border/70 pt-6">
            <p className="text-sm text-muted-foreground">
              Need an account?{" "}
              <a href="/auth/register" className="font-semibold text-primary hover:text-foreground">
                Create one
              </a>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
