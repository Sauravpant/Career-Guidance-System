import logging
import numpy as np
import pandas as pd
import joblib
from pathlib import Path

from training.preprocessing import load_encoders, build_feature_matrix

logger = logging.getLogger(__name__)
MODELS_DIR = Path(__file__).resolve().parent.parent.parent / "models"


class RecommendationService:
    def __init__(self):
        logger.info("Loading model and encoders...")
        self.model = joblib.load(MODELS_DIR / "best_model.pkl")
        self.skill_mlb, self.interest_mlb, self.edu_encoder, self.le = load_encoders()
        logger.info("RecommendationService ready.")

    def predict(self, skills: list[str], interests: list[str], education: str) -> dict:
        df = pd.DataFrame([{
            "Skills":    ";".join(skills),
            "Interests": ";".join(interests),
            "Education": education,
        }])

        X, _, _, _ = build_feature_matrix(
            df,
            skill_mlb=self.skill_mlb,
            interest_mlb=self.interest_mlb,
            edu_encoder=self.edu_encoder,
            fit=False,
        )

        proba    = self.model.predict_proba(X)[0]
        top3_idx = np.argsort(proba)[::-1][:3]

        return {
            "best_career":           self.le.inverse_transform([top3_idx[0]])[0],
            "confidence":            round(float(proba[top3_idx[0]]), 4),
            "top_3_recommendations": [
                {"career": self.le.inverse_transform([i])[0], "score": round(float(proba[i]), 4)}
                for i in top3_idx
            ],
        }
