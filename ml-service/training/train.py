import joblib
import pandas as pd
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier
from imblearn.over_sampling import SMOTE

from training.data_loader import load_data
from training.preprocessing import build_feature_matrix, encode_target, save_encoders
from training.evaluate import compute_metrics, save_comparison
from training.learning_curves import plot_learning_curve
from training.tune import tune_best_model
from training.utils import get_logger

logger = get_logger(__name__)
MODELS_DIR = Path(__file__).resolve().parent.parent / "models"

MODELS = {
    "Logistic Regression": LogisticRegression(
        max_iter=1000,
        random_state=42
    ),

    "SVC": SVC(
        probability=True,
        C=0.5,
        random_state=42
    ),

    "Random Forest": RandomForestClassifier(
        n_estimators=1000,
        max_depth=10,
        random_state=42
    ),

    "XGBoost": XGBClassifier(
    n_estimators=300,
    learning_rate=0.05,
    max_depth=4,
    min_child_weight=5,
    gamma=0.5,
    subsample=0.8,
    colsample_bytree=0.8,
    reg_alpha=0.5,
    reg_lambda=2.0,
    random_state=42,
    eval_metric="mlogloss"
    )
}

MODEL_FILE_NAMES = {
    "Logistic Regression": "logistic_regression.pkl",
    "SVC":                 "svc.pkl",
    "Random Forest":       "random_forest.pkl",
    "XGBoost":             "xgboost.pkl",
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

    X, skill_mlb, scaler = build_feature_matrix(df, fit=True)
    y, le                = encode_target(df["job_title"], fit=True)

    save_encoders(skill_mlb, scaler, le)
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
    all_metrics    = []
    trained_models = {}

    # --- Step 1: Train baseline models ---
    for name, model in MODELS.items():
        logger.info(f"Training {name}...")
        model.fit(X_train_res, y_train_res)

        logger.info(f"Generating learning curve for {name}...")
        plot_learning_curve(model, X_train_res, y_train_res, model_name=name)

        metrics = compute_metrics(
            model, X_train_res, y_train_res,
            X_test, y_test, list(le.classes_), name
        )
        logger.info(
            f"{name} → Train F1: {metrics['train']['f1_macro']} | "
            f"Test F1: {metrics['test']['f1_macro']} | "
            f"Test MCC: {metrics['test']['mcc']} | "
            f"Overfit gap: {round(metrics['train']['f1_macro'] - metrics['test']['f1_macro'], 4)}"
        )
        all_metrics.append(metrics)
        trained_models[name] = model
        joblib.dump(model, MODELS_DIR / MODEL_FILE_NAMES[name])

    # --- Step 2: Pick best baseline model by test F1 macro ---
    best_name = save_comparison(all_metrics)
    logger.info(f"\n🏆 Best baseline model: {best_name}")

    # --- Step 3: Hyperparameter tune the best model ---
    logger.info(f"Tuning {best_name} with RandomizedSearchCV (n_iter=50, cv=5)...")
    tuned_model = tune_best_model(best_name, trained_models[best_name], X_train_res, y_train_res)

    # --- Step 4: Learning curve for tuned model ---
    logger.info("Generating learning curve for tuned model...")
    plot_learning_curve(tuned_model, X_train_res, y_train_res, model_name=f"{best_name} (Tuned)")

    # --- Step 5: Evaluate tuned model ---
    logger.info("Evaluating tuned model on train and test sets...")
    tuned_metrics = compute_metrics(
        tuned_model, X_train_res, y_train_res,
        X_test, y_test, list(le.classes_), f"{best_name} (Tuned)"
    )
    logger.info(
        f"Tuned {best_name} → Train F1: {tuned_metrics['train']['f1_macro']} | "
        f"Test F1: {tuned_metrics['test']['f1_macro']} | "
        f"Test MCC: {tuned_metrics['test']['mcc']} | "
        f"Overfit gap: {round(tuned_metrics['train']['f1_macro'] - tuned_metrics['test']['f1_macro'], 4)}"
    )

    all_metrics.append(tuned_metrics)
    save_comparison(all_metrics)

    joblib.dump(tuned_model, MODELS_DIR / "best_model.pkl")
    logger.info("Tuned best model saved → models/best_model.pkl")


if __name__ == "__main__":
    train()
