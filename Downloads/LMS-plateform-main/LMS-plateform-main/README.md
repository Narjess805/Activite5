# LMS Platform — Learning Management System

> **Master DevOps & Cloud — M1 | Skills Integration Project**

A production-grade, microservices-based Learning Management System that delivers an AI-powered learning experience. The platform combines a modern student portal, course management, real-time analytics, an AI tutoring assistant, and workflow automation — all orchestrated via Docker Compose and unified behind an Nginx reverse proxy.

---

## Table of Contents

- [Project Overview](#project-overview)
  - [Architecture](#architecture)
  - [Service Summary](#service-summary)
- [Installation Instructions](#installation-instructions)
  - [Prerequisites](#prerequisites)
  - [Environment Configuration](#environment-configuration)
  - [Running with Docker (Recommended)](#running-with-docker-recommended)
  - [Running Services Individually](#running-services-individually)
- [Feature Guide](#feature-guide)
  - [Student Portal (Frontend)](#1-student-portal-frontend)
  - [Authentication & User Management](#2-authentication--user-management)
  - [Course Management](#3-course-management)
  - [Lesson Viewer & Progress Tracking](#4-lesson-viewer--progress-tracking)
  - [AI Tutor](#5-ai-tutor)
  - [Analytics Dashboard](#6-analytics-dashboard)
  - [Instructor Dashboard](#7-instructor-dashboard)
  - [Admin Dashboard](#8-admin-dashboard)
  - [Workflow Automation (n8n)](#9-workflow-automation-n8n)
- [API Reference](#api-reference)
- [Usage Examples](#usage-examples)
- [Troubleshooting](#troubleshooting)
- [Contribution Guidelines](#contribution-guidelines)

---

## Project Overview

### Architecture

```
                          ┌──────────────────────┐
                          │     Nginx Gateway     │
                          │       (port 80)       │
                          └──────────┬────────────┘
          ┌───────────┬──────────────┼────────────┬──────────────┐
          ▼           ▼              ▼            ▼              ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
    │ Frontend │ │  Course  │ │   User   │ │ AI Tutor │ │   n8n    │
    │ Next.js  │ │ Service  │ │ Service  │ │ Service  │ │Automation│
    │  :3000   │ │ FastAPI  │ │ Express  │ │ FastAPI  │ │  :5678   │
    │          │ │  :8001   │ │  :8002   │ │  :8004   │ │          │
    └──────────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘
                      │            │             │             │
               ┌──────▼────┐ ┌────▼────┐ ┌──────▼──────┐    │
               │ PostgreSQL│ │ MongoDB │ │    Redis     │    │
               │   :5432   │ │  :27017 │ │    :6379     │    │
               └──────┬────┘ └─────────┘ └─────────────-┘    │
                      │                                        │
               ┌──────▼──────────┐                            │
               │Analytics Service│◄───────────────────────────┘
               │  FastAPI :8003  │
               └─────────────────┘
                      │
               ┌──────▼──────────┐
               │     MinIO       │
               │  Object Storage │
               │  :9000 / :9001  │
               └─────────────────┘
```

### Service Summary

| Service | Technology | Internal Port | Description |
|---------|-----------|--------------|-------------|
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS | `3000` | Student-facing learning portal |
| **Course Service** | FastAPI, SQLAlchemy, PostgreSQL | `8001` | Courses, lessons, enrollments, progress, reviews |
| **User Service** | Node.js, Express, MongoDB | `8002` | JWT authentication, user profiles, roles |
| **Analytics Service** | FastAPI, SQLAlchemy, PostgreSQL | `8003` | Event tracking, platform metrics, dashboards |
| **AI Tutor Service** | FastAPI, OpenAI SDK / Groq | `8004` | AI chat, quiz generation, recommendations |
| **n8n** | n8n Automation | `5678` | Automated workflows and notifications |
| **Nginx** | Nginx Alpine | `80` | API Gateway and reverse proxy |
| **PostgreSQL 16** | — | `5432` | Relational data (courses, analytics) |
| **MongoDB 7** | — | `27017` | Document store (users, feedback) |
| **Redis 7** | — | `6379` | Distributed caching layer |
| **MinIO** | S3-compatible | `9000/9001` | Object storage for media assets |

---

## Installation Instructions

### Prerequisites

Ensure the following are installed on your machine before proceeding:

| Tool | Minimum Version | Purpose |
|------|----------------|---------|
| [Docker](https://docs.docker.com/get-docker/) | 24.x | Container runtime |
| [Docker Compose](https://docs.docker.com/compose/install/) | v2.20+ | Multi-service orchestration |
| [Git](https://git-scm.com/) | 2.x | Source control |
| [Node.js](https://nodejs.org/) *(optional, local dev only)* | 20.x LTS | Frontend / User Service |
| [Python](https://www.python.org/) *(optional, local dev only)* | 3.11+ | FastAPI services |

Verify your setup:

```bash
docker --version          # Docker version 24.x.x
docker compose version    # Docker Compose version v2.x.x
git --version             # git version 2.x.x
```

### Environment Configuration

**Step 1 — Copy the environment template:**

```bash
cp .env.example .env
```

**Step 2 — Edit `.env` and set the required values:**

```dotenv
# ─── AI / LLM ───────────────────────────────────────────────────────────────
# Choose ONE provider: either OpenAI or Groq (Groq has a free tier)
GROQ_API_KEY=your-groq-api-key-here          # Get one at https://console.groq.com
OPENAI_API_KEY=your-openai-api-key-here      # Optional: OpenAI fallback

# LLM model to use (default works with Groq free tier)
LLM_MODEL=llama-3.3-70b-versatile

# ─── SECURITY (CHANGE BEFORE ANY PUBLIC DEPLOYMENT) ─────────────────────────
JWT_SECRET=replace-this-with-a-long-random-string

# ─── DATABASE CREDENTIALS (optional overrides) ──────────────────────────────
POSTGRES_USER=lms_user
POSTGRES_PASSWORD=lms_password
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
MINIO_ENDPOINT=http://minio:9000
MINIO_PUBLIC_URL=http://localhost:9000
MINIO_BUCKET=lms-media

# ─── STRIPE PAYMENTS (required for paid courses) ───────────────────────────
# Use the full secret key copied from the Stripe dashboard.
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
# Local webhook signing secret from `stripe listen --forward-to ...`
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_CURRENCY=usd
FRONTEND_BASE_URL=http://localhost
```

> **Security Notice:** The defaults work out-of-the-box for local development. Before deploying to any shared or public environment, replace all placeholder credentials and secrets with strong, randomly-generated values.

### Stripe Payments

Paid course checkout uses Stripe Checkout.

**Required environment variables:**

```dotenv
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CURRENCY=usd
FRONTEND_BASE_URL=http://localhost
```

**Important:**

- Use the full secret key copied from Stripe. Do not paste a shortened value ending with `...`.
- `pk_test_...` is the publishable key and is not valid for backend checkout creation.
- `rk_test_...` is a restricted key and is not used by the current checkout backend.

**Local webhook setup with Stripe CLI:**

```bash
stripe listen --forward-to http://localhost/api/courses/payments/stripe/webhook
```

Windows PowerShell helper:

```powershell
./scripts/stripe-listen.ps1
```

Copy the printed `whsec_...` value into `.env` as `STRIPE_WEBHOOK_SECRET`, then rebuild or restart `course-service`.

**Why the Stripe dashboard says `Invalid URL`:**

- Stripe Dashboard event destinations do not accept `localhost` URLs like `http://localhost/api/courses/payments/stripe/webhook`.
- For local development, use Stripe CLI forwarding instead of creating a dashboard destination.
- If you want to use the Stripe dashboard, you must provide a publicly reachable `https://...` webhook URL.

Examples:

- Local development: `stripe listen --forward-to http://localhost/api/courses/payments/stripe/webhook`
- Public deployment: `https://your-domain/api/courses/payments/stripe/webhook`

The payment flow uses these endpoints:

- `POST /api/courses/{course_id}/checkout/stripe`
- `GET /api/courses/{course_id}/checkout/stripe/session/{session_id}`
- `POST /api/courses/payments/stripe/webhook`

### MinIO Media Uploads

Course thumbnails and lesson video uploads can be stored in MinIO and then referenced by the LMS UI.

**Relevant environment variables:**

```dotenv
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
MINIO_ENDPOINT=http://minio:9000
MINIO_PUBLIC_URL=http://localhost:9000
MINIO_BUCKET=lms-media
```

The course service exposes:

- `POST /api/courses/media/upload`

Supported upload kinds:

- `course_thumbnail`
- `lesson_video`

The upload endpoint automatically creates the bucket when needed, applies a public-read policy for uploaded objects, and returns a direct object URL that can be stored in `thumbnail_url` or `video_url`.

Windows PowerShell smoke test:

```powershell
./scripts/minio-smoke-test.ps1
```

### Running with Docker (Recommended)

This is the easiest and recommended way to run the full platform.

**Start all services:**

```bash
git clone https://github.com/chaditroudi/LMS-plateform.git
cd LMS-plateform
docker compose up --build -d
```

The first build downloads images and installs dependencies — this may take 3–5 minutes. Subsequent starts are much faster.

**Check that every service is healthy:**

```bash
docker compose ps
```

All services should show `healthy` or `running`. If a service is restarting, check its logs:

```bash
docker compose logs <service-name> --follow
# e.g.:
docker compose logs ai-tutor-service --follow
```

**Access the platform:**

| Interface | URL |
|-----------|-----|
| Student Portal | http://localhost |
| Course Service API Docs | http://localhost:8001/docs |
| Analytics API Docs | http://localhost:8003/docs |
| AI Tutor API Docs | http://localhost:8004/docs |
| n8n Workflow Dashboard | http://localhost/n8n |
| MinIO Console | http://localhost:9001 |

**Stop the platform:**

```bash
# Stop containers (data is preserved)
docker compose down

# Stop and wipe all data volumes (full reset)
docker compose down -v
```

---

### Running Services Individually

For active development, you can run each service locally without Docker.

#### Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev          # Development server with hot-reload at http://localhost:3000
npm run build        # Production build
npm run start        # Serve production build
npm run lint         # Run ESLint
```

> The frontend calls backend APIs via `/api/*` routes. When running locally without Docker, update `src/lib/api.ts` to point to the correct service URLs (e.g., `http://localhost:8001`).

#### User Service (Node.js / Express)

```bash
cd services/user-service
npm install
npm run dev          # Development with nodemon (auto-restart on change)
npm start            # Production
npm test             # Jest test suite with coverage
```

Requires a running MongoDB instance. Set `MONGODB_URI` in your environment:

```bash
export MONGODB_URI=mongodb://localhost:27017/lms_users
export JWT_SECRET=your-secret-key
export PORT=8002
```

#### Course Service (FastAPI / Python)

```bash
cd services/course-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

Requires running PostgreSQL and Redis. Set environment variables:

```bash
export DATABASE_URL=postgresql://lms_user:lms_password@localhost:5432/lms_courses
export REDIS_URL=redis://localhost:6379
export PORT=8001
```

#### Analytics Service (FastAPI / Python)

```bash
cd services/analytics-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8003
```

Uses the same PostgreSQL database as the Course Service.

#### AI Tutor Service (FastAPI / Python)

```bash
cd services/ai-tutor-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8004
```

Requires at least one LLM API key:

```bash
export GROQ_API_KEY=your-groq-api-key
export LLM_MODEL=llama-3.3-70b-versatile
export DATABASE_URL=postgresql://lms_user:lms_password@localhost:5432/lms_courses
export REDIS_URL=redis://localhost:6379
```

---

## Feature Guide

### 1. Student Portal (Frontend)

**Technology:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, Radix UI

The frontend is the primary interface for all users (students, instructors, admins). It is a server-rendered React application with a dark-mode capable design system.

**Accessing it:**
- Docker: http://localhost (served via Nginx)
- Local dev: http://localhost:3000

**Main pages:**

| Route | Description |
|-------|-------------|
| `/` | Landing page — platform introduction and featured courses |
| `/auth/login` | Sign in to an existing account |
| `/auth/register` | Create a new student account |
| `/courses` | Browse and filter the course catalog |
| `/courses/[id]` | Course detail, description, lessons, and enrollment |
| `/courses/[id]/lessons/[lessonId]` | Lesson viewer with content and progress tracking |
| `/dashboard` | Personal learning dashboard |
| `/dashboard/profile` | Edit profile, bio, and avatar |
| `/dashboard/instructor` | Instructor course management |
| `/dashboard/admin` | Admin panel (admin role required) |

---

### 2. Authentication & User Management

**Technology:** JWT (jsonwebtoken), bcryptjs, Express, MongoDB

The platform uses JSON Web Tokens for stateless authentication. Passwords are hashed with bcrypt at cost factor 12.

**Three user roles:**

| Role | Capabilities |
|------|-------------|
| `student` | Browse catalog, enroll in courses, track progress, chat with AI tutor |
| `instructor` | All student capabilities + create/edit/delete own courses and lessons |
| `admin` | Full access to all resources and users |

**Registration flow:**
1. Navigate to `/auth/register`
2. Fill in name, email, and password
3. On success, you are redirected to your dashboard

**Login flow:**
1. Navigate to `/auth/login`
2. Enter credentials
3. A JWT is issued and stored client-side — all subsequent API calls use it as a `Bearer` token

**Token verification:** Every protected API call sends `Authorization: Bearer <token>` to the User Service's `/api/auth/verify` endpoint before granting access.

---

### 3. Course Management

**Technology:** FastAPI, SQLAlchemy, PostgreSQL

The Course Service manages the full lifecycle of courses and lessons.

**For students:**
- Browse courses at `/courses` with optional filters (category, free/paid)
- View course details including the lesson outline, rating, and instructor
- Enroll in a course with a single click

**For instructors:**
1. Go to `/dashboard/instructor`
2. Click **Create Course** and fill in title, description, category, and price
3. After creating a course, add lessons from `/dashboard/instructor/[id]/lessons`
4. Each lesson requires a title, content body, optional video URL, and duration

**Database tables:**

| Table | Purpose |
|-------|---------|
| `courses` | Course metadata (title, category, price, instructor) |
| `lessons` | Individual lessons linked to a course, with ordering |
| `enrollments` | Records which user is enrolled in which course |
| `progress` | Tracks lesson-level completion per user |
| `reviews` | Star ratings (1–5) and comments from enrolled students |

---

### 4. Lesson Viewer & Progress Tracking

**Technology:** Next.js, Course Service API, PostgreSQL

When a student opens a lesson:
1. Navigate to `/courses/[courseId]/lessons/[lessonId]`
2. Read the lesson content (and watch the video if provided)
3. Click **Mark as Complete** to record progress
4. Progress is persisted and displayed on the course detail page and the student dashboard

The system automatically calculates the percentage of lessons completed per course and displays it as a progress bar.

---

### 5. AI Tutor

**Technology:** FastAPI, OpenAI SDK, Groq API, Redis

The AI Tutor Service connects to a Large Language Model (Groq or OpenAI) to provide three distinct features:

#### 5a. AI Chat

Ask the AI tutor questions about any course topic. The service sends your message along with course context to the LLM.

**To use:**
- Open any course detail page
- Use the **AI Chat** widget
- Type your question and receive a contextualized answer

The AI chat endpoint supports multi-turn conversations via a `chat_history` array.

#### 5b. Course Recommendations

The AI analyzes your learning history and preferences to suggest the most relevant courses.

**To use:**
- Open your student dashboard
- The recommendation panel is automatically populated based on your enrolled courses and completion history

#### 5c. Quiz Generation

Automatically generate multiple-choice questions from any lesson's content.

**To use:**
1. Open a lesson
2. Click **Generate Quiz**
3. The AI reads the lesson content and produces questions with answers

**Configuring the LLM backend:**

The AI service supports two providers. Set these in your `.env`:

```dotenv
# Option A — Groq (free tier available, fast inference)
GROQ_API_KEY=gsk_xxxxxxxxxxxx
GROQ_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL=llama-3.3-70b-versatile

# Option B — OpenAI
OPENAI_API_KEY=sk-xxxxxxxxxxxx
LLM_MODEL=gpt-4o-mini
```

Check the AI service health and current LLM configuration:

```bash
curl http://localhost:8004/health
```

---

### 6. Analytics Dashboard

**Technology:** FastAPI, SQLAlchemy, PostgreSQL

The Analytics Service records platform events and exposes aggregate metrics.

**Tracked events:**
- `course_view` — A student viewed a course
- `enrollment` — A student enrolled in a course
- `lesson_completion` — A student completed a lesson
- `review_submitted` — A student posted a review

**Accessing the dashboard:**
- Admin users can view the full analytics dashboard at `/dashboard/admin`
- The dashboard shows total views, enrollment counts, completion rates, and recent activity trends

**API dashboard endpoint:**

```bash
curl http://localhost:8003/api/analytics/dashboard/
```

Sample response:

```json
{
  "total_course_views": 1840,
  "total_enrollments": 312,
  "total_completions": 97,
  "recent_events": [...]
}
```

---

### 7. Instructor Dashboard

**Technology:** Next.js, Course Service API

Instructors have a dedicated workspace at `/dashboard/instructor`.

**Capabilities:**
- View all courses they have created
- See total enrollment count per course
- Create new courses and manage existing ones
- Add, edit, reorder, and delete lessons within a course
- Monitor which students have enrolled

**Lesson management:**
1. Go to `/dashboard/instructor`
2. Click on a course card to open lesson management
3. Use **Add Lesson** to create new content
4. Drag-and-drop (or use `order_index`) to reorder lessons

---

### 8. Admin Dashboard

**Technology:** Next.js, all microservice APIs

Admin users (`role: admin`) access the admin panel at `/dashboard/admin`.

**Capabilities:**
- View all registered users and their roles
- Inspect platform-wide analytics
- Monitor service health via the `/health` endpoints
- Access raw event logs filtered by event type or user

**Creating an admin user:**

Since self-registration defaults to `student` role, promote a user via the MongoDB shell:

```bash
docker exec -it lms-mongo mongosh
use lms_users
db.users.updateOne({ email: "admin@example.com" }, { $set: { role: "admin" } })
```

---

### 9. Workflow Automation (n8n)

**Technology:** n8n, webhook-based integrations

The n8n service runs four pre-configured workflows:

| Workflow | Trigger | Action |
|----------|---------|--------|
| `1-enrollment-notification` | Student enrolls in a course | Sends a notification |
| `2-review-alert` | A review is submitted | Alerts the instructor |
| `3-lesson-completion` | A lesson is marked complete | Logs the achievement |
| `4-weekly-analytics-report` | Scheduled (weekly) | Generates an analytics summary |

**Accessing n8n:**
- URL: http://localhost/n8n
- Default credentials are set during container initialization

**Editing workflows:**
1. Open the n8n dashboard
2. Select a workflow to edit visually
3. Trigger test executions to verify behavior

The Course Service communicates with n8n via webhook calls in `n8n_client.py`.

---

## API Reference

All API calls go through Nginx on port 80. Interactive Swagger UI docs are available for all Python services.

### Authentication

| Method | Endpoint | Auth Required | Description |
|--------|----------|:---:|-------------|
| `POST` | `/api/auth/register` | No | Create a new account |
| `POST` | `/api/auth/login` | No | Login and receive a JWT |
| `GET` | `/api/auth/verify` | Yes | Validate a Bearer token |

### User Profiles

| Method | Endpoint | Auth Required | Description |
|--------|----------|:---:|-------------|
| `GET` | `/api/users/me` | Yes | Get current user's profile |
| `PUT` | `/api/users/me` | Yes | Update profile fields |
| `GET` | `/api/users/` | Admin | List all users |
| `GET` | `/api/users/:id` | Admin | Get user by ID |

### Courses

| Method | Endpoint | Auth Required | Description |
|--------|----------|:---:|-------------|
| `GET` | `/api/courses/` | No | List all courses (filter: `category`, `is_free`) |
| `GET` | `/api/courses/{id}` | No | Get course details |
| `POST` | `/api/courses/` | Instructor | Create a course |
| `PUT` | `/api/courses/{id}` | Instructor | Update a course |
| `DELETE` | `/api/courses/{id}` | Instructor | Delete a course |
| `GET` | `/api/courses/{id}/lessons` | Yes | List lessons for a course |
| `POST` | `/api/courses/{id}/enroll` | Yes | Enroll current user |
| `GET` | `/api/courses/user/{userId}/enrollments` | Yes | Get all enrollments for a user |
| `GET` | `/api/courses/{id}/progress/{userId}` | Yes | Get progress summary |
| `POST` | `/api/courses/{id}/lessons/{lessonId}/progress` | Yes | Mark lesson complete |
| `GET` | `/api/courses/{id}/reviews` | No | Get reviews |
| `POST` | `/api/courses/{id}/reviews` | Yes | Submit a review |

### Analytics

| Method | Endpoint | Auth Required | Description |
|--------|----------|:---:|-------------|
| `POST` | `/api/analytics/events/` | Yes | Record a platform event |
| `GET` | `/api/analytics/events/` | Admin | List events (filter: `event_type`, `user_id`) |
| `GET` | `/api/analytics/dashboard/` | Admin | Aggregated platform statistics |

### AI Tutor

| Method | Endpoint | Auth Required | Description |
|--------|----------|:---:|-------------|
| `POST` | `/api/ai/chat` | Yes | Chat with the AI tutor |
| `POST` | `/api/ai/recommendations` | Yes | Get AI course recommendations |
| `POST` | `/api/ai/quiz/generate` | Yes | Generate a quiz from lesson content |
| `GET` | `/api/ai/health` | No | AI service health and LLM config |

### Health Checks

Every service exposes `GET /health` returning `{"status": "ok"}`.

---

## Usage Examples

### Register and Login

```bash
# Register a new student account
curl -X POST http://localhost/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice Smith", "email": "alice@example.com", "password": "SecurePass123!"}'

# Login and capture the JWT
TOKEN=$(curl -s -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com", "password": "SecurePass123!"}' \
  | jq -r '.token')

echo "Your token: $TOKEN"
```

### Browse and Enroll in a Course

```bash
# List all free courses
curl http://localhost/api/courses/?is_free=true

# Get details for course with ID 1
curl http://localhost/api/courses/1

# Enroll in course 1 (requires JWT)
curl -X POST http://localhost/api/courses/1/enroll \
  -H "Authorization: Bearer $TOKEN"
```

### Track Lesson Progress

```bash
# Mark lesson 3 in course 1 as complete
curl -X POST http://localhost/api/courses/1/lessons/3/progress \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"completed": true}'

# Check overall progress for course 1
curl http://localhost/api/courses/1/progress/alice-user-id \
  -H "Authorization: Bearer $TOKEN"
```

### Chat with the AI Tutor

```bash
# Ask the AI tutor a question about a course
curl -X POST http://localhost/api/ai/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Can you explain the difference between supervised and unsupervised learning?",
    "course_id": 5,
    "chat_history": []
  }'
```

### Generate a Quiz

```bash
# Generate a 5-question quiz from lesson 2 content
curl -X POST http://localhost/api/ai/quiz/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lesson_id": 2,
    "num_questions": 5
  }'
```

### Get Course Recommendations

```bash
# AI-powered personalized recommendations
curl -X POST http://localhost/api/ai/recommendations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "alice-user-id",
    "enrolled_course_ids": [1, 3],
    "learning_preferences": {"topics": ["machine learning", "python"]}
  }'
```

### Submit a Course Review

```bash
# Post a 5-star review for course 1
curl -X POST http://localhost/api/courses/1/reviews \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rating": 5, "comment": "Excellent course — very clear and well-structured."}'
```

### Record an Analytics Event

```bash
# Log a course view event
curl -X POST http://localhost/api/analytics/events/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"event_type": "course_view", "user_id": "alice-user-id", "course_id": 1}'

# Retrieve the analytics dashboard
curl http://localhost/api/analytics/dashboard/ \
  -H "Authorization: Bearer $TOKEN"
```

### Create a Course (Instructor)

```bash
# Create a new course as an instructor
curl -X POST http://localhost/api/courses/ \
  -H "Authorization: Bearer $INSTRUCTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Introduction to Docker",
    "description": "Learn containerization from scratch.",
    "category": "DevOps",
    "price": 0,
    "is_free": true,
    "instructor_id": "instructor-user-id"
  }'
```

### Run Smoke Tests

```powershell
# From the project root on Windows/PowerShell
.\scripts\smoke-test.ps1
```

---

## Troubleshooting

### Services not starting / restarting

**Check the logs first:**

```bash
docker compose logs <service-name> --tail=50
# Common services: frontend, course-service, user-service, ai-tutor-service, analytics-service
```

**Issue: Database not ready**

Services depend on database health checks. If PostgreSQL or MongoDB takes longer than expected to initialize, a service may crash and restart. This is usually self-healing within 30–60 seconds. You can force a restart:

```bash
docker compose restart course-service
```

**Issue: Port already in use**

If port 80 is occupied by another process:

```bash
# Find the process using port 80
lsof -i :80       # macOS/Linux
netstat -ano | findstr :80   # Windows

# Then kill it, or change the Nginx host port in docker-compose.yml:
# ports: - "8080:80"
```

---

### AI Tutor not responding

**Check the health endpoint:**

```bash
curl http://localhost:8004/health
```

If `llm_configured` is `false`, the service started without a valid API key.

**Fix:** Ensure your `.env` file has a valid `GROQ_API_KEY` or `OPENAI_API_KEY`, then restart:

```bash
docker compose restart ai-tutor-service
```

**Issue: LLM timeout**

The AI endpoints can take 5–30 seconds depending on the model. Nginx is configured with a 120-second timeout for AI routes. If you see `504 Gateway Timeout`, the model response exceeded this limit — try a smaller model:

```dotenv
LLM_MODEL=llama-3.1-8b-instant   # Faster Groq model
```

---

### Authentication errors (401 / 403)

- **401 Unauthorized:** Your token is missing or expired. Log in again to get a fresh JWT.
- **403 Forbidden:** Your account role does not have permission for this action. Admin-only endpoints require `role: admin`.

Check your token is being sent correctly:

```bash
# The Authorization header must match exactly:
-H "Authorization: Bearer eyJhbG..."
#                  ^^^^^^ note the space between Bearer and token
```

---

### Frontend not loading

**Issue: Blank page or `Cannot connect to API`**

Verify Nginx and the frontend container are running:

```bash
docker compose ps frontend nginx
```

If the frontend is running but the page is blank, check the browser console for API errors. Ensure the Docker network `lms-network` is healthy:

```bash
docker network inspect lms-network
```

---

### Database connection errors

**PostgreSQL:**

```bash
docker exec -it lms-postgres psql -U lms_user -d lms_courses -c "\dt"
```

**MongoDB:**

```bash
docker exec -it lms-mongo mongosh --eval "db.users.countDocuments()"
```

**Redis:**

```bash
docker exec -it lms-redis redis-cli ping
# Expected: PONG
```

---

### Full platform reset

If you need to start completely fresh:

```bash
docker compose down -v          # Remove containers and all volumes
docker compose up --build -d    # Rebuild images and re-seed the database
```

> Warning: `down -v` permanently deletes all database data including user accounts and course progress.

---

### n8n workflows not triggering

Ensure the n8n service is reachable from the course service:

```bash
docker compose logs n8n --tail=30
curl http://localhost/n8n/healthz
```

If webhooks are not firing, verify the `N8N_WEBHOOK_BASE_URL` in `docker-compose.yml` matches the internal Docker service name (`http://n8n:5678`).

---

## Contribution Guidelines

We welcome contributions from the community. Please follow these guidelines to keep the codebase healthy and maintainable.

### Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/LMS-plateform.git
   cd LMS-plateform
   ```
3. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   # or for bug fixes:
   git checkout -b fix/issue-description
   ```
4. Set up the development environment as described in [Installation Instructions](#installation-instructions)

### Development Workflow

- Keep each pull request focused on a single concern (one feature or one bug fix)
- Write clear, descriptive commit messages:
  ```
  feat(ai-tutor): add streaming response support for chat endpoint
  fix(course-service): prevent duplicate enrollment on concurrent requests
  docs: update AI tutor configuration section in README
  ```
- Follow the existing code style within each service:
  - **Python:** PEP 8, type hints on all function signatures
  - **TypeScript/Node:** existing ESLint configuration
  - **Frontend:** Tailwind utility classes, Radix UI components for new UI elements

### Before Submitting a Pull Request

- [ ] All existing tests pass: `npm test` (User Service) or verify other services still start cleanly
- [ ] New functionality has corresponding tests where applicable
- [ ] Environment variable additions are documented in `.env.example` and this README
- [ ] The Docker build succeeds: `docker compose up --build`
- [ ] Smoke tests pass: `.\scripts\smoke-test.ps1` (Windows) or equivalent `curl` checks

### Submitting the Pull Request

1. Push your branch to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
2. Open a pull request against the `main` branch of the upstream repository
3. Fill in the PR template:
   - What does this change do?
   - Why is it needed?
   - How was it tested?
   - Any screenshots for UI changes

### Reporting Issues

Open a GitHub Issue with the following details:
- **Environment:** OS, Docker version, Docker Compose version
- **Steps to reproduce** the problem
- **Expected behavior** vs. **actual behavior**
- **Relevant logs:** `docker compose logs <service> --tail=50`

### Requesting Features

Open a GitHub Issue with the label `enhancement`. Include:
- The problem you are trying to solve
- Your proposed solution or approach
- Any alternative approaches you considered

### Security Vulnerabilities

Please **do not** open a public issue for security vulnerabilities. Instead, report them directly to the repository maintainers via GitHub's private vulnerability reporting or by email.

---

## Database Schema Reference

### PostgreSQL — `lms_courses`

```sql
courses       (id, title, description, instructor_id, category, price, is_free, thumbnail_url, created_at, updated_at)
lessons       (id, course_id, title, content, video_url, order_index, duration_minutes, created_at)
enrollments   (id, user_id, course_id, enrolled_at)           -- UNIQUE(user_id, course_id)
progress      (id, user_id, lesson_id, course_id, completed, completed_at)  -- UNIQUE(user_id, lesson_id)
reviews       (id, user_id, course_id, rating, comment, created_at)         -- UNIQUE(user_id, course_id)
analytics     (id, event_type, user_id, course_id, lesson_id, metadata JSONB, created_at)
```

### MongoDB — `lms_users`

```javascript
users     { name, email, password (bcrypt), role, avatar_url, bio, created_at, updated_at }
feedback  { user_id, course_id, type, message, rating, status, created_at }
```

---

> Developed as part of the **Master DevOps & Cloud — M1** Skills Integration Project.
# Micro-project
