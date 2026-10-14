"""
Analytics Dashboard Route — GET /api/analytics/dashboard

Returns aggregated platform-wide statistics computed from the analytics
table in PostgreSQL. Falls back to sample data when no events are recorded.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct, case, extract

from app.database import get_db
from app.models import AnalyticsEvent

router = APIRouter()


class TrendItem(BaseModel):
    label: str
    value: int


class DashboardStats(BaseModel):
    total_views: int
    total_enrollments: int
    active_users: int
    completion_rate: float
    popular_courses: List[TrendItem]
    enrollment_trends: List[TrendItem]


@router.get("/", response_model=DashboardStats)
async def get_dashboard(db: Session = Depends(get_db)):
    """Aggregate analytics from PostgreSQL events table."""

    total_views = db.query(func.count(AnalyticsEvent.id)).filter(
        AnalyticsEvent.event_type == "page_view"
    ).scalar() or 0

    total_enrollments = db.query(func.count(AnalyticsEvent.id)).filter(
        AnalyticsEvent.event_type == "enrollment"
    ).scalar() or 0

    active_users = db.query(func.count(distinct(AnalyticsEvent.user_id))).filter(
        AnalyticsEvent.user_id.isnot(None)
    ).scalar() or 0

    total_completed = db.query(func.count(AnalyticsEvent.id)).filter(
        AnalyticsEvent.event_type == "course_completed"
    ).scalar() or 0

    completion_rate = 0.0
    if total_enrollments > 0:
        completion_rate = round((total_completed / total_enrollments) * 100, 1)

    # Popular courses: top 5 by enrollment event count
    pop_rows = (
        db.query(
            AnalyticsEvent.course_id,
            func.count(AnalyticsEvent.id).label("cnt"),
        )
        .filter(
            AnalyticsEvent.event_type == "enrollment",
            AnalyticsEvent.course_id.isnot(None),
        )
        .group_by(AnalyticsEvent.course_id)
        .order_by(func.count(AnalyticsEvent.id).desc())
        .limit(5)
        .all()
    )
    popular_courses = [
        TrendItem(label=f"Course #{r.course_id}", value=r.cnt) for r in pop_rows
    ]

    # Enrollment trends: last 6 months
    month_names = [
        "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ]
    trend_rows = (
        db.query(
            extract("month", AnalyticsEvent.created_at).label("m"),
            func.count(AnalyticsEvent.id).label("cnt"),
        )
        .filter(AnalyticsEvent.event_type == "enrollment")
        .group_by("m")
        .order_by("m")
        .limit(6)
        .all()
    )
    enrollment_trends = [
        TrendItem(label=month_names[int(r.m)], value=r.cnt) for r in trend_rows
    ]

    # Fall back to sample data when no events recorded yet
    if total_enrollments == 0 and total_views == 0 and active_users == 0:
        return DashboardStats(
            total_views=15420,
            total_enrollments=3250,
            active_users=1890,
            completion_rate=68.5,
            popular_courses=[
                TrendItem(label="Introduction to Python", value=1250),
                TrendItem(label="Web Development with React", value=980),
                TrendItem(label="Data Science Fundamentals", value=750),
                TrendItem(label="DevOps & Cloud Computing", value=520),
                TrendItem(label="Machine Learning A-Z", value=410),
            ],
            enrollment_trends=[
                TrendItem(label="Jan", value=280),
                TrendItem(label="Feb", value=320),
                TrendItem(label="Mar", value=410),
                TrendItem(label="Apr", value=380),
                TrendItem(label="May", value=450),
                TrendItem(label="Jun", value=520),
            ],
        )

    return DashboardStats(
        total_views=total_views,
        total_enrollments=total_enrollments,
        active_users=active_users,
        completion_rate=completion_rate,
        popular_courses=popular_courses,
        enrollment_trends=enrollment_trends,
    )
