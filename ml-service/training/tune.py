import json
import joblib
import numpy as np
from pathlib import Path
from sklearn.model_selection import RandomizedSearchCV
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier

from training.utils import get_logger

logger = get_logger(__name__)
ARTIFACTS_DIR = Path(__file__).resolve().parent.parent / "data" / "artifacts"

PARAM_GRIDS = {
    "Logistic Regression": {
        "C":       [0.01, 0.1, 1, 10, 100],
        "solver":  ["lbfgs", "saga"],
        "penalty": ["l2"],
    },
    "SVC": {
        "C":      [0.1, 1, 10, 50],
        "kernel": ["rbf", "linear"],
        "gamma":  ["scale", "auto"],
    },
    "Random Forest": {
        "n_estimators":      [100, 200, 300],
        "max_depth":         [None, 10, 20, 30],
        "min_samples_split": [2, 5, 10],
        "min_samples_leaf":  [1, 2, 4],
    },
    "XGBoost": {
        "n_estimators": [100,200,300,500],
        "max_depth": [3,4,5,6,8,10],
        "learning_rate": [0.01,0.03,0.05,0.1,0.2],
        "subsample": [0.6,0.7,0.8,0.9,1.0],
        "colsample_bytree": [0.6,0.8,1.0],
        "min_child_weight": [1,3,5],
    },
}


def tune_best_model(
    best_name: str,
    best_model,
    X_train: np.ndarray,
    y_train: np.ndarray,
) -> object:
    param_grid = PARAM_GRIDS.get(best_name)
    if param_grid is None:
        logger.warning(f"No param grid defined for {best_name}, skipping tuning.")
        return best_model

    logger.info(f"Starting RandomizedSearchCV for {best_name} with 5-fold CV...")

    grid_search = RandomizedSearchCV(
        estimator=best_model,
        param_distributions=param_grid,
        cv=5,
        scoring="f1_macro",
        n_jobs=-1,
        n_iter=20,
        verbose=1,
        refit=True,
    )
    grid_search.fit(X_train, y_train)

    logger.info(f"Best params: {grid_search.best_params_}")
    logger.info(f"Best CV F1 (macro): {round(grid_search.best_score_, 4)}")

    _save_tuning_results(best_name, grid_search)

    return grid_search.best_estimator_


def _save_tuning_results(model_name: str, grid_search: RandomizedSearchCV):
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    results = {
        "model":          model_name,
        "best_params":    grid_search.best_params_,
        "best_cv_f1":     round(grid_search.best_score_, 4),
    }
    with open(ARTIFACTS_DIR / "tuning_results.json", "w") as f:
        json.dump(results, f, indent=2)