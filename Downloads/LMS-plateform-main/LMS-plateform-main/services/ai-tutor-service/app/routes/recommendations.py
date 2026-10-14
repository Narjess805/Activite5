"""
Recommendation Route — POST /api/ai/recommendations

Builds personalized course recommendations using a hybrid approach:
  - LLM ranking when configured
  - deterministic fallback scoring from learner preferences, enrollments,
    categories, popularity, and ratings
"""

import logging
import re
from typing import List, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.database import get_all_courses_summary, get_recommendation_catalog
from app.llm import generate_json, is_llm_available

logger = logging.getLogger(__name__)

router = APIRouter()


class RecommendationRequest(BaseModel):
    user_id: str
    current_course_id: Optional[int] = None
    interests: List[str] = Field(default_factory=list)
    learning_goal: Optional[str] = None


class CourseRecommendation(BaseModel):
    course_id: int
    title: str
    reason: str
    score: float


class RecommendationResponse(BaseModel):
    user_id: str
    recommendations: List[CourseRecommendation]


RECOMMENDATION_PROMPT_TEMPLATE = """You are an AI course recommendation engine for an online learning platform.
Recommend the best next courses for this learner.

Learner profile:
- Interests: {interests}
- Learning goal: {learning_goal}
- Current course ID: {current_course_id}

Available Courses:
{courses_summary}

Return ONLY valid JSON with this exact structure:
[
  {{
    "course_id": 1,
    "title": "Course Title",
    "reason": "Why this course is recommended",
    "score": 0.95
  }}
]

Rules:
- Recommend up to 5 courses ranked by relevance.
- Exclude the current course.
- Prefer courses aligned to the learner's goal and interests.
- Score must be between 0.0 and 1.0.
- Return JSON only."""


def _tokenize(values: List[str]) -> set[str]:
    tokens: set[str] = set()
    for value in values:
        for part in re.split(r"[^a-z0-9]+", value.lower()):
            if len(part) >= 3:
                tokens.add(part)
    return tokens


def _normalize_text(value: Optional[str]) -> str:
    return (value or "").strip().lower()


def _has_meaningful_preferences(request: RecommendationRequest) -> bool:
    return bool(
        [item for item in request.interests if item.strip()]
        or _normalize_text(request.learning_goal)
    )


def _fallback_recommendations(request: RecommendationRequest) -> List[CourseRecommendation]:
    if not _has_meaningful_preferences(request):
        return []

    catalog, enrolled_ids = get_recommendation_catalog(request.user_id)
    if not catalog:
        return []

    interest_tokens = _tokenize(request.interests)
    goal_tokens = _tokenize([request.learning_goal or ""])

    candidates = [
        item for item in catalog
        if item["course_id"] not in enrolled_ids and item["course_id"] != request.current_course_id
    ]
    if not candidates:
        candidates = [
            item for item in catalog
            if item["course_id"] != request.current_course_id
        ]

    max_popularity = max((item["popularity"] for item in candidates), default=1) or 1
    max_rating_count = max((item["rating_count"] for item in candidates), default=1) or 1
    recommendations: List[CourseRecommendation] = []

    for item in candidates:
        title = item["title"]
        category = item["category"]
        description = item["description"]
        haystack = " ".join([title, category, description]).lower()

        matching_interests = sorted(token for token in interest_tokens if token in haystack)
        matching_goal = sorted(token for token in goal_tokens if token in haystack)
        popularity_score = item["popularity"] / max_popularity
        rating_score = min((item["rating_avg"] / 5.0) * 0.7 + (item["rating_count"] / max_rating_count) * 0.3, 1.0)
        interest_match = min(
            1.0,
            (len(matching_interests) + len(matching_goal)) / max(len(interest_tokens) + len(goal_tokens), 1),
        )

        if not matching_interests and not matching_goal:
            continue

        final_score = (
            0.55 * interest_match +
            0.25 * rating_score +
            0.20 * popularity_score
        )

        reason_parts: List[str] = []
        if matching_interests:
            reason_parts.append(f"Matches your interests in {', '.join(matching_interests[:2])}")
        if matching_goal:
            reason_parts.append(f"supports your goal around {', '.join(matching_goal[:2])}")
        if item["rating_avg"] >= 4:
            reason_parts.append("is highly rated by learners")
        elif item["popularity"] > 0:
            reason_parts.append("is popular with other learners")

        reason = ". ".join(reason_parts[:3]) if reason_parts else "A strong next course for your learning path"
        if not reason.endswith("."):
            reason += "."

        recommendations.append(
            CourseRecommendation(
                course_id=item["course_id"],
                title=title,
                reason=reason,
                score=min(round(final_score, 2), 0.99),
            )
        )

    recommendations.sort(key=lambda item: (-item.score, item.title.lower()))
    return recommendations[:5]


def _build_catalog_lookup(user_id: str) -> dict[int, dict]:
    catalog, _ = get_recommendation_catalog(user_id)
    return {item["course_id"]: item for item in catalog}


def _matches_preferences(request: RecommendationRequest, course: dict) -> bool:
    haystack = " ".join([
        course.get("title", ""),
        course.get("category", ""),
        course.get("description", ""),
    ]).lower()
    interest_tokens = _tokenize(request.interests)
    goal_tokens = _tokenize([request.learning_goal or ""])

    return bool(
        any(token in haystack for token in interest_tokens)
        or any(token in haystack for token in goal_tokens)
    )


@router.post("", response_model=RecommendationResponse)
async def get_recommendations(request: RecommendationRequest):
    if not _has_meaningful_preferences(request):
        logger.info("No meaningful preferences for user %s — returning no recommendations", request.user_id)
        return RecommendationResponse(user_id=request.user_id, recommendations=[])

    catalog_lookup = _build_catalog_lookup(request.user_id)

    if not await is_llm_available():
        logger.warning("LLM API key not configured — using fallback recommendations")
        return RecommendationResponse(
            user_id=request.user_id,
            recommendations=_fallback_recommendations(request),
        )

    courses_summary = get_all_courses_summary()
    prompt = RECOMMENDATION_PROMPT_TEMPLATE.format(
        interests=", ".join(request.interests) or "General learning",
        learning_goal=request.learning_goal or "not specified",
        current_course_id=request.current_course_id or "None",
        courses_summary=courses_summary,
    )

    try:
        parsed = await generate_json(prompt)
        logger.info("Recommendation parsed type=%s value=%s", type(parsed).__name__, str(parsed)[:500])

        items: list | None = None
        if isinstance(parsed, list):
            items = parsed
        elif isinstance(parsed, dict):
            for value in parsed.values():
                if isinstance(value, list):
                    items = value
                    break

        if items:
            recommendations = []
            for item in items[:5]:
                if not isinstance(item, dict):
                    continue
                course_id = item.get("course_id", 0)
                catalog_item = catalog_lookup.get(course_id)
                if not catalog_item or not _matches_preferences(request, catalog_item):
                    continue
                recommendations.append(
                    CourseRecommendation(
                        course_id=course_id,
                        title=item.get("title", "Unknown"),
                        reason=item.get("reason", "Recommended for you"),
                        score=min(max(float(item.get("score", 0.5)), 0.0), 1.0),
                    )
                )
            if recommendations:
                return RecommendationResponse(
                    user_id=request.user_id,
                    recommendations=recommendations,
                )
    except Exception as exc:
        logger.error("Recommendation generation failed: %s", exc)

    logger.warning("No recommendations generated for user %s — using fallback", request.user_id)
    return RecommendationResponse(
        user_id=request.user_id,
        recommendations=_fallback_recommendations(request),
    )
