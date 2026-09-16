from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from api import service
from api.db import get_session
from api.schemas import (
    FacilitiesResponse,
    FacilityDetailResponse,
    LotCreateRequest,
    LotCreateResponse,
)

router = APIRouter()


@router.get("/api/facilities", response_model=FacilitiesResponse)
def list_facilities(session: Session = Depends(get_session)):
    result = service.get_pipeline(session)
    return {"facilities": service.facility_summaries(session, result)}


@router.get("/api/facilities/{facility_id}", response_model=FacilityDetailResponse)
def get_facility(facility_id: str, session: Session = Depends(get_session)):
    result = service.get_pipeline(session)
    detail = service.facility_detail(session, result, facility_id)
    if detail is None:
        raise HTTPException(status_code=404, detail="facility not found")
    return detail


@router.post("/api/facilities/{facility_id}/lots", response_model=LotCreateResponse, status_code=201)
def create_lot(facility_id: str, body: LotCreateRequest, session: Session = Depends(get_session)):
    try:
        created = service.create_lot(
            session,
            facility_id,
            body.blood_group,
            body.component,
            body.units,
            body.collected_at,
            body.expires_at,
            body.storage_status,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if created is None:
        raise HTTPException(status_code=404, detail="facility not found")
    return created
