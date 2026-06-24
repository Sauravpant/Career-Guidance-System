import json
import logging
from pathlib import Path

ARTIFACTS_DIR = Path(__file__).resolve().parent.parent / "data" / "artifacts"


def get_logger(name: str) -> logging.Logger:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )
    return logging.getLogger(name)


def save_json(data: dict, filename: str):
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    with open(ARTIFACTS_DIR / filename, "w") as f:
        json.dump(data, f, indent=2)
