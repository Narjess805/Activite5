"use client";

import { useState, useEffect, useCallback, useDeferredValue } from "react";
import { ArrowRight, BookOpen, Compass, Search, Sparkles } from "lucide-react";
import { fetchCourses } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Course {
  id: number;
  title: string;
  description: string;
  category: string;
  price: number;
  is_free: boolean;
  instructor_id: string;
  thumbnail_url: string | null;
}

const categories = [
  "All",
  "Programming",
  "Web Development",
  "Data Science",
  "DevOps",
  "AI/ML",
];

const toneClasses = [
  "from-sky-100 via-white to-cyan-50",
  "from-emerald-100 via-white to-teal-50",
  "from-amber-100 via-white to-orange-50",
  "from-violet-100 via-white to-fuchsia-50",
  "from-blue-100 via-white to-indigo-50",
  "from-lime-100 via-white to-emerald-50",
];

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const deferredSearch = useDeferredValue(search);

  const loadCourses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCourses({
        search: deferredSearch || undefined,
        category: category !== "All" ? category : undefined,
      });
      setCourses(data);
    } catch {
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, [deferredSearch, category]);

  useEffect(() => {
    const timer = setTimeout(loadCourses, 280);
    return () => clearTimeout(timer);
  }, [loadCourses]);

  return (
    <div className="app-shell space-y-8">
      <section className="hero-shell soft-grid px-6 py-10 sm:px-8 lg:px-10">
        <div className="absolute right-[-2rem] top-[-3rem] h-44 w-44 rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.18),transparent_70%)] blur-3xl" />
        <div className="absolute bottom-[-4rem] left-[-2rem] h-48 w-48 rounded-full bg-[radial-gradient(circle,hsl(var(--accent)/0.15),transparent_68%)] blur-3xl" />

        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div className="max-w-3xl">
            <Badge variant="secondary">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              Refreshed course discovery
            </Badge>
            <h1 className="mt-5 font-display text-5xl leading-[0.9] text-foreground sm:text-6xl">
              The catalog now feels curated, not crowded.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
              Search with intent, filter without friction, and move into course detail pages that feel more premium and persuasive.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="metric-tile">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Matching courses</p>
              <p className="mt-3 text-4xl font-semibold text-foreground">{courses.length}</p>
              <p className="mt-2 text-sm text-muted-foreground">Results adapt as you search and filter.</p>
            </div>
            <div className="spotlight-panel">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/65">Browse mode</p>
              <p className="mt-3 text-2xl font-semibold text-white">Guided discovery</p>
              <p className="mt-3 text-sm leading-6 text-white/75">
                A cleaner layout that surfaces signal first: topic, pricing, value, and next action.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section-panel p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by topic, skill, or outcome"
              className="pl-11"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={category === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {loading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="overflow-hidden bg-white/80">
              <div className="h-52 animate-pulse bg-[linear-gradient(135deg,hsl(var(--secondary)),hsl(var(--card)),hsl(var(--background)))]" />
              <CardContent className="space-y-3 p-6">
                <div className="h-5 w-24 animate-pulse rounded-full bg-muted" />
                <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
                <div className="space-y-2">
                  <div className="h-4 w-full animate-pulse rounded bg-muted" />
                  <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                </div>
                <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <Card className="bg-white/80 py-16 text-center">
          <CardContent>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.6rem] bg-[linear-gradient(135deg,hsl(var(--secondary)),hsl(var(--card)))] text-primary">
              <BookOpen className="h-7 w-7" />
            </div>
            <h3 className="mt-5 text-2xl font-semibold text-foreground">No courses match that search yet</h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Try broadening the keyword or switching to a different category.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course, index) => (
            <a key={course.id} href={`/courses/${course.id}`} className="group block">
              <Card className="overflow-hidden bg-white/80 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_34px_80px_-52px_rgba(15,48,80,0.42)]">
                <div className={`relative flex h-56 items-end overflow-hidden bg-gradient-to-br ${toneClasses[index % toneClasses.length]} p-6`}>
                  {course.thumbnail_url && (
                    <img
                      src={course.thumbnail_url}
                      alt={`${course.title} thumbnail`}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,20,30,0.05),rgba(12,20,30,0.55))]" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.14),transparent_38%)]" />
                  <div className="absolute right-5 top-5 rounded-full border border-white/60 bg-white/70 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-foreground/70 backdrop-blur">
                    {course.category || "General"}
                  </div>
                  <div className="relative">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Lunexa track</p>
                    <h2 className="mt-3 max-w-sm text-3xl font-semibold leading-tight text-foreground">{course.title}</h2>
                  </div>
                </div>
                <CardContent className="p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    {course.is_free ? <Badge variant="success">Free</Badge> : <Badge variant="warning">${course.price}</Badge>}
                    <span className="stat-chip">
                      <Compass className="h-3.5 w-3.5 text-primary" />
                      Instructor {course.instructor_id.slice(0, 4).toUpperCase()}
                    </span>
                  </div>

                  <p className="mt-4 line-clamp-3 text-sm leading-7 text-muted-foreground">{course.description}</p>

                  <div className="mt-6 flex items-center justify-between border-t border-border/70 pt-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Access</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">
                        {course.is_free ? "Open access" : `$${course.price}`}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground transition-all group-hover:gap-3 group-hover:text-primary">
                      View course
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
