"use client";

import React, { useEffect, useState } from "react";
import { Eye, ImagePlus, Layers, Pencil, Plus, Trash2 } from "lucide-react";
import { createCourse, deleteCourse, fetchCourses, updateCourse, uploadCourseMedia } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CourseItem {
  id: number;
  title: string;
  description: string | null;
  category: string | null;
  price: number;
  is_free: boolean;
  thumbnail_url: string | null;
  instructor_id: string;
  created_at: string;
  updated_at: string;
}

interface UserData {
  _id: string;
  name: string;
  role: string;
}

export default function InstructorDashboard() {
  const [user, setUser] = useState<UserData | null>(null);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseItem | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("0");
  const [isFree, setIsFree] = useState(true);
  const [thumbnailUrl, setThumbnailUrl] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      window.location.href = "/auth/login";
      return;
    }

    const parsed = JSON.parse(stored);
    if (parsed.role !== "instructor" && parsed.role !== "admin") {
      window.location.href = "/dashboard";
      return;
    }

    setUser(parsed);
    loadCourses();
  }, []);

  async function loadCourses() {
    try {
      const allCourses = await fetchCourses();
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        setCourses(
          parsed.role === "admin"
            ? allCourses
            : allCourses.filter((course: CourseItem) => course.instructor_id === parsed._id)
        );
      }
    } catch {
      setError("Failed to load courses");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setCategory("");
    setPrice("0");
    setIsFree(true);
    setThumbnailUrl("");
    setEditingCourse(null);
    setShowForm(false);
    setError("");
  }

  function openEditForm(course: CourseItem) {
    setEditingCourse(course);
    setTitle(course.title);
    setDescription(course.description || "");
    setCategory(course.category || "");
    setPrice(String(course.price));
    setIsFree(course.is_free);
    setThumbnailUrl(course.thumbnail_url || "");
    setShowForm(true);
  }

  async function handleThumbnailUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setThumbnailUploading(true);
    setError("");

    try {
      const uploaded = await uploadCourseMedia(file, { kind: "course_thumbnail" });
      setThumbnailUrl(uploaded.url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Thumbnail upload failed");
    } finally {
      setThumbnailUploading(false);
      e.target.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (editingCourse) {
        await updateCourse(editingCourse.id, {
          title,
          description: description || undefined,
          category: category || undefined,
          price: parseFloat(price) || 0,
          is_free: isFree,
          thumbnail_url: thumbnailUrl || undefined,
        });
      } else if (user) {
        await createCourse({
          title,
          description: description || undefined,
          category: category || undefined,
          price: parseFloat(price) || 0,
          is_free: isFree,
          thumbnail_url: thumbnailUrl || undefined,
          instructor_id: user._id,
        });
      }

      resetForm();
      await loadCourses();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(courseId: number) {
    if (!confirm("Delete this course? All lessons, enrollments, and reviews will be removed.")) {
      return;
    }

    try {
      await deleteCourse(courseId);
      setCourses((prev) => prev.filter((course) => course.id !== courseId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  if (loading) {
    return (
      <div className="app-shell py-16 text-center text-muted-foreground">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-4">Loading course studio...</p>
      </div>
    );
  }

  return (
    <div className="app-shell space-y-8">
      <section className="hero-shell px-6 py-8 sm:px-8 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="eyebrow">Course studio</p>
            <h1 className="mt-5 font-display text-5xl leading-[0.9] text-foreground sm:text-6xl">
              Manage your catalog in a cleaner creator workspace.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              {user?.role === "admin"
                ? "You are viewing every course on the platform with the refreshed management interface."
                : "Create courses, refine details, and move into lesson management from a more productized control surface."}
            </p>
          </div>
          <div className="spotlight-panel">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/65">Catalog overview</p>
            <h2 className="mt-4 font-display text-4xl leading-[0.92] text-white">{courses.length} course{courses.length !== 1 ? "s" : ""}</h2>
            <p className="mt-4 text-sm leading-7 text-white/75">
              The refreshed studio prioritizes quick edits, stronger readability, and easier transitions into lesson management.
            </p>
            <Button onClick={() => { resetForm(); setShowForm(true); }} className="mt-6 bg-white text-foreground hover:bg-white/92">
              <Plus className="mr-2 h-4 w-4" />
              New course
            </Button>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-[1.3rem] border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {showForm && (
        <Card className="bg-white/80">
          <CardHeader>
            <CardTitle>{editingCourse ? "Edit course" : "Create course"}</CardTitle>
            <CardDescription>
              {editingCourse
                ? "Update the course details below."
                : "Fill out the course basics to publish a new learning path."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Introduction to Python" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Programming, Data Science..." />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Course description..."
                  className="ui-textarea"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="price">Price</Label>
                  <Input id="price" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
                </div>

                <div className="flex items-end">
                  <label className="flex h-12 w-full items-center gap-3 rounded-[1.25rem] border border-white/80 bg-white/80 px-4 text-sm font-medium text-foreground">
                    <input
                      type="checkbox"
                      checked={isFree}
                      onChange={(e) => setIsFree(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    Free course
                  </label>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-2">
                  <Label htmlFor="thumbnail">Thumbnail URL</Label>
                  <Input
                    id="thumbnail"
                    value={thumbnailUrl}
                    onChange={(e) => setThumbnailUrl(e.target.value)}
                    placeholder="https://... or upload below"
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste an external image URL, or upload directly to MinIO.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="thumbnailFile">Upload thumbnail</Label>
                  <label className="flex min-h-[3.25rem] cursor-pointer items-center gap-3 rounded-[1.25rem] border border-dashed border-border bg-background/60 px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
                    <ImagePlus className="h-4 w-4 text-primary" />
                    <span>{thumbnailUploading ? "Uploading image..." : "Choose an image file"}</span>
                    <input
                      id="thumbnailFile"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleThumbnailUpload}
                      disabled={thumbnailUploading}
                    />
                  </label>
                </div>
              </div>

              {thumbnailUrl && (
                <div className="overflow-hidden rounded-[1.5rem] border border-white/80 bg-white/70 p-3">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Thumbnail preview
                  </p>
                  <img
                    src={thumbnailUrl}
                    alt="Course thumbnail preview"
                    className="h-48 w-full rounded-[1.1rem] object-cover"
                  />
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={saving || thumbnailUploading}>
                  {saving ? "Saving..." : editingCourse ? "Update course" : "Create course"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {courses.length === 0 ? (
        <Card className="bg-white/80 text-center">
          <CardContent className="py-12">
            <h3 className="text-2xl font-semibold text-foreground">No courses yet</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Click “New course” to start building your first productized learning path.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {courses.map((course) => (
            <Card key={course.id} className="bg-white/80 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_34px_80px_-52px_rgba(15,48,80,0.42)]">
              <CardContent className="grid gap-5 p-6 lg:grid-cols-[150px_1fr_auto] lg:items-start">
                <div className="overflow-hidden rounded-[1.25rem] bg-[linear-gradient(135deg,hsl(var(--secondary)),hsl(var(--card)))]">
                  {course.thumbnail_url ? (
                    <img
                      src={course.thumbnail_url}
                      alt={`${course.title} thumbnail`}
                      className="h-28 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-28 items-center justify-center text-sm font-semibold text-primary">
                      No image
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-2xl font-semibold text-foreground">{course.title}</h3>
                    <Badge variant={course.is_free ? "success" : "warning"}>
                      {course.is_free ? "Free" : `$${course.price}`}
                    </Badge>
                    {course.category && <Badge variant="outline">{course.category}</Badge>}
                  </div>
                  {course.description && (
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">{course.description}</p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <span>Created {new Date(course.created_at).toLocaleDateString()}</span>
                    <span>Updated {new Date(course.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/courses/${course.id}`}>
                      <Eye className="mr-1 h-4 w-4" />
                      View
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/dashboard/instructor/${course.id}/lessons`}>
                      <Layers className="mr-1 h-4 w-4" />
                      Lessons
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEditForm(course)}>
                    <Pencil className="mr-1 h-4 w-4" />
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(course.id)}>
                    <Trash2 className="mr-1 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
