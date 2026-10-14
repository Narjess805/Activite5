"""Stripe helpers used by the course service payment flow."""

from __future__ import annotations

import os
from decimal import Decimal, ROUND_HALF_UP
from urllib.parse import urlsplit

import stripe


STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "").strip()
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "").strip()
STRIPE_CURRENCY = os.getenv("STRIPE_CURRENCY", "usd").strip().lower() or "usd"
FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost").strip().rstrip("/")

if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY


class StripeConfigurationError(RuntimeError):
    """Raised when Stripe configuration is missing or invalid."""


def _validate_secret_key(secret_key: str) -> None:
    if not secret_key:
        raise StripeConfigurationError("Stripe is not configured. Set STRIPE_SECRET_KEY.")
    if "..." in secret_key:
        raise StripeConfigurationError(
            "STRIPE_SECRET_KEY looks truncated. Paste the full Stripe secret key without ellipsis."
        )
    if not secret_key.startswith(("sk_test_", "sk_live_")):
        raise StripeConfigurationError(
            "STRIPE_SECRET_KEY must start with sk_test_ or sk_live_."
        )


def _validate_webhook_secret(webhook_secret: str) -> None:
    if not webhook_secret:
        raise StripeConfigurationError(
            "Stripe webhook verification is not configured. Set STRIPE_WEBHOOK_SECRET."
        )
    if "..." in webhook_secret:
        raise StripeConfigurationError(
            "STRIPE_WEBHOOK_SECRET looks truncated. Paste the full webhook signing secret."
        )
    if not webhook_secret.startswith("whsec_"):
        raise StripeConfigurationError(
            "STRIPE_WEBHOOK_SECRET must start with whsec_."
        )


def ensure_stripe_configured() -> None:
    _validate_secret_key(STRIPE_SECRET_KEY)


def normalize_frontend_base_url(frontend_origin: str | None = None) -> str:
    candidate = (frontend_origin or FRONTEND_BASE_URL).strip().rstrip("/")
    parsed = urlsplit(candidate)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise StripeConfigurationError(
            "frontend_origin must be a valid http:// or https:// origin."
        )
    return f"{parsed.scheme}://{parsed.netloc}"


def build_checkout_urls(course_id: int, frontend_origin: str | None = None) -> tuple[str, str]:
    frontend_base_url = normalize_frontend_base_url(frontend_origin)
    success_url = (
        f"{frontend_base_url}/courses/{course_id}"
        "?checkout=success&session_id={CHECKOUT_SESSION_ID}"
    )
    cancel_url = f"{frontend_base_url}/courses/{course_id}?checkout=cancelled"
    return success_url, cancel_url


def amount_to_cents(amount: float) -> int:
    normalized = Decimal(str(amount)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return int(normalized * 100)


def create_checkout_session(
    *,
    course_id: int,
    course_title: str,
    course_description: str | None,
    amount: float,
    user_id: str,
    user_email: str | None,
    frontend_origin: str | None = None,
) -> stripe.checkout.Session:
    ensure_stripe_configured()
    success_url, cancel_url = build_checkout_urls(course_id, frontend_origin)
    unit_amount = amount_to_cents(amount)
    if unit_amount <= 0:
        raise StripeConfigurationError("Paid courses must have a positive Stripe amount.")

    session = stripe.checkout.Session.create(
        mode="payment",
        customer_email=user_email or None,
        success_url=success_url,
        cancel_url=cancel_url,
        line_items=[
            {
                "quantity": 1,
                "price_data": {
                    "currency": STRIPE_CURRENCY,
                    "unit_amount": unit_amount,
                    "product_data": {
                        "name": course_title,
                        "description": course_description
                        or f"Full access to {course_title}",
                    },
                },
            }
        ],
        metadata={
            "course_id": str(course_id),
            "user_id": user_id,
            "course_title": course_title,
        },
    )
    return session


def retrieve_checkout_session(session_id: str) -> stripe.checkout.Session:
    ensure_stripe_configured()
    return stripe.checkout.Session.retrieve(session_id)


def construct_webhook_event(payload: bytes, signature: str) -> stripe.Event:
    ensure_stripe_configured()
    _validate_webhook_secret(STRIPE_WEBHOOK_SECRET)
    return stripe.Webhook.construct_event(payload, signature, STRIPE_WEBHOOK_SECRET)
