import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, confusion_matrix, classification_report,
    matthews_corrcoef,
)

ARTIFACTS_DIR = Path(__file__).resolve().parent.parent / "data" / "artifacts"


def compute_metrics(
    model,
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_test: np.ndarray,
    y_test: np.ndarray,
    label_names: list[str],
    model_name: str,
) -> dict:
    y_train_pred = model.predict(X_train)
    y_test_pred  = model.predict(X_test)

    def _metrics(y_true, y_pred) -> dict:
        return {
            "accuracy":        round(accuracy_score(y_true, y_pred), 4),
            "precision_macro": round(precision_score(y_true, y_pred, average="macro", zero_division=0), 4),
            "recall_macro":    round(recall_score(y_true, y_pred, average="macro", zero_division=0), 4),
            "f1_macro":        round(f1_score(y_true, y_pred, average="macro", zero_division=0), 4),
            "mcc":             round(matthews_corrcoef(y_true, y_pred), 4),
        }

    train_metrics = _metrics(y_train, y_train_pred)
    test_metrics  = _metrics(y_test, y_test_pred)

    metrics = {
        "model":  model_name,
        "train":  train_metrics,
        "test":   test_metrics,
    }

    _save_classification_report(y_test, y_test_pred, label_names, model_name)
    _save_confusion_matrix(y_test, y_test_pred, label_names, model_name)

    return metrics


def save_comparison(all_metrics: list[dict]) -> str:
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

    rows = []
    for m in all_metrics:
        rows.append({
            "model":                m["model"],
            "train_accuracy":       m["train"]["accuracy"],
            "train_f1_macro":       m["train"]["f1_macro"],
            "train_mcc":            m["train"]["mcc"],
            "test_accuracy":        m["test"]["accuracy"],
            "test_f1_macro":        m["test"]["f1_macro"],
            "test_precision_macro": m["test"]["precision_macro"],
            "test_recall_macro":    m["test"]["recall_macro"],
            "test_mcc":             m["test"]["mcc"],
        })

    df = pd.DataFrame(rows)
    df.to_csv(ARTIFACTS_DIR / "model_comparison.csv", index=False)

    # primary: test f1_macro
    best_idx  = df["test_f1_macro"].idxmax()
    best_name = df.loc[best_idx, "model"]

    # separate baseline and tuned entries
    baseline_rows = [r for r in rows if "(Tuned)" not in r["model"]]
    tuned_rows    = [r for r in rows if "(Tuned)" in r["model"]]

    metrics_out = {
        "best_model":      best_name,
        "baseline_models": baseline_rows,
        "tuned_model":     tuned_rows[0] if tuned_rows else None,
    }

    with open(ARTIFACTS_DIR / "metrics.json", "w") as f:
        json.dump(metrics_out, f, indent=2)

    return best_name


def _save_classification_report(y_test, y_pred, label_names: list[str], model_name: str):
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    safe   = _safe_name(model_name)
    report = classification_report(y_test, y_pred, target_names=label_names, zero_division=0)
    with open(ARTIFACTS_DIR / f"classification_report_{safe}.txt", "w") as f:
        f.write(f"=== {model_name} ===\n\n{report}")


def _save_confusion_matrix(y_test, y_pred, label_names: list[str], model_name: str):
    cm  = confusion_matrix(y_test, y_pred)
    fig, ax = plt.subplots(figsize=(12, 9))
    sns.heatmap(
        cm, annot=True, fmt="d", cmap="Blues",
        xticklabels=label_names, yticklabels=label_names, ax=ax,
    )
    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual")
    ax.set_title(f"Confusion Matrix — {model_name}")
    plt.tight_layout()
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    fig.savefig(ARTIFACTS_DIR / f"confusion_matrix_{_safe_name(model_name)}.png", dpi=150)
    plt.close(fig)


def _safe_name(name: str) -> str:
    return name.lower().replace(" ", "_").replace("(", "").replace(")", "").replace("/", "_")
