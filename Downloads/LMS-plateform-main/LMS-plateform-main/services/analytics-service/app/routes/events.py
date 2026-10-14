"""
Analytics Events Routes — /api/analytics/events

Collects and queries user behaviour events emitted by the frontend and
other services. Events are stored in the PostgreSQL analytics table.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AnalyticsEvent

router = APIRouter()


class EventInput(BaseModel):
    event_type: str
    user_id: Optional[str] = None
    course_id: Optional[int] = None
    lesson_id: Optional[int] = None
    metadata: Optional[dict] = None


class EventResponse(BaseModel):
    id: str
    event_type: str
    timestamp: str


@router.post("/", response_model=EventResponse, status_code=201)
async def track_event(event: EventInput, db: Session = Depends(get_db)):
    """Record an analytics event in PostgreSQL."""
    db_event = AnalyticsEvent(
        event_type=event.event_type,
        user_id=event.user_id,
        course_id=event.course_id,
        lesson_id=event.lesson_id,
        event_metadata=event.metadata,
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return EventResponse(
        id=str(db_event.id),
        event_type=db_event.event_type,
        timestamp=db_event.created_at.isoformat(),
    )


@router.get("/")
async def list_events(
    event_type: Optional[str] = None,
    user_id: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """List recent analytics events with optional filters."""
    query = db.query(AnalyticsEvent)
    if event_type:
        query = query.filter(AnalyticsEvent.event_type == event_type)
    if user_id:
        query = query.filter(AnalyticsEvent.user_id == user_id)
    rows = query.order_by(AnalyticsEvent.created_at.desc()).limit(limit).all()
    return [
        {
            "id": str(r.id),
            "event_type": r.event_type,
            "user_id": r.user_id,
            "course_id": r.course_id,
            "lesson_id": r.lesson_id,
            "metadata": r.event_metadata,
            "timestamp": r.created_at.isoformat(),
        }
        for r in rows
    ]
