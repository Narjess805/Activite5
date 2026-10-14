"use client";

import React, { useState } from "react";
import { ArrowRight, Compass, GraduationCap, Lock, Mail, Sparkles, User, UserPlus } from "lucide-react";
import { register } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import BrandLogo from "@/app/components/BrandLogo";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await register(name, email, password, role);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      const userRole = data.user.role;
      window.location.href =
        userRole === "instructor" || userRole === "admin"
          ? "/dashboard/instructor"
          : "/dashboard";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell flex min-h-[82vh] items-center py-4">
      <div className="grid w-full gap-6 lg:grid-cols-[0.98fr_1.02fr]">
        <Card className="bg-white/80">
          <CardHeader className="pb-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-[1.4rem] bg-[linear-gradient(135deg,hsl(var(--foreground)),hsl(var(--primary)))] text-primary-foreground shadow-[0_22px_42px_-24px_hsl(var(--primary)/0.76)]">
              <UserPlus className="h-7 w-7" />
            </div>
            <CardTitle className="mt-6 text-4xl sm:text-5xl">Create your account</CardTitle>
            <CardDescription>Choose your role and step into the redesigned experience.</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-[1.3rem] border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jordan Rivers"
                    className="pl-11"
                    required
                  />
                </div>
              </div>

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
                    placeholder="Minimum 6 characters"
                    className="pl-11"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">I want to</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setRole("student")}
                    className={`rounded-[1.5rem] border p-4 text-left transition-all ${
                      role === "student"
                        ? "border-primary/20 bg-primary/10 shadow-[0_18px_42px_-30px_hsl(var(--primary)/0.35)]"
                        : "border-white/80 bg-white/75 hover:border-primary/15"
                    }`}
                  >
                    <GraduationCap className={`h-6 w-6 ${role === "student" ? "text-primary" : "text-muted-foreground"}`} />
                    <p className="mt-4 text-base font-semibold text-foreground">Learn</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Browse courses, track progress, and use the AI tutor inside the study flow.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("instructor")}
                    className={`rounded-[1.5rem] border p-4 text-left transition-all ${
                      role === "instructor"
                        ? "border-primary/20 bg-primary/10 shadow-[0_18px_42px_-30px_hsl(var(--primary)/0.35)]"
                        : "border-white/80 bg-white/75 hover:border-primary/15"
                    }`}
                  >
                    <Compass className={`h-6 w-6 ${role === "instructor" ? "text-primary" : "text-muted-foreground"}`} />
                    <p className="mt-4 text-base font-semibold text-foreground">Teach</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Build courses, manage lesson structure, and operate inside the creator workspace.
                    </p>
                  </button>
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Creating account...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Create account
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center border-t border-border/70 pt-6">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <a href="/auth/login" className="font-semibold text-primary hover:text-foreground">
                Sign in
              </a>
            </p>
          </CardFooter>
        </Card>

        <Card className="overflow-hidden bg-[linear-gradient(145deg,hsl(var(--secondary)),hsl(var(--card)))]">
          <CardContent className="flex h-full flex-col justify-between p-8 sm:p-10">
            <div>
              <BrandLogo className="mb-6" />
              <Badge variant="secondary">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                New Lunexa identity
              </Badge>
              <h1 className="mt-6 max-w-lg font-display text-5xl leading-[0.9] text-foreground sm:text-6xl">
                Start with an onboarding flow that feels noticeably newer.
              </h1>
              <p className="mt-5 max-w-md text-sm leading-7 text-muted-foreground">
                The updated interface now carries through the catalog, lessons, profile setup, instructor tools, and admin view with one coherent product story.
              </p>
            </div>

            <div className="grid gap-3">
              {[
                "Sharper typography and a cooler premium palette",
                "Cleaner dashboards for students, instructors, and admins",
                "Integrated AI recommendation and lesson quiz moments",
              ].map((item) => (
                <div key={item} className="rounded-[1.4rem] border border-white/80 bg-white/70 px-4 py-3 text-sm leading-6 text-muted-foreground">
                  {item}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
