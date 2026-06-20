from functools import lru_cache
from app.services.recommendation_service import RecommendationService


@lru_cache(maxsize=1)
def get_recommendation_service() -> RecommendationService:
    return RecommendationService()
