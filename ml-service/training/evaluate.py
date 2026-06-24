import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import json
from pathlib import Path
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, confusion_matrix, classification_report,
)

ARTIFACTS_DIR = Path(__file__).resolve().parent.parent / "data" / "artifacts"


def compute_metrics(
    model, X_test, y_test, label_names: list[str], model_name: str
) -> dict:
    y_pred = model.predict(X_test)

    metrics = {
        "model":           model_name,
        "accuracy":        round(accuracy_score(y_test, y_pred), 4),
        "precision_macro": round(precision_score(y_test, y_pred, average="macro", zero_division=0), 4),
        "recall_macro":    round(recall_score(y_test, y_pred, average="macro", zero_division=0), 4),
        "f1_macro":        round(f1_score(y_test, y_pred, average="macro", zero_division=0), 4),
    }

    report = classification_report(y_test, y_pred, target_names=label_names, zero_division=0)
    _save_classification_report(report, model_name)
    _save_confusion_matrix(y_test, y_pred, label_names, model_name)

    return metrics


def save_comparison(all_metrics: list[dict]) -> str:
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    df = pd.DataFrame(all_metrics)
    df.to_csv(ARTIFACTS_DIR / "model_comparison.csv", index=False)

    best = df.loc[df["f1_macro"].idxmax()]
    with open(ARTIFACTS_DIR / "metrics.json", "w") as f:
        json.dump(dict(best), f, indent=2)

    return best["model"]


def _save_classification_report(report: str, model_name: str):
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    safe = model_name.lower().replace(" ", "_").replace("(", "").replace(")", "")
    with open(ARTIFACTS_DIR / f"classification_report_{safe}.txt", "w") as f:
        f.write(f"=== {model_name} ===\n\n{report}")


def _save_confusion_matrix(y_test, y_pred, label_names: list[str], model_name: str):
    cm = confusion_matrix(y_test, y_pred)
    fig, ax = plt.subplots(figsize=(14, 10))
    sns.heatmap(
        cm, annot=True, fmt="d", cmap="Blues",
        xticklabels=label_names, yticklabels=label_names, ax=ax,
    )
    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual")
    ax.set_title(f"Confusion Matrix — {model_name}")
    plt.tight_layout()

    safe = model_name.lower().replace(" ", "_").replace("(", "").replace(")", "")
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    fig.savefig(ARTIFACTS_DIR / f"confusion_matrix_{safe}.png", dpi=150)
    plt.close(fig)
