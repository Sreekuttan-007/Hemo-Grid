"""POST /api/demo/reset only. counterfactual/shock are deferred: they depend
on hemogrid_model.counterfactual, which is an intentional empty stub
(Model.md M10, not implemented yet) that the frontend does not call today."""

from fastapi import APIRouter, Depends
from sqlmodel import Session, func, select

from api import seed, service
from api.db import get_session
from api.models import Consumption, Facility, Lot
from api.schemas import DemoResetResponse

router = APIRouter()


@router.post("/api/demo/reset", response_model=DemoResetResponse)
def reset_demo(session: Session = Depends(get_session)):
    seed.main()
    service.invalidate()

    counts = {
        "facilities": session.exec(select(func.count()).select_from(Facility)).one(),
        "lots": session.exec(select(func.count()).select_from(Lot)).one(),
        "consumption": session.exec(select(func.count()).select_from(Consumption)).one(),
    }
    return {"ok": True, "seeded": counts}
