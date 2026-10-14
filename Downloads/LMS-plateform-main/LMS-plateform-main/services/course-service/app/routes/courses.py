"""
Course Routes — /api/courses

CRUD endpoints for the course catalogue.

Endpoints:
  GET    /               — List/search courses with optional filters:
                            ?category=, ?search=, ?is_free=, ?page=, ?limit=
  POST   /               — Create a new course (returns 201 + full course).
  GET    /{course_id}    — Retrieve a single course with its nested lessons.
  PUT    /{course_id}    — Partially update a course (all body fields optional).
  DELETE /{course_id}    — Remove a course and cascade-delete all related data.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List

from app.database import get_db
from app.models import Course
from app.schemas import CourseCreate, CourseUpdate, CourseResponse, CourseListResponse

router = APIRouter()


@router.get("/", response_model=List[CourseListResponse])
def list_courses(
    category: Optional[str] = None,
    search: Optional[str] = None,
    is_free: Optional[bool] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    Return a paginated list of courses.

    Supports optional server-side filtering by category, free/paid status,
    and a case-insensitive keyword search across title and description.
    """
    query = db.query(Course)

    if category:
        query = query.filter(Course.category == category)
    if is_free is not None:
        query = query.filter(Course.is_free == is_free)
    if search:
        query = query.filter(
            Course.title.ilike(f"%{search}%") | Course.description.ilike(f"%{search}%")
        )

    total = query.count()
    courses = query.offset((page - 1) * limit).limit(limit).all()
    return courses


@router.post("/", response_model=CourseResponse, status_code=201)
def create_course(course: CourseCreate, db: Session = Depends(get_db)):
    """Create a new course and return the persisted record."""
    db_course = Course(**course.model_dump())
    db.add(db_course)
    db.commit()
    db.refresh(db_course)
    return db_course


@router.get("/{course_id}", response_model=CourseResponse)
def get_course(course_id: int, db: Session = Depends(get_db)):
    """Retrieve a single course by its ID, including its nested lessons list."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.put("/{course_id}", response_model=CourseResponse)
def update_course(course_id: int, course_update: CourseUpdate, db: Session = Depends(get_db)):
    """Partially update a course. Only fields present in the request body are changed."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    for field, value in course_update.model_dump(exclude_unset=True).items():
        setattr(course, field, value)

    db.commit()
    db.refresh(course)
    return course


@router.delete("/{course_id}", status_code=204)
def delete_course(course_id: int, db: Session = Depends(get_db)):
    """
    Permanently delete a course.

    All associated lessons, enrollments, progress records, and reviews are
    removed automatically via CASCADE.
    """
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    db.delete(course)
    db.commit()
