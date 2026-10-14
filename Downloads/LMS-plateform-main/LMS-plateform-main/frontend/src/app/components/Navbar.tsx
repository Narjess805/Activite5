/**
 * Navbar — Site-wide Navigation Bar
 *
 * Client component that reads the authenticated user from localStorage
 * on mount and adapts its content accordingly:
 *   - Unauthenticated : Shows a "Sign In" button linking to /auth/login.
 *   - Authenticated   : Shows the user's name and a Logout button.
 *
 * On logout, both the JWT and the user object are removed from
 * localStorage and the user is redirected to the home page.
 *
 * Navigation links:
 *   /          — Home (brand logo)
 *   /courses   — Course catalogue
 *   /dashboard — User dashboard
 */

"use client";

import { useState, useEffect } from "react";
import { ArrowRight, BookOpen, Compass, LayoutDashboard, LogOut, Menu, Settings, Shield, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import BrandLogo from "./BrandLogo";

export default function Navbar() {
  const [user, setUser] = useState<{ name: string; role?: string } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) setUser(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  }

  const navLinks = [
    { href: "/courses", label: "Courses", icon: BookOpen },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ...((user?.role === "instructor" || user?.role === "admin")
      ? [{ href: "/dashboard/instructor", label: "Course Management", icon: Settings }]
      : []),
    ...(user?.role === "admin"
      ? [{ href: "/dashboard/admin", label: "Admin", icon: Shield }]
      : []),
  ];

  return (
    <header className="sticky top-0 z-50 w-full px-3 pt-3 sm:px-5">
      <div className="app-shell">
        <div className="flex min-h-[5rem] items-center justify-between gap-4 rounded-[1.9rem] border border-white/80 bg-white/70 px-4 py-3 shadow-[0_26px_80px_-48px_rgba(15,48,80,0.34)] backdrop-blur-2xl sm:px-6">
          <a href="/" className="group flex items-center gap-3 transition-all hover:opacity-95">
            <BrandLogo />
          </a>

          <nav className="hidden items-center gap-1 rounded-full border border-white/80 bg-background/65 p-1 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="group/link inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-white hover:text-foreground"
              >
                <link.icon className="h-4 w-4 text-muted-foreground transition-colors group-hover/link:text-primary" />
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <div className="stat-chip hidden lg:inline-flex">
              <Compass className="h-3.5 w-3.5 text-primary" />
              Private-label ready
            </div>
            {user ? (
              <div className="flex items-center gap-3">
                <a href="/dashboard/profile" className="group/avatar flex items-center gap-3 rounded-full border border-white/80 bg-white/80 px-2.5 py-1.5 shadow-[0_18px_36px_-28px_rgba(15,48,80,0.3)]">
                  <Avatar className="h-9 w-9 ring-2 ring-primary/10">
                    <AvatarFallback className="bg-[linear-gradient(135deg,hsl(var(--secondary)),hsl(var(--card)))] text-xs font-semibold text-primary">
                      {user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold leading-tight">{user.name}</span>
                    <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{user.role || "student"}</span>
                  </div>
                </a>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="rounded-full px-4">
                  <LogOut className="mr-1 h-4 w-4" />
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild className="rounded-full px-4">
                  <a href="/auth/login">Sign In</a>
                </Button>
                <Button size="sm" asChild className="rounded-full px-4">
                  <a href="/auth/register">
                    Start Free
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </a>
                </Button>
              </div>
            )}
          </div>
          <Button variant="ghost" size="icon" className="rounded-full md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {mobileOpen && (
          <div className="mt-3 rounded-[1.85rem] border border-white/80 bg-white/80 p-4 shadow-[0_26px_80px_-48px_rgba(15,48,80,0.34)] backdrop-blur-2xl md:hidden">
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 rounded-2xl bg-background/80 px-4 py-3 text-sm font-semibold text-foreground"
                >
                  <link.icon className="h-4 w-4 text-primary" />
                  {link.label}
                </a>
              ))}
              <Separator className="my-2" />
              {user ? (
                <>
                  <div className="flex items-center gap-3 rounded-2xl bg-background/80 px-4 py-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-[linear-gradient(135deg,hsl(var(--secondary)),hsl(var(--card)))] text-xs font-semibold text-primary">
                        {user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <span className="block text-sm font-semibold">{user.name}</span>
                      <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{user.role || "student"}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleLogout} className="justify-start rounded-full px-4">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                </>
              ) : (
                <div className="flex flex-col gap-2 pt-1">
                  <Button variant="outline" size="sm" asChild className="rounded-full">
                    <a href="/auth/login">Sign In</a>
                  </Button>
                  <Button size="sm" asChild className="rounded-full">
                    <a href="/auth/register">Start Free</a>
                  </Button>
                </div>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
