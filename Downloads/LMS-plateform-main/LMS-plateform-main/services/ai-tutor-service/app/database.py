"""
Database access for the AI Tutor Service.

Reads course and lesson data from the shared PostgreSQL database so the LLM
can be provided with the relevant course context when answering questions,
generating quizzes, or making recommendations.
"""

import os
from sqlalchemy import create_engine, Column, Integer, String, Text, ForeignKey, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://lms_user:lms_password@localhost:5432/lms_courses",
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ── Lightweight ORM models (read-only mirrors of course-service tables) ──


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True)
    title = Column(String(255))
    description = Column(Text)
    category = Column(String(100))
    instructor_id = Column(String(255))

    lessons = relationship("Lesson", back_populates="course", order_by="Lesson.order_index")


class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(Integer, primary_key=True)
    course_id = Column(Integer, ForeignKey("courses.id"))
    title = Column(String(255))
    content = Column(Text)
    order_index = Column(Integer)
    duration_minutes = Column(Integer)

    course = relationship("Course", back_populates="lessons")


class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True)
    user_id = Column(String(255), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"))


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True)
    user_id = Column(String(255), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"))
    rating = Column(Integer, nullable=False)


# ── Helper functions ──


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_course_context(course_id: int) -> str:
    """
    Build a text summary of a course and its lessons for LLM context.
    Returns a formatted string with course title, description, and lesson outlines.
    """
    db = SessionLocal()
    try:
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            return f"Course {course_id} not found."

        parts = [
            f"Course: {course.title}",
            f"Category: {course.category or 'General'}",
            f"Description: {course.description or 'No description available.'}",
            "",
            "Lessons:",
        ]
        for lesson in course.lessons:
            lesson_number = lesson.order_index if lesson.order_index is not None else len(parts)
            parts.append(f"  {lesson_number}. {lesson.title}")
            if lesson.content:
                # Include first 200 chars of each lesson content for context
                snippet = lesson.content[:200]
                parts.append(f"     Content: {snippet}")
        return "\n".join(parts)
    finally:
        db.close()


def get_lesson_context(course_id: int, lesson_id: int) -> str:
    """Get the full content of a specific lesson for quiz generation."""
    db = SessionLocal()
    try:
        lesson = (
            db.query(Lesson)
            .filter(Lesson.course_id == course_id, Lesson.id == lesson_id)
            .first()
        )
        if not lesson:
            return ""
        return f"Lesson: {lesson.title}\n\nContent:\n{lesson.content or 'No content available.'}"
    finally:
        db.close()


def get_all_courses_summary() -> str:
    """Get a brief summary of all courses for recommendations."""
    db = SessionLocal()
    try:
        courses = db.query(Course).all()
        if not courses:
            return "No courses available."
        parts = []
        for c in courses:
            parts.append(
                f"- ID: {c.id}, Title: {c.title}, Category: {c.category or 'General'}, "
                f"Description: {(c.description or '')[:200]}"
            )
        return "\n".join(parts)
    finally:
        db.close()


def get_recommendation_catalog(user_id: str) -> tuple[list[dict], set[int]]:
    """Return course metadata plus the set of course IDs already enrolled by the user."""
    db = SessionLocal()
    try:
        courses = db.query(Course).all()
        enrolled_rows = (
            db.query(Enrollment.course_id)
            .filter(Enrollment.user_id == user_id)
            .all()
        )
        enrolled_ids = {course_id for (course_id,) in enrolled_rows}

        popularity_rows = (
            db.query(Enrollment.course_id, func.count(Enrollment.id))
            .group_by(Enrollment.course_id)
            .all()
        )
        rating_rows = (
            db.query(Review.course_id, func.avg(Review.rating), func.count(Review.id))
            .group_by(Review.course_id)
            .all()
        )
        popularity_by_course = {
            course_id: count for course_id, count in popularity_rows if course_id is not None
        }
        ratings_by_course = {
            course_id: {
                "rating_avg": float(avg or 0),
                "rating_count": int(count or 0),
            }
            for course_id, avg, count in rating_rows
            if course_id is not None
        }

        catalog = [
            {
                "course_id": course.id,
                "title": course.title or f"Course {course.id}",
                "category": course.category or "General",
                "description": course.description or "",
                "popularity": int(popularity_by_course.get(course.id, 0)),
                "rating_avg": ratings_by_course.get(course.id, {}).get("rating_avg", 0.0),
                "rating_count": ratings_by_course.get(course.id, {}).get("rating_count", 0),
            }
            for course in courses
        ]
        return catalog, enrolled_ids
    finally:
        db.close()
