"use client";

import React, { useEffect, useState } from "react";
import { ArrowRight, Award, BookOpen, ChartSpline, Clock, Sparkles, TrendingUp } from "lucide-react";
import {
  fetchDashboardStats,
  getUserEnrollments,
  fetchCourse,
  getUserProgress,
  getRecommendations,
  getProfile,
  LearningPreferences,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Enrollment {
  id: number;
  user_id: string;
  course_id: number;
  enrolled_at: string;
}

interface CourseInfo {
  id: number;
  title: string;
  lessons: { id: number }[];
}

interface ProgressItem {
  lesson_id: number;
  completed: boolean;
}

interface DashboardStats {
  total_views: number;
  total_enrollments: number;
  active_users: number;
  completion_rate: number;
  popular_courses: { label: string; value: number }[];
  enrollment_trends: { label: string; value: number }[];
}

interface Recommendation {
  course_id: number;
  title: string;
  reason: string;
  score: number;
}

interface UserProfileResponse {
  _id: string;
  learning_preferences?: LearningPreferences;
}

function hasMeaningfulPreferences(preferences?: LearningPreferences) {
  return Boolean(
    preferences?.interests?.some((item) => item.trim()) ||
      preferences?.learning_goal?.trim()
  );
}

export default function DashboardPage() {
  const [user, setUser] = useState<{ _id: string; name: string } | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courseDetails, setCourseDetails] = useState<
    Map<number, { title: string; totalLessons: number; completedLessons: number }>
  >(new Map());
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [hasPreferenceSetup, setHasPreferenceSetup] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const stored = localStorage.getItem("user");
        if (!stored) {
          window.location.href = "/auth/login";
          return;
        }

        const parsedUser = JSON.parse(stored);
        setUser(parsedUser);

        const [enrs, dashStats, fullProfile] = await Promise.all([
          getUserEnrollments(parsedUser._id),
          fetchDashboardStats(),
          getProfile() as Promise<UserProfileResponse | null>,
        ]);

        setHasPreferenceSetup(hasMeaningfulPreferences(fullProfile?.learning_preferences));
        setEnrollments(enrs);
        setStats(dashStats);

        const details = new Map<number, { title: string; totalLessons: number; completedLessons: number }>();
        await Promise.all(
          enrs.map(async (enrollment: Enrollment) => {
            try {
              const [course, progress]: [CourseInfo, ProgressItem[]] = await Promise.all([
                fetchCourse(enrollment.course_id),
                getUserProgress(enrollment.course_id, parsedUser._id),
              ]);

              details.set(enrollment.course_id, {
                title: course.title,
                totalLessons: course.lessons?.length || 0,
                completedLessons: progress.filter((item) => item.completed).length,
              });
            } catch {
              // ignore per-course failures
            }
          })
        );
        setCourseDetails(details);

        try {
          const recs = await getRecommendations(
            parsedUser._id,
            undefined,
            fullProfile?.learning_preferences
          );
          setRecommendations(recs.recommendations || []);
        } catch {
          // ignore recommendation failures
        }
      } catch {
        // ignore global load failures
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <div className="app-shell py-16 text-center text-muted-foreground">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-4">Loading dashboard...</p>
      </div>
    );
  }

  const totalCompleted = Array.from(courseDetails.values()).filter(
    (course) => course.totalLessons > 0 && course.completedLessons >= course.totalLessons
  ).length;
  const totalHours = Math.round(
    Array.from(courseDetails.values()).reduce(
      (sum, course) => sum + course.completedLessons * 15,
      0
    ) / 60
  );
  const inProgress = Math.max(enrollments.length - totalCompleted, 0);

  return (
    <div className="app-shell space-y-8">
      <section className="hero-shell px-6 py-8 sm:px-8 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="eyebrow">Learner workspace</p>
            <h1 className="mt-5 font-display text-5xl leading-[0.9] text-foreground sm:text-6xl">
              Welcome back{user?.name ? `, ${user.name}` : ""}.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Your refreshed dashboard brings active courses, learning momentum, platform insights, and AI recommendations into one more polished workspace.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <span className="stat-chip">
                <BookOpen className="h-3.5 w-3.5 text-primary" />
                {enrollments.length} active courses
              </span>
              <span className="stat-chip">
                <Clock className="h-3.5 w-3.5 text-accent" />
                {totalHours} hours learned
              </span>
            </div>
          </div>

          <div className="spotlight-panel">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/65">Recommendation engine</p>
            <h2 className="mt-4 font-display text-4xl leading-[0.92] text-white">
              {hasPreferenceSetup ? "Personalization is active" : "Finish your learner profile"}
            </h2>
            <p className="mt-4 text-sm leading-7 text-white/75">
              {hasPreferenceSetup
                ? "Your profile is already shaping tailored suggestions. The recommendations tab is ready with relevant next steps."
                : "Add your interests and learning goal in the profile studio to unlock more useful AI recommendations."}
            </p>
            <div className="mt-6">
              <Button asChild className="bg-white text-foreground hover:bg-white/90">
                <a href={hasPreferenceSetup ? "/dashboard#recommended" : "/dashboard/profile"}>
                  {hasPreferenceSetup ? "Review recommendations" : "Open profile setup"}
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="data-grid">
        <MetricCard icon={<BookOpen className="h-5 w-5 text-primary" />} label="Enrolled" value={String(enrollments.length)} helper="Courses in your workspace" />
        <MetricCard icon={<Clock className="h-5 w-5 text-accent" />} label="Hours learned" value={String(totalHours)} helper="Estimated study time completed" />
        <MetricCard icon={<Award className="h-5 w-5 text-emerald-600" />} label="Completed" value={String(totalCompleted)} helper="Courses finished end-to-end" />
        <MetricCard icon={<TrendingUp className="h-5 w-5 text-sky-600" />} label="In progress" value={String(inProgress)} helper="Courses still underway" />
      </div>

      <Tabs defaultValue="courses" className="space-y-6" id="recommended">
        <TabsList>
          <TabsTrigger value="courses">My Courses</TabsTrigger>
          <TabsTrigger value="analytics">Platform Signals</TabsTrigger>
          <TabsTrigger value="recommendations">Recommended</TabsTrigger>
        </TabsList>

        <TabsContent value="courses">
          {enrollments.length === 0 ? (
            <Card className="bg-white/80 text-center">
              <CardContent className="py-12">
                <BookOpen className="mx-auto mb-4 h-12 w-12 text-primary/45" />
                <h3 className="text-2xl font-semibold text-foreground">No courses enrolled yet</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Browse the refreshed catalog and add your first learning path.
                </p>
                <Button className="mt-5" asChild>
                  <a href="/courses">
                    Browse courses
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {enrollments.map((enrollment) => {
                const info = courseDetails.get(enrollment.course_id);
                const percent =
                  info && info.totalLessons > 0
                    ? Math.round((info.completedLessons / info.totalLessons) * 100)
                    : 0;

                return (
                  <a key={enrollment.id} href={`/courses/${enrollment.course_id}`} className="block group">
                    <Card className="bg-white/80 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_34px_80px_-52px_rgba(15,48,80,0.42)]">
                      <CardContent className="grid gap-5 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-xl font-semibold text-foreground transition-colors group-hover:text-primary">
                              {info?.title || `Course #${enrollment.course_id}`}
                            </h3>
                            <Badge variant={percent >= 100 ? "success" : "secondary"}>
                              {percent >= 100
                                ? "Completed"
                                : `${info?.completedLessons || 0}/${info?.totalLessons || 0} lessons`}
                            </Badge>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            Continue where you left off with stronger progress visibility and cleaner navigation.
                          </p>
                          <div className="mt-4">
                            <Progress value={percent} className="h-2.5" />
                            <div className="mt-2 flex items-center justify-between text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                              <span>Course progress</span>
                              <span>{percent}%</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground group-hover:text-primary">
                          Open course
                          <ArrowRight className="h-4 w-4" />
                        </div>
                      </CardContent>
                    </Card>
                  </a>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics">
          {stats && (
            <div className="space-y-6">
              <div className="data-grid">
                <MetricCard icon={<ChartSpline className="h-5 w-5 text-primary" />} label="Total views" value={stats.total_views.toLocaleString()} helper="Platform page views" />
                <MetricCard icon={<BookOpen className="h-5 w-5 text-emerald-600" />} label="Enrollments" value={stats.total_enrollments.toLocaleString()} helper="All enrollments tracked" />
                <MetricCard icon={<Sparkles className="h-5 w-5 text-accent" />} label="Active users" value={stats.active_users.toLocaleString()} helper="Current active learners" />
                <MetricCard icon={<TrendingUp className="h-5 w-5 text-sky-600" />} label="Completion rate" value={`${stats.completion_rate}%`} helper="Cross-platform completion signal" />
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                <Card className="bg-white/80">
                  <CardHeader>
                    <CardTitle>Popular courses</CardTitle>
                    <CardDescription>What learners are engaging with most right now.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {stats.popular_courses.map((course, index) => (
                      <div key={`${course.label}-${index}`} className="rounded-[1.35rem] bg-background/80 p-4">
                        <div className="mb-3 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                              {index + 1}
                            </span>
                            <span className="font-medium text-foreground">{course.label}</span>
                          </div>
                          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            {course.value} enrollments
                          </span>
                        </div>
                        <Progress
                          value={(course.value / (stats.popular_courses[0]?.value || 1)) * 100}
                          className="h-2"
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="bg-white/80">
                  <CardHeader>
                    <CardTitle>Enrollment trends</CardTitle>
                    <CardDescription>Momentum across recent periods.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {stats.enrollment_trends.map((trend, index) => (
                      <div key={`${trend.label}-${index}`} className="rounded-[1.35rem] bg-background/80 p-4">
                        <div className="mb-3 flex items-center justify-between text-sm">
                          <span className="font-medium text-foreground">{trend.label}</span>
                          <span className="text-muted-foreground">{trend.value}</span>
                        </div>
                        <Progress
                          value={
                            (trend.value /
                              Math.max(...stats.enrollment_trends.map((item) => item.value), 1)) *
                            100
                          }
                          className="h-2.5"
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="recommendations">
          {!hasPreferenceSetup ? (
            <Card className="bg-white/80 text-center">
              <CardContent className="py-12">
                <Sparkles className="mx-auto mb-4 h-12 w-12 text-accent/70" />
                <h3 className="text-2xl font-semibold text-foreground">Set your recommendation goal first</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Add a learning goal and a few interests in your profile studio so the AI can recommend stronger next steps.
                </p>
                <Button className="mt-5" asChild>
                  <a href="/dashboard/profile">
                    Open profile
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          ) : recommendations.length === 0 ? (
            <Card className="bg-white/80 text-center">
              <CardContent className="py-12">
                <Sparkles className="mx-auto mb-4 h-12 w-12 text-primary/55" />
                <h3 className="text-2xl font-semibold text-foreground">No strong matches yet</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Try a clearer learning goal in your profile, like becoming a frontend developer or preparing for DevOps work.
                </p>
                <Button className="mt-5" variant="outline" asChild>
                  <a href="/dashboard/profile">Update preferences</a>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {recommendations.map((recommendation) => (
                <a key={recommendation.course_id} href={`/courses/${recommendation.course_id}`} className="group block">
                  <Card className="h-full bg-white/80 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_34px_80px_-52px_rgba(15,48,80,0.42)]">
                    <CardContent className="flex h-full flex-col p-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-[1.2rem] bg-[linear-gradient(135deg,hsl(var(--foreground)),hsl(var(--primary)))] text-primary-foreground">
                        <ChartSpline className="h-5 w-5" />
                      </div>
                      <h3 className="mt-5 text-2xl font-semibold text-foreground transition-colors group-hover:text-primary">
                        {recommendation.title}
                      </h3>
                      <p className="mt-3 flex-1 text-sm leading-7 text-muted-foreground">{recommendation.reason}</p>
                      <div className="mt-5 flex items-center justify-between">
                        <Badge variant="secondary">Score {Math.round(recommendation.score * 100)}%</Badge>
                        <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground group-hover:text-primary">
                          Explore
                          <ArrowRight className="h-4 w-4" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </a>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <Card className="bg-white/80">
      <CardContent className="p-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-[1.2rem] bg-[linear-gradient(135deg,hsl(var(--secondary)),hsl(var(--card)))] shadow-[0_18px_40px_-30px_rgba(15,48,80,0.28)]">
          {icon}
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
        <p className="mt-2 text-3xl font-semibold text-foreground">{value}</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  );
}
