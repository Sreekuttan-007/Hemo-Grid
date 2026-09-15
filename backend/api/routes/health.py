from datetime import date

from fastapi import APIRouter

AS_OF = date(2026, 3, 1)

router = APIRouter()


@router.get("/api/health")
def get_health():
    return {"ok": True, "as_of": AS_OF.isoformat()}
