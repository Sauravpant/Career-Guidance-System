# Career Recommendation System

> An end-to-end ML pipeline that recommends tech job roles based on a candidate's skills and years of experience.

![Python](https://img.shields.io/badge/Python-3.12-blue?logo=python) ![FastAPI](https://img.shields.io/badge/FastAPI-latest-green?logo=fastapi) ![XGBoost](https://img.shields.io/badge/XGBoost-tuned-orange) ![License](https://img.shields.io/badge/license-MIT-lightgrey)

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Dataset](#dataset)
- [Feature Engineering](#feature-engineering)
- [ML Pipeline](#ml-pipeline)
- [Model Results](#model-results)
  - [Performance Summary](#performance-summary)
  - [Confusion Matrices](#confusion-matrices)
  - [Learning Curves](#learning-curves)
  - [Hyperparameter Tuning](#hyperparameter-tuning)
- [API Reference](#api-reference)
- [Running Training](#running-training)
- [Running the API](#running-the-api)
- [Artifacts](#artifacts)

---

## Overview

The Career Recommendation System takes a candidate's **skills** and **years of experience** as input and returns ranked job role recommendations with confidence scores. The pipeline trains and compares four classifiers, tunes the best model with `RandomizedSearchCV`, and serves predictions via a FastAPI REST endpoint.

**Best model:** XGBoost — **88.46% F1 Macro** on the held-out test set (1,330 samples).

---

## Tech Stack

| Layer | Technology |
|---|---|
| API Framework | FastAPI + Uvicorn |
| Data Validation | Pydantic v2 |
| ML Models | scikit-learn, XGBoost |
| Imbalance Handling | imbalanced-learn (SMOTE) |
| Feature Encoding | MultiLabelBinarizer, LabelEncoder |
| Serialization | joblib |
| Visualization | matplotlib, seaborn |
| Language | Python 3.12 |

---

## Project Structure

```
ml-service-v2/
├── app/                        # FastAPI application
│   └── services/               # Prediction service layer
├── training/                   # ML pipeline
│   ├── data_loader.py
│   ├── preprocessing.py
│   ├── train.py
│   ├── evaluate.py
│   ├── tune.py
│   ├── learning_curves.py
│   ├── recommend.py
│   └── utils.py
├── models/                     # Saved models and encoders (.pkl)
├── data/
│   ├── raw/                    # Input dataset
│   └── artifacts/              # All evaluation outputs
├── notebooks/
└── requirements.txt
```

---

## Dataset

| Property | Detail |
|---|---|
| File | `data/raw/tech_jobs_dataset_cleaned.csv` |
| Total records | 6,648 |
| Features used | `skills_required`, `experience` |
| Dropped | `skills_count` |
| Target | `job_title` |
| Classes | 8 |

**Class distribution:**

| Job Title | Count | Share |
|---|---|---|
| AI/ML Engineer | 1,685 | 25.3% |
| Data Scientist | 1,544 | 23.2% |
| Data Analyst | 1,083 | 16.3% |
| Python Developer | 582 | 8.8% |
| Software Engineer | 554 | 8.3% |
| Full Stack Developer | 545 | 8.2% |
| QA Engineer | 397 | 6.0% |
| DevOps Engineer | 258 | 3.9% |

The dataset is moderately imbalanced — DevOps Engineer has ~6.5× fewer samples than AI/ML Engineer. SMOTE is applied on training data to mitigate this.

---

## Feature Engineering

### Skill

Comma-separated skill strings are parsed and encoded with `MultiLabelBinarizer`:

```
"python, sql, machine learning"  →  [0, 1, 0, 1, 1, 0, ...]
```

### Experience

A numeric float used as-is, prepended as the first column of the feature matrix.

### Final Feature Matrix

```
X = [experience] + [MLB(skills_required)]
```

### Class Imbalance — SMOTE

SMOTE is applied **only on training data** after the 80/20 stratified split. The test set is never touched, ensuring evaluation reflects real-world distribution.

---

## ML Pipeline

```
Raw CSV
  └─▶ data_loader.py          clean + drop skills_count
        └─▶ preprocessing.py      MLB(skills) + experience
              └─▶ train_test_split  (80/20, stratified)
                    └─▶ SMOTE        (training only)
                          └─▶ Train 4 baseline models
                                └─▶ Learning curves (all 4)
                                      └─▶ Evaluate train + test
                                            └─▶ Pick best by F1 macro
                                                  └─▶ RandomizedSearchCV
                                                        (n_iter=50, cv=5)
                                                        └─▶ Learning curve (tuned)
                                                              └─▶ Evaluate tuned model
                                                                    └─▶ Save best_model.pkl
```

---

## Model Results

### Performance Summary

All metrics are reported on the held-out test set (1,330 samples, 20% stratified split). Training metrics are included to assess overfitting.

| Model | Train Accuracy | Train F1 Macro | Train MCC | Test Accuracy | Test F1 Macro | Test Precision | Test Recall | Test MCC |
|---|---|---|---|---|---|---|---|---|
| Logistic Regression | 0.9185 | 0.9211 | 0.9063 | 0.8872 | 0.8767 | 0.8752 | 0.8821 | 0.8644 |
| SVC | 0.9310 | 0.9344 | 0.9206 | 0.8925 | 0.8833 | 0.8858 | 0.8832 | 0.8705 |
| Random Forest | 0.8590 | 0.8660 | 0.8415 | 0.8256 | 0.8112 | 0.8522 | 0.8032 | 0.7956 |
| **XGBoost** | **0.9326** | **0.9361** | **0.9225** | **0.8925** | **0.8846** | **0.8853** | **0.8863** | **0.8706** |
| XGBoost (Tuned) | 0.9415 | 0.9456 | 0.9328 | 0.8925 | 0.8843 | 0.8855 | 0.8858 | 0.8706 |

**Key observations:**

- **XGBoost** (baseline) was selected as the best model by F1 Macro. It ties SVC on test accuracy but edges ahead on recall and MCC.
- **Random Forest** underperformed significantly — its learning curve reveals a persistent train/validation gap that did not close with more data, suggesting it struggles with this feature representation.
- **Tuning yielded marginal gains** on test metrics (+0 accuracy, −0.0003 F1 macro vs. baseline XGBoost) but meaningfully improved cross-validation F1 to **0.9229**, indicating better generalization on unseen folds.
- **Logistic Regression** achieves a competitive 0.8767 F1 macro — a strong baseline given its simplicity.

**Evaluation metric rationale:**

| Metric | Role |
|---|---|
| F1 Macro | Primary — penalizes ignoring minority classes equally across all 8 roles |
| MCC | Secondary — robust single-value score for imbalanced multiclass |
| Accuracy | Informational |
| Precision / Recall Macro | Informational — used to diagnose precision-recall tradeoffs per class |

---

### Confusion Matrices

#### Logistic Regression

![Confusion Matrix — Logistic Regression](data/artifacts/confusion_matrix_logistic_regression.png)

Notable: AI/ML Engineer and Data Scientist see the most cross-confusion (25 AI/ML predicted as Data Scientist, 18 Data Scientist predicted as AI/ML), which is expected given overlapping skill sets. Software Engineer is the hardest class (F1 0.78) with spillover into Python Developer.

---

#### Random Forest

![Confusion Matrix — Random Forest](data/artifacts/confusion_matrix_random_forest.png)

Notable: Random Forest routes a disproportionate number of samples to Software Engineer (e.g., 36 AI/ML Engineers misclassified as Software Engineer), dragging down macro recall. This is reflected in its lowest test F1 (0.8112) and precision-recall gap (0.8522 vs. 0.8032).

---

#### SVC

![Confusion Matrix — SVC](data/artifacts/confusion_matrix_svc.png)

Notable: SVC achieves clean separation across most classes. Full Stack Developer reaches F1 0.92 — the highest among all models for that class. Software Engineer improves to 0.83 F1 vs. 0.78 for Logistic Regression.

---

#### XGBoost (Baseline)

![Confusion Matrix — XGBoost](data/artifacts/confusion_matrix_xgboost.png)

Notable: XGBoost matches SVC on accuracy but improves recall for DevOps Engineer (0.90 vs. 0.87) and Python Developer (0.84 vs. 0.83), helping macro recall. The AI/ML ↔ Data Scientist confusion cluster (24/18 misclassifications) is consistent with all linear models.

---

#### XGBoost (Tuned)

![Confusion Matrix — XGBoost (Tuned)](data/artifacts/confusion_matrix_xgboost_tuned.png)

Notable: Tuning does not materially change the error pattern vs. baseline XGBoost. The confusion matrix is nearly identical — the main gains from tuning are improved cross-validation stability rather than a shift in which classes are misclassified.

---

### Learning Curves

Learning curves plot F1 Macro (y-axis) against training set size (x-axis) for both training score and cross-validation score. A narrowing gap indicates good generalization; a persistent wide gap signals variance/overfitting.

#### Logistic Regression

![Learning Curve — Logistic Regression](data/artifacts/learning_curve_logistic_regression.png)

The curves converge cleanly by ~4,000 samples, with train and validation scores meeting near 0.91. This indicates Logistic Regression is well-fitted and not suffering from high variance or bias — it simply plateaus slightly below the tree-based models.

---

#### Random Forest

![Learning Curve — Random Forest](data/artifacts/learning_curve_random_forest.png)

A striking U-shape in the validation curve and a wide, persistent train/validation gap throughout most of the training range indicate high variance. The curves begin converging only at the far right (~6,000 samples), suggesting this model would likely benefit from significantly more data or better hyperparameter control on tree depth.

---

#### SVC

![Learning Curve — SVC](data/artifacts/learning_curve_svc.png)

Strong convergence — curves merge tightly by ~4,500 samples. SVC achieves high validation scores (≥0.92) with very low variance at full training size. The wide confidence band at small sample sizes collapses quickly, showing the model is data-efficient.

---

#### XGBoost (Baseline)

![Learning Curve — XGBoost](data/artifacts/learning_curve_xgboost.png)

Both curves are still rising at the 6,000-sample mark (~0.94 train, ~0.92 validation), with a modest but stable gap. This upward trend suggests the model has not yet saturated — **additional training data would likely yield further improvement**. The gap is well-controlled, indicating low variance.

---

#### XGBoost (Tuned)

![Learning Curve — XGBoost (Tuned)](data/artifacts/learning_curve_xgboost_tuned.png)

The tuned model shows a tighter training curve (starts higher, grows more steadily) and improved validation scores throughout. The train/validation gap is slightly narrower than baseline XGBoost, consistent with better regularization from the tuned `gamma`, `min_child_weight`, and `colsample_bytree` parameters.

---

### Hyperparameter Tuning

XGBoost was selected as the best baseline model and tuned with `RandomizedSearchCV` (n_iter=50, cv=5, scoring=F1 Macro).

**Best cross-validation F1 Macro: 0.9229**

**Best parameters found:**

| Parameter | Value | Effect |
|---|---|---|
| `n_estimators` | 200 | More trees; compensated by low learning rate |
| `max_depth` | 4 | Shallow trees reduce overfitting |
| `learning_rate` | 0.1 | Standard; works well with 200 estimators |
| `subsample` | 0.9 | Stochastic sampling adds regularization |
| `colsample_bytree` | 0.7 | Feature subsampling per tree |
| `min_child_weight` | 3 | Controls leaf node minimum sum of instance weights |
| `gamma` | 0.25 | Minimum loss reduction for a split; prunes weak splits |
| `reg_alpha` | 0 | No L1 regularization |
| `reg_lambda` | 1 | Standard L2 regularization |

The combination of shallow trees (`max_depth=4`), moderate feature subsampling (`colsample_bytree=0.7`), and a non-zero `gamma` (0.25) is responsible for the improved cross-validation stability compared to the default configuration.

---

## API Reference

**Base URL:** `http://localhost:8000`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/api/v1/recommend` | Get career recommendations |
| `GET` | `/docs` | Swagger UI |

### POST `/api/v1/recommend`

**Request body**

```json
{
  "skills": ["python", "machine learning", "sql", "tensorflow"],
  "experience": 3.5
}
```

**Response**

```json
{
  "best_career": "AI/ML Engineer",
  "confidence": 0.7434,
  "top_3_recommendations": [
    { "career": "AI/ML Engineer",  "score": 0.7434 },
    { "career": "Data Scientist",  "score": 0.1337 },
    { "career": "Data Analyst",    "score": 0.0666 }
  ]
}
```

**Field descriptions:**

| Field | Type | Description |
|---|---|---|
| `skills` | `list[str]` | Candidate's skills (comma-separated or list) |
| `experience` | `float` | Years of experience |
| `best_career` | `str` | Highest-confidence role |
| `confidence` | `float` | Probability score for the top recommendation |
| `top_3_recommendations` | `list` | Top 3 roles with scores, sorted descending |

---

## Running Training

```bash
cd ml-service
python -m training.train
```

This executes the full pipeline: data loading → preprocessing → SMOTE → training all 4 models → evaluation → hyperparameter tuning → saving `best_model.pkl`.

---

## Running the API

```bash
cd ml-service
uvicorn app.main:app --reload
```

Once running, the Swagger UI is available at `http://localhost:8000/docs`.

---

## Artifacts

All outputs are saved to `data/artifacts/` after training:

| File | Description |
|---|---|
| `model_comparison.csv` | Train + test metrics for all models including tuned |
| `metrics.json` | Best model metrics (structured) |
| `tuning_results.json` | Best hyperparameters from RandomizedSearchCV |
| `classification_report_logistic_regression.txt` | Per-class precision/recall/F1 |
| `classification_report_random_forest.txt` | Per-class precision/recall/F1 |
| `classification_report_svc.txt` | Per-class precision/recall/F1 |
| `classification_report_xgboost.txt` | Per-class precision/recall/F1 |
| `classification_report_xgboost_tuned.txt` | Per-class precision/recall/F1 |
| `confusion_matrix_logistic_regression.png` | Confusion matrix heatmap |
| `confusion_matrix_random_forest.png` | Confusion matrix heatmap |
| `confusion_matrix_svc.png` | Confusion matrix heatmap |
| `confusion_matrix_xgboost.png` | Confusion matrix heatmap |
| `confusion_matrix_xgboost_tuned.png` | Confusion matrix heatmap |
| `learning_curve_logistic_regression.png` | Learning curve (F1 Macro vs. training size) |
| `learning_curve_random_forest.png` | Learning curve (F1 Macro vs. training size) |
| `learning_curve_svc.png` | Learning curve (F1 Macro vs. training size) |
| `learning_curve_xgboost.png` | Learning curve (F1 Macro vs. training size) |
| `learning_curve_xgboost_tuned.png` | Learning curve (F1 Macro vs. training size) |