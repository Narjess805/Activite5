"""
Quiz Generation Route — POST /api/ai/quiz/generate

Generates multiple-choice quiz questions for a given course or lesson using
the configured LLM. Falls back to sample questions if the LLM is unavailable.
"""

import logging
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional

from app.llm import generate_json, is_llm_available
from app.database import get_course_context, get_lesson_context

logger = logging.getLogger(__name__)

router = APIRouter()


class QuizGenerateRequest(BaseModel):
    course_id: int
    lesson_id: Optional[int] = None
    num_questions: int = 5


class QuizOption(BaseModel):
    label: str
    text: str
    is_correct: bool = False


class QuizQuestion(BaseModel):
    question: str
    options: List[QuizOption]
    explanation: str


class QuizResponse(BaseModel):
    course_id: int
    lesson_id: Optional[int] = None
    questions: List[QuizQuestion]


QUIZ_PROMPT_TEMPLATE = """You are an expert quiz generator specializing in creating assessments tied directly to specific educational content.

Generate exactly {num_questions} multiple-choice questions that are EXCLUSIVELY based on the lesson content below—never include questions about general knowledge or topics outside the lesson scope.

LESSON CONTENT:
{context}

Core Requirements:
- Every question must reference, test, or directly relate to material explicitly covered in the lesson above.
- Do not add tangential information, common knowledge, or content from other sources.
- Questions should verify that the learner understood and retained the specific concepts from the lesson.
- Each question can be answered using ONLY information from the lesson.

Return ONLY a valid JSON array with this exact structure (no other text):
[
  {{
    "question": "The question text",
    "options": [
      {{"label": "A", "text": "Option text", "is_correct": false}},
      {{"label": "B", "text": "Option text", "is_correct": true}},
      {{"label": "C", "text": "Option text", "is_correct": false}},
      {{"label": "D", "text": "Option text", "is_correct": false}}
    ],
    "explanation": "Brief explanation referencing the lesson content"
  }}
]

Rules:
- Each question must have exactly 4 options (A, B, C, D).
- Exactly one option must be correct (is_correct: true).
- Questions should test understanding, not just memorisation.
- Vary difficulty from easy to moderate.
- Return ONLY the JSON array, no markdown, no extra text."""


def _fallback_questions() -> List[QuizQuestion]:
    """Sample questions returned when LLM is unavailable."""
    return [
        QuizQuestion(
            question="What is a variable in programming?",
            options=[
                QuizOption(label="A", text="A container for storing data values", is_correct=True),
                QuizOption(label="B", text="A type of loop"),
                QuizOption(label="C", text="A function definition"),
                QuizOption(label="D", text="An error message"),
            ],
            explanation="A variable is a named container used to store data values in memory.",
        ),
        QuizQuestion(
            question="Which keyword is used to define a function in Python?",
            options=[
                QuizOption(label="A", text="function"),
                QuizOption(label="B", text="func"),
                QuizOption(label="C", text="def", is_correct=True),
                QuizOption(label="D", text="define"),
            ],
            explanation="In Python, the 'def' keyword is used to define a function.",
        ),
        QuizQuestion(
            question="What does API stand for?",
            options=[
                QuizOption(label="A", text="Application Programming Interface", is_correct=True),
                QuizOption(label="B", text="Advanced Program Integration"),
                QuizOption(label="C", text="Automated Process Instruction"),
                QuizOption(label="D", text="Application Process Interface"),
            ],
            explanation="API stands for Application Programming Interface.",
        ),
    ]


@router.post("/generate", response_model=QuizResponse)
async def generate_quiz(request: QuizGenerateRequest):
    """
    AI-powered quiz generation based on course/lesson content.
    Uses the configured LLM to generate contextual questions.
    Falls back to sample questions if the LLM is unavailable.
    """
    if not await is_llm_available():
        logger.warning("LLM unavailable, returning fallback quiz questions")
        return QuizResponse(
            course_id=request.course_id,
            lesson_id=request.lesson_id,
            questions=_fallback_questions()[:request.num_questions],
        )

    # Build context from course/lesson data
    if request.lesson_id:
        context = get_lesson_context(request.course_id, request.lesson_id)
        if not context:
            context = get_course_context(request.course_id)
    else:
        context = get_course_context(request.course_id)

    prompt = QUIZ_PROMPT_TEMPLATE.format(
        num_questions=request.num_questions,
        context=context,
    )

    try:
        parsed = await generate_json(prompt)
        if parsed and isinstance(parsed, list):
            questions = []
            for q in parsed[:request.num_questions]:
                options = [
                    QuizOption(
                        label=opt.get("label", chr(65 + i)),
                        text=opt.get("text", ""),
                        is_correct=opt.get("is_correct", False),
                    )
                    for i, opt in enumerate(q.get("options", []))
                ]
                questions.append(
                    QuizQuestion(
                        question=q.get("question", ""),
                        options=options,
                        explanation=q.get("explanation", ""),
                    )
                )
            if questions:
                return QuizResponse(
                    course_id=request.course_id,
                    lesson_id=request.lesson_id,
                    questions=questions,
                )
    except Exception as e:
        logger.error("LLM quiz generation failed: %s", e)

    # Fallback
    return QuizResponse(
        course_id=request.course_id,
        lesson_id=request.lesson_id,
        questions=_fallback_questions()[:request.num_questions],
    )
