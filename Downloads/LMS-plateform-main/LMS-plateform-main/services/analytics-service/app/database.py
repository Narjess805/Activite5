"""
Database Configuration — Analytics Service

Connects to the same PostgreSQL database used by the course service.
Uses the pre-existing 'analytics' table created by postgres-init.sql.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://lms_user:lms_password@localhost:5432/lms_courses",
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
