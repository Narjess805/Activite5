"""
Database Configuration — Course Service

Configures the SQLAlchemy engine and session factory for the PostgreSQL
database used by the course service.

Environment variables:
  DATABASE_URL  — Full PostgreSQL DSN.
                   Defaults to the local development database when absent.

Exports:
  engine        — SQLAlchemy Engine bound to the configured database.
  SessionLocal  — Session factory (autocommit=False, autoflush=False).
  Base          — Declarative base class for all ORM models.
  get_db()      — FastAPI dependency that yields a DB session and
                   guarantees session closure even on exceptions.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://lms_user:lms_password@localhost:5432/lms_courses"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """
    FastAPI dependency that provides a SQLAlchemy database session.

    Yields a session for the duration of the request and ensures it is
    closed when the request completes (success or error).
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
