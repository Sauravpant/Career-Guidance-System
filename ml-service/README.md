# Career Recommendation System

An end-to-end machine learning service that recommends careers based on a candidate's education, skills, and interests, served via a production-ready FastAPI REST API.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Dataset](#dataset)
- [Feature Engineering](#feature-engineering)
- [ML Pipeline](#ml-pipeline)
- [Model Results](#model-results)
- [API Reference](#api-reference)
- [Running Training](#running-training)
- [Running the API](#running-the-api)
- [Artifacts](#artifacts)
- [Notes](#notes)

---

## Overview

This system takes a candidate's **education level**, **skills**, and **interests** as input and returns a ranked list of recommended careers with confidence scores.

It trains and compares four classifiers, automatically selects the best base model by F1-score (macro average), hypertunes that model with `RandomizedSearchCV`, and exposes the final tuned model through a clean REST API endpoint.

> **Dataset Notice**
> Training and test data now come from two **separate, independently sourced files** instead of a single split dataset. `train_dataset.csv` is sourced from Kaggle. `test_set.csv` is a **synthetically generated** holdout set built to mirror the same schema (`Education`, `Skills`, `Interests`, `Recommended_Career`) so the model is evaluated on data it never trained on, with no leakage between the two files. The label set was also consolidated down to **10 career classes** (e.g. `AI/ML Engineer` now absorbs what were previously separate ML/AI/Data-Analyst-adjacent labels), removing the smaller, noisier classes from the previous 13-class version.

---

## Tech Stack

| Layer              | Technology                                       |
| ------------------ | ------------------------------------------------ |
| API Framework      | FastAPI + Uvicorn                                |
| Data Validation    | Pydantic v2                                      |
| ML Models          | scikit-learn, XGBoost                            |
| Imbalance Handling | imbalanced-learn (SMOTE)                         |
| Feature Encoding   | MultiLabelBinarizer, OneHotEncoder, LabelEncoder |
| Serialization      | joblib                                           |
| Visualization      | matplotlib, seaborn                              |
| Language           | Python 3.14                                      |

---

## Project Structure

```
ml-service/
├── app/                  # FastAPI application
│   ├── main.py           # App entrypoint, /health route
│   ├── routes.py         # /api/v1/recommend route
│   ├── schemas.py        # Pydantic request/response models
│   ├── dependencies.py   # Cached service injection
│   └── services/         # RecommendationService (model + encoders)
├── training/             # ML pipeline (loader, preprocessing, train, tune, evaluate)
├── models/                # Saved models and encoders (.pkl)
├── data/
│   ├── raw/               # train_dataset.csv, test_set.csv
│   ├── processed/
│   └── artifacts/         # Metrics, reports, confusion matrices
├── notebooks/             # EDA and model comparison
└── requirements.txt
```

---

## Dataset

| Property                       | Detail                                                                                              |
| ------------------------------ | --------------------------------------------------------------------------------------------------- |
| Train file                     | `data/raw/train_dataset.csv`                                                                        |
| Test file                      | `data/raw/test_set.csv`                                                                             |
| Train origin                   | Kaggle                                                                                              |
| Test origin                    | Synthetically generated holdout set (same schema, independent file — not a split of the train file) |
| Train records (raw)            | 5,237                                                                                               |
| Train records (after cleaning) | 5,232                                                                                               |
| Test records (raw)             | 1,200                                                                                               |
| Test records (after cleaning)  | 1,194                                                                                               |
| Target column                  | `Recommended_Career`                                                                                |
| Number of classes              | 10                                                                                                  |

Cleaning drops unused columns (`CandidateID`, `Name`, `Age`, `Recommendation_Score`), drops rows with missing `Education`/`Skills`/`Interests`/`Recommended_Career`, normalizes `Education` casing/aliases, and strips whitespace from the target label — which is what brings each file's row count down slightly (5,237 → 5,232 train, 1,200 → 1,194 test).

**Target class distribution (after cleaning):**

| Career                   | Train | Test |
| ------------------------ | ----- | ---- |
| Software Engineer        | 687   | 157  |
| Full Stack Developer     | 651   | 152  |
| Front-end Developer      | 620   | 145  |
| Data Scientist           | 591   | 129  |
| Backend Developer        | 541   | 132  |
| Mobile Developer         | 503   | 108  |
| UX Designer              | 460   | 108  |
| AI/ML Engineer           | 439   | 98   |
| DevOps Engineer          | 387   | 90   |
| Cybersecurity Specialist | 353   | 75   |

`Cybersecurity Specialist` and `DevOps Engineer` are the smallest classes in both files, consistent with real-world hiring distributions. SMOTE handles this imbalance during training only.

**Columns used:**

| Column                                               | Role    | Notes                                    |
| ---------------------------------------------------- | ------- | ---------------------------------------- |
| `Education`                                          | Feature | Categorical — normalized + OneHotEncoded |
| `Skills`                                             | Feature | Semicolon-separated multi-label          |
| `Interests`                                          | Feature | Semicolon-separated multi-label          |
| `Recommended_Career`                                 | Target  | LabelEncoded                             |
| `CandidateID`, `Name`, `Age`, `Recommendation_Score` | Dropped | Not used                                 |

---

## Feature Engineering

### Education

Raw values were inconsistent (`"bachelor's"`, `"BACHELOR'S"`, `"Bachelors"`, `"Bachelor's Degree"` etc.) — all normalized to three clean categories: `Bachelor`, `Master`, `PhD`, then encoded with `OneHotEncoder` (`handle_unknown="ignore"`, fit on train only).

### Skills & Interests

Both are semicolon-separated multi-label strings, split and encoded independently with `MultiLabelBinarizer`, fit on the training set and reused (never refit) on the test set.

```
"Python;Machine Learning;SQL"  →  [0, 1, 0, 1, 0, 1, ...]
"AI;Analytics"                 →  [1, 1, 0, 0, ...]
```

### Final Feature Matrix

```
X = [OneHot(Education)] + [MLB(Skills)] + [MLB(Interests)]
Shape: (5232, 367)   →   3 education dims + 287 skill dims + 77 interest dims
```

### Class Imbalance

Unlike a single-file split, train and test are already separate files, so there is no train/test leakage to guard against. SMOTE is still applied **only to the training matrix**, after both train and test feature matrices have been built with the same fitted encoders.

```
Before SMOTE: 5,232 training samples
After SMOTE:  6,870 training samples  (1,374 synthetic minority-class samples)
Test set:     1,194 samples — never touched by SMOTE
```

---

## ML Pipeline

```
train_dataset.csv (Kaggle)        test_set.csv (synthetic)
        │                                  │
        └─────────────┬────────────────────┘
                       ▼
              data_loader.py        clean + normalize (independently, same rules)
                       │
                       ▼
              preprocessing.py      fit encoders on TRAIN → transform TRAIN + TEST
                       │
                       ▼
              SMOTE (training matrix only)
                       │
                       ▼
              Train 4 base models → evaluate each on test_set.csv
                       │
                       ▼
              Select best base model by F1 macro
                       │
                       ▼
              RandomizedSearchCV (5-fold CV) on best model only
                       │
                       ▼
              Evaluate tuned model on test_set.csv
                       │
                       ▼
              Save tuned model → models/best_model.pkl
```

The key pipeline change from the previous version: there is no `train_test_split()` step anymore. Train and test were already two distinct files going in, so the split logic was removed and replaced with two independent load + clean + transform paths that share the same fitted encoders.

---

## Model Results

All four base models are trained on the SMOTE-resampled training set (6,870 samples) and evaluated on the untouched, independently-sourced test set (1,194 samples).

| Model               | Accuracy   | Precision (macro) | Recall (macro) | F1 (macro) |
| ------------------- | ---------- | ----------------- | -------------- | ---------- |
| Logistic Regression | 91.37%     | 91.19%            | 91.28%         | 91.20%     |
| SVC                 | 91.96%     | 91.70%            | 91.85%         | 91.74%     |
| Random Forest       | 89.78%     | 89.35%            | 89.52%         | 89.33%     |
| **XGBoost**         | **92.38%** | **92.18%**        | **92.24%**     | **92.18%** |

### Why selection is based on macro F1, not accuracy or precision/recall alone

The best base model is picked by **macro-averaged F1**, not accuracy, and not precision or recall in isolation:

- **Accuracy is misleading on an imbalanced label set.** `Cybersecurity Specialist` (353 train / 75 test rows) and `DevOps Engineer` (387 train / 90 test rows) are roughly half the size of `Software Engineer` (687 train / 157 test rows). A model can post a high accuracy by being very good at the large classes while quietly failing the small ones — accuracy doesn't expose that.
- **Precision and recall alone each tell only half the story.** Optimizing for precision alone rewards a model that under-predicts a class to avoid false positives; optimizing for recall alone rewards a model that over-predicts a class to avoid false negatives. Since every misclassification here (e.g. recommending `Full Stack Developer` instead of `Backend Developer`) is equally costly to a real candidate, neither metric on its own is the right target.
- **F1 balances precision and recall per class**, so a class can't look good by sacrificing one for the other.
- **Macro averaging (vs. weighted/micro) treats every class equally**, regardless of how many rows it has. This matters specifically because of the smaller classes (`Cybersecurity Specialist`, `DevOps Engineer`) — a weighted or micro average would let the large classes dominate the score and mask poor performance on the minority ones, which is exactly the failure mode SMOTE and this metric choice are meant to guard against.

So macro F1 is the metric that best reflects "does this model work for every career category, not just the common ones" — which is the actual goal of a recommendation system that needs to be useful across all 10 classes, not just the popular ones.

### Hypertuning the best model

**XGBoost** is selected as the best base model by macro F1 and passed into `RandomizedSearchCV` (5-fold CV, 20 candidates, scoring=`f1_macro`). The best cross-validated macro F1 was **0.9392**, with these tuned hyperparameters:

```json
{
  "subsample": 0.9,
  "n_estimators": 200,
  "min_child_weight": 1,
  "max_depth": 5,
  "learning_rate": 0.2,
  "colsample_bytree": 0.6
}
```

| Model                          | Accuracy   | Precision (macro) | Recall (macro) | F1 (macro) |
| ------------------------------ | ---------- | ----------------- | -------------- | ---------- |
| XGBoost (base)                 | 92.38%     | 92.18%            | 92.24%         | 92.18%     |
| **XGBoost (Tuned) ⭐ shipped** | **92.63%** | **92.33%**        | **92.57%**     | **92.41%** |

The tuned XGBoost model is what's saved as `models/best_model.pkl` and served by the API — not the untuned base XGBoost from the table above.

### Key observations from confusion matrices

With the consolidated 10-class label set, the hardest classification boundaries are still the ones you'd expect from real-world, overlapping candidate profiles:

- **Full Stack Developer ↔ Backend Developer / Front-end Developer** — the most common confusion in the tuned model (7 Backend rows predicted as Full Stack, 5 Full Stack rows predicted as Front-end). Expected, since Full Stack profiles share most of their skill vocabulary with both specializations.
- **Cybersecurity Specialist ↔ Mobile Developer** — a smaller but consistent confusion (4 Mobile rows predicted as Cybersecurity). Skill overlap in areas like networking/security tooling drives this.
- **AI/ML Engineer ↔ Cybersecurity Specialist** — minor confusion (3 AI/ML rows predicted as Cybersecurity), likely from shared technical/analytical interest tags rather than overlapping core skills.
- **UX Designer ↔ Software Engineer / DevOps Engineer** — a handful of edge cases (3 UX rows each), consistent with candidates who list both design and technical skills.

Classes with the cleanest separation in the tuned model: **Software Engineer** (150/157 correct) and **Data Scientist** (123/129 correct) — their skill/interest vocabularies are large enough and distinct enough that misclassifications stay in the single digits.

---

## API Reference

### Base URL

```
http://localhost:8000
```

### Endpoints

| Method | Endpoint            | Description                |
| ------ | ------------------- | -------------------------- |
| `GET`  | `/health`           | Health check               |
| `POST` | `/api/v1/recommend` | Get career recommendations |
| `GET`  | `/docs`             | Swagger UI                 |
| `GET`  | `/redoc`            | ReDoc documentation        |

### POST /api/v1/recommend

**Request**

```json
{
  "skills": ["Python", "SQL", "Machine Learning"],
  "interests": ["AI", "Analytics"],
  "education": "Bachelor"
}
```

| Field       | Type        | Description                         |
| ----------- | ----------- | ----------------------------------- |
| `skills`    | `list[str]` | List of technical skills            |
| `interests` | `list[str]` | List of interest areas              |
| `education` | `str`       | One of: `Bachelor`, `Master`, `PhD` |

**Response**

```json
{
  "best_career": "AI/ML Engineer",
  "confidence": 0.6974,
  "top_3_recommendations": [
    {
      "career": "AI/ML Engineer",
      "score": 0.6974
    },
    {
      "career": "Data Scientist",
      "score": 0.1838
    },
    {
      "career": "Front-end Developer",
      "score": 0.0366
    }
  ]
}
```

_(Example generated by running the actual shipped `best_model.pkl` against this request.)_

---

## Running Training

```bash
cd ml-service
python -m training.train
```

This loads `train_dataset.csv` and `test_set.csv` independently, fits all encoders on train only, applies SMOTE to the training matrix, trains and evaluates all four base models on the test set, tunes the best one with `RandomizedSearchCV`, and saves the tuned model to `models/best_model.pkl`.

---

## Running the API

```bash
cd ml-service
uvicorn app.main:app --reload
```

Server starts at `http://127.0.0.1:8000`. Visit `/docs` for the interactive Swagger UI.

The model and all four encoders (`skill_mlb`, `interest_mlb`, `edu_encoder`, `label_encoder`) load once at API startup via `@lru_cache` inside `RecommendationService` — no reload per request.

---

## Artifacts

All saved to `data/artifacts/` after training:

| File                          | Description                                                        |
| ----------------------------- | ------------------------------------------------------------------ |
| `metrics.json`                | Final tuned model metrics (matches `best_model.pkl`)               |
| `model_comparison.csv`        | All 4 base models side by side                                     |
| `tuning_results.json`         | Best hyperparameters + best CV F1 macro from `RandomizedSearchCV`  |
| `classification_report_*.txt` | Per-class report for each base model, plus the tuned model         |
| `confusion_matrix_*.png`      | Confusion matrix heatmap for each base model, plus the tuned model |

---

## Notes

- Train and test are two **separate source files** (`train_dataset.csv` from Kaggle, `test_set.csv` synthetically generated) rather than one dataset split 80/20 — there is no `train_test_split()` call anywhere in the pipeline.
- All encoders (`MultiLabelBinarizer` ×2, `OneHotEncoder`, `LabelEncoder`) are fit on the training set only and reused, unfit, to transform the test set — preventing leakage between the two files.
- SMOTE is applied to the training feature matrix only, after encoding, and is never applied to the test set.
- Unknown skills or interests at inference time are safely ignored by the fitted `MultiLabelBinarizer`.
- Unknown education values fall back gracefully via `handle_unknown="ignore"` in `OneHotEncoder`.
