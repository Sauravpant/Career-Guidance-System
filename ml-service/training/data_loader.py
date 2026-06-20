import pandas as pd
from pathlib import Path

RAW_DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "raw" / "Raw_Dataset.csv"

DROP_COLS = ["CandidateID", "Name", "Age", "Recommendation_Score"]

EDUCATION_MAP = {
    "bachelor's": "Bachelor",
    "bachelors": "Bachelor",
    "bachelor's degree": "Bachelor",
    "bachelor's": "Bachelor",
    "master's": "Master",
    "masters": "Master",
    "master's degree": "Master",
    "master's": "Master",
    "master's": "Master",
    "phd": "PhD",
    "ph.d.": "PhD",
}


def load_data(path: Path = RAW_DATA_PATH) -> pd.DataFrame:
    df = pd.read_csv(path)
    df.drop(columns=[c for c in DROP_COLS if c in df.columns], inplace=True)
    df.dropna(subset=["Education", "Skills", "Interests", "Recommended_Career"], inplace=True)
    df["Education"] = df["Education"].str.strip().str.lower().map(
        lambda x: EDUCATION_MAP.get(x, x.title())
    )
    df["Recommended_Career"] = df["Recommended_Career"].str.strip()
    return df.reset_index(drop=True)
