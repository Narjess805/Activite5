"""
n8n Webhook Client — Course Service

Fire-and-forget utility for emitting LMS events to n8n automation workflows.
All calls run in a background thread and failures are silently logged so
that n8n downtime never affects core course-service operations.

Environment variables:
  N8N_WEBHOOK_BASE_URL  — Base URL of the n8n instance.
                          Defaults to http://n8n:5678 (internal Docker network).

Webhook paths (each corresponds to an active n8n workflow):
  enrollment      — POST /webhook/enrollment
  review          — POST /webhook/review
  lesson-complete — POST /webhook/lesson-complete
"""

import os
import logging
import threading
from typing import Any, Dict, Optional

import httpx

logger = logging.getLogger(__name__)

N8N_BASE_URL = os.getenv("N8N_WEBHOOK_BASE_URL", "http://n8n-automation:5678")
_TIMEOUT = 5.0  # seconds


def _post(path: str, payload: Dict[str, Any]) -> None:
    """
    Internal: perform a synchronous POST to an n8n webhook path.
    Intended to be called from a daemon thread only.
    """
    url = f"{N8N_BASE_URL}/webhook/{path}"
    try:
        with httpx.Client(timeout=_TIMEOUT) as client:
            response = client.post(url, json=payload)
            if response.status_code >= 400:
                logger.warning(
                    "n8n webhook %s returned HTTP %s: %s",
                    path,
                    response.status_code,
                    response.text[:200],
                )
    except Exception as exc:
        logger.warning("n8n webhook %s failed: %s", path, exc)


def _fire(path: str, payload: Dict[str, Any]) -> None:
    """Dispatch a webhook call in a daemon thread (non-blocking)."""
    t = threading.Thread(target=_post, args=(path, payload), daemon=True)
    t.start()


# ---------------------------------------------------------------------------
# Public helpers — one per workflow
# ---------------------------------------------------------------------------

def emit_enrollment(user_id: str, course_id: int, course_title: str) -> None:
    """
    Notify n8n that a user enrolled in a course.

    Triggers workflow: LMS - 1. Enrollment Notification
    n8n then logs an analytics event for the enrollment.

    Args:
        user_id:      MongoDB _id of the enrolling user.
        course_id:    PostgreSQL id of the course.
        course_title: Human-readable course title for reporting.
    """
    _fire("enrollment", {
        "user_id": user_id,
        "course_id": course_id,
        "course_title": course_title,
    })


def emit_review(
    user_id: str,
    course_id: int,
    rating: int,
    comment: Optional[str],
) -> None:
    """
    Notify n8n that a user submitted a course review.

    Triggers workflow: LMS - 2. Review Alert
    n8n logs the event and raises a low-rating alert when rating < 3.

    Args:
        user_id:   MongoDB _id of the reviewer.
        course_id: PostgreSQL id of the reviewed course.
        rating:    Integer rating 1–5.
        comment:   Optional review text.
    """
    _fire("review", {
        "user_id": user_id,
        "course_id": course_id,
        "rating": rating,
        "comment": comment or "",
    })


def emit_lesson_complete(
    user_id: str,
    course_id: int,
    lesson_id: int,
    lesson_title: str,
    all_lessons_complete: bool = False,
) -> None:
    """
    Notify n8n that a user marked a lesson as complete.

    Triggers workflow: LMS - 3. Lesson Completion Tracker
    n8n logs the event and, when all_lessons_complete is True,
    emits a course_completed event to the analytics service.

    Args:
        user_id:              MongoDB _id of the user.
        course_id:            PostgreSQL id of the course.
        lesson_id:            PostgreSQL id of the completed lesson.
        lesson_title:         Human-readable lesson title.
        all_lessons_complete: True when this is the last lesson in the course.
    """
    _fire("lesson-complete", {
        "user_id": user_id,
        "course_id": course_id,
        "lesson_id": lesson_id,
        "lesson_title": lesson_title,
        "all_lessons_complete": all_lessons_complete,
    })
