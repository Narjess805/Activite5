"use client";

import React, { useEffect, useState } from "react";
import { BookOpen, Clock, Mail, Save, Sparkles, User } from "lucide-react";
import {
  getProfile,
  getUserEnrollments,
  LearningPreferences,
  updateProfile,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  role: string;
  bio?: string;
  avatar_url?: string;
  learning_preferences?: LearningPreferences;
  createdAt: string;
}

function listToCsv(values?: string[]) {
  return (values || []).join(", ");
}

function csvToList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [enrollmentCount, setEnrollmentCount] = useState(0);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [interests, setInterests] = useState("");
  const [learningGoal, setLearningGoal] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      window.location.href = "/auth/login";
      return;
    }
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const loadedProfile = await getProfile();
      if (!loadedProfile) {
        window.location.href = "/auth/login";
        return;
      }

      setProfile(loadedProfile);
      setName(loadedProfile.name || "");
      setBio(loadedProfile.bio || "");
      setAvatarUrl(loadedProfile.avatar_url || "");
      setInterests(listToCsv(loadedProfile.learning_preferences?.interests));
      setLearningGoal(loadedProfile.learning_preferences?.learning_goal || "");

      try {
        const enrollments = await getUserEnrollments(loadedProfile._id);
        setEnrollmentCount(enrollments.length);
      } catch {
        // ignore count failures
      }
    } catch {
      window.location.href = "/auth/login";
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const learning_preferences: LearningPreferences = {
        interests: csvToList(interests),
        learning_goal: learningGoal.trim(),
        preferred_categories: [],
        preferred_formats: [],
        weekly_hours: 0,
        learning_style: "mixed",
      };

      const updated = await updateProfile({
        name: name || undefined,
        bio: bio || undefined,
        avatar_url: avatarUrl || undefined,
        learning_preferences,
      });

      setProfile(updated);

      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.name = updated.name;
        localStorage.setItem("user", JSON.stringify(parsed));
      }

      setMessage("Profile updated successfully.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="app-shell py-16 text-center text-muted-foreground">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-4">Loading profile...</p>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="app-shell space-y-8">
      <section className="hero-shell px-6 py-8 sm:px-8 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="eyebrow">Profile studio</p>
            <h1 className="mt-5 font-display text-5xl leading-[0.9] text-foreground sm:text-6xl">
              Shape your account and your AI learning context.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Personal details and recommendation preferences now live inside one cleaner editing workspace designed to feel more premium and easier to trust.
            </p>
          </div>
          <div className="spotlight-panel">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/65">Readiness</p>
            <h2 className="mt-4 font-display text-4xl leading-[0.92] text-white">
              {learningGoal ? "Recommendation profile is active" : "Set a clear learning goal"}
            </h2>
            <p className="mt-4 text-sm leading-7 text-white/75">
              A simple goal and a few interests make the AI recommendations noticeably more useful. Keep it direct and outcome-focused.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr]">
        <div className="space-y-6">
          <Card className="bg-white/80">
            <CardContent className="flex flex-col items-center p-6 text-center">
              <Avatar className="h-28 w-28 ring-4 ring-primary/10">
                <AvatarFallback className="bg-[linear-gradient(135deg,hsl(var(--secondary)),hsl(var(--card)))] text-2xl font-bold text-primary">
                  {profile.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <h2 className="mt-4 text-2xl font-semibold text-foreground">{profile.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{profile.email}</p>
              <Badge className="mt-4" variant={profile.role === "admin" ? "destructive" : profile.role === "instructor" ? "default" : "secondary"}>
                {profile.role}
              </Badge>

              <Separator className="my-6" />

              <div className="w-full space-y-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <BookOpen className="h-4 w-4" />
                    Enrolled courses
                  </span>
                  <span className="font-semibold text-foreground">{enrollmentCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Joined
                  </span>
                  <span className="font-semibold text-foreground">
                    {new Date(profile.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Sparkles className="h-4 w-4" />
                    Goal
                  </span>
                  <span className="text-right font-semibold text-foreground">
                    {learningGoal || "Not set yet"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80">
            <CardHeader>
              <CardTitle>Profile notes</CardTitle>
              <CardDescription>Use this space to improve how your profile reads in the product.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
              <p>Keep your learning goal short and specific, like “become a data analyst” or “improve cloud deployment skills.”</p>
              <p>Use interests as focused keywords rather than long sentences, for example: `react, docker, ai`.</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white/80">
          <CardHeader>
            <CardTitle>Edit profile</CardTitle>
            <CardDescription>Update your account details and tune the recommendation engine.</CardDescription>
          </CardHeader>
          <CardContent>
            {message && (
              <div className="mb-4 rounded-[1.3rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {message}
              </div>
            )}
            {error && (
              <div className="mb-4 rounded-[1.3rem] border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="pl-11" placeholder="Your name" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="email" value={profile.email} disabled className="pl-11" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  className="ui-textarea"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatar">Avatar URL</Label>
                <Input
                  id="avatar"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                />
              </div>

              <Separator />

              <div>
                <h3 className="text-xl font-semibold text-foreground">AI recommendation setup</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Keep this direct: define what you want to learn and a few topics you care about.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="goal">Learning goal</Label>
                <Input
                  id="goal"
                  value={learningGoal}
                  onChange={(e) => setLearningGoal(e.target.value)}
                  placeholder="Become a data analyst"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="interests">Interests</Label>
                <Input
                  id="interests"
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  placeholder="python, data science, sql"
                />
                <p className="text-xs text-muted-foreground">
                  Separate interests with commas. Example: `python, ai, web development`
                </p>
              </div>

              <Button type="submit" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
