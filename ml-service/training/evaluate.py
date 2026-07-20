import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
from sklearn.model_selection import cross_validate
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, confusion_matrix, classification_report,
    matthews_corrcoef, make_scorer,
)

ARTIFACTS_DIR = Path(__file__).resolve().parent.parent / "data" / "artifacts"

# Shared scoring set used everywhere we report metrics (default-param CV,
# RandomizedSearchCV during tuning, and this module) so every stage of the
# pipeline is reporting the exact same set of numbers and can be compared
# apples-to-apples.
CV_SCORING = {
    "accuracy":        "accuracy",
    "precision_macro": "precision_macro",
    "recall_macro":    "recall_macro",
    "f1_macro":        "f1_macro",
    "mcc":             make_scorer(matthews_corrcoef),
}


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


def compute_cv_metrics(model, X: np.ndarray, y: np.ndarray, cv) -> dict:
    """
    Runs k-fold cross-validation for a single (unfitted) model and returns
    mean/std for accuracy, precision_macro, recall_macro, f1_macro, and MCC.

    `cv` should be a pre-built splitter (e.g. StratifiedKFold(n_splits=5,
    shuffle=True, random_state=42)) so that the SAME folds can be reused for
    both the default-parameter baseline and the hyperparameter-tuned model,
    keeping the comparison fair.

    Used for the default-parameter baseline stage. For the tuned stage, the
    equivalent numbers are pulled directly out of RandomizedSearchCV's
    cv_results_ (see training.tune.tune_model) rather than recomputed here,
    since the search already performs this exact cross-validation.
    """
    scores = cross_validate(model, X, y, cv=cv, scoring=CV_SCORING, n_jobs=-1)

    cv_metrics = {}
    for name in CV_SCORING:
        cv_metrics[f"{name}_mean"] = round(float(np.mean(scores[f"test_{name}"])), 4)
        cv_metrics[f"{name}_std"]  = round(float(np.std(scores[f"test_{name}"])), 4)
    return cv_metrics


def save_comparison(all_metrics: list[dict]) -> str:
    """
    Saves model_comparison.csv and metrics.json across ALL models supplied
    (both "default" and "tuned" stage entries are expected — see the `stage`
    and `cv` keys added onto each metrics dict in training.train).

    Final model selection uses the same metric the project already used
    (highest test f1_macro), but — per the fairness fix — it is now applied
    ONLY across the tuned-stage entries, since every model goes through
    identical default -> tune stages before this comparison happens.
    """
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

    rows = []
    for m in all_metrics:
        cv = m.get("cv") or {}
        rows.append({
            "model":                    m["model"],
            "stage":                    m.get("stage", "default"),
            "train_accuracy":           m["train"]["accuracy"],
            "train_f1_macro":           m["train"]["f1_macro"],
            "train_mcc":                m["train"]["mcc"],
            "test_accuracy":            m["test"]["accuracy"],
            "test_f1_macro":            m["test"]["f1_macro"],
            "test_precision_macro":     m["test"]["precision_macro"],
            "test_recall_macro":        m["test"]["recall_macro"],
            "test_mcc":                 m["test"]["mcc"],
            "cv_accuracy_mean":         cv.get("accuracy_mean"),
            "cv_accuracy_std":          cv.get("accuracy_std"),
            "cv_precision_macro_mean":  cv.get("precision_macro_mean"),
            "cv_recall_macro_mean":     cv.get("recall_macro_mean"),
            "cv_f1_macro_mean":         cv.get("f1_macro_mean"),
            "cv_f1_macro_std":          cv.get("f1_macro_std"),
            "cv_mcc_mean":              cv.get("mcc_mean"),
            "cv_mcc_std":               cv.get("mcc_std"),
        })

    df = pd.DataFrame(rows)
    df.to_csv(ARTIFACTS_DIR / "model_comparison.csv", index=False)

    # Select the best model from the tuned rows only (falls back to all rows
    # if, for some reason, no tuned rows were supplied).
    tuned_df     = df[df["stage"] == "tuned"]
    selection_df = tuned_df if not tuned_df.empty else df
    best_idx     = selection_df["test_f1_macro"].idxmax()
    best_name    = df.loc[best_idx, "model"]

    default_rows = [r for r in rows if r["stage"] == "default"]
    tuned_rows   = [r for r in rows if r["stage"] == "tuned"]

    metrics_out = {
        "best_model":     best_name,
        "default_models": default_rows,
        "tuned_models":   tuned_rows,
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
