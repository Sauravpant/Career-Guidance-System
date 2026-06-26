from pydantic import BaseModel, field_validator


class RecommendRequest(BaseModel):
    skills:     list[str]
    experience: float

    @field_validator("skills")
    @classmethod
    def non_empty(cls, v: list[str]) -> list[str]:
        if not v:
            raise ValueError("skills must not be empty")
        return [s.strip().lower() for s in v]

    @field_validator("experience")
    @classmethod
    def valid_experience(cls, v: float) -> float:
        if v < 0:
            raise ValueError("experience must be non-negative")
        return v


class CareerScore(BaseModel):
    career: str
    score:  float


class RecommendResponse(BaseModel):
    best_career:            str
    confidence:             float
    top_3_recommendations:  list[CareerScore]
