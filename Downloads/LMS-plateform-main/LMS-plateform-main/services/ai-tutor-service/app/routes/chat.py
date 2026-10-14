"""
AI Chat Route — POST /api/ai/chat

Provides an AI-powered question-and-answer endpoint scoped to a specific
course. Clients send a message along with the conversation history so the
AI can provide contextually relevant answers.

The handler fetches the course content from PostgreSQL, builds a system
prompt with course context, and calls the configured LLM.
Falls back to a descriptive placeholder if the LLM is unavailable.
"""

import logging
from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import List

from app.llm import chat_completion, is_llm_available
from app.database import get_course_context

logger = logging.getLogger(__name__)

router = APIRouter()


class ChatMessage(BaseModel):
    """A single turn in the conversation history."""
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    """Request body for the AI chat endpoint."""
    course_id: int
    message: str
    history: List[ChatMessage] = Field(default_factory=list)


class ChatResponse(BaseModel):
    """Response body returned by the AI chat endpoint."""
    reply: str
    course_id: int


SYSTEM_PROMPT_TEMPLATE = """You are an AI tutor. Help students understand this course:

{course_context}

Be concise, clear, and encouraging. Keep answers short (2-4 paragraphs max)."""


def _fallback_chat_reply(course_context: str, question: str) -> str:
    """
    Return a helpful course-grounded reply when the LLM is unavailable.
    """
    lesson_lines = [
        line.strip()
        for line in course_context.splitlines()
        if line.strip().startswith(tuple(f"{i}." for i in range(1, 20))) or line.strip().startswith("Content:")
    ]
    overview = course_context[:500].strip()

    if lesson_lines:
        lesson_preview = "\n".join(lesson_lines[:4])
        return (
            f"I can't reach the live AI model right now, but here's help based on this course.\n\n"
            f"Your question: {question}\n\n"
            f"Course overview:\n{overview}\n\n"
            f"Key lesson points:\n{lesson_preview}\n\n"
            f"If you want, ask a more specific question about one lesson and I can answer from the course content that is available locally."
        )

    return (
        f"I can't reach the live AI model right now, but I can still help from the saved course content.\n\n"
        f"Your question: {question}\n\n"
        f"Course overview:\n{overview}\n\n"
        f"Ask about a specific concept from this course and I'll answer using the material stored in the platform."
    )


@router.post("", response_model=ChatResponse)
async def chat_with_tutor(request: ChatRequest):
    """
    AI-powered Q&A based on course content.
    Connects to the configured LLM with course context for real answers.
    Falls back to placeholder if the LLM is unavailable.
    """
    # Fetch course context from database
    course_context = get_course_context(request.course_id)
    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(course_context=course_context)

    if not await is_llm_available():
        logger.warning("LLM API key not configured, using course-context fallback")
        return ChatResponse(
            reply=_fallback_chat_reply(course_context, request.message),
            course_id=request.course_id,
        )

    # Build message list from history + current message
    messages = [{"role": m.role, "content": m.content} for m in request.history]
    messages.append({"role": "user", "content": request.message})

    try:
        reply = await chat_completion(system_prompt, messages)
    except Exception as e:
        logger.error("LLM chat failed: %s", e)
        reply = _fallback_chat_reply(course_context, request.message)

    return ChatResponse(reply=reply, course_id=request.course_id)
