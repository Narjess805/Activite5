"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bot,
  CheckCircle,
  CheckCircle2,
  Clock,
  GraduationCap,
  Play,
  Send,
  Sparkles,
  Star,
  Users,
  Video,
} from "lucide-react";
import {
  createStripeCheckoutSession,
  enrollInCourse,
  chatWithAI,
  fetchCourse,
  fetchStripeCheckoutSessionStatus,
  fetchLessons,
  fetchReviews,
  getUserEnrollments,
  getUserProgress,
  submitReview,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Lesson {
  id: number;
  title: string;
  duration_minutes: number;
  order_index: number;
  video_url?: string | null;
  content?: string | null;
}

interface Review {
  id: number;
  user_id: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface Course {
  id: number;
  title: string;
  description: string;
  category: string;
  price: number;
  is_free: boolean;
  thumbnail_url?: string | null;
  instructor_id: string;
  lessons: Lesson[];
}

function getStoredUser() {
  try {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export default function CourseDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = Number(params.id);

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollMsg, setEnrollMsg] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewMsg, setReviewMsg] = useState("");
  const [progressMap, setProgressMap] = useState<Record<number, boolean>>({});
  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [loadedCourse, loadedLessons, loadedReviews] = await Promise.all([
          fetchCourse(courseId),
          fetchLessons(courseId),
          fetchReviews(courseId),
        ]);

        setCourse(loadedCourse);
        setLessons(loadedLessons);
        setReviews(loadedReviews);

        const user = getStoredUser();
        if (user) {
          const [progress, enrollments] = await Promise.all([
            getUserProgress(courseId, user._id),
            getUserEnrollments(user._id),
          ]);

          setIsEnrolled(enrollments.some((item: { course_id: number }) => item.course_id === courseId));

          const map: Record<number, boolean> = {};
          progress.forEach((item: { lesson_id: number; completed: boolean }) => {
            map[item.lesson_id] = item.completed;
          });
          setProgressMap(map);
        }
      } catch {
        setCourse(null);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [courseId]);

  useEffect(() => {
    async function confirmCheckoutReturn() {
      const checkoutState = searchParams.get("checkout");
      const sessionId = searchParams.get("session_id");
      if (!checkoutState) return;

      const cleanupCheckoutParams = () => {
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.delete("checkout");
        nextUrl.searchParams.delete("session_id");
        window.history.replaceState({}, "", nextUrl.toString());
      };

      if (checkoutState === "cancelled") {
        setEnrollMsg("Stripe checkout was cancelled. You can try again whenever you're ready.");
        cleanupCheckoutParams();
        return;
      }

      if (checkoutState !== "success" || !sessionId) return;

      const user = getStoredUser();
      if (!user?._id) return;

      setCheckoutLoading(true);
      try {
        const status = await fetchStripeCheckoutSessionStatus(courseId, sessionId, user._id);
        if (status.enrolled) {
          setIsEnrolled(true);
          setEnrollMsg("Payment confirmed. You're now enrolled in this course.");
        } else if (status.payment_status === "paid") {
          setEnrollMsg("Payment was received and enrollment is being finalized.");
        } else {
          setEnrollMsg("Payment is still processing. Refresh in a moment if enrollment doesn't appear yet.");
        }
      } catch (err: unknown) {
        setEnrollMsg(err instanceof Error ? err.message : "Unable to confirm Stripe checkout.");
      } finally {
        setCheckoutLoading(false);
        cleanupCheckoutParams();
      }
    }

    confirmCheckoutReturn();
  }, [courseId, searchParams]);

  async function handleEnroll() {
    const user = getStoredUser();
    if (!user) {
      window.location.href = "/auth/login";
      return;
    }

    try {
      if (course && !course.is_free) {
        setCheckoutLoading(true);
        const session = await createStripeCheckoutSession(courseId, {
          user_id: user._id,
          user_email: user.email,
          frontend_origin: window.location.origin,
        });
        window.location.href = session.url;
        return;
      }

      await enrollInCourse(courseId, user._id);
      setEnrollMsg("Enrollment successful. You can start learning now.");
      setIsEnrolled(true);
    } catch (err: unknown) {
      setEnrollMsg(err instanceof Error ? err.message : "Enrollment failed");
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function handleChat(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    const history = [...chatMessages, { role: "user", content: userMessage }];

    setChatInput("");
    setChatMessages(history);
    setChatLoading(true);

    try {
      const response = await chatWithAI(courseId, userMessage, chatMessages);
      setChatMessages((prev) => [...prev, { role: "assistant", content: response.reply }]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't process your question right now." },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  async function handleReview(e: React.FormEvent) {
    e.preventDefault();
    const user = getStoredUser();
    if (!user) {
      window.location.href = "/auth/login";
      return;
    }

    try {
      const review = await submitReview(courseId, user._id, reviewRating, reviewComment);
      setReviews((prev) => [...prev, review]);
      setReviewComment("");
      setReviewMsg("Review submitted successfully.");
    } catch (err: unknown) {
      setReviewMsg(err instanceof Error ? err.message : "Failed to submit review");
    }
  }

  if (loading) {
    return (
      <div className="app-shell py-16 text-center text-muted-foreground">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-4 text-sm">Loading course...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="app-shell py-16 text-center">
        <Card className="mx-auto max-w-xl bg-white/80">
          <CardContent className="py-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-[linear-gradient(135deg,hsl(var(--secondary)),hsl(var(--card)))] text-primary">
              <BookOpen className="h-7 w-7" />
            </div>
            <h1 className="mt-5 text-3xl font-semibold text-foreground">Course not found</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              This course may have been removed or is no longer available.
            </p>
            <Button variant="outline" asChild className="mt-5">
              <a href="/courses">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to catalog
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalDuration = lessons.reduce((sum, lesson) => sum + lesson.duration_minutes, 0);
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
      : "N/A";
  const completedCount = lessons.filter((lesson) => progressMap[lesson.id]).length;
  const courseProgress = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;
  const nextLesson =
    lessons.find((lesson) => !progressMap[lesson.id]) || lessons[0];

  return (
    <div className="app-shell space-y-8">
      <section className="hero-shell soft-grid px-6 py-8 sm:px-8 lg:px-10">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="rounded-full px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
        >
          <a href="/courses">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to catalog
          </a>
        </Button>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <Badge variant="secondary">{course.category || "General"}</Badge>
            <h1 className="mt-5 max-w-4xl font-display text-5xl leading-[0.9] text-foreground sm:text-6xl">
              {course.title}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-muted-foreground">
              {course.description}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <span className="stat-chip">
                <BookOpen className="h-3.5 w-3.5 text-primary" />
                {lessons.length} lessons
              </span>
              <span className="stat-chip">
                <Clock className="h-3.5 w-3.5 text-accent" />
                {totalDuration} min
              </span>
              <span className="stat-chip">
                <Star className="h-3.5 w-3.5 text-amber-500" />
                {avgRating} rating
              </span>
              <span className="stat-chip">
                <Users className="h-3.5 w-3.5 text-primary" />
                {reviews.length} reviews
              </span>
            </div>
          </div>

          <div className="spotlight-panel">
            {course.thumbnail_url && (
              <img
                src={course.thumbnail_url}
                alt={`${course.title} thumbnail`}
                className="mb-5 h-48 w-full rounded-[1.6rem] object-cover"
              />
            )}
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/65">Enrollment panel</p>
            <div className="mt-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm text-white/68">Price</p>
                <p className="mt-2 text-5xl font-semibold text-white">
                  {course.is_free ? "Free" : `$${course.price}`}
                </p>
              </div>
              <Badge className="border-white/15 bg-white/10 text-white/80">
                Instructor {course.instructor_id.slice(0, 6)}
              </Badge>
            </div>

            {isEnrolled ? (
              <div className="mt-6 rounded-[1.5rem] border border-white/12 bg-white/10 p-5">
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  Enrolled and ready to continue
                </div>
                <div className="mt-4 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-white/64">
                  <span>Course progress</span>
                  <span>{courseProgress}%</span>
                </div>
                <Progress value={courseProgress} className="mt-2 h-2 bg-white/15" />
                {nextLesson && (
                  <Button asChild className="mt-5 w-full bg-white text-foreground hover:bg-white/92">
                    <a href={`/courses/${courseId}/lessons/${nextLesson.id}`}>
                      {completedCount > 0 ? "Continue learning" : "Start course"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            ) : (
              <div className="mt-6">
                <p className="text-sm leading-7 text-white/75">
                  Enroll to unlock the lesson flow, AI tutor prompts, progress tracking, and review submission.
                </p>
                <Button
                  onClick={handleEnroll}
                  disabled={checkoutLoading}
                  className="mt-5 w-full bg-white text-foreground hover:bg-white/92"
                >
                  {checkoutLoading
                    ? "Opening Stripe checkout..."
                    : course.is_free
                    ? "Enroll for free"
                    : "Buy with Stripe"}
                </Button>
                {enrollMsg && <p className="mt-3 text-sm text-white/75">{enrollMsg}</p>}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_330px]">
        <div className="space-y-6">
          <Tabs defaultValue="syllabus" className="space-y-6">
            <TabsList>
              <TabsTrigger value="syllabus">Syllabus</TabsTrigger>
              <TabsTrigger value="ai-tutor">AI Tutor</TabsTrigger>
              <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="syllabus">
              <div className="grid gap-4">
                {lessons.map((lesson, index) => {
                  const isDone = progressMap[lesson.id];

                  return (
                    <a key={lesson.id} href={`/courses/${course.id}/lessons/${lesson.id}`} className="group block">
                      <Card className={`bg-white/80 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_34px_80px_-52px_rgba(15,48,80,0.42)] ${isDone ? "ring-1 ring-emerald-200" : ""}`}>
                        <CardContent className="flex items-center justify-between gap-4 p-5">
                          <div className="flex items-start gap-4">
                            <div className={`flex h-12 w-12 items-center justify-center rounded-[1.1rem] text-sm font-semibold ${isDone ? "bg-emerald-100 text-emerald-700" : "bg-[linear-gradient(135deg,hsl(var(--secondary)),hsl(var(--card)))] text-primary"}`}>
                              {isDone ? <CheckCircle className="h-4 w-4" /> : index + 1}
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-foreground transition-colors group-hover:text-primary">
                                {lesson.title}
                              </h3>
                              <div className="mt-2 flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                <span>{lesson.duration_minutes} min</span>
                                {lesson.video_url && (
                                  <span className="inline-flex items-center gap-1">
                                    <Video className="h-3 w-3" />
                                    Video lesson
                                  </span>
                                )}
                                {lesson.content && <span>Reading included</span>}
                              </div>
                            </div>
                          </div>
                          <Play className="h-5 w-5 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
                        </CardContent>
                      </Card>
                    </a>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="ai-tutor">
              <Card className="bg-white/80">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Bot className="h-5 w-5 text-primary" />
                    Ask the AI tutor
                  </CardTitle>
                  <CardDescription>
                    Get clarification, summaries, or next-step guidance without leaving the course context.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {chatMessages.length > 0 && (
                    <div className="mb-4 max-h-80 space-y-3 overflow-y-auto rounded-[1.6rem] border border-white/75 bg-background/70 p-4">
                      {chatMessages.map((message, index) => (
                        <div
                          key={`${message.role}-${index}`}
                          className={`rounded-[1.25rem] p-3 text-sm leading-6 ${
                            message.role === "user"
                              ? "ml-8 bg-[linear-gradient(135deg,hsl(var(--foreground)),hsl(var(--primary)))] text-primary-foreground"
                              : "mr-8 border border-white/75 bg-white/80 text-foreground"
                          }`}
                        >
                          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">
                            {message.role === "user" ? "You" : "AI tutor"}
                          </span>
                          {message.content}
                        </div>
                      ))}
                      {chatLoading && (
                        <div className="mr-8 rounded-[1.25rem] border border-white/75 bg-white/80 p-3 text-sm text-muted-foreground">
                          Thinking...
                        </div>
                      )}
                    </div>
                  )}

                  <form onSubmit={handleChat} className="flex gap-2">
                    <Input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask a question about this course..."
                      disabled={chatLoading}
                    />
                    <Button type="submit" size="icon" disabled={chatLoading}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reviews">
              <div className="space-y-6">
                {reviews.length > 0 ? (
                  <div className="grid gap-4">
                    {reviews.map((review) => (
                      <Card key={review.id} className="bg-white/80">
                        <CardContent className="p-5">
                          <div className="mb-3 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-4 w-4 ${
                                    star <= review.rating
                                      ? "fill-amber-400 text-amber-400"
                                      : "text-muted-foreground/30"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                              {new Date(review.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm leading-7 text-muted-foreground">
                            {review.comment || "No written feedback provided."}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="bg-white/80">
                    <CardContent className="py-12 text-center text-muted-foreground">
                      No reviews yet. Be the first to share your experience.
                    </CardContent>
                  </Card>
                )}

                <Card className="bg-white/80">
                  <CardHeader>
                    <CardTitle>Write a review</CardTitle>
                    <CardDescription>Leave feedback to help other learners evaluate this course.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {reviewMsg && (
                      <p className={`mb-4 text-sm ${reviewMsg.toLowerCase().includes("success") ? "text-emerald-600" : "text-destructive"}`}>
                        {reviewMsg}
                      </p>
                    )}
                    <form onSubmit={handleReview} className="space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Rating:</span>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button key={star} type="button" onClick={() => setReviewRating(star)}>
                            <Star
                              className={`h-5 w-5 transition-colors ${
                                star <= reviewRating
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-muted-foreground/30 hover:text-amber-300"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Share your experience..."
                        className="ui-textarea"
                        rows={4}
                      />
                      <Button type="submit">Submit review</Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <aside className="space-y-5">
          <Card className="sticky top-24 bg-white/80">
            <CardHeader>
              <CardTitle className="text-xl">Course snapshot</CardTitle>
              <CardDescription>Everything a buyer or learner wants to know at a glance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[1.4rem] bg-background/80 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Lessons</span>
                  <span className="font-semibold text-foreground">{lessons.length}</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-semibold text-foreground">{totalDuration} min</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Certificate</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Designed for</p>
                <div className="flex items-center gap-3 rounded-[1.25rem] bg-secondary/70 px-4 py-3 text-sm text-secondary-foreground">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  Learners who want guided progression with AI support.
                </div>
                <div className="flex items-center gap-3 rounded-[1.25rem] bg-secondary/70 px-4 py-3 text-sm text-secondary-foreground">
                  <Sparkles className="h-4 w-4 text-accent" />
                  Teams who want a platform that feels more polished in demos.
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
