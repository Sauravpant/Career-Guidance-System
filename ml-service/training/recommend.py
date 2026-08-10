import numpy as np
import pandas as pd
import joblib
from pathlib import Path
from training.preprocessing import load_encoders, build_feature_matrix

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"

_EXP_SHARP_MIN = 1.0
_EXP_SHARP_MAX = 2.5
_EXP_LOG_REF   = np.log1p(15.0)


def _experience_sharpen(proba: np.ndarray, experience: float) -> np.ndarray:
    exp_norm    = float(np.clip(np.log1p(experience) / _EXP_LOG_REF, 0.0, 1.0))
    sharpening  = _EXP_SHARP_MIN + (_EXP_SHARP_MAX - _EXP_SHARP_MIN) * exp_norm
    temperature = 1.0 / sharpening
    log_p   = np.log(np.clip(proba, 1e-12, 1.0))
    scaled  = log_p / temperature
    scaled -= scaled.max()
    sharpened = np.exp(scaled)
    sharpened /= sharpened.sum()
    return np.clip(sharpened, 0.0, 1.0)


def predict(skills: list[str], experience: float) -> dict:
    skill_mlb, scaler, le, exp_clip_range = load_encoders()
    model = joblib.load(MODELS_DIR / "best_model.pkl")

    df = pd.DataFrame([{
        "skills_required": ",".join(skills),
        "experience":      experience,
    }])

    X, _, _, _ = build_feature_matrix(df, skill_mlb=skill_mlb, scaler=scaler, exp_clip_range=exp_clip_range, fit=False)

    raw_proba = model.predict_proba(X)[0]
    proba     = _experience_sharpen(raw_proba, experience)
    top3_idx  = np.argsort(proba)[::-1][:3]

    return {
        "best_career":           le.inverse_transform([top3_idx[0]])[0],
        "confidence":            round(float(proba[top3_idx[0]]), 4),
        "top_3_recommendations": [
            {"career": le.inverse_transform([i])[0], "score": round(float(proba[i]), 4)}
            for i in top3_idx
        ],
    }

