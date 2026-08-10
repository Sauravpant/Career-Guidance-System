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
    exp_clip_range: tuple[float, float] = None,
    fit: bool = True,
) -> tuple[np.ndarray, MultiLabelBinarizer, StandardScaler, tuple[float, float]]:
    skills     = parse_skills(df["skills_required"])
    experience = df["experience"].values.reshape(-1, 1)

    if fit:
        skill_mlb     = MultiLabelBinarizer()
        scaler        = StandardScaler()
        X_skills = skill_mlb.fit_transform(skills)
        exp_clip_range = (float(experience.min()), float(experience.max()))
        X_exp = scaler.fit_transform(experience)
    else:
        lo, hi = exp_clip_range if exp_clip_range is not None else (-np.inf, np.inf)
        experience = np.clip(experience, lo, hi)
        X_skills = skill_mlb.transform(skills)
        X_exp = scaler.transform(experience)

    X = np.hstack([X_skills, X_exp])
    return X, skill_mlb, scaler, exp_clip_range


def encode_target(
    series: pd.Series,
    le: LabelEncoder = None,
    fit: bool = True,
) -> tuple[np.ndarray, LabelEncoder]:
    if fit:
        le = LabelEncoder()
        return le.fit_transform(series), le
    return le.transform(series), le


def save_encoders(
    skill_mlb: MultiLabelBinarizer,
    scaler: StandardScaler,
    le: LabelEncoder,
    exp_clip_range: tuple[float, float],
):
    MODELS_DIR.mkdir(exist_ok=True)
    joblib.dump(skill_mlb,     MODELS_DIR / "skill_mlb.pkl")
    joblib.dump(scaler,        MODELS_DIR / "scaler.pkl")
    joblib.dump(le,            MODELS_DIR / "label_encoder.pkl")
    joblib.dump(exp_clip_range, MODELS_DIR / "exp_clip_range.pkl")


def load_encoders() -> tuple[MultiLabelBinarizer, StandardScaler, LabelEncoder, tuple[float, float]]:
    skill_mlb     = joblib.load(MODELS_DIR / "skill_mlb.pkl")
    scaler        = joblib.load(MODELS_DIR / "scaler.pkl")
    le            = joblib.load(MODELS_DIR / "label_encoder.pkl")
    exp_clip_range = joblib.load(MODELS_DIR / "exp_clip_range.pkl")
    return skill_mlb, scaler, le, exp_clip_range
