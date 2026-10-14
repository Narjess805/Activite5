"""
LLM client helpers for the AI Tutor Service.

Supports the official OpenAI API by default while still allowing any
OpenAI-compatible endpoint through environment variables.

Environment variables:
    OPENAI_API_KEY   OpenAI API key
    OPENAI_BASE_URL  Optional OpenAI-compatible base URL
    GROQ_API_KEY     Groq API key
    GROQ_BASE_URL    Optional override for Groq's OpenAI-compatible base URL
    LLM_MODEL        Model name to use
"""

import json
import logging
import os
from json import JSONDecodeError, JSONDecoder

from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "").strip()
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
GROQ_BASE_URL = os.getenv("GROQ_BASE_URL", "").strip() or "https://api.groq.com/openai/v1"

if OPENAI_API_KEY:
    API_KEY = OPENAI_API_KEY
    BASE_URL = OPENAI_BASE_URL or None
    LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")
    LLM_BACKEND = "openai-compatible" if OPENAI_BASE_URL else "openai"
elif GROQ_API_KEY:
    API_KEY = GROQ_API_KEY
    BASE_URL = GROQ_BASE_URL
    LLM_MODEL = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile")
    LLM_BACKEND = "groq"
else:
    API_KEY = ""
    BASE_URL = OPENAI_BASE_URL or None
    LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")
    LLM_BACKEND = "unconfigured"

client = AsyncOpenAI(
    api_key=API_KEY,
    base_url=BASE_URL,
) if API_KEY else None


def _extract_json_payload(text: str) -> dict | list | None:
    """Extract the first valid JSON object or array from model output."""
    cleaned = text.strip()
    if not cleaned:
        return None

    if "```json" in cleaned:
        cleaned = cleaned.split("```json", 1)[1].split("```", 1)[0].strip()
    elif "```" in cleaned:
        cleaned = cleaned.split("```", 1)[1].split("```", 1)[0].strip()

    try:
        return json.loads(cleaned)
    except JSONDecodeError:
        decoder = JSONDecoder()
        for index, char in enumerate(cleaned):
            if char not in "[{":
                continue
            try:
                parsed, _ = decoder.raw_decode(cleaned[index:])
                return parsed
            except JSONDecodeError:
                continue

    logger.warning("Failed to parse LLM JSON output: %s", cleaned[:200])
    return None


async def chat_completion(
    system_prompt: str,
    messages: list[dict],
    temperature: float = 0.7,
) -> str:
    """Send a multi-turn chat request and return the assistant reply."""
    if not client:
        return "AI tutor is not configured. Please set OPENAI_API_KEY or GROQ_API_KEY."

    request_messages = [{"role": "system", "content": system_prompt}, *messages]

    try:
        resp = await client.chat.completions.create(
            model=LLM_MODEL,
            messages=request_messages,
            temperature=temperature,
            max_tokens=512,
        )
        return resp.choices[0].message.content or "I'm sorry, I couldn't generate a response."
    except Exception as exc:
        logger.error("LLM chat failed: %s", exc)
        raise


async def generate_text(prompt: str, temperature: float = 0.7) -> str:
    """Send a single prompt and return free-form text."""
    if not client:
        return ""

    try:
        resp = await client.chat.completions.create(
            model=LLM_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=1024,
        )
        return resp.choices[0].message.content or ""
    except Exception as exc:
        logger.error("LLM text generation failed: %s", exc)
        return ""


async def generate_json(prompt: str, temperature: float = 0.3) -> dict | list | None:
    """Generate a response and parse the first valid JSON payload returned."""
    if not client:
        return None

    try:
        resp = await client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Return valid JSON only. Do not use markdown fences or explanatory text."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            temperature=temperature,
            max_tokens=1024,
        )
        raw = resp.choices[0].message.content or ""
    except Exception as exc:
        logger.error("LLM JSON generation failed: %s", exc)
        return None

    parsed = _extract_json_payload(raw)
    if isinstance(parsed, dict) and len(parsed) == 1:
        value = next(iter(parsed.values()))
        if isinstance(value, list):
            return value
    return parsed


async def is_llm_available() -> bool:
    """Health check for LLM configuration."""
    return bool(client)
