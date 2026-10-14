"""
Enrollment & Progress Routes — /api/courses

Manages course enrollments and per-lesson learning progress.

Endpoints:
  POST /{course_id}/enroll                              — Enroll a user in a course.
                                                          Returns 409 if already enrolled.
  GET  /{course_id}/enrollments                         — List all enrollments for a course.
  GET  /user/{user_id}/enrollments                      — List all courses a user is enrolled in.
  PUT  /{course_id}/lessons/{lesson_id}/progress        — Mark a lesson complete or incomplete.
                                                          Requires ?user_id= query parameter.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.database import get_db
from app.models import Enrollment, Course, Progress, Lesson
from app.schemas import EnrollmentCreate, EnrollmentResponse, ProgressUpdate, ProgressResponse
from app import n8n_client

router = APIRouter()


@router.post("/{course_id}/enroll", response_model=EnrollmentResponse, status_code=201)
def enroll_in_course(course_id: int, enrollment: EnrollmentCreate, db: Session = Depends(get_db)):
    """
    Enroll a user in a course.

    Returns 409 Conflict when the user is already enrolled to prevent
    duplicate enrollment records.
    """
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if not course.is_free:
        raise HTTPException(
            status_code=402,
            detail="Paid courses must be purchased through Stripe Checkout",
        )

    existing = db.query(Enrollment).filter(
        Enrollment.user_id == enrollment.user_id,
        Enrollment.course_id == course_id,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Already enrolled")

    db_enrollment = Enrollment(user_id=enrollment.user_id, course_id=course_id)
    db.add(db_enrollment)
    db.commit()
    db.refresh(db_enrollment)
    n8n_client.emit_enrollment(enrollment.user_id, course_id, course.title)
    return db_enrollment


@router.get("/{course_id}/enrollments", response_model=List[EnrollmentResponse])
def list_enrollments(course_id: int, db: Session = Depends(get_db)):
    """Return all enrollment records for the given course."""
    return db.query(Enrollment).filter(Enrollment.course_id == course_id).all()


@router.get("/user/{user_id}/enrollments", response_model=List[EnrollmentResponse])
def get_user_enrollments(user_id: str, db: Session = Depends(get_db)):
    """Return all courses a specific user is enrolled in."""
    return db.query(Enrollment).filter(Enrollment.user_id == user_id).all()


@router.put("/{course_id}/lessons/{lesson_id}/progress", response_model=ProgressResponse)
def update_progress(
    course_id: int,
    lesson_id: int,
    progress_data: ProgressUpdate,
    user_id: str = "",
    db: Session = Depends(get_db),
):
    """
    Upsert a lesson progress record for the given user.

    If a progress record already exists it is updated in-place; otherwise a
    new record is created. The completed_at timestamp is set when the lesson
    is marked complete and cleared when it is marked incomplete.

    Args:
        user_id: Passed as a query parameter (?user_id=<mongo_id>).
    """
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id query parameter required")

    lesson = db.query(Lesson).filter(
        Lesson.id == lesson_id, Lesson.course_id == course_id
    ).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    progress = db.query(Progress).filter(
        Progress.user_id == user_id, Progress.lesson_id == lesson_id
    ).first()

    if progress:
        progress.completed = progress_data.completed
        progress.completed_at = datetime.utcnow() if progress_data.completed else None
    else:
        progress = Progress(
            user_id=user_id,
            lesson_id=lesson_id,
            course_id=course_id,
            completed=progress_data.completed,
            completed_at=datetime.utcnow() if progress_data.completed else None,
        )
        db.add(progress)

    db.commit()
    db.refresh(progress)
    total_lessons = db.query(Lesson).filter(Lesson.course_id == course_id).count()
    completed_count = db.query(Progress).filter(
        Progress.user_id == user_id,
        Progress.course_id == course_id,
        Progress.completed == True,
    ).count()
    all_complete = total_lessons > 0 and completed_count >= total_lessons
    n8n_client.emit_lesson_complete(user_id, course_id, lesson_id, lesson.title, all_complete)
    return progress


@router.get("/{course_id}/progress/{user_id}", response_model=List[ProgressResponse])
def get_user_progress(course_id: int, user_id: str, db: Session = Depends(get_db)):
    return db.query(Progress).filter(
        Progress.user_id == user_id, Progress.course_id == course_id
    ).all()
