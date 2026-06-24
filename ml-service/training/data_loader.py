import pandas as pd
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"

TRAIN_PATH = DATA_DIR / "train_dataset.csv"
TEST_PATH  = DATA_DIR / "test_set.csv"

DROP_COLS = ["CandidateID", "Name", "Age", "Recommendation_Score"]

EDUCATION_MAP = {
    "bachelor's":        "Bachelor",
    "bachelors":         "Bachelor",
    "bachelor's degree": "Bachelor",
    "master's":          "Master",
    "masters":           "Master",
    "master's degree":   "Master",
    "master's":          "Master",
    "phd":               "PhD",
    "ph.d.":             "PhD",
}


def _clean(df: pd.DataFrame) -> pd.DataFrame:
    df = df.drop(columns=[c for c in DROP_COLS if c in df.columns])
    df = df.dropna(subset=["Education", "Skills", "Interests", "Recommended_Career"])
    df["Education"] = (
        df["Education"].str.strip().str.lower()
        .map(lambda x: EDUCATION_MAP.get(x, x.title()))
    )
    df["Recommended_Career"] = df["Recommended_Career"].str.strip()
    return df.reset_index(drop=True)


def load_train(path: Path = TRAIN_PATH) -> pd.DataFrame:
    return _clean(pd.read_csv(path))


def load_test(path: Path = TEST_PATH) -> pd.DataFrame:
    return _clean(pd.read_csv(path))
