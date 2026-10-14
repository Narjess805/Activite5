/**
 * Root Layout — Next.js App Router
 *
 * Wraps every page in the application with the shared Chrome:
 *   - <Navbar />  — Top navigation bar with auth-aware links.
 *   - <main>      — Page content outlet.
 *   - <footer>    — Site-wide footer.
 *
 * Global CSS (Tailwind base styles) is imported here so it applies
 * to all routes without each page needing to import it separately.
 *
 * Metadata exported from this file sets the default <title> and
 * <meta name="description"> for every page unless overridden.
 */

import type { Metadata } from "next";
import { Bricolage_Grotesque, Outfit } from "next/font/google";
import React from "react";
import BrandLogo from "./components/BrandLogo";
import Navbar from "./components/Navbar";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lunexa Academy | Private-Label Learning Suite",
  description: "A fully reimagined learning platform with a new identity, logo, and premium UX across courses, lessons, AI tutoring, and dashboards.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.variable} ${bricolage.variable} min-h-screen bg-background font-sans text-foreground`}>
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute left-[-10%] top-[-5rem] h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,hsl(var(--secondary-foreground)/0.12),transparent_64%)] blur-3xl" />
          <div className="absolute right-[-6%] top-[8%] h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.18),transparent_60%)] blur-3xl" />
          <div className="absolute bottom-[-8rem] left-[14%] h-[22rem] w-[22rem] rounded-full bg-[radial-gradient(circle,hsl(var(--accent)/0.16),transparent_70%)] blur-3xl" />
        </div>

        <div className="relative flex min-h-screen flex-col">
          <Navbar />
          <main className="flex-1 pb-16 pt-6 sm:pt-8">{children}</main>
          <footer className="mt-10 border-t border-white/70 bg-[linear-gradient(180deg,hsl(var(--card)/0.52),hsl(var(--background)/0.9))] backdrop-blur-2xl">
            <div className="app-shell py-14">
              <div className="grid grid-cols-1 gap-10 border-b border-border/70 pb-10 md:grid-cols-[1.2fr_repeat(3,1fr)]">
                <div>
                  <div className="mb-5">
                    <BrandLogo />
                  </div>
                  <h2 className="max-w-md font-display text-3xl leading-[0.92] text-foreground sm:text-4xl">
                    A private-label learning suite with a fuller brand identity and a more cinematic product feel.
                  </h2>
                  <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
                    Lunexa Academy packages courses, AI guidance, dashboards, and management tools inside a warmer, more premium interface designed to feel sale-ready.
                  </p>
                </div>
                <div>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-foreground/70">Platform</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li><a href="/" className="transition-colors hover:text-primary">Home</a></li>
                    <li><a href="/courses" className="transition-colors hover:text-primary">Browse Courses</a></li>
                    <li><a href="/dashboard" className="transition-colors hover:text-primary">Dashboard</a></li>
                  </ul>
                </div>
                <div>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-foreground/70">Access</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li><a href="/auth/register" className="transition-colors hover:text-primary">Get Started</a></li>
                    <li><a href="/auth/login" className="transition-colors hover:text-primary">Sign In</a></li>
                    <li><a href="/dashboard/profile" className="transition-colors hover:text-primary">Profile</a></li>
                  </ul>
                </div>
                <div>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-foreground/70">Why It Feels New</h3>
                  <p className="text-sm leading-6 text-muted-foreground">
                    New name, new logo, new palette, new typography, and more distinct learner, creator, and admin experiences.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-3 pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <p>&copy; {new Date().getFullYear()} Lunexa Academy. Crafted for private-label course products and modern training teams.</p>
                <p>Course delivery, AI tutoring, creator tools, and analytics in one platform.</p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
