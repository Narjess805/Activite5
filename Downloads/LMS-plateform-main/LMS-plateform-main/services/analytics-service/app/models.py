"""
SQLAlchemy ORM Model — Analytics Service

Maps to the 'analytics' table already created by postgres-init.sql.
"""

from sqlalchemy import Column, Integer, String, DateTime, JSON
from datetime import datetime

from app.database import Base


class AnalyticsEvent(Base):
    __tablename__ = "analytics"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(50), nullable=False)
    user_id = Column(String(255))
    course_id = Column(Integer)
    lesson_id = Column(Integer)
    event_metadata = Column("metadata", JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
