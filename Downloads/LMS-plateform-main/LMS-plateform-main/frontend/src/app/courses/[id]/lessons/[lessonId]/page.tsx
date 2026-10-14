"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  Brain,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  HelpCircle,
  ListOrdered,
  Play,
  Video,
} from "lucide-react";
import { fetchLesson, fetchLessons, generateQuiz, getUserProgress, markLessonComplete } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

interface LessonData {
  id: number;
  course_id: number;
  title: string;
  content: string | null;
  video_url: string | null;
  order_index: number;
  duration_minutes: number;
}

interface ProgressRecord {
  lesson_id: number;
  completed: boolean;
}

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|.*&v=))([^&#?]+)/);
  return match ? match[1] : null;
}

function getStoredUser() {
  try {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export default function LessonPage() {
  const params = useParams();
  const courseId = Number(params.id);
  const lessonId = Number(params.lessonId);

  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [allLessons, setAllLessons] = useState<LessonData[]>([]);
  const [progressMap, setProgressMap] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [readProgress, setReadProgress] = useState(0);
  const [videoEnded, setVideoEnded] = useState(false);

  const [quizQuestions, setQuizQuestions] = useState<
    { question: string; options: string[]; correct_answer: number; explanation?: string }[]
  >([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizVisible, setQuizVisible] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [loadedLesson, lessons] = await Promise.all([
          fetchLesson(courseId, lessonId),
          fetchLessons(courseId),
        ]);
        setLesson(loadedLesson);
        setAllLessons(lessons);

        const user = getStoredUser();
        if (user) {
          const progress: ProgressRecord[] = await getUserProgress(courseId, user._id);
          const map: Record<number, boolean> = {};
          progress.forEach((item) => {
            map[item.lesson_id] = item.completed;
          });
          setProgressMap(map);
          setCompleted(!!map[lessonId]);
        }
      } catch {
        setLesson(null);
      } finally {
        setLoading(false);
      }
    }

    load();
    setReadProgress(0);
    setVideoEnded(false);
  }, [courseId, lessonId]);

  const handleScroll = useCallback(() => {
    if (!contentRef.current) return;

    const element = contentRef.current;
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const scrolled = Math.max(0, -rect.top + viewportHeight * 0.3);
    const progress = Math.min(100, Math.round((scrolled / element.scrollHeight) * 100));
    setReadProgress(progress);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  async function handleMarkComplete() {
    const user = getStoredUser();
    if (!user) {
      window.location.href = "/auth/login";
      return;
    }

    try {
      await markLessonComplete(courseId, lessonId, user._id);
      setCompleted(true);
      setProgressMap((prev) => ({ ...prev, [lessonId]: true }));
    } catch {
      // ignore
    }
  }

  async function handleGenerateQuiz() {
    setQuizLoading(true);
    setQuizVisible(true);
    setQuizSubmitted(false);
    setQuizAnswers({});

    try {
      const data = await generateQuiz(courseId, lessonId, 5);
      const transformed = (data.questions || []).map(
        (question: {
          question: string;
          options: { text: string; is_correct?: boolean }[];
          explanation?: string;
        }) => ({
          question: question.question,
          options: question.options.map((option) => option.text),
          correct_answer: question.options.findIndex((option) => option.is_correct),
          explanation: question.explanation,
        })
      );
      setQuizQuestions(transformed);
    } catch {
      setQuizQuestions([]);
    } finally {
      setQuizLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="app-shell py-16 text-center text-muted-foreground">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-4">Loading lesson...</p>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="app-shell py-16 text-center">
        <Card className="mx-auto max-w-xl bg-white/80">
          <CardContent className="py-12">
            <h1 className="text-3xl font-semibold text-foreground">Lesson not found</h1>
            <Button variant="outline" asChild className="mt-5">
              <a href="/courses">Back to courses</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sortedLessons = [...allLessons].sort((a, b) => a.order_index - b.order_index);
  const currentIndex = sortedLessons.findIndex((item) => item.id === lessonId);
  const prevLesson = currentIndex > 0 ? sortedLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < sortedLessons.length - 1 ? sortedLessons[currentIndex + 1] : null;
  const completedCount = sortedLessons.filter((item) => progressMap[item.id]).length;
  const courseProgress =
    sortedLessons.length > 0 ? Math.round((completedCount / sortedLessons.length) * 100) : 0;

  const ytId = lesson.video_url ? getYouTubeId(lesson.video_url) : null;
  const isDirectVideo = lesson.video_url && !ytId;
  const hasVideo = !!lesson.video_url;
  const hasText = !!lesson.content;

  return (
    <>
      {hasText && (
        <div className="fixed left-0 right-0 top-0 z-50 h-1 bg-transparent">
          <div
            className="h-full bg-[linear-gradient(90deg,hsl(var(--secondary-foreground)),hsl(var(--primary)),hsl(var(--accent)))] transition-all duration-300 ease-out"
            style={{ width: `${readProgress}%` }}
          />
        </div>
      )}

      <div className="app-shell space-y-8">
        <section className="hero-shell px-6 py-6 sm:px-8">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <a href="/courses" className="hover:text-primary">Courses</a>
            <ChevronRight className="h-3.5 w-3.5" />
            <a href={`/courses/${courseId}`} className="hover:text-primary">Course</a>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">{lesson.title}</span>
          </nav>

          <div className="mt-5 grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
            <div>
              <h1 className="font-display text-4xl leading-[0.94] text-foreground sm:text-5xl">
                {lesson.title}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Badge variant="secondary">Lesson {lesson.order_index + 1}</Badge>
                <span className="stat-chip">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  {lesson.duration_minutes} min
                </span>
                {hasVideo && (
                  <span className="stat-chip">
                    <Video className="h-3.5 w-3.5 text-primary" />
                    Video
                  </span>
                )}
                {hasText && (
                  <span className="stat-chip">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    Reading
                  </span>
                )}
              </div>
            </div>

            <div className="spotlight-panel">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/65">Completion</p>
              <h2 className="mt-4 font-display text-4xl leading-[0.92] text-white">
                {completed ? "Lesson complete" : "Mark this lesson when finished"}
              </h2>
              <p className="mt-4 text-sm leading-7 text-white/75">
                Keep progress updated so the course flow, dashboard, and next lesson prompts remain accurate.
              </p>
              <Button
                onClick={handleMarkComplete}
                disabled={completed}
                className="mt-6 bg-white text-foreground hover:bg-white/92"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                {completed ? "Completed" : "Mark complete"}
              </Button>
            </div>
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-[1fr_330px]">
          <div className="space-y-8">
            {hasVideo && (
              <Card className="overflow-hidden bg-white/80">
                {ytId ? (
                  <div className="relative aspect-video w-full">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${ytId}?rel=0`}
                      title={lesson.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 h-full w-full border-0"
                    />
                  </div>
                ) : isDirectVideo ? (
                  <div className="relative aspect-video w-full bg-black">
                    <video
                      src={lesson.video_url!}
                      controls
                      className="h-full w-full"
                      onEnded={() => setVideoEnded(true)}
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                ) : (
                  <a
                    href={lesson.video_url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex aspect-video items-center justify-center bg-[linear-gradient(145deg,hsl(var(--foreground)),hsl(214_52%_24%))] text-primary-foreground"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 backdrop-blur">
                        <Play className="h-8 w-8" />
                      </div>
                      <span className="text-sm font-medium">Open video</span>
                    </div>
                  </a>
                )}
              </Card>
            )}

            {videoEnded && !completed && (
              <div className="flex flex-col gap-3 rounded-[1.4rem] border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center">
                <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" />
                <p className="text-sm text-emerald-800">Video finished. Want to mark this lesson as completed?</p>
                <Button size="sm" onClick={handleMarkComplete} className="sm:ml-auto">
                  Complete lesson
                </Button>
              </div>
            )}

            {hasText && (
              <Card className="bg-white/80">
                <CardContent className="p-8" ref={contentRef}>
                  <div className="space-y-4 text-[15px] leading-8 text-foreground/90">
                    {lesson.content!.split("\n\n").map((paragraph, index) => {
                      if (paragraph.startsWith("# ")) {
                        return (
                          <h2 key={index} className="pt-2 text-3xl font-semibold text-foreground">
                            {paragraph.replace(/^#+\s*/, "")}
                          </h2>
                        );
                      }

                      if (paragraph.startsWith("## ")) {
                        return (
                          <h3 key={index} className="pt-1 text-2xl font-semibold text-foreground">
                            {paragraph.replace(/^#+\s*/, "")}
                          </h3>
                        );
                      }

                      if (paragraph.match(/^[-*•]\s/m)) {
                        const items = paragraph.split(/\n/).filter(Boolean);
                        return (
                          <ul key={index} className="list-disc space-y-2 pl-5">
                            {items.map((item, innerIndex) => (
                              <li key={innerIndex}>{item.replace(/^[-*•]\s*/, "")}</li>
                            ))}
                          </ul>
                        );
                      }

                      if (paragraph.match(/^\d+[.)]\s/m)) {
                        const items = paragraph.split(/\n/).filter(Boolean);
                        return (
                          <ol key={index} className="list-decimal space-y-2 pl-5">
                            {items.map((item, innerIndex) => (
                              <li key={innerIndex}>{item.replace(/^\d+[.)]\s*/, "")}</li>
                            ))}
                          </ol>
                        );
                      }

                      if (paragraph.startsWith("```") || paragraph.startsWith("    ")) {
                        return (
                          <pre key={index} className="overflow-x-auto rounded-[1.35rem] bg-muted p-4 text-sm">
                            <code>{paragraph.replace(/^```\w*\n?|```$/g, "").replace(/^    /gm, "")}</code>
                          </pre>
                        );
                      }

                      return (
                        <p
                          key={index}
                          dangerouslySetInnerHTML={{
                            __html: paragraph
                              .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                              .replace(/\*(.+?)\*/g, "<em>$1</em>")
                              .replace(/`(.+?)`/g, '<code class="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">$1</code>')
                              .replace(/\n/g, "<br />"),
                          }}
                        />
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {!hasVideo && !hasText && (
              <Card className="bg-white/80">
                <CardContent className="flex flex-col items-center gap-4 p-12 text-center text-muted-foreground">
                  <FileText className="h-12 w-12 opacity-50" />
                  <p>No content is available for this lesson yet.</p>
                </CardContent>
              </Card>
            )}

            <Card className="bg-white/80">
              <CardContent className="p-6">
                {!quizVisible ? (
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-[1rem] bg-[linear-gradient(135deg,hsl(var(--secondary)),hsl(var(--card)))] text-primary">
                        <HelpCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Test your knowledge</p>
                        <p className="text-sm leading-6 text-muted-foreground">
                          Generate a short quiz to reinforce what you just covered.
                        </p>
                      </div>
                    </div>
                    <Button onClick={handleGenerateQuiz} variant="outline">
                      <Brain className="mr-2 h-4 w-4" />
                      Generate quiz
                    </Button>
                  </div>
                ) : quizLoading ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="mt-4">Generating quiz questions...</p>
                  </div>
                ) : quizQuestions.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <p>No quiz questions are available for this lesson.</p>
                    <Button variant="ghost" className="mt-2" onClick={() => setQuizVisible(false)}>
                      Close
                    </Button>
                  </div>
                ) : (
                  <div>
                    <div className="mb-5 flex items-center justify-between gap-4">
                      <h3 className="flex items-center gap-2 text-xl font-semibold text-foreground">
                        <Brain className="h-5 w-5 text-primary" />
                        Lesson quiz
                      </h3>
                      {quizSubmitted && (
                        <Badge variant="outline">
                          Score{" "}
                          {
                            quizQuestions.filter(
                              (question, index) => quizAnswers[index] === question.correct_answer
                            ).length
                          }
                          /{quizQuestions.length}
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-6">
                      {quizQuestions.map((question, questionIndex) => {
                        const userAnswer = quizAnswers[questionIndex];
                        const isCorrect = quizSubmitted && userAnswer === question.correct_answer;
                        const isWrong =
                          quizSubmitted &&
                          userAnswer !== undefined &&
                          userAnswer !== question.correct_answer;

                        return (
                          <div
                            key={questionIndex}
                            className={`rounded-[1.45rem] border p-4 ${
                              isCorrect
                                ? "border-emerald-200 bg-emerald-50/80"
                                : isWrong
                                ? "border-red-200 bg-red-50/80"
                                : "border-white/80 bg-background/75"
                            }`}
                          >
                            <p className="mb-3 font-medium text-foreground">
                              <span className="mr-2 text-muted-foreground">{questionIndex + 1}.</span>
                              {question.question}
                            </p>

                            <div className="space-y-2">
                              {question.options.map((option, optionIndex) => {
                                const isSelected = userAnswer === optionIndex;
                                const showCorrect = quizSubmitted && optionIndex === question.correct_answer;
                                const showWrong =
                                  quizSubmitted &&
                                  isSelected &&
                                  optionIndex !== question.correct_answer;

                                return (
                                  <button
                                    key={optionIndex}
                                    type="button"
                                    disabled={quizSubmitted}
                                    onClick={() => setQuizAnswers((prev) => ({ ...prev, [questionIndex]: optionIndex }))}
                                    className={`flex w-full items-center gap-3 rounded-[1rem] border px-4 py-3 text-left text-sm transition-all ${
                                      showCorrect
                                        ? "border-emerald-300 bg-emerald-100 font-medium text-emerald-800"
                                        : showWrong
                                        ? "border-red-300 bg-red-100 text-red-800"
                                        : isSelected
                                        ? "border-primary bg-primary/10 font-medium"
                                        : "border-white/80 bg-white/80 hover:border-primary/25"
                                    }`}
                                  >
                                    <span className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${
                                      isSelected
                                        ? "border-primary bg-primary text-primary-foreground"
                                        : "text-muted-foreground"
                                    }`}>
                                      {String.fromCharCode(65 + optionIndex)}
                                    </span>
                                    {option}
                                    {showCorrect && <CheckCircle className="ml-auto h-4 w-4 text-emerald-600" />}
                                  </button>
                                );
                              })}
                            </div>

                            {quizSubmitted && question.explanation && (
                              <p className="mt-3 rounded-[1rem] bg-muted/70 px-3 py-2 text-sm text-muted-foreground">
                                <strong>Explanation:</strong> {question.explanation}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                      {!quizSubmitted ? (
                        <Button
                          onClick={() => setQuizSubmitted(true)}
                          disabled={Object.keys(quizAnswers).length < quizQuestions.length}
                        >
                          Submit answers
                        </Button>
                      ) : (
                        <Button onClick={handleGenerateQuiz} variant="outline">
                          <Brain className="mr-2 h-4 w-4" />
                          Try again
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setQuizVisible(false);
                          setQuizSubmitted(false);
                          setQuizAnswers({});
                        }}
                      >
                        Close quiz
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Separator />

            <div className="flex items-center justify-between">
              {prevLesson ? (
                <Button variant="ghost" asChild>
                  <a href={`/courses/${courseId}/lessons/${prevLesson.id}`}>
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Previous
                  </a>
                </Button>
              ) : (
                <div />
              )}

              {nextLesson ? (
                <Button asChild className={!completed ? "opacity-85" : ""}>
                  <a href={`/courses/${courseId}/lessons/${nextLesson.id}`}>
                    Next lesson
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </a>
                </Button>
              ) : (
                <Button variant="outline" asChild>
                  <a href={`/courses/${courseId}`}>
                    Back to course
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>

          <aside>
            <Card className="sticky top-24 bg-white/80">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <ListOrdered className="h-4 w-4" />
                    Course progress
                  </CardTitle>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {completedCount}/{sortedLessons.length}
                  </span>
                </div>
                <Progress value={courseProgress} className="mt-2 h-2.5" />
              </CardHeader>
              <Separator />
              <CardContent className="max-h-[60vh] overflow-y-auto p-2">
                <div className="space-y-1">
                  {sortedLessons.map((item) => {
                    const isCurrent = item.id === lessonId;
                    const isDone = progressMap[item.id];

                    return (
                      <a
                        key={item.id}
                        href={`/courses/${courseId}/lessons/${item.id}`}
                        className={`flex items-center gap-2 rounded-[1rem] px-3 py-2.5 text-sm transition-colors ${
                          isCurrent
                            ? "bg-primary/10 font-medium text-primary"
                            : isDone
                            ? "text-muted-foreground hover:bg-muted/70"
                            : "text-foreground hover:bg-muted/70"
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
                        ) : isCurrent ? (
                          <Play className="h-4 w-4 shrink-0 text-primary" />
                        ) : (
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] text-muted-foreground">
                            {item.order_index + 1}
                          </span>
                        )}

                        <span className={`truncate ${isDone && !isCurrent ? "line-through opacity-60" : ""}`}>
                          {item.title}
                        </span>
                        <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                          {item.duration_minutes}m
                        </span>
                      </a>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </>
  );
}
