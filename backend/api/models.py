from datetime import date, datetime

from sqlalchemy import Column, JSON
from sqlmodel import SQLModel, Field


class Facility(SQLModel, table=True):
    id: str = Field(primary_key=True)
    code: str = Field(unique=True)
    name: str
    tier: str                    # REGIONAL_CENTRE | HOSPITAL | DISTRICT
    lat: float
    lng: float


class Lot(SQLModel, table=True):
    id: str = Field(primary_key=True)
    trace_id: str = Field(unique=True)
    facility_id: str = Field(foreign_key="facility.id", index=True)
    blood_group: str
    component: str
    units: int
    collected_at: date
    expires_at: date = Field(index=True)
    storage_status: str          # OK | ANOMALY | UNKNOWN


class Consumption(SQLModel, table=True):
    id: str = Field(primary_key=True)
    facility_id: str = Field(foreign_key="facility.id", index=True)
    date: date = Field(index=True)
    blood_group: str
    component: str
    units: int
    kind: str                    # ROUTINE | EMERGENCY


class Route(SQLModel, table=True):
    id: str = Field(primary_key=True)
    from_id: str
    to_id: str
    transit_hours: float
    cold_chain_capable: bool


class Policy(SQLModel, table=True):
    component: str = Field(primary_key=True)
    shelf_life_days: int
    window_open_days: int
    window_close_days: int
    forecast_horizon: int
    reserve_days: int


class Recommendation(SQLModel, table=True):
    id: str = Field(primary_key=True)
    status: str = "GENERATED"    # GENERATED | UNDER_REVIEW | APPROVED | REJECTED | CLOSED
    source_lot_id: str
    source_facility_id: str
    dest_facility_id: str
    blood_group: str
    component: str
    units: int
    rescue_score: int
    transit_hours: float
    factors: dict = Field(sa_column=Column(JSON))
    explanation: dict = Field(sa_column=Column(JSON))
    checks: list = Field(sa_column=Column(JSON))
    withdrawn_reason: str | None = None
    created_at: datetime


class Review(SQLModel, table=True):
    id: str = Field(primary_key=True)
    recommendation_id: str = Field(foreign_key="recommendation.id", index=True)
    actor: str
    action: str                  # OPENED | APPROVED | REJECTED | CLOSED
    note: str | None = None
    at: datetime
