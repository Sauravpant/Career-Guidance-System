import joblib
from pathlib import Path
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier
from imblearn.over_sampling import SMOTE

from training.data_loader import load_train, load_test
from training.preprocessing import (
    build_feature_matrix, encode_target, save_encoders
)
from training.evaluate import compute_metrics, save_comparison
from training.tune import tune_best_model
from training.utils import get_logger, save_json

logger = get_logger(__name__)
MODELS_DIR = Path(__file__).resolve().parent.parent / "models"

MODELS = {
    "Logistic Regression": LogisticRegression(),
    "SVC":                 SVC(probability=True),
    "Random Forest":       RandomForestClassifier(),
    "XGBoost":             XGBClassifier(),
}

MODEL_FILE_NAMES = {
    "Logistic Regression": "logistic_regression.pkl",
    "SVC":                 "svc.pkl",
    "Random Forest":       "random_forest.pkl",
    "XGBoost":             "xgboost.pkl",
}


def train():
    logger.info("Loading train dataset...")
    train_df = load_train()
    logger.info(f"Train shape: {train_df.shape}")

    logger.info("Loading test dataset...")
    test_df = load_test()
    logger.info(f"Test shape: {test_df.shape}")

    X_train, skill_mlb, interest_mlb, edu_encoder = build_feature_matrix(train_df, fit=True)
    y_train, le = encode_target(train_df["Recommended_Career"], fit=True)

    save_encoders(skill_mlb, interest_mlb, edu_encoder, le)
    logger.info(f"Feature matrix: {X_train.shape} | Classes: {len(le.classes_)}")

    X_test, _, _, _ = build_feature_matrix(
        test_df,
        skill_mlb=skill_mlb,
        interest_mlb=interest_mlb,
        edu_encoder=edu_encoder,
        fit=False,
    )
    y_test, _ = encode_target(test_df["Recommended_Career"], le=le, fit=False)

    logger.info("Applying SMOTE on training data only...")
    X_train_res, y_train_res = SMOTE(random_state=42).fit_resample(X_train, y_train)
    logger.info(f"After SMOTE: {X_train_res.shape}")

    MODELS_DIR.mkdir(exist_ok=True)
    all_metrics = []
    trained_models = {}

    # --- Step 1: Train all base models, evaluate on test set ---
    for name, model in MODELS.items():
        logger.info(f"Training {name}...")
        model.fit(X_train_res, y_train_res)

        metrics = compute_metrics(model, X_test, y_test, list(le.classes_), name)
        logger.info(f"{name} → F1: {metrics['f1_macro']} | Acc: {metrics['accuracy']}")

        all_metrics.append(metrics)
        trained_models[name] = model
        joblib.dump(model, MODELS_DIR / MODEL_FILE_NAMES[name])

    # --- Step 2: Pick best model by macro F1 ---
    best_name = save_comparison(all_metrics)
    logger.info(f"\n Best model: {best_name} based on macro F1 score. Starting hypertuning...")

    # --- Step 3: GridSearchCV on best model — CV happens here ---
    logger.info(f"Hypertuning {best_name} with RandomizedSearchCV (5-fold CV)...")
    tuned_model = tune_best_model(best_name, trained_models[best_name], X_train_res, y_train_res)

    # --- Step 4: Final evaluation of tuned model on test set ---
    logger.info("Evaluating tuned model on test set...")
    tuned_metrics = compute_metrics(
        tuned_model, X_test, y_test, list(le.classes_), f"{best_name} (Tuned)"
    )
    logger.info(
        f"Tuned {best_name} → F1: {tuned_metrics['f1_macro']} | "
        f"Acc: {tuned_metrics['accuracy']}"
    )

    # save_comparison() above wrote metrics.json from the pre-tuning model
    # comparison, so it described a different model than the one about to be
    # saved below. Overwrite it here so metrics.json always matches
    # best_model.pkl — the model actually being shipped.
    save_json(tuned_metrics, "metrics.json")

    joblib.dump(tuned_model, MODELS_DIR / "best_model.pkl")
    logger.info("Tuned best model saved → models/best_model.pkl")


if __name__ == "__main__":
    train()