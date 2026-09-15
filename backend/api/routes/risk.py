from fastapi import APIRouter, Depends
from sqlmodel import Session

from api import service
from api.db import get_session
from api.schemas import RiskExpiryResponse, RiskShortageResponse

router = APIRouter()


@router.get("/api/risk/expiry", response_model=RiskExpiryResponse)
def get_risk_expiry(session: Session = Depends(get_session)):
    result = service.get_pipeline(session)
    lots, by_state = service.expiry(session, result)
    return {"lots": lots, "by_state": by_state}


@router.get("/api/risk/shortage", response_model=RiskShortageResponse)
def get_risk_shortage(session: Session = Depends(get_session)):
    result = service.get_pipeline(session)
    return {"shortages": service.shortages(session, result)}
