"""
Pydantic Schemas — Course Service

Defines the request/response contracts for all course-service endpoints.
FastAPI uses these schemas to:
  - Validate and parse incoming JSON request bodies.
  - Serialise and document outgoing JSON responses.

Schema families:
  Course*      — CourseBase, CourseCreate, CourseUpdate, CourseResponse,
                   CourseListResponse
  Lesson*      — LessonCreate, LessonUpdate, LessonResponse
  Enrollment*  — EnrollmentCreate, EnrollmentResponse
  Progress*    — ProgressUpdate, ProgressResponse
  Review*      — ReviewCreate, ReviewResponse
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ---------------------------------------------------------------------------
# Course schemas
# ---------------------------------------------------------------------------

class CourseBase(BaseModel):
    """Shared fields used by both create and response course schemas."""

    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    price: float = 0.0
    is_free: bool = True
    thumbnail_url: Optional[str] = None


class CourseCreate(CourseBase):
    """Request body for creating a new course. Requires instructor_id."""

    instructor_id: str


class CourseUpdate(BaseModel):
    """Request body for partially updating a course. All fields are optional."""

    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    is_free: Optional[bool] = None
    thumbnail_url: Optional[str] = None


class LessonResponse(BaseModel):
    """Lesson data embedded in course detail responses."""

    id: int
    course_id: int
    title: str
    content: Optional[str] = None
    video_url: Optional[str] = None
    order_index: int
    duration_minutes: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class CourseResponse(CourseBase):
    """Full course detail response — includes the nested lessons list."""

    id: int
    instructor_id: str
    created_at: datetime
    updated_at: datetime
    lessons: List[LessonResponse] = []

    class Config:
        from_attributes = True


class CourseListResponse(CourseBase):
    """Lightweight course response used in list/search results (no lessons)."""

    id: int
    instructor_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Lesson schemas
# ---------------------------------------------------------------------------

class LessonCreate(BaseModel):
    """Request body for adding a lesson to a course."""

    title: str
    content: Optional[str] = None
    video_url: Optional[str] = None
    order_index: int
    duration_minutes: int = 0


class LessonUpdate(BaseModel):
    """Request body for partially updating a lesson. All fields are optional."""

    title: Optional[str] = None
    content: Optional[str] = None
    video_url: Optional[str] = None
    order_index: Optional[int] = None
    duration_minutes: Optional[int] = None


# ---------------------------------------------------------------------------
# Enrollment schemas
# ---------------------------------------------------------------------------

class EnrollmentCreate(BaseModel):
    """Request body for enrolling a user in a course."""

    user_id: str


class EnrollmentResponse(BaseModel):
    """Enrollment record returned after successful enrollment."""

    id: int
    user_id: str
    course_id: int
    enrolled_at: datetime

    class Config:
        from_attributes = True


class CheckoutSessionCreate(BaseModel):
    """Request body for starting a Stripe Checkout session."""

    user_id: str
    user_email: Optional[str] = None
    frontend_origin: Optional[str] = None


class CheckoutSessionResponse(BaseModel):
    """Response payload for a newly-created Stripe Checkout session."""

    session_id: str
    url: str


class CheckoutSessionStatusResponse(BaseModel):
    """Response payload for a Stripe Checkout session status lookup."""

    session_id: str
    status: str
    payment_status: str
    enrolled: bool


# ---------------------------------------------------------------------------
# Progress schemas
# ---------------------------------------------------------------------------

class ProgressUpdate(BaseModel):
    """Request body for marking a lesson as complete (or incomplete)."""

    completed: bool = True


class ProgressResponse(BaseModel):
    """Progress record returned after an update."""

    id: int
    user_id: str
    lesson_id: int
    course_id: int
    completed: bool
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Review schemas
# ---------------------------------------------------------------------------

class ReviewCreate(BaseModel):
    """Request body for submitting a course review."""

    user_id: str
    rating: int = Field(ge=1, le=5)  # Rating must be between 1 and 5
    comment: Optional[str] = None


class ReviewResponse(BaseModel):
    """Review record returned after creation or in review listings."""

    id: int
    user_id: str
    course_id: int
    rating: int
    comment: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
