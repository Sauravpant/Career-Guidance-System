import numpy as np
from training.preprocessing import load_encoders, build_feature_matrix
import pandas as pd


def predict(skills: list[str], interests: list[str], education: str) -> dict:
    skill_mlb, interest_mlb, edu_encoder, le = load_encoders()

    df = pd.DataFrame([{
        "Skills": ";".join(skills),
        "Interests": ";".join(interests),
        "Education": education,
    }])

    import joblib
    from pathlib import Path
    model = joblib.load(Path(__file__).resolve().parent.parent / "models" / "best_model.pkl")

    X, _, _, _ = build_feature_matrix(
        df,
        skill_mlb=skill_mlb,
        interest_mlb=interest_mlb,
        edu_encoder=edu_encoder,
        fit=False,
    )

    proba = model.predict_proba(X)[0]
    top3_idx = np.argsort(proba)[::-1][:3]

    best_career = le.inverse_transform([top3_idx[0]])[0]
    confidence = round(float(proba[top3_idx[0]]), 4)

    top3 = [
        {"career": le.inverse_transform([i])[0], "score": round(float(proba[i]), 4)}
        for i in top3_idx
    ]

    return {
        "best_career": best_career,
        "confidence": confidence,
        "top_3_recommendations": top3,
    }
