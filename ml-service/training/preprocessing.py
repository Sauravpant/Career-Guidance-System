import numpy as np
import joblib
import pandas as pd
from pathlib import Path
from sklearn.preprocessing import MultiLabelBinarizer, LabelEncoder, OneHotEncoder

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"


def parse_multilabel(series: pd.Series) -> list[list[str]]:
    return series.apply(lambda x: [i.strip() for i in str(x).split(";")]).tolist()


def build_feature_matrix(
    df: pd.DataFrame,
    skill_mlb: MultiLabelBinarizer = None,
    interest_mlb: MultiLabelBinarizer = None,
    edu_encoder: OneHotEncoder = None,
    fit: bool = True,
) -> tuple[np.ndarray, MultiLabelBinarizer, MultiLabelBinarizer, OneHotEncoder]:
    skills    = parse_multilabel(df["Skills"])
    interests = parse_multilabel(df["Interests"])
    education = df[["Education"]]

    if fit:
        skill_mlb    = MultiLabelBinarizer()
        interest_mlb = MultiLabelBinarizer()
        edu_encoder  = OneHotEncoder(handle_unknown="ignore", sparse_output=False)

        X_skills    = skill_mlb.fit_transform(skills)
        X_interests = interest_mlb.fit_transform(interests)
        X_edu       = edu_encoder.fit_transform(education)
    else:
        X_skills    = skill_mlb.transform(skills)
        X_interests = interest_mlb.transform(interests)
        X_edu       = edu_encoder.transform(education)

    return np.hstack([X_edu, X_skills, X_interests]), skill_mlb, interest_mlb, edu_encoder


def encode_target(
    series: pd.Series,
    le: LabelEncoder = None,
    fit: bool = True,
) -> tuple[np.ndarray, LabelEncoder]:
    if fit:
        le = LabelEncoder()
        return le.fit_transform(series), le
    return le.transform(series), le


def save_encoders(skill_mlb, interest_mlb, edu_encoder, le):
    MODELS_DIR.mkdir(exist_ok=True)
    joblib.dump(skill_mlb,    MODELS_DIR / "skill_mlb.pkl")
    joblib.dump(interest_mlb, MODELS_DIR / "interest_mlb.pkl")
    joblib.dump(edu_encoder,  MODELS_DIR / "edu_encoder.pkl")
    joblib.dump(le,           MODELS_DIR / "label_encoder.pkl")


def load_encoders():
    skill_mlb    = joblib.load(MODELS_DIR / "skill_mlb.pkl")
    interest_mlb = joblib.load(MODELS_DIR / "interest_mlb.pkl")
    edu_encoder  = joblib.load(MODELS_DIR / "edu_encoder.pkl")
    le           = joblib.load(MODELS_DIR / "label_encoder.pkl")
    return skill_mlb, interest_mlb, edu_encoder, le
