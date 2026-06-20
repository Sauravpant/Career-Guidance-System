from pydantic import BaseModel, field_validator


class RecommendRequest(BaseModel):
    skills: list[str]
    interests: list[str]
    education: str

    @field_validator("skills", "interests")
    @classmethod
    def non_empty_list(cls, v: list[str]) -> list[str]:
        if not v:
            raise ValueError("List must not be empty")
        return [item.strip() for item in v]

    @field_validator("education")
    @classmethod
    def non_empty_str(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Education must not be empty")
        return v.strip()


class CareerScore(BaseModel):
    career: str
    score: float


class RecommendResponse(BaseModel):
    best_career: str
    confidence: float
    top_3_recommendations: list[CareerScore]
