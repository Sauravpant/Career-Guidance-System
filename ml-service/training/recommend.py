import numpy as np
import pandas as pd
import joblib
from pathlib import Path
from training.preprocessing import load_encoders, build_feature_matrix

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"


def predict(skills: list[str], experience: float) -> dict:
    skill_mlb, scaler, le = load_encoders()
    model = joblib.load(MODELS_DIR / "best_model.pkl")

    df = pd.DataFrame([{
        "skills_required": ",".join(skills),
        "experience":      experience,
    }])

    X, _, _ = build_feature_matrix(df, skill_mlb=skill_mlb, scaler=scaler, fit=False)

    proba    = model.predict_proba(X)[0]
    top3_idx = np.argsort(proba)[::-1][:3]

    return {
        "best_career":           le.inverse_transform([top3_idx[0]])[0],
        "confidence":            round(float(proba[top3_idx[0]]), 4),
        "top_3_recommendations": [
            {"career": le.inverse_transform([i])[0], "score": round(float(proba[i]), 4)}
            for i in top3_idx
        ],
    }
