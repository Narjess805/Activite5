"""MinIO-backed object storage helpers for course media uploads."""

from __future__ import annotations

import io
import json
import mimetypes
import os
import re
from pathlib import Path
from urllib.parse import urlsplit
from uuid import uuid4

from minio import Minio


MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "http://minio:9000").strip()
MINIO_PUBLIC_URL = os.getenv("MINIO_PUBLIC_URL", "http://localhost:9000").strip().rstrip("/")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minioadmin").strip()
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minioadmin").strip()
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "lms-media").strip() or "lms-media"


class StorageConfigurationError(RuntimeError):
    """Raised when MinIO storage configuration is missing or invalid."""


def _parse_http_url(value: str, env_name: str):
    parsed = urlsplit(value)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise StorageConfigurationError(
            f"{env_name} must be a valid http:// or https:// URL."
        )
    return parsed


def ensure_storage_configured() -> None:
    if not MINIO_ACCESS_KEY or not MINIO_SECRET_KEY:
        raise StorageConfigurationError(
            "MinIO credentials are missing. Set MINIO_ACCESS_KEY and MINIO_SECRET_KEY."
        )
    if "..." in MINIO_ACCESS_KEY or "..." in MINIO_SECRET_KEY:
        raise StorageConfigurationError(
            "MinIO credentials look truncated. Paste the full values without ellipsis."
        )
    if not MINIO_BUCKET:
        raise StorageConfigurationError("MINIO_BUCKET must not be empty.")

    _parse_http_url(MINIO_ENDPOINT, "MINIO_ENDPOINT")
    _parse_http_url(MINIO_PUBLIC_URL, "MINIO_PUBLIC_URL")


def _client() -> Minio:
    ensure_storage_configured()
    parsed = _parse_http_url(MINIO_ENDPOINT, "MINIO_ENDPOINT")
    return Minio(
        parsed.netloc,
        access_key=MINIO_ACCESS_KEY,
        secret_key=MINIO_SECRET_KEY,
        secure=parsed.scheme == "https",
    )


def _ensure_bucket(client: Minio) -> None:
    if not client.bucket_exists(MINIO_BUCKET):
        client.make_bucket(MINIO_BUCKET)

    policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {"AWS": ["*"]},
                "Action": ["s3:GetBucketLocation", "s3:ListBucket"],
                "Resource": [f"arn:aws:s3:::{MINIO_BUCKET}"],
            },
            {
                "Effect": "Allow",
                "Principal": {"AWS": ["*"]},
                "Action": ["s3:GetObject"],
                "Resource": [f"arn:aws:s3:::{MINIO_BUCKET}/*"],
            },
        ],
    }
    client.set_bucket_policy(MINIO_BUCKET, json.dumps(policy))


def _slug(value: str) -> str:
    normalized = re.sub(r"[^a-zA-Z0-9._-]+", "-", value.strip()).strip("-").lower()
    return normalized or "asset"


def _extension_for(filename: str, content_type: str | None) -> str:
    suffix = Path(filename).suffix.strip()
    if suffix:
        return suffix.lower()

    guessed = mimetypes.guess_extension(content_type or "")
    return (guessed or "").lower()


def upload_public_media(
    *,
    content: bytes,
    filename: str,
    content_type: str | None,
    folder: str,
    course_id: int | None = None,
    lesson_id: int | None = None,
) -> dict[str, str | int]:
    client = _client()
    _ensure_bucket(client)

    safe_folder = _slug(folder).replace(".", "-")
    safe_stem = Path(filename).stem or "upload"
    extension = _extension_for(filename, content_type)

    path_parts = [safe_folder]
    if course_id:
        path_parts.append(f"course-{course_id}")
    if lesson_id:
        path_parts.append(f"lesson-{lesson_id}")

    object_name = "/".join(
        [*path_parts, f"{_slug(safe_stem)}-{uuid4().hex}{extension}"]
    )
    stream = io.BytesIO(content)
    resolved_content_type = content_type or "application/octet-stream"
    client.put_object(
        MINIO_BUCKET,
        object_name,
        stream,
        len(content),
        content_type=resolved_content_type,
    )

    return {
        "bucket": MINIO_BUCKET,
        "object_name": object_name,
        "content_type": resolved_content_type,
        "size": len(content),
        "url": f"{MINIO_PUBLIC_URL}/{MINIO_BUCKET}/{object_name}",
    }
