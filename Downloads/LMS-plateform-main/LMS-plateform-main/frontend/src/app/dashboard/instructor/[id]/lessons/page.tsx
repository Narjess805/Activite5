"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Pencil, Plus, Trash2, Upload, Video } from "lucide-react";
import { createLesson, deleteLesson, fetchCourse, fetchLessons, updateLesson, uploadCourseMedia } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface LessonItem {
  id: number;
  course_id: number;
  title: string;
  content: string | null;
  video_url: string | null;
  order_index: number;
  duration_minutes: number;
  created_at: string;
}

interface CourseInfo {
  id: number;
  title: string;
}

export default function LessonManagerPage() {
  const params = useParams();
  const courseId = Number(params.id);

  const [course, setCourse] = useState<CourseInfo | null>(null);
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLesson, setEditingLesson] = useState<LessonItem | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [orderIndex, setOrderIndex] = useState("0");
  const [durationMinutes, setDurationMinutes] = useState("0");

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

    loadData();
  }, [courseId]);

  async function loadData() {
    try {
      const [loadedCourse, loadedLessons] = await Promise.all([
        fetchCourse(courseId),
        fetchLessons(courseId),
      ]);

      setCourse(loadedCourse);
      setLessons(loadedLessons);
    } catch {
      setError("Failed to load course data");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setTitle("");
    setContent("");
    setVideoUrl("");
    setOrderIndex(String(lessons.length));
    setDurationMinutes("0");
    setEditingLesson(null);
    setShowForm(false);
    setError("");
  }

  function openCreate() {
    resetForm();
    setOrderIndex(String(lessons.length));
    setShowForm(true);
  }

  function openEdit(lesson: LessonItem) {
    setEditingLesson(lesson);
    setTitle(lesson.title);
    setContent(lesson.content || "");
    setVideoUrl(lesson.video_url || "");
    setOrderIndex(String(lesson.order_index));
    setDurationMinutes(String(lesson.duration_minutes));
    setShowForm(true);
  }

  async function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setVideoUploading(true);
    setError("");

    try {
      const uploaded = await uploadCourseMedia(file, {
        kind: "lesson_video",
        course_id: courseId,
        lesson_id: editingLesson?.id,
      });
      setVideoUrl(uploaded.url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Video upload failed");
    } finally {
      setVideoUploading(false);
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
      if (editingLesson) {
        await updateLesson(courseId, editingLesson.id, {
          title,
          content: content || undefined,
          video_url: videoUrl || undefined,
          order_index: parseInt(orderIndex, 10),
          duration_minutes: parseInt(durationMinutes, 10) || 0,
        });
      } else {
        await createLesson(courseId, {
          title,
          content: content || undefined,
          video_url: videoUrl || undefined,
          order_index: parseInt(orderIndex, 10),
          duration_minutes: parseInt(durationMinutes, 10) || 0,
        });
      }

      resetForm();
      const updatedLessons = await fetchLessons(courseId);
      setLessons(updatedLessons);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(lessonId: number) {
    if (!confirm("Delete this lesson? Progress data will be removed.")) {
      return;
    }

    try {
      await deleteLesson(courseId, lessonId);
      setLessons((prev) => prev.filter((lesson) => lesson.id !== lessonId));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  if (loading) {
    return (
      <div className="app-shell py-16 text-center text-muted-foreground">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-4">Loading lessons...</p>
      </div>
    );
  }

  return (
    <div className="app-shell space-y-8">
      <section className="hero-shell px-6 py-8 sm:px-8 lg:px-10">
        <Button variant="ghost" size="sm" className="rounded-full px-0 hover:bg-transparent" asChild>
          <a href="/dashboard/instructor">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to courses
          </a>
        </Button>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <div>
            <p className="eyebrow">Lesson flow builder</p>
            <h1 className="mt-5 font-display text-5xl leading-[0.9] text-foreground sm:text-6xl">
              Build the structure of your course.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              {course?.title || `Course #${courseId}`} currently includes {lessons.length} lesson{lessons.length !== 1 ? "s" : ""}. The refreshed editor makes order, duration, and content easier to scan and maintain.
            </p>
          </div>
          <div className="spotlight-panel">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/65">Lesson count</p>
            <h2 className="mt-4 font-display text-4xl leading-[0.92] text-white">{lessons.length}</h2>
            <p className="mt-4 text-sm leading-7 text-white/75">
              Add or refine lesson content with a management surface that now feels far more intentional and product-grade.
            </p>
            <Button onClick={openCreate} className="mt-6 bg-white text-foreground hover:bg-white/92">
              <Plus className="mr-2 h-4 w-4" />
              Add lesson
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
            <CardTitle>{editingLesson ? "Edit lesson" : "Create lesson"}</CardTitle>
            <CardDescription>
              {editingLesson
                ? "Update the lesson details below."
                : "Fill in the lesson details to extend the course flow."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-[1fr_auto_auto]">
                <div className="space-y-2">
                  <Label htmlFor="lessonTitle">Title</Label>
                  <Input id="lessonTitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Getting started with variables" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orderIndex">Order</Label>
                  <Input id="orderIndex" type="number" min="0" value={orderIndex} onChange={(e) => setOrderIndex(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration</Label>
                  <Input id="duration" type="number" min="0" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} placeholder="0" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="videoUrl">Video URL</Label>
                <Input id="videoUrl" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=... or upload below" />
                <p className="text-xs text-muted-foreground">
                  Keep using YouTube or external links, or upload a direct video file to MinIO.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="videoFile">Upload video</Label>
                <label className="flex min-h-[3.25rem] cursor-pointer items-center gap-3 rounded-[1.25rem] border border-dashed border-border bg-background/60 px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
                  <Upload className="h-4 w-4 text-primary" />
                  <span>{videoUploading ? "Uploading video..." : "Choose a video file"}</span>
                  <input
                    id="videoFile"
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={handleVideoUpload}
                    disabled={videoUploading}
                  />
                </label>
              </div>

              {videoUrl && !videoUrl.includes("youtube.com") && !videoUrl.includes("youtu.be") && (
                <div className="overflow-hidden rounded-[1.5rem] border border-white/80 bg-white/70 p-3">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Direct video preview
                  </p>
                  <video src={videoUrl} controls className="w-full rounded-[1.1rem]" />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Lesson content (markdown or text)..."
                  className="ui-textarea"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={saving || videoUploading}>
                  {saving ? "Saving..." : editingLesson ? "Update lesson" : "Create lesson"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {lessons.length === 0 ? (
        <Card className="bg-white/80 text-center">
          <CardContent className="py-12">
            <h3 className="text-2xl font-semibold text-foreground">No lessons yet</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Start building the course by adding the first lesson.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {lessons.map((lesson) => (
            <Card key={lesson.id} className="bg-white/80 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_34px_80px_-52px_rgba(15,48,80,0.42)]">
              <CardContent className="grid gap-5 p-6 lg:grid-cols-[1fr_auto] lg:items-start">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[1.15rem] bg-[linear-gradient(135deg,hsl(var(--secondary)),hsl(var(--card)))] text-sm font-semibold text-primary">
                    {lesson.order_index + 1}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-semibold text-foreground">{lesson.title}</h3>
                      {lesson.video_url && (
                        <Badge variant="outline">
                          <Video className="h-3 w-3" />
                          Video
                        </Badge>
                      )}
                      {lesson.duration_minutes > 0 && (
                        <Badge variant="secondary">{lesson.duration_minutes} min</Badge>
                      )}
                    </div>

                    {lesson.content && (
                      <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
                        {lesson.content.slice(0, 180)}
                        {lesson.content.length > 180 ? "..." : ""}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(lesson)}>
                    <Pencil className="mr-1 h-4 w-4" />
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(lesson.id)}>
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
