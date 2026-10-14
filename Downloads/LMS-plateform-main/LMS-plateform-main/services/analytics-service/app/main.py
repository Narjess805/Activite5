"""
Analytics Service — FastAPI Application

Microservice responsible for tracking user behaviour and surfacing
aggregated learning metrics to the admin dashboard.

Service Port   : 8003
API Prefix     : /api/analytics
Documentation  : http://localhost:8003/docs  (Swagger UI)

In the current implementation events are stored in an in-memory list
(resets on restart). In production both the events and the dashboard
aggregates are backed by a dedicated PostgreSQL table.

Routes summary:
  POST /api/analytics/events         — Track a learning event
  GET  /api/analytics/events         — List recent events (filterable)
  GET  /api/analytics/dashboard      — Aggregated platform-wide statistics
  GET  /health                       — Liveness probe
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import events, dashboard

app = FastAPI(
    title="LMS Analytics Service",
    description="Track views, enrollments, and learning trends",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(events.router, prefix="/api/analytics/events", tags=["events"])
app.include_router(dashboard.router, prefix="/api/analytics/dashboard", tags=["dashboard"])


@app.get("/health")
def health_check():
    """Liveness probe used by Docker and nginx."""
    return {"status": "ok", "service": "analytics-service"}
