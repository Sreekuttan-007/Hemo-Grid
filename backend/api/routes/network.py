from fastapi import APIRouter, Depends
from sqlmodel import Session

from api import service
from api.db import get_session
from api.schemas import NetworkSummary

router = APIRouter()


@router.get("/api/network/summary", response_model=NetworkSummary)
def get_network_summary(session: Session = Depends(get_session)):
    result = service.get_pipeline(session)
    return service.network_summary(result)
