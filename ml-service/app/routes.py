import logging
from fastapi import APIRouter, Depends, HTTPException

from app.schemas import RecommendRequest, RecommendResponse
from app.dependencies import get_recommendation_service
from app.services.recommendation_service import RecommendationService

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/recommend", response_model=RecommendResponse)
def recommend(
    payload: RecommendRequest,
    service: RecommendationService = Depends(get_recommendation_service),
) -> RecommendResponse:
    try:
        result = service.predict(
            skills=payload.skills,
            experience=payload.experience,
        )
        return RecommendResponse(**result)
    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        raise HTTPException(status_code=500, detail="Prediction error. Check inputs and model.")
