"""
Lesson Routes — /api/courses/{course_id}/lessons

CRUD endpoints for managing lessons within a course.
All endpoints first verify that the parent course exists before operating
on lessons to keep error messages meaningful.

Endpoints:
  GET    /{course_id}/lessons               — List lessons ordered by order_index.
  POST   /{course_id}/lessons               — Add a new lesson to a course.
  GET    /{course_id}/lessons/{lesson_id}   — Retrieve a single lesson.
  PUT    /{course_id}/lessons/{lesson_id}   — Partially update a lesson.
  DELETE /{course_id}/lessons/{lesson_id}   — Remove a lesson from a course.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import Lesson, Course
from app.schemas import LessonCreate, LessonUpdate, LessonResponse

router = APIRouter()


@router.get("/{course_id}/lessons", response_model=List[LessonResponse])
def list_lessons(course_id: int, db: Session = Depends(get_db)):
    """Return all lessons for a course, sorted by order_index."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return db.query(Lesson).filter(Lesson.course_id == course_id).order_by(Lesson.order_index).all()


@router.post("/{course_id}/lessons", response_model=LessonResponse, status_code=201)
def create_lesson(course_id: int, lesson: LessonCreate, db: Session = Depends(get_db)):
    """Add a new lesson to an existing course."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    db_lesson = Lesson(course_id=course_id, **lesson.model_dump())
    db.add(db_lesson)
    db.commit()
    db.refresh(db_lesson)
    return db_lesson


@router.get("/{course_id}/lessons/{lesson_id}", response_model=LessonResponse)
def get_lesson(course_id: int, lesson_id: int, db: Session = Depends(get_db)):
    """Retrieve a single lesson by its ID, scoped to the given course."""
    lesson = db.query(Lesson).filter(
        Lesson.id == lesson_id, Lesson.course_id == course_id
    ).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return lesson


@router.put("/{course_id}/lessons/{lesson_id}", response_model=LessonResponse)
def update_lesson(
    course_id: int, lesson_id: int, lesson_update: LessonUpdate, db: Session = Depends(get_db)
):
    """Partially update a lesson. Only fields present in the request body are changed."""
    lesson = db.query(Lesson).filter(
        Lesson.id == lesson_id, Lesson.course_id == course_id
    ).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    for field, value in lesson_update.model_dump(exclude_unset=True).items():
        setattr(lesson, field, value)

    db.commit()
    db.refresh(lesson)
    return lesson


@router.delete("/{course_id}/lessons/{lesson_id}", status_code=204)
def delete_lesson(course_id: int, lesson_id: int, db: Session = Depends(get_db)):
    """Permanently remove a lesson (and its progress records) from a course."""
    lesson = db.query(Lesson).filter(
        Lesson.id == lesson_id, Lesson.course_id == course_id
    ).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    db.delete(lesson)
    db.commit()
