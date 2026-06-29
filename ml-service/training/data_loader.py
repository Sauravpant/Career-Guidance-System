import pandas as pd
from pathlib import Path

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "raw" / "tech_jobs_dataset.csv"


DROP_COLS = ["skills_count"]


def load_data(path: Path = DATA_PATH) -> pd.DataFrame:
    df = pd.read_csv(path)
    df.drop(columns=[c for c in DROP_COLS if c in df.columns], inplace=True)
    df.dropna(subset=["skills_required", "experience", "job_title"], inplace=True)
    df["job_title"] = df["job_title"].str.strip()
    df["skills_required"] = df["skills_required"].str.strip()
    return df.reset_index(drop=True)
