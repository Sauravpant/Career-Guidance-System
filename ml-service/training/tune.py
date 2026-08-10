import json
import numpy as np
from pathlib import Path
from sklearn.model_selection import RandomizedSearchCV, cross_validate
from sklearn.metrics import make_scorer, matthews_corrcoef

from training.utils import get_logger

logger = get_logger(__name__)
ARTIFACTS_DIR = Path(__file__).resolve().parent.parent / "data" / "artifacts"

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
        "max_depth":         [10, 15, 20],
        "min_samples_leaf":  [3, 5, 8],
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
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    with open(ARTIFACTS_DIR / "tuning_results.json", "w") as f:
        json.dump(all_tuning_results, f, indent=2)
