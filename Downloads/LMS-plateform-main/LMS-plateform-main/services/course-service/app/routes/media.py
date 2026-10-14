"""Media upload routes backed by MinIO object storage."""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.storage import StorageConfigurationError, upload_public_media

router = APIRouter()

MAX_UPLOAD_BYTES = 100 * 1024 * 1024

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"}
VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov", ".m4v", ".ogg"}


def _validate_kind(kind: str, filename: str, content_type: str | None) -> str:
    extension = Path(filename).suffix.lower()
    normalized_type = (content_type or "").lower()

    if kind == "course_thumbnail":
        if normalized_type.startswith("image/") or extension in IMAGE_EXTENSIONS:
            return "course-thumbnails"
        raise HTTPException(status_code=400, detail="Course thumbnails must be image files.")

    if kind == "lesson_video":
        if normalized_type.startswith("video/") or extension in VIDEO_EXTENSIONS:
            return "lesson-videos"
        raise HTTPException(status_code=400, detail="Lesson videos must be video files.")

    raise HTTPException(status_code=400, detail="Unsupported upload kind.")


@router.post("/media/upload", status_code=201)
async def upload_media(
    file: UploadFile = File(...),
    kind: str = Form(...),
    course_id: int | None = Form(default=None),
    lesson_id: int | None = Form(default=None),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="A file is required.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Uploaded file exceeds the 100MB limit.")

    folder = _validate_kind(kind, file.filename, file.content_type)

    try:
        return upload_public_media(
            content=content,
            filename=file.filename,
            content_type=file.content_type,
            folder=folder,
            course_id=course_id,
            lesson_id=lesson_id,
        )
    except StorageConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - storage/network failures
        raise HTTPException(status_code=502, detail=f"Media upload failed: {exc}") from exc
