"""
SQLAlchemy ORM Models — Course Service

Defines the relational schema for the course service.

Tables:
  courses      — Top-level course catalogue entries.
  lessons      — Ordered video/text lessons that belong to a course.
  enrollments  — Join table linking users to courses they have enrolled in.
  progress     — Per-user, per-lesson completion status.
  reviews      — User ratings and comments for courses.

All cascade deletes are handled at the database level (ondelete="CASCADE")
so removing a course automatically removes its lessons, enrollments, progress
records, and reviews.
"""

from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database import Base


class Course(Base):
    """A course offered on the platform."""

    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    instructor_id = Column(String(255), nullable=False)  # MongoDB user _id
    category = Column(String(100))
    price = Column(Float, default=0.0)
    is_free = Column(Boolean, default=True)
    thumbnail_url = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    lessons = relationship("Lesson", back_populates="course", cascade="all, delete-orphan")
    enrollments = relationship("Enrollment", back_populates="course", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="course", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="course", cascade="all, delete-orphan")


class Lesson(Base):
    """An individual lesson (video or text) within a course."""

    __tablename__ = "lessons"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"))
    title = Column(String(255), nullable=False)
    content = Column(Text)
    video_url = Column(Text)
    order_index = Column(Integer, nullable=False)  # Determines lesson order within the course
    duration_minutes = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    course = relationship("Course", back_populates="lessons")


class Enrollment(Base):
    """
    Records that a specific user has enrolled in a specific course.

    The (user_id, course_id) pair is unique — a user cannot enroll twice.
    """

    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), nullable=False)  # MongoDB user _id
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"))
    enrolled_at = Column(DateTime, default=datetime.utcnow)

    course = relationship("Course", back_populates="enrollments")

    __table_args__ = (UniqueConstraint("user_id", "course_id"),)


class Progress(Base):
    """
    Tracks per-user lesson completion.

    The (user_id, lesson_id) pair is unique — one progress record per lesson
    per user. When completed=True the completed_at timestamp is set.
    """

    __tablename__ = "progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), nullable=False)
    lesson_id = Column(Integer, ForeignKey("lessons.id", ondelete="CASCADE"))
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"))
    completed = Column(Boolean, default=False)
    completed_at = Column(DateTime)

    __table_args__ = (UniqueConstraint("user_id", "lesson_id"),)


class Review(Base):
    """
    A user review for a course.

    Each user may submit at most one review per course (enforced by
    the unique constraint on user_id + course_id). Ratings are integers
    from 1 to 5 (validated in the schema layer).
    """

    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"))
    rating = Column(Integer, nullable=False)  # 1–5
    comment = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    course = relationship("Course", back_populates="reviews")

    __table_args__ = (UniqueConstraint("user_id", "course_id"),)


class Payment(Base):
    """Tracks Stripe checkout sessions for paid course purchases."""

    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"))
    stripe_checkout_session_id = Column(String(255), nullable=False, unique=True, index=True)
    stripe_payment_intent_id = Column(String(255))
    customer_email = Column(String(255))
    amount = Column(Float, default=0.0)
    currency = Column(String(16), default="usd")
    status = Column(String(64), default="pending")
    fulfilled_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    course = relationship("Course", back_populates="payments")
