import json
import numpy as np
from pathlib import Path
from sklearn.model_selection import RandomizedSearchCV, cross_validate
from sklearn.metrics import make_scorer, matthews_corrcoef

from training.utils import get_logger

logger = get_logger(__name__)
ARTIFACTS_DIR = Path(__file__).resolve().parent.parent / "data" / "artifacts"

# RF and XGBoost grids are kept regularized intentionally —
# deep trees and high estimators are excluded to prevent overfitting
PARAM_GRIDS = {
    "Logistic Regression": {
        "C":      [0.01, 0.1, 0.5, 1.0, 5.0, 10.0],
        "solver": ["saga", "lbfgs"],
        "penalty": ["l2"],
    },
    "SVC": {
        "C":      [0.01, 0.1, 0.5, 1.0],
        "kernel": ["rbf", "linear"],
        "gamma":  ["scale", "auto"],
    },
    "Random Forest": {
        "n_estimators":      [100, 200, 300],
        "max_depth":         [10, 15, 20],       # no None — prevents full depth trees
        "min_samples_leaf":  [3, 5, 8],          # higher than default to reduce overfit
        "min_samples_split": [4, 8, 12],
        "max_features":      ["sqrt", "log2"],
    },
    "XGBoost": {
    "n_estimators": [200, 300, 400,600],
    "learning_rate": [0.03, 0.05, 0.1],
    "max_depth": [3, 4, 5],
    "min_child_weight": [3, 5, 7],
    "gamma": [0, 0.25, 0.5],
    "subsample": [0.7, 0.8, 0.9],
    "colsample_bytree": [0.7, 0.8, 0.9],
    "reg_alpha": [0, 0.5, 1],
    "reg_lambda": [1, 2, 5]
    }
}

# Same scoring set used for the default-parameter CV baseline (see
# evaluate.compute_cv_metrics / evaluate.CV_SCORING) so default-vs-tuned CV
# numbers are directly comparable. "f1_macro" remains the metric used to
# pick the winning candidate inside each search (refit="f1_macro"),
# matching the project's existing primary metric.
SCORING = {
    "accuracy":        "accuracy",
    "precision_macro": "precision_macro",
    "recall_macro":    "recall_macro",
    "f1_macro":        "f1_macro",
    "mcc":             make_scorer(matthews_corrcoef),
}


def tune_model(
    name: str,
    model,
    X_train: np.ndarray,
    y_train: np.ndarray,
    cv,
    n_iter: int = 50,
) -> tuple:
    """
    Hyperparameter-tunes a single model with RandomizedSearchCV.

    `model` should be a FRESH, unfitted, default-parameter estimator (tuning
    always starts from scratch — never from an already-fitted baseline
    model). `cv` should be a pre-built splitter (e.g. StratifiedKFold(5,
    shuffle=True, random_state=42)), ideally the same splitter instance used
    for the default-parameter CV baseline so both stages are scored on
    identical folds.

    Returns (tuned_estimator, best_params, cv_metrics):
      - tuned_estimator: fitted on the full X_train/y_train
      - best_params:     dict of the winning hyperparameters ({} if no grid
                          was defined for this model)
      - cv_metrics:      mean/std for accuracy, precision_macro,
                          recall_macro, f1_macro, and mcc at the winning
                          configuration, in the same format produced by
                          evaluate.compute_cv_metrics

    If no param grid is defined for `name`, the model is simply fit with its
    default parameters and its own cv metrics are computed the same way, so
    the return shape stays consistent for every model.
    """
    param_grid = PARAM_GRIDS.get(name)

    if param_grid is None:
        logger.warning(f"[{name}] No param grid defined — fitting with default parameters only.")
        model.fit(X_train, y_train)
        scores = cross_validate(model, X_train, y_train, cv=cv, scoring=SCORING, n_jobs=-1)
        cv_metrics = {}
        for metric_name in SCORING:
            cv_metrics[f"{metric_name}_mean"] = round(float(np.mean(scores[f"test_{metric_name}"])), 4)
            cv_metrics[f"{metric_name}_std"]  = round(float(np.std(scores[f"test_{metric_name}"])), 4)
        return model, {}, cv_metrics

    n_splits = cv.get_n_splits()
    logger.info(f"[{name}] RandomizedSearchCV (n_iter={n_iter}, cv={n_splits})...")

    search = RandomizedSearchCV(
        estimator=model,
        param_distributions=param_grid,
        n_iter=n_iter,
        cv=cv,
        scoring=SCORING,
        refit="f1_macro",
        n_jobs=-1,
        verbose=1,
        random_state=42,
    )
    search.fit(X_train, y_train)

    best_idx = search.best_index_
    cv_metrics = {}
    for metric_name in SCORING:
        cv_metrics[f"{metric_name}_mean"] = round(float(search.cv_results_[f"mean_test_{metric_name}"][best_idx]), 4)
        cv_metrics[f"{metric_name}_std"]  = round(float(search.cv_results_[f"std_test_{metric_name}"][best_idx]), 4)

    logger.info(f"[{name}] Best params: {search.best_params_}")
    logger.info(f"[{name}] Best CV f1_macro: {cv_metrics['f1_macro_mean']} ± {cv_metrics['f1_macro_std']}")

    return search.best_estimator_, search.best_params_, cv_metrics


def save_tuning_summary(all_tuning_results: dict):
    """
    Writes ONE consolidated tuning_results.json covering all 4 models, e.g.:

    {
      "Logistic Regression": {"best_params": {...}, "cv_metrics": {...}},
      "SVC":                 {"best_params": {...}, "cv_metrics": {...}},
      "Random Forest":       {"best_params": {...}, "cv_metrics": {...}},
      "XGBoost":              {"best_params": {...}, "cv_metrics": {...}}
    }
    """
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    with open(ARTIFACTS_DIR / "tuning_results.json", "w") as f:
        json.dump(all_tuning_results, f, indent=2)
