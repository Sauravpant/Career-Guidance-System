import joblib
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier
from imblearn.over_sampling import SMOTE

from training.data_loader import load_data
from training.preprocessing import (
    build_feature_matrix, encode_target, save_encoders
)
from training.evaluate import compute_metrics, cross_val, save_comparison
from training.utils import get_logger

logger = get_logger(__name__)
MODELS_DIR = Path(__file__).resolve().parent.parent / "models"

MODELS = {
    "Logistic Regression": LogisticRegression(max_iter=1000, n_jobs=-1, random_state=42),
    "SVC": SVC(probability=True, random_state=42),
    "Random Forest": RandomForestClassifier(n_estimators=200, n_jobs=-1, random_state=42),
    "XGBoost": XGBClassifier(n_estimators=200, use_label_encoder=False,
                             eval_metric="mlogloss", n_jobs=-1, random_state=42),
}

MODEL_FILE_NAMES = {
    "Logistic Regression": "logistic_regression.pkl",
    "SVC": "svc.pkl",
    "Random Forest": "random_forest.pkl",
    "XGBoost": "xgboost.pkl",
}


def train():
    logger.info("Loading data...")
    df = load_data()
    logger.info(f"Dataset shape: {df.shape}")

    X, skill_mlb, interest_mlb, edu_encoder = build_feature_matrix(df, fit=True)
    y, le = encode_target(df["Recommended_Career"], fit=True)

    save_encoders(skill_mlb, interest_mlb, edu_encoder, le)
    logger.info(f"Feature matrix: {X.shape} | Classes: {len(le.classes_)}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    logger.info("Applying SMOTE on training data...")
    smote = SMOTE(random_state=42)
    X_train_res, y_train_res = smote.fit_resample(X_train, y_train)
    logger.info(f"After SMOTE: {X_train_res.shape}")

    MODELS_DIR.mkdir(exist_ok=True)
    all_metrics = []

    for name, model in MODELS.items():
        logger.info(f"Training {name}...")
        model.fit(X_train_res, y_train_res)

        metrics = compute_metrics(model, X_test, y_test, list(le.classes_), name)

        logger.info(f"Running cross-validation for {name}...")
        cv_score = cross_val(model, X_train_res, y_train_res, cv=5)
        metrics["cv_f1_macro"] = cv_score

        logger.info(f"{name} → F1: {metrics['f1_macro']} | Acc: {metrics['accuracy']} | CV: {cv_score}")
        all_metrics.append(metrics)

        joblib.dump(model, MODELS_DIR / MODEL_FILE_NAMES[name])

    best_name = save_comparison(all_metrics)
    logger.info(f"\n🏆 Best model: {best_name}")

    best_file = MODEL_FILE_NAMES[best_name]
    best_model = joblib.load(MODELS_DIR / best_file)
    joblib.dump(best_model, MODELS_DIR / "best_model.pkl")
    logger.info(f"Best model saved → models/best_model.pkl")


if __name__ == "__main__":
    train()
