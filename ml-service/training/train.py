import joblib
import pandas as pd
from pathlib import Path
from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier
from imblearn.over_sampling import SMOTE

from training.data_loader import load_data
from training.preprocessing import build_feature_matrix, encode_target, save_encoders
from training.evaluate import compute_metrics, compute_cv_metrics, save_comparison
from training.learning_curves import plot_learning_curve
from training.tune import tune_model, save_tuning_summary
from training.utils import get_logger
import warnings

warnings.filterwarnings("ignore", category=Warning)
logger = get_logger(__name__)
MODELS_DIR = Path(__file__).resolve().parent.parent / "models"

CV_FOLDS = 5
TUNE_N_ITER = 50


def build_default_models() -> dict:
    return {
        "Logistic Regression": LogisticRegression(random_state=42),
        "SVC":                 SVC(probability=True, random_state=42),
        "Random Forest":       RandomForestClassifier(random_state=42),
        "XGBoost":             XGBClassifier(random_state=42),
    }


MODEL_FILE_NAMES = {
    "Logistic Regression": "logistic_regression.pkl",
    "SVC":                 "svc.pkl",
    "Random Forest":       "random_forest.pkl",
    "XGBoost":             "xgboost.pkl",
}

TUNED_MODEL_FILE_NAMES = {
    "Logistic Regression": "logistic_regression_tuned.pkl",
    "SVC":                 "svc_tuned.pkl",
    "Random Forest":       "random_forest_tuned.pkl",
    "XGBoost":             "xgboost_tuned.pkl",
}


def _partial_smote(X_train, y_train) -> tuple:
    counts       = pd.Series(y_train).value_counts()
    target_size  = int(counts.max() * 0.60)
    strategy     = {cls: target_size for cls, cnt in counts.items() if cnt < target_size}
    k_neighbors  = max(1, min(5, counts.min() - 1))

    logger.info(f"Partial SMOTE — majority: {counts.max()} | target: {target_size} | k: {k_neighbors}")
    logger.info(f"Classes being oversampled: {strategy}")

    smote = SMOTE(sampling_strategy=strategy, k_neighbors=k_neighbors, random_state=42)
    return smote.fit_resample(X_train, y_train)


def train():
    logger.info("Loading dataset...")
    df = load_data()
    logger.info(f"Dataset shape: {df.shape}")

    X, skill_mlb, scaler, exp_clip_range = build_feature_matrix(df, fit=True)
    y, le = encode_target(df["job_title"], fit=True)

    save_encoders(skill_mlb, scaler, le, exp_clip_range)
    logger.info(f"Feature matrix: {X.shape} | Classes: {len(le.classes_)}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    logger.info(f"Train: {X_train.shape} | Test: {X_test.shape}")

    X_train_res, y_train_res = _partial_smote(X_train, y_train)
    logger.info(f"After partial SMOTE: {X_train_res.shape}")

    MODELS_DIR.mkdir(exist_ok=True)

    cv_splitter = StratifiedKFold(n_splits=CV_FOLDS, shuffle=True, random_state=42)

    default_metrics = []
    default_models  = {}

    for name, model in build_default_models().items():
        logger.info(f"[Default] Training {name}...")

        logger.info(f"[Default] Running {CV_FOLDS}-fold CV for {name}...")
        cv_metrics = compute_cv_metrics(
            build_default_models()[name],
            X_train_res, y_train_res, cv=cv_splitter,
        )

        model.fit(X_train_res, y_train_res)

        logger.info(f"[Default] Generating learning curve for {name}...")
        plot_learning_curve(model, X_train_res, y_train_res, model_name=name, cv=CV_FOLDS)

        metrics = compute_metrics(
            model, X_train_res, y_train_res,
            X_test, y_test, list(le.classes_), name
        )
        metrics["stage"]     = "default"
        metrics["base_name"] = name
        metrics["cv"]        = cv_metrics

        logger.info(
            f"[Default] {name} → CV F1: {cv_metrics['f1_macro_mean']} ± {cv_metrics['f1_macro_std']} | "
            f"Train F1: {metrics['train']['f1_macro']} | Test F1: {metrics['test']['f1_macro']} | "
            f"Test MCC: {metrics['test']['mcc']} | "
            f"Overfit gap: {round(metrics['train']['f1_macro'] - metrics['test']['f1_macro'], 4)}"
        )

        default_metrics.append(metrics)
        default_models[name] = model
        joblib.dump(model, MODELS_DIR / MODEL_FILE_NAMES[name])

    logger.info("\nAll 4 models trained with default parameters. Proceeding to hyperparameter tuning for all 4...")

    tuned_metrics = []
    tuned_models   = {}
    tuning_summary = {}

    for name, fresh_model in build_default_models().items():
        logger.info(f"[Tuning] {name} — RandomizedSearchCV (n_iter={TUNE_N_ITER}, cv={CV_FOLDS})...")

        tuned_model, best_params, cv_metrics = tune_model(
            name, fresh_model, X_train_res, y_train_res,
            cv=cv_splitter, n_iter=TUNE_N_ITER,
        )
        tuning_summary[name] = {"best_params": best_params, "cv_metrics": cv_metrics}

        logger.info(f"[Tuning] Generating learning curve for tuned {name}...")
        plot_learning_curve(tuned_model, X_train_res, y_train_res, model_name=f"{name} (Tuned)", cv=CV_FOLDS)

        metrics = compute_metrics(
            tuned_model, X_train_res, y_train_res,
            X_test, y_test, list(le.classes_), f"{name} (Tuned)"
        )
        metrics["stage"]     = "tuned"
        metrics["base_name"] = name
        metrics["cv"]        = cv_metrics

        logger.info(
            f"[Tuning] {name} → CV F1: {cv_metrics['f1_macro_mean']} ± {cv_metrics['f1_macro_std']} | "
            f"Train F1: {metrics['train']['f1_macro']} | Test F1: {metrics['test']['f1_macro']} | "
            f"Test MCC: {metrics['test']['mcc']} | "
            f"Overfit gap: {round(metrics['train']['f1_macro'] - metrics['test']['f1_macro'], 4)}"
        )

        tuned_metrics.append(metrics)
        tuned_models[name] = tuned_model
        joblib.dump(tuned_model, MODELS_DIR / TUNED_MODEL_FILE_NAMES[name])

    save_tuning_summary(tuning_summary)
    logger.info("Tuning results for all 4 models saved → data/artifacts/tuning_results.json")

    all_metrics = default_metrics + tuned_metrics
    save_comparison(all_metrics)
    logger.info("Full model comparison saved → data/artifacts/model_comparison.csv / metrics.json")

    best_tuned = max(tuned_metrics, key=lambda m: m["test"]["f1_macro"])
    best_name  = best_tuned["base_name"]

    logger.info(
        f"\nBest model overall (selected after tuning all 4): {best_name} (Tuned) → "
        f"Test F1: {best_tuned['test']['f1_macro']} | Test MCC: {best_tuned['test']['mcc']} | "
        f"CV F1: {best_tuned['cv']['f1_macro_mean']} ± {best_tuned['cv']['f1_macro_std']}"
    )

    joblib.dump(tuned_models[best_name], MODELS_DIR / "best_model.pkl")
    logger.info("Best tuned model saved → models/best_model.pkl")


if __name__ == "__main__":
    train()
