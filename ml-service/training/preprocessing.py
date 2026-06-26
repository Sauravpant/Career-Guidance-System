import numpy as np
import joblib
import pandas as pd
from pathlib import Path
from sklearn.preprocessing import MultiLabelBinarizer, LabelEncoder, StandardScaler

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"


def parse_skills(series: pd.Series) -> list[list[str]]:
    return series.apply(lambda x: [s.strip().lower() for s in str(x).split(",") if s.strip()]).tolist()


def build_feature_matrix(
    df: pd.DataFrame,
    skill_mlb: MultiLabelBinarizer = None,
    scaler: StandardScaler = None,
    fit: bool = True,
) -> tuple[np.ndarray, MultiLabelBinarizer, StandardScaler]:
    skills     = parse_skills(df["skills_required"])
    experience = df["experience"].values.reshape(-1, 1)

    if fit:
        skill_mlb = MultiLabelBinarizer()
        scaler    = StandardScaler()
        X_skills  = skill_mlb.fit_transform(skills)
        X_exp     = scaler.fit_transform(experience)
    else:
        X_skills  = skill_mlb.transform(skills)
        X_exp     = scaler.transform(experience)

    X = np.hstack([X_exp, X_skills])
    return X, skill_mlb, scaler


def encode_target(
    series: pd.Series,
    le: LabelEncoder = None,
    fit: bool = True,
) -> tuple[np.ndarray, LabelEncoder]:
    if fit:
        le = LabelEncoder()
        return le.fit_transform(series), le
    return le.transform(series), le


def save_encoders(skill_mlb: MultiLabelBinarizer, scaler: StandardScaler, le: LabelEncoder):
    MODELS_DIR.mkdir(exist_ok=True)
    joblib.dump(skill_mlb, MODELS_DIR / "skill_mlb.pkl")
    joblib.dump(scaler,    MODELS_DIR / "scaler.pkl")
    joblib.dump(le,        MODELS_DIR / "label_encoder.pkl")


def load_encoders() -> tuple[MultiLabelBinarizer, StandardScaler, LabelEncoder]:
    skill_mlb = joblib.load(MODELS_DIR / "skill_mlb.pkl")
    scaler    = joblib.load(MODELS_DIR / "scaler.pkl")
    le        = joblib.load(MODELS_DIR / "label_encoder.pkl")
    return skill_mlb, scaler, le
