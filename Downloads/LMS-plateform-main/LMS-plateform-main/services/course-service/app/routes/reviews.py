"""
Review Routes — /api/courses/{course_id}/reviews

Allows authenticated users to submit and view course reviews.
Each user may only submit one review per course (enforced at the DB level
and returned as a 409 Conflict if violated).

Endpoints:
  POST /{course_id}/reviews   — Submit a review (rating 1–5 + optional comment).
  GET  /{course_id}/reviews   — List all reviews for a course.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import Review, Course
from app.schemas import ReviewCreate, ReviewResponse
from app import n8n_client

router = APIRouter()


@router.post("/{course_id}/reviews", response_model=ReviewResponse, status_code=201)
def create_review(course_id: int, review: ReviewCreate, db: Session = Depends(get_db)):
    """
    Submit a new review for a course.

    Returns 409 Conflict if a review from the same user already exists for
    this course.
    """
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    existing = db.query(Review).filter(
        Review.user_id == review.user_id, Review.course_id == course_id
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Review already exists")

    db_review = Review(course_id=course_id, **review.model_dump())
    db.add(db_review)
    db.commit()
    db.refresh(db_review)
    n8n_client.emit_review(review.user_id, course_id, db_review.rating, db_review.comment)
    return db_review


@router.get("/{course_id}/reviews", response_model=List[ReviewResponse])
def list_reviews(course_id: int, db: Session = Depends(get_db)):
    """Return all reviews for the given course."""
    return db.query(Review).filter(Review.course_id == course_id).all()
