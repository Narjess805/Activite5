/**
 * API Client — Frontend
 *
 * Centralised HTTP client for all backend service calls.
 * All functions throw an Error on non-OK responses so callers can
 * use try/catch without needing to check response status themselves.
 *
 * Base URL resolution:
 *   - Browser context   : Empty string — relative URLs hit nginx (port 80).
 *   - Server context    : NEXT_PUBLIC_API_URL env var or "http://nginx".
 *     This allows Next.js server-side rendering to reach services through
 *     the internal Docker network.
 *
 * Auth:
 *   authHeaders() reads the JWT from localStorage and adds it as a
 *   Bearer token. It returns an empty object in SSR contexts where
 *   localStorage is unavailable.
 */

// Use relative URLs from the gateway in-browser, internal URL from the server.
// When the frontend is opened directly on :3000, relative /api requests would
// hit Next.js itself and return its HTML 404 page. In that case, fall back to
// the same host on the default gateway port instead.
function getBaseUrl() {
  if (typeof window !== "undefined") {
    const { hostname, port, protocol } = window.location;
    if (port === "3000") {
      return `${protocol}//${hostname}`;
    }
    return "";
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://nginx-gateway";
}

export interface LearningPreferences {
  interests?: string[];
  skill_level?: "beginner" | "intermediate" | "advanced";
  learning_goal?: string;
  preferred_categories?: string[];
  preferred_formats?: string[];
  weekly_hours?: number;
  learning_style?: "hands_on" | "theory_first" | "short_lessons" | "mixed";
}

/** Returns Authorization header with Bearer token if one is stored in localStorage. */
function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ---------------------------------------------------------------------------
// Course Service
// ---------------------------------------------------------------------------

/** Fetch a paginated, filterable list of courses from the course service. */
export async function fetchCourses(params?: {
  search?: string;
  category?: string;
  is_free?: boolean;
  page?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set("search", params.search);
  if (params?.category && params.category !== "All")
    searchParams.set("category", params.category);
  if (params?.is_free !== undefined)
    searchParams.set("is_free", String(params.is_free));
  if (params?.page) searchParams.set("page", String(params.page));

  const res = await fetch(
    `${getBaseUrl()}/api/courses?${searchParams.toString()}`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error("Failed to fetch courses");
  return res.json();
}

/** Fetch a single course (with its nested lessons) by ID. */
export async function fetchCourse(id: number) {
  const res = await fetch(`${getBaseUrl()}/api/courses/${id}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch course");
  return res.json();
}

/** Fetch the ordered list of lessons for a course. */
export async function fetchLessons(courseId: number) {
  const res = await fetch(
    `${getBaseUrl()}/api/courses/${courseId}/lessons`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error("Failed to fetch lessons");
  return res.json();
}

/** Fetch a single lesson by its ID within a course. */
export async function fetchLesson(courseId: number, lessonId: number) {
  const res = await fetch(
    `${getBaseUrl()}/api/courses/${courseId}/lessons/${lessonId}`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error("Failed to fetch lesson");
  return res.json();
}

// ---------------------------------------------------------------------------
// User Service — Authentication
// ---------------------------------------------------------------------------

/** Log in with email and password; returns { user, token }. */
export async function login(email: string, password: string) {
  const res = await fetch(`${getBaseUrl()}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Login failed");
  }
  return res.json();
}

/** Register a new user account; returns { user, token }. */
export async function register(
  name: string,
  email: string,
  password: string,
  role: string = "student"
) {
  const res = await fetch(`${getBaseUrl()}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password, role }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Registration failed");
  }
  return res.json();
}

/** Verify the stored JWT; returns null when the token is absent or invalid. */
export async function verifyToken() {
  const res = await fetch(`${getBaseUrl()}/api/auth/verify`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) return null;
  return res.json();
}

/** Fetch the currently authenticated user's profile. Returns null on failure. */
export async function getProfile() {
  const res = await fetch(`${getBaseUrl()}/api/users/me`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) return null;
  return res.json();
}

// ---------------------------------------------------------------------------
// Course Service — Enrollments & Progress
// ---------------------------------------------------------------------------

/** Enroll a user in a course. Throws if the user is already enrolled. */
export async function enrollInCourse(courseId: number, userId: string) {
  const res = await fetch(`${getBaseUrl()}/api/courses/${courseId}/enroll`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ user_id: userId }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Enrollment failed");
  }
  return res.json();
}

/** Return all courses the given user is enrolled in. Returns [] on failure. */
export async function getUserEnrollments(userId: string) {
  const res = await fetch(
    `${getBaseUrl()}/api/courses/user/${userId}/enrollments`,
    { headers: { ...authHeaders() } }
  );
  if (!res.ok) return [];
  return res.json();
}

/** Return lesson-level progress records for a user within a course. Returns [] on failure. */
export async function getUserProgress(courseId: number, userId: string) {
  const res = await fetch(
    `${getBaseUrl()}/api/courses/${courseId}/progress/${userId}`,
    { headers: { ...authHeaders() } }
  );
  if (!res.ok) return [];
  return res.json();
}

/** Mark a specific lesson as complete for the authenticated user. */
export async function markLessonComplete(
  courseId: number,
  lessonId: number,
  userId: string
) {
  const res = await fetch(
    `${getBaseUrl()}/api/courses/${courseId}/lessons/${lessonId}/progress?user_id=${encodeURIComponent(userId)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ completed: true }),
    }
  );
  if (!res.ok) throw new Error("Failed to mark lesson complete");
  return res.json();
}

/** Submit a star rating and optional comment for a course. Throws on duplicate or failure. */
export async function submitReview(
  courseId: number,
  userId: string,
  rating: number,
  comment: string
) {
  const res = await fetch(`${getBaseUrl()}/api/courses/${courseId}/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ user_id: userId, rating, comment }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to submit review");
  }
  return res.json();
}

/** Fetch all reviews for a course. Returns [] on failure. */
export async function fetchReviews(courseId: number) {
  const res = await fetch(`${getBaseUrl()}/api/courses/${courseId}/reviews`, {
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

// ---------------------------------------------------------------------------
// AI Tutor Service
// ---------------------------------------------------------------------------

/**
 * Send a chat message to the AI tutor for the given course.
 * @param history - Previous conversation turns for context continuity.
 */
export async function chatWithAI(
  courseId: number,
  message: string,
  history: { role: string; content: string }[] = []
) {
  const res = await fetch(`${getBaseUrl()}/api/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ course_id: courseId, message, history }),
  });
  if (!res.ok) throw new Error("AI chat failed");
  return res.json();
}

/** Generate quiz questions for a course or lesson via the AI tutor service. */
export async function generateQuiz(
  courseId: number,
  lessonId?: number,
  numQuestions: number = 5
) {
  const res = await fetch(`${getBaseUrl()}/api/ai/quiz/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      course_id: courseId,
      lesson_id: lessonId,
      num_questions: numQuestions,
    }),
  });
  if (!res.ok) throw new Error("Quiz generation failed");
  return res.json();
}

/** Fetch AI-generated course recommendations for a user. */
export async function getRecommendations(
  userId: string,
  currentCourseId?: number,
  preferences?: LearningPreferences
) {
  const res = await fetch(`${getBaseUrl()}/api/ai/recommendations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      user_id: userId,
      current_course_id: currentCourseId,
      interests: preferences?.interests || [],
      learning_goal: preferences?.learning_goal,
    }),
  });
  if (!res.ok) throw new Error("Recommendations failed");
  return res.json();
}

/** Create a Stripe Checkout session for a paid course purchase. */
export async function createStripeCheckoutSession(
  courseId: number,
  data: {
    user_id: string;
    user_email?: string;
    frontend_origin?: string;
  }
) {
  const res = await fetch(`${getBaseUrl()}/api/courses/${courseId}/checkout/stripe`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const response = await res.json().catch(() => ({}));
    throw new Error(response.detail || "Unable to start Stripe checkout");
  }
  return res.json();
}

/** Confirm a Stripe Checkout session after redirect back from Stripe. */
export async function fetchStripeCheckoutSessionStatus(
  courseId: number,
  sessionId: string,
  userId: string
) {
  const res = await fetch(
    `${getBaseUrl()}/api/courses/${courseId}/checkout/stripe/session/${encodeURIComponent(sessionId)}?user_id=${encodeURIComponent(userId)}`,
    { headers: { ...authHeaders() }, cache: "no-store" }
  );
  if (!res.ok) {
    const response = await res.json().catch(() => ({}));
    throw new Error(response.detail || "Unable to verify Stripe checkout");
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Analytics Service
// ---------------------------------------------------------------------------

/** Fetch aggregated platform statistics for the admin dashboard. */
export async function fetchDashboardStats() {
  const res = await fetch(`${getBaseUrl()}/api/analytics/dashboard`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch dashboard");
  return res.json();
}

/**
 * Fire-and-forget analytics event tracker.
 * Failures are silently ignored to avoid disrupting the user experience.
 */
export async function trackEvent(event: {
  event_type: string;
  user_id?: string;
  course_id?: number;
  lesson_id?: number;
}) {
  fetch(`${getBaseUrl()}/api/analytics/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
  }).catch(() => {});
}

// ---------------------------------------------------------------------------
// Course Service — Instructor CRUD
// ---------------------------------------------------------------------------

/** Create a new course. */
export async function createCourse(data: {
  title: string;
  description?: string;
  category?: string;
  price?: number;
  is_free?: boolean;
  thumbnail_url?: string;
  instructor_id: string;
}) {
  const res = await fetch(`${getBaseUrl()}/api/courses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.detail || "Failed to create course");
  }
  return res.json();
}

/** Update an existing course. */
export async function updateCourse(
  courseId: number,
  data: {
    title?: string;
    description?: string;
    category?: string;
    price?: number;
    is_free?: boolean;
    thumbnail_url?: string;
  }
) {
  const res = await fetch(`${getBaseUrl()}/api/courses/${courseId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.detail || "Failed to update course");
  }
  return res.json();
}

/** Delete a course and all related data. */
export async function deleteCourse(courseId: number) {
  const res = await fetch(`${getBaseUrl()}/api/courses/${courseId}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.detail || "Failed to delete course");
  }
}

/** Upload a course thumbnail or lesson video to MinIO via the course service. */
export async function uploadCourseMedia(
  file: File,
  data: {
    kind: "course_thumbnail" | "lesson_video";
    course_id?: number;
    lesson_id?: number;
  }
) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("kind", data.kind);
  if (data.course_id !== undefined) {
    formData.append("course_id", String(data.course_id));
  }
  if (data.lesson_id !== undefined) {
    formData.append("lesson_id", String(data.lesson_id));
  }

  const res = await fetch(`${getBaseUrl()}/api/courses/media/upload`, {
    method: "POST",
    headers: { ...authHeaders() },
    body: formData,
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.detail || "Failed to upload media");
  }
  return res.json();
}

/** Create a new lesson within a course. */
export async function createLesson(
  courseId: number,
  data: {
    title: string;
    content?: string;
    video_url?: string;
    order_index: number;
    duration_minutes?: number;
  }
) {
  const res = await fetch(`${getBaseUrl()}/api/courses/${courseId}/lessons`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.detail || "Failed to create lesson");
  }
  return res.json();
}

/** Update an existing lesson. */
export async function updateLesson(
  courseId: number,
  lessonId: number,
  data: {
    title?: string;
    content?: string;
    video_url?: string;
    order_index?: number;
    duration_minutes?: number;
  }
) {
  const res = await fetch(
    `${getBaseUrl()}/api/courses/${courseId}/lessons/${lessonId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(data),
    }
  );
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.detail || "Failed to update lesson");
  }
  return res.json();
}

/** Delete a lesson from a course. */
export async function deleteLesson(courseId: number, lessonId: number) {
  const res = await fetch(
    `${getBaseUrl()}/api/courses/${courseId}/lessons/${lessonId}`,
    {
      method: "DELETE",
      headers: { ...authHeaders() },
    }
  );
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.detail || "Failed to delete lesson");
  }
}

// ---------------------------------------------------------------------------
// User Service — Profile & Admin
// ---------------------------------------------------------------------------

/** Update the authenticated user's profile (name, bio, avatar_url). */
export async function updateProfile(data: {
  name?: string;
  bio?: string;
  avatar_url?: string;
  learning_preferences?: LearningPreferences;
}) {
  const res = await fetch(`${getBaseUrl()}/api/users/me`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.error || "Failed to update profile");
  }
  return res.json();
}

/** Fetch paginated user list (admin only). */
export async function fetchUsers(page: number = 1, limit: number = 20) {
  const res = await fetch(
    `${getBaseUrl()}/api/users?page=${page}&limit=${limit}`,
    { headers: { ...authHeaders() } }
  );
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

/** Fetch a single user by ID (admin). */
export async function fetchUser(userId: string) {
  const res = await fetch(`${getBaseUrl()}/api/users/${userId}`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error("Failed to fetch user");
  return res.json();
}

/** Fetch analytics events with optional filters. */
export async function fetchEvents(params?: {
  event_type?: string;
  user_id?: string;
  course_id?: number;
  limit?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params?.event_type) searchParams.set("event_type", params.event_type);
  if (params?.user_id) searchParams.set("user_id", params.user_id);
  if (params?.course_id) searchParams.set("course_id", String(params.course_id));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  const res = await fetch(
    `${getBaseUrl()}/api/analytics/events?${searchParams.toString()}`,
    { headers: { ...authHeaders() } }
  );
  if (!res.ok) return [];
  return res.json();
}
