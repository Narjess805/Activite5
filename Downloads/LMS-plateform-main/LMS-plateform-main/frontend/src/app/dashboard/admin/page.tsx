"use client";

import React, { useEffect, useState } from "react";
import { Activity, Eye, Shield, UserCheck } from "lucide-react";
import { fetchCourses, fetchDashboardStats, fetchEvents, fetchUsers } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface UserItem {
  _id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface CourseItem {
  id: number;
  title: string;
  category: string | null;
  instructor_id: string;
  is_free: boolean;
  price: number;
  created_at: string;
}

interface DashboardStats {
  total_views: number;
  total_enrollments: number;
  active_users: number;
  completion_rate: number;
  popular_courses: { label: string; value: number }[];
  enrollment_trends: { label: string; value: number }[];
}

interface EventItem {
  id: number;
  event_type: string;
  user_id: string | null;
  course_id: number | null;
  created_at: string;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPage, setUserPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      window.location.href = "/auth/login";
      return;
    }

    const parsed = JSON.parse(stored);
    if (parsed.role !== "admin") {
      window.location.href = "/dashboard";
      return;
    }

    loadData();
  }, []);

  async function loadData() {
    try {
      const [usersData, coursesData, statsData, eventsData] = await Promise.all([
        fetchUsers(1, 50),
        fetchCourses(),
        fetchDashboardStats(),
        fetchEvents({ limit: 50 }),
      ]);

      setUsers(usersData.users || []);
      setTotalUsers(usersData.pagination?.total || 0);
      setTotalPages(usersData.pagination?.pages || 1);
      setCourses(coursesData || []);
      setStats(statsData);
      setEvents(eventsData || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers(page: number) {
    try {
      const data = await fetchUsers(page, 50);
      setUsers(data.users || []);
      setUserPage(page);
      setTotalPages(data.pagination?.pages || 1);
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <div className="app-shell py-16 text-center text-muted-foreground">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-4">Loading admin control room...</p>
      </div>
    );
  }

  const studentCount = users.filter((user) => user.role === "student").length;
  const instructorCount = users.filter((user) => user.role === "instructor").length;
  const adminCount = users.filter((user) => user.role === "admin").length;

  return (
    <div className="app-shell space-y-8">
      <section className="hero-shell px-6 py-8 sm:px-8 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="eyebrow">Admin control room</p>
            <h1 className="mt-5 font-display text-5xl leading-[0.9] text-foreground sm:text-6xl">
              Run the platform from a calmer, clearer command surface.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Users, courses, activity, and analytics now sit inside a more polished admin experience with stronger hierarchy and cleaner data presentation.
            </p>
          </div>
          <div className="spotlight-panel">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/65">Live overview</p>
            <h2 className="mt-4 font-display text-4xl leading-[0.92] text-white">{totalUsers} users</h2>
            <p className="mt-4 text-sm leading-7 text-white/75">
              Track the shape of the platform with cleaner analytics panels, simplified tables, and more legible recent activity.
            </p>
          </div>
        </div>
      </section>

      <div className="data-grid">
        <MetricCard title="Total users" value={String(totalUsers)} />
        <MetricCard title="Total courses" value={String(courses.length)} />
        <MetricCard title="Enrollments" value={String(stats?.total_enrollments || 0)} />
        <MetricCard title="Completion rate" value={`${stats?.completion_rate || 0}%`} />
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">Users ({totalUsers})</TabsTrigger>
          <TabsTrigger value="courses">Courses ({courses.length})</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card className="bg-white/80">
            <CardHeader>
              <CardTitle>All users</CardTitle>
              <CardDescription>
                {studentCount} students, {instructorCount} instructors, {adminCount} admins
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="table-shell overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-border/70 text-left text-muted-foreground">
                      <th className="px-5 py-4 font-medium">Name</th>
                      <th className="px-5 py-4 font-medium">Email</th>
                      <th className="px-5 py-4 font-medium">Role</th>
                      <th className="px-5 py-4 font-medium">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user._id} className="border-b border-border/60 last:border-0">
                        <td className="px-5 py-4 font-medium text-foreground">{user.name}</td>
                        <td className="px-5 py-4 text-muted-foreground">{user.email}</td>
                        <td className="px-5 py-4">
                          <Badge variant={user.role === "admin" ? "destructive" : user.role === "instructor" ? "default" : "secondary"}>
                            {user.role === "admin" && <Shield className="h-3 w-3" />}
                            {user.role === "student" && <UserCheck className="h-3 w-3" />}
                            {user.role}
                          </Badge>
                        </td>
                        <td className="px-5 py-4 text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Page {userPage} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={userPage <= 1} onClick={() => loadUsers(userPage - 1)}>
                      Previous
                    </Button>
                    <Button variant="outline" size="sm" disabled={userPage >= totalPages} onClick={() => loadUsers(userPage + 1)}>
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="courses">
          <Card className="bg-white/80">
            <CardHeader>
              <CardTitle>All courses</CardTitle>
              <CardDescription>A cleaner overview of every course on the platform.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="table-shell overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-border/70 text-left text-muted-foreground">
                      <th className="px-5 py-4 font-medium">ID</th>
                      <th className="px-5 py-4 font-medium">Title</th>
                      <th className="px-5 py-4 font-medium">Category</th>
                      <th className="px-5 py-4 font-medium">Price</th>
                      <th className="px-5 py-4 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courses.map((course) => (
                      <tr key={course.id} className="border-b border-border/60 last:border-0">
                        <td className="px-5 py-4 text-muted-foreground">#{course.id}</td>
                        <td className="px-5 py-4">
                          <a href={`/courses/${course.id}`} className="font-medium text-foreground hover:text-primary">
                            {course.title}
                          </a>
                        </td>
                        <td className="px-5 py-4">
                          {course.category ? <Badge variant="outline">{course.category}</Badge> : <span className="text-muted-foreground">-</span>}
                        </td>
                        <td className="px-5 py-4">
                          <Badge variant={course.is_free ? "secondary" : "warning"}>
                            {course.is_free ? "Free" : `$${course.price}`}
                          </Badge>
                        </td>
                        <td className="px-5 py-4 text-muted-foreground">
                          {new Date(course.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          {stats && (
            <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <Card className="bg-white/80">
                <CardHeader>
                  <CardTitle>Popular courses</CardTitle>
                  <CardDescription>What is drawing the most enrollments right now.</CardDescription>
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
                      <Progress value={(course.value / (stats.popular_courses[0]?.value || 1)) * 100} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-white/80">
                <CardHeader>
                  <CardTitle>Enrollment trends</CardTitle>
                  <CardDescription>Recent momentum across the platform.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {stats.enrollment_trends.map((trend, index) => (
                    <div key={`${trend.label}-${index}`} className="rounded-[1.35rem] bg-background/80 p-4">
                      <div className="mb-3 flex items-center justify-between text-sm">
                        <span className="font-medium text-foreground">{trend.label}</span>
                        <span className="text-muted-foreground">{trend.value}</span>
                      </div>
                      <Progress
                        value={(trend.value / Math.max(...stats.enrollment_trends.map((item) => item.value), 1)) * 100}
                        className="h-2.5"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="activity">
          <Card className="bg-white/80">
            <CardHeader>
              <CardTitle>Recent events</CardTitle>
              <CardDescription>Latest platform activity in a cleaner event feed.</CardDescription>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">No activity recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {events.slice(0, 30).map((event) => (
                    <div key={event.id} className="flex items-center gap-3 rounded-[1.3rem] border border-white/80 bg-white/75 p-4">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${
                          event.event_type === "enrollment"
                            ? "bg-emerald-50 text-emerald-600"
                            : event.event_type === "page_view"
                            ? "bg-blue-50 text-blue-600"
                            : "bg-secondary text-primary"
                        }`}
                      >
                        {event.event_type === "enrollment" ? (
                          <UserCheck className="h-4 w-4" />
                        ) : event.event_type === "page_view" ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <Activity className="h-4 w-4" />
                        )}
                      </div>

                      <div className="flex-1">
                        <p className="text-sm font-medium capitalize text-foreground">
                          {event.event_type.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {event.user_id && `User: ${event.user_id.slice(0, 8)}...`}
                          {event.course_id && ` • Course #${event.course_id}`}
                        </p>
                      </div>

                      <span className="text-xs text-muted-foreground">
                        {new Date(event.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <Card className="bg-white/80">
      <CardContent className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">{title}</p>
        <p className="mt-3 text-3xl font-semibold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}
