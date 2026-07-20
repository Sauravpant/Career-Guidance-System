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
#ignore all warnings
warnings.filterwarnings("ignore", category=Warning)
logger = get_logger(__name__)
MODELS_DIR = Path(__file__).resolve().parent.parent / "models"

CV_FOLDS    = 5   # used for BOTH the default-parameter baseline CV and every hyperparameter search
TUNE_N_ITER = 50  # RandomizedSearchCV iterations per model


# -----------------------------------------------------------------------------
# Fairness fix (per supervisor feedback): comparing "baseline" models that
# already had hand-picked hyperparameters against a tuned model was not a
# fair comparison. Every model below is built with its library's own
# DEFAULT hyperparameters — nothing here is hand-tuned. The only two
# exceptions are NOT performance-tuning choices:
#
#   - random_state=42       → fixes the seed for reproducibility only; it
#                              does not change the "default-ness" of the
#                              configuration.
#   - SVC(probability=True) → required so the model exposes predict_proba,
#                              which app/services/recommendation_service.py
#                              depends on regardless of which of the 4
#                              models ends up winning.
#
# Every other hyperparameter is left at the library default. Each of these
# 4 models is trained here with defaults, then separately hyperparameter-
# tuned in Phase 2 below (see training.tune.tune_model), and the final model
# is only chosen after ALL FOUR have been tuned.
#
# NOTE: a fresh dict must be built each time (rather than reused/mutated),
# since a fitted model can't cleanly be "reset" back to unfitted — Phase 1
# and Phase 2 each need their own untouched instances.
# -----------------------------------------------------------------------------
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
    """
    Boost minority classes to 60% of majority class size only.
    Prevents overcorrection on genuinely rare classes like DevOps Engineer.
    Also sets k_neighbors safely based on smallest class size.
    """
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

    X, skill_mlb, scaler = build_feature_matrix(df, fit=True) #input feature encode
    y, le                = encode_target(df["job_title"], fit=True) #output encode

    save_encoders(skill_mlb, scaler, le) #savw rgw encoder for future use
    logger.info(f"Feature matrix: {X.shape} | Classes: {len(le.classes_)}")

    # 80/20 stratified split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    logger.info(f"Train: {X_train.shape} | Test: {X_test.shape}")

    # Partial SMOTE on training data only
    X_train_res, y_train_res = _partial_smote(X_train, y_train)
    logger.info(f"After partial SMOTE: {X_train_res.shape}")

    MODELS_DIR.mkdir(exist_ok=True)

    # Shared fold splitter — reused for BOTH the default-parameter CV (Phase
    # 1) and every hyperparameter search (Phase 2), so default and tuned
    # models are scored on the exact same 5 folds. This is what makes the
    # before/after tuning comparison fair.
    cv_splitter = StratifiedKFold(n_splits=CV_FOLDS, shuffle=True, random_state=42)

    # =========================================================================
    # PHASE 1 — Train all 4 models with DEFAULT hyperparameters only.
    #           Each is evaluated with train/test metrics AND 5-fold CV.
    # =========================================================================
    default_metrics = []
    default_models  = {}

    for name, model in build_default_models().items():
        logger.info(f"[Default] Training {name} (library default hyperparameters)...")

        logger.info(f"[Default] Running {CV_FOLDS}-fold CV for {name}...")
        cv_metrics = compute_cv_metrics(
            build_default_models()[name],  # fresh, unfitted clone — cross_validate fits its own internal clones anyway, but this keeps intent explicit
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
        joblib.dump(model, MODELS_DIR / MODEL_FILE_NAMES[name]) #save default model

    logger.info("\nAll 4 models trained with default parameters. Proceeding to hyperparameter tuning for all 4...")

    # =========================================================================
    # PHASE 2 — Hyperparameter-tune ALL 4 models (RandomizedSearchCV, cv=5).
    #           Tuning starts from a FRESH default instance each time — never
    #           from the already-fitted Phase 1 model.
    # =========================================================================
    tuned_metrics  = []
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
        joblib.dump(tuned_model, MODELS_DIR / TUNED_MODEL_FILE_NAMES[name]) #save tuned model

    save_tuning_summary(tuning_summary)
    logger.info("Tuning results for all 4 models saved → data/artifacts/tuning_results.json")

    # =========================================================================
    # PHASE 3 — Save the full comparison (all 4 default + all 4 tuned), then
    #           pick the FINAL model. Selection criterion is unchanged from
    #           before (highest test f1_macro) — but per the fairness fix it
    #           is now applied ONLY across the 4 TUNED models, since every
    #           model has now been through the identical default -> tune
    #           pipeline.
    # =========================================================================
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
