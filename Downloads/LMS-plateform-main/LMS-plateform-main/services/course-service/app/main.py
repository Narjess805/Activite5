"""
Course Service — FastAPI Application

Microservice responsible for managing the full course lifecycle:
  - Courses      : CRUD operations and search/filter
  - Lessons      : Ordered lesson content within a course
  - Enrollments  : Enroll users in courses and track per-lesson progress
  - Reviews      : One review per user per course (rating 1–5 + comment)

Service Port   : 8001 (configured in docker-compose.yml)
Database       : PostgreSQL (SQLAlchemy ORM, auto-migrated on startup)
API Prefix     : /api/courses
Documentation  : http://localhost:8001/docs  (Swagger UI, auto-generated)

Routes summary:
  /api/courses                          — courses router
  /api/courses/{id}/lessons             — lessons router
  /api/courses/{id}/enroll              — enrollments router
  /api/courses/{id}/reviews             — reviews router
  /health                               — liveness probe
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import courses, lessons, enrollments, reviews, payments, media
from app.database import engine, Base

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="LMS Course Service",
    description="Course management, lessons, enrollments, and search",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(courses.router, prefix="/api/courses", tags=["courses"])
app.include_router(lessons.router, prefix="/api/courses", tags=["lessons"])
app.include_router(enrollments.router, prefix="/api/courses", tags=["enrollments"])
app.include_router(reviews.router, prefix="/api/courses", tags=["reviews"])
app.include_router(payments.router, prefix="/api/courses", tags=["payments"])
app.include_router(media.router, prefix="/api/courses", tags=["media"])


@app.get("/health")
def health_check():
    """Liveness probe used by Docker and nginx."""
    return {"status": "ok", "service": "course-service"}
