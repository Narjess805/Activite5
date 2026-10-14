"""Stripe payment routes for paid course checkout and fulfillment."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import n8n_client
from app.database import get_db
from app.models import Course, Enrollment, Payment
from app.schemas import (
    CheckoutSessionCreate,
    CheckoutSessionResponse,
    CheckoutSessionStatusResponse,
)
from app.stripe_client import (
    STRIPE_CURRENCY,
    StripeConfigurationError,
    construct_webhook_event,
    create_checkout_session,
    retrieve_checkout_session,
)

router = APIRouter()


def _value(session_obj, key: str, default=None):
    value = getattr(session_obj, key, None)
    if value is not None:
        return value

    if isinstance(session_obj, dict):
        return session_obj.get(key, default)

    getter = getattr(session_obj, "get", None)
    if callable(getter):
        return getter(key, default)

    return default


def _payment_status(session_obj) -> str:
    return _value(session_obj, "payment_status", "unpaid") or "unpaid"


def _session_status(session_obj) -> str:
    return _value(session_obj, "status", "open") or "open"


def _session_id(session_obj) -> str:
    return _value(session_obj, "id", "") or ""


def _session_metadata(session_obj) -> dict[str, str]:
    metadata = _value(session_obj, "metadata", {}) or {}
    return metadata if isinstance(metadata, dict) else {}


def _payment_intent_id(session_obj) -> str | None:
    payment_intent = _value(session_obj, "payment_intent")
    if payment_intent is None:
        return None
    if isinstance(payment_intent, str):
        return payment_intent
    if isinstance(payment_intent, dict):
        return payment_intent.get("id")
    return getattr(payment_intent, "id", None)


def _customer_email(session_obj) -> str | None:
    customer_email = _value(session_obj, "customer_email")
    if customer_email:
        return customer_email

    customer_details = _value(session_obj, "customer_details", {}) or {}
    if isinstance(customer_details, dict):
        return customer_details.get("email")

    return getattr(customer_details, "email", None)


def _session_course_id(session_obj) -> int:
    metadata = _session_metadata(session_obj)
    raw_course_id = metadata.get("course_id")
    try:
        course_id = int(raw_course_id or 0)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail="Stripe session metadata is incomplete") from exc

    if course_id <= 0:
        raise HTTPException(status_code=400, detail="Stripe session metadata is incomplete")

    return course_id


def _session_user_id(session_obj) -> str:
    user_id = _session_metadata(session_obj).get("user_id", "").strip()
    if not user_id:
        raise HTTPException(status_code=400, detail="Stripe session metadata is incomplete")
    return user_id


def _upsert_payment_record(session_obj, db: Session) -> Payment:
    course_id = _session_course_id(session_obj)
    user_id = _session_user_id(session_obj)
    session_id = _session_id(session_obj)
    if not session_id:
        raise HTTPException(status_code=400, detail="Stripe session metadata is incomplete")

    amount_total = _value(session_obj, "amount_total", 0)
    customer_email = _customer_email(session_obj)
    payment = (
        db.query(Payment)
        .filter(Payment.stripe_checkout_session_id == session_id)
        .first()
    )
    if not payment:
        payment = Payment(
            user_id=user_id,
            course_id=course_id,
            stripe_checkout_session_id=session_id,
            amount=(amount_total or 0) / 100,
            currency=(
                _value(session_obj, "currency", STRIPE_CURRENCY)
                or STRIPE_CURRENCY
            ),
            customer_email=customer_email,
        )
        db.add(payment)

    payment.customer_email = customer_email
    payment.amount = (amount_total or 0) / 100
    payment.currency = _value(session_obj, "currency", STRIPE_CURRENCY) or STRIPE_CURRENCY
    payment.status = _payment_status(session_obj)
    payment.stripe_payment_intent_id = _payment_intent_id(session_obj)
    return payment


def _sync_terminal_payment_state(session_obj, payment: Payment) -> None:
    session_status = _session_status(session_obj)
    if session_status == "expired":
        payment.status = "expired"
    elif session_status == "complete" and _payment_status(session_obj) in {"unpaid", "no_payment_required"}:
        payment.status = "failed"


def _fulfill_paid_session(session_obj, db: Session, payment: Payment | None = None) -> bool:
    payment = payment or _upsert_payment_record(session_obj, db)
    course_id = _session_course_id(session_obj)
    user_id = _session_user_id(session_obj)

    existing = (
        db.query(Enrollment)
        .filter(Enrollment.user_id == user_id, Enrollment.course_id == course_id)
        .first()
    )
    if existing:
        if payment.fulfilled_at is None:
            payment.fulfilled_at = datetime.utcnow()
            db.commit()
            db.refresh(payment)
        return True

    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found during fulfillment")

    enrollment = Enrollment(user_id=user_id, course_id=course_id)
    db.add(enrollment)
    payment.fulfilled_at = datetime.utcnow()
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = (
            db.query(Enrollment)
            .filter(Enrollment.user_id == user_id, Enrollment.course_id == course_id)
            .first()
        )
        if not existing:
            raise

        payment = _upsert_payment_record(session_obj, db)
        if payment.fulfilled_at is None:
            payment.fulfilled_at = datetime.utcnow()
            db.commit()
            db.refresh(payment)
        return True

    db.refresh(payment)
    n8n_client.emit_enrollment(user_id, course_id, course.title)
    return True


@router.post(
    "/{course_id}/checkout/stripe",
    response_model=CheckoutSessionResponse,
    status_code=201,
)
def create_stripe_checkout(
    course_id: int,
    payload: CheckoutSessionCreate,
    db: Session = Depends(get_db),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.is_free or course.price <= 0:
        raise HTTPException(status_code=400, detail="This course does not require payment")

    existing_enrollment = (
        db.query(Enrollment)
        .filter(Enrollment.user_id == payload.user_id, Enrollment.course_id == course_id)
        .first()
    )
    if existing_enrollment:
        raise HTTPException(status_code=409, detail="Already enrolled")

    try:
        session = create_checkout_session(
            course_id=course.id,
            course_title=course.title,
            course_description=course.description,
            amount=course.price,
            user_id=payload.user_id,
            user_email=payload.user_email,
            frontend_origin=payload.frontend_origin,
        )
    except StripeConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - SDK/network failures
        raise HTTPException(status_code=502, detail=f"Stripe checkout failed: {exc}") from exc

    payment = Payment(
        user_id=payload.user_id,
        course_id=course.id,
        stripe_checkout_session_id=session.id,
        amount=course.price,
        currency=STRIPE_CURRENCY,
        customer_email=payload.user_email,
        status=_payment_status(session),
    )
    db.add(payment)
    db.commit()

    return CheckoutSessionResponse(session_id=session.id, url=session.url)


@router.get(
    "/{course_id}/checkout/stripe/session/{session_id}",
    response_model=CheckoutSessionStatusResponse,
)
def get_stripe_checkout_status(
    course_id: int,
    session_id: str,
    user_id: str,
    db: Session = Depends(get_db),
):
    try:
        session = retrieve_checkout_session(session_id)
    except StripeConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - SDK/network failures
        raise HTTPException(status_code=502, detail=f"Stripe session lookup failed: {exc}") from exc

    if _session_course_id(session) != course_id:
        raise HTTPException(status_code=400, detail="Session does not match this course")
    if _session_user_id(session) != user_id:
        raise HTTPException(status_code=403, detail="Session does not belong to this user")

    payment = _upsert_payment_record(session, db)
    _sync_terminal_payment_state(session, payment)
    enrolled = False
    if _payment_status(session) == "paid":
        enrolled = _fulfill_paid_session(session, db, payment=payment)
    else:
        db.commit()

    return CheckoutSessionStatusResponse(
        session_id=session_id,
        status=_session_status(session),
        payment_status=_payment_status(session),
        enrolled=enrolled
        or db.query(Enrollment)
        .filter(Enrollment.user_id == user_id, Enrollment.course_id == course_id)
        .first()
        is not None,
    )


@router.post("/payments/stripe/webhook", status_code=200)
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(default="", alias="Stripe-Signature"),
    db: Session = Depends(get_db),
):
    payload = await request.body()
    try:
        event = construct_webhook_event(payload, stripe_signature)
    except StripeConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - signature/payload failures
        raise HTTPException(status_code=400, detail=f"Invalid Stripe webhook: {exc}") from exc

    event_type = getattr(event, "type", None) or event.get("type")
    data_object = (
        getattr(getattr(event, "data", None), "object", None)
        or event.get("data", {}).get("object")
    )
    if data_object is None:
        raise HTTPException(status_code=400, detail="Stripe webhook payload is missing the session")

    if event_type in {"checkout.session.completed", "checkout.session.async_payment_succeeded"}:
        payment = _upsert_payment_record(data_object, db)
        _sync_terminal_payment_state(data_object, payment)
        if _payment_status(data_object) == "paid":
            _fulfill_paid_session(data_object, db, payment=payment)
        else:
            db.commit()
    elif event_type in {"checkout.session.expired", "checkout.session.async_payment_failed"}:
        payment = _upsert_payment_record(data_object, db)
        if event_type == "checkout.session.expired":
            payment.status = "expired"
        else:
            payment.status = "failed"
        db.commit()

    return {"received": True}
