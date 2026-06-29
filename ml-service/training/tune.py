import json
import numpy as np
from pathlib import Path
from sklearn.model_selection import GridSearchCV, RandomizedSearchCV, StratifiedKFold
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier

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


def tune_best_model(
    best_name: str,
    best_model,
    X_train: np.ndarray,
    y_train: np.ndarray,
) -> object:
    param_grid = PARAM_GRIDS.get(best_name)
    if param_grid is None:
        logger.warning(f"No param grid for {best_name}, skipping tuning.")
        return best_model

    logger.info(f"RandomizedSearchCV for {best_name} (n_iter=50, cv=5)...")

    search = RandomizedSearchCV(
        estimator=best_model,
        param_distributions=param_grid,
        n_iter=50,
        cv=5,
        scoring="f1_macro",
        n_jobs=-1,
        verbose=1,
        refit=True,
    )
    search.fit(X_train, y_train)

    logger.info(f"Best params: {search.best_params_}")
    logger.info(f"Best CV F1 macro: {round(search.best_score_, 4)}")

    _save_tuning_results(best_name, search)
    return search.best_estimator_


def _save_tuning_results(model_name: str, search: RandomizedSearchCV):
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    results = {
        "model":       model_name,
        "best_params": search.best_params_,
        "best_cv_f1":  round(search.best_score_, 4),
    }
    with open(ARTIFACTS_DIR / "tuning_results.json", "w") as f:
        json.dump(results, f, indent=2)
