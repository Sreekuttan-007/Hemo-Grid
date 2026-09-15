from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from api import service
from api.db import get_session
from api.schemas import (
    RecommendationDetailResponse,
    RecommendationsResponse,
    ReviewRequest,
    ReviewResponse,
)

router = APIRouter()


@router.get("/api/recommendations", response_model=RecommendationsResponse)
def list_recommendations(session: Session = Depends(get_session)):
    result = service.get_pipeline(session)
    recommendations, exclusions = service.recommendations_and_exclusions(session, result)
    return {"recommendations": recommendations, "exclusions": exclusions}


@router.get("/api/recommendations/{recommendation_id}", response_model=RecommendationDetailResponse)
def get_recommendation(recommendation_id: str, session: Session = Depends(get_session)):
    service.get_pipeline(session)  # ensures the row exists with fresh computed fields
    row = service.get_recommendation(session, recommendation_id)
    if row is None:
        raise HTTPException(status_code=404, detail="recommendation not found")
    names = service.facility_names(session)
    return {
        "recommendation": service.recommendation_item(row, names),
        "reviews": service.reviews_for(session, recommendation_id),
    }


@router.post("/api/recommendations/{recommendation_id}/review", response_model=ReviewResponse)
def review_recommendation(
    recommendation_id: str, body: ReviewRequest, session: Session = Depends(get_session)
):
    try:
        row = service.apply_review(session, recommendation_id, body.actor, body.action, body.note)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    if row is None:
        raise HTTPException(status_code=404, detail="recommendation not found")

    names = service.facility_names(session)
    return {
        "recommendation": service.recommendation_item(row, names),
        "reviews": service.reviews_for(session, recommendation_id),
    }
