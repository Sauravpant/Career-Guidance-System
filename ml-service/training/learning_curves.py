import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path
from sklearn.model_selection import learning_curve

ARTIFACTS_DIR = Path(__file__).resolve().parent.parent / "data" / "artifacts"


def plot_learning_curve(
    model,
    X_train: np.ndarray,
    y_train: np.ndarray,
    model_name: str,
    cv: int = 5,
    scoring: str = "f1_macro",
):
    train_sizes, train_scores, val_scores = learning_curve(
        model,
        X_train,
        y_train,
        cv=cv,
        scoring=scoring,
        train_sizes=np.linspace(0.1, 1.0, 8),
        n_jobs=-1,
    )

    train_mean = train_scores.mean(axis=1)
    train_std  = train_scores.std(axis=1)
    val_mean   = val_scores.mean(axis=1)
    val_std    = val_scores.std(axis=1)

    fig, ax = plt.subplots(figsize=(9, 5))

    ax.plot(train_sizes, train_mean, "o-", color="#2563eb", label="Training score")
    ax.fill_between(train_sizes, train_mean - train_std, train_mean + train_std, alpha=0.15, color="#2563eb")

    ax.plot(train_sizes, val_mean, "o-", color="#16a34a", label="Validation score (CV)")
    ax.fill_between(train_sizes, val_mean - val_std, val_mean + val_std, alpha=0.15, color="#16a34a")

    ax.set_title(f"Learning Curve — {model_name}")
    ax.set_xlabel("Training samples")
    ax.set_ylabel(f"Score ({scoring})")
    ax.legend(loc="lower right")
    ax.grid(True, linestyle="--", alpha=0.5)
    plt.tight_layout()

    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    safe = model_name.lower().replace(" ", "_").replace("(", "").replace(")", "").replace("/", "_")
    fig.savefig(ARTIFACTS_DIR / f"learning_curve_{safe}.png", dpi=150)
    plt.close(fig)
