import logging
import numpy as np
import pandas as pd
import joblib
from pathlib import Path
from training.preprocessing import load_encoders, build_feature_matrix

logger     = logging.getLogger(__name__)
MODELS_DIR = Path(__file__).resolve().parent.parent.parent / "models"


_EXP_FILL_MAX = 0.75
_EXP_LOG_REF  = np.log1p(30.0)   


def _experience_fill(skill_base: float, experience: float) -> float:
    exp_fill = float(np.clip(np.log1p(experience) / _EXP_LOG_REF, 0.0, 1.0))
    score    = skill_base + (1.0 - skill_base) * exp_fill * _EXP_FILL_MAX
    return float(np.clip(score, 0.0, 1.0))


class RecommendationService:
    def __init__(self):
        logger.info("Loading model and encoders...")
        self.model                                            = joblib.load(MODELS_DIR / "best_model.pkl")
        self.skill_mlb, self.scaler, self.le, self.exp_clip_range = load_encoders()
        logger.info("RecommendationService ready.")

    def _build_features(self, skills: list[str], experience: float) -> np.ndarray:
        df = pd.DataFrame([{
            "skills_required": ",".join(skills),
            "experience":      experience,
        }])
        X, _, _, _ = build_feature_matrix(
            df,
            skill_mlb=self.skill_mlb,
            scaler=self.scaler,
            exp_clip_range=self.exp_clip_range,
            fit=False,
        )
        return X

    def predict(self, skills: list[str], experience: float) -> dict:
        X_zero = self._build_features(skills, 0.0)
        skill_proba = self.model.predict_proba(X_zero)[0]

        top3_idx = np.argsort(skill_proba)[::-1][:3]

        lo, hi = self.exp_clip_range
        effective_exp = float(experience)

        top_idx = int(top3_idx[0])
        top_score = _experience_fill(float(skill_proba[top_idx]), effective_exp)

        def score_for(i: int) -> float:
            if i == top_idx:
                return top_score
            return float(np.clip(skill_proba[i] * (top_score / max(skill_proba[top_idx], 1e-9)), 0.0, 1.0))

        return {
            "best_career":           self.le.inverse_transform([top_idx])[0],
            "confidence":            round(top_score, 4),
            "top_3_recommendations": [
                {"career": self.le.inverse_transform([i])[0], "score": round(score_for(i), 4)}
                for i in top3_idx
            ],
        }

