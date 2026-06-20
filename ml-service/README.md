# Career Recommendation System

An end-to-end machine learning service that recommends careers based on a candidate's education, skills, and interests — served via a production-ready FastAPI REST API.

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

It trains and compares four classifiers, automatically selects the best model by F1-score (macro average), and exposes predictions through a clean REST API endpoint.

> **Dataset Notice**
> The dataset originates from Kaggle but had significant class imbalance and insufficient samples across several career categories. Additional synthetic records were generated to supplement underrepresented classes and ensure the model could train meaningfully across all 13 career labels. As a result, model performance metrics are higher than what would typically be expected on a fully real-world dataset. This project is intended as a portfolio demonstration of an end-to-end ML + API system — not a production career counselling tool.

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
| Language           | Python 3.12                                      |

---

## Project Structure

```
ml-service/
├── app/                  # FastAPI application
│   └── services/         # Service layer
├── training/             # ML pipeline (loader, preprocessing, train, evaluate)
├── models/               # Saved models and encoders (.pkl)
├── data/
│   ├── raw/              # Input dataset
│   ├── processed/
│   └── artifacts/        # Metrics, reports, confusion matrices
├── notebooks/            # EDA and model comparison
└── requirements.txt
```

---

## Dataset

| Property               | Detail                                       |
| ---------------------- | -------------------------------------------- |
| File                   | `data/raw/Raw_Dataset.csv`                   |
| Origin                 | Kaggle — supplemented with synthetic records |
| Total records          | 7,315                                        |
| Records after cleaning | 7,289                                        |
| Target column          | `Recommended_Career`                         |
| Number of classes      | 13                                           |

**Target class distribution:**

| Career                    | Count |
| ------------------------- | ----- |
| Data Analyst              | 741   |
| Software Engineer         | 717   |
| Full Stack Developer      | 684   |
| Front-end Developer       | 661   |
| Data Scientist            | 617   |
| Backend Developer         | 585   |
| Mobile Developer          | 558   |
| UX Designer               | 530   |
| Machine Learning Engineer | 500   |
| DevOps Engineer           | 469   |
| AI Engineer               | 447   |
| Cloud Engineer            | 409   |
| Cybersecurity Specialist  | 375   |

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

Raw values were inconsistent (`"bachelor's"`, `"BACHELOR'S"`, `"Bachelors"`, `"Bachelor's Degree"` etc.) — all normalized to three clean categories: `Bachelor`, `Master`, `PhD`, then encoded with `OneHotEncoder`.

### Skills & Interests

Both are semicolon-separated multi-label strings, split and encoded independently with `MultiLabelBinarizer`.

```
"Python;Machine Learning;SQL"  →  [0, 1, 0, 1, 0, 1, ...]
"AI;Analytics"                 →  [1, 1, 0, 0, ...]
```

### Final Feature Matrix

```
X = [OneHot(Education)] + [MLB(Skills)] + [MLB(Interests)]
Shape: (7289, 446)
```

### Class Imbalance

SMOTE is applied **only on training data** after the train/test split. Test data is never touched.

```
Before SMOTE: 5,831 training samples
After SMOTE:  7,696 training samples
```

---

## ML Pipeline

```
Raw CSV
  └─▶ data_loader.py        clean + normalize
        └─▶ preprocessing.py   encode features + target
              └─▶ train_test_split (80/20, stratified)
                    └─▶ SMOTE (training set only)
                          └─▶ Train 4 models
                                └─▶ Evaluate on test set
                                      └─▶ Select best by F1 macro
                                            └─▶ Save best_model.pkl
```

---

## Model Results

All models trained on the same 80/20 stratified split with SMOTE-resampled training data.

| Model               | Accuracy   | Precision (macro) | Recall (macro) | F1 (macro) | CV F1 (5-fold) |
| ------------------- | ---------- | ----------------- | -------------- | ---------- | -------------- |
| Logistic Regression | 97.67%     | 97.51%            | 97.44%         | 97.45%     | 97.70%         |
| **SVC ⭐ Best**     | **98.08%** | **97.91%**        | **97.85%**     | **97.85%** | **97.75%**     |
| Random Forest       | 97.46%     | 97.28%            | 97.22%         | 97.22%     | 97.49%         |
| XGBoost             | 97.74%     | 97.66%            | 97.47%         | 97.55%     | 97.43%         |

Selected by highest F1 macro score. Saved as `models/best_model.pkl`.

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
  "best_career": "Machine Learning Engineer",
  "confidence": 0.9412,
  "top_3_recommendations": [
    { "career": "Machine Learning Engineer", "score": 0.9412 },
    { "career": "AI Engineer", "score": 0.0381 },
    { "career": "Data Scientist", "score": 0.0124 }
  ]
}
```

---

## Running Training

```bash
cd ml-service
python -m training.train
```

---

## Running the API

```bash
cd ml-service
uvicorn app.main:app --reload
```

Server starts at `http://127.0.0.1:8000`. Visit `/docs` for the interactive Swagger UI.

---

## Artifacts

All saved to `data/artifacts/` after training:

| File                          | Description                             |
| ----------------------------- | --------------------------------------- |
| `metrics.json`                | Best model metrics                      |
| `model_comparison.csv`        | All 4 models side by side               |
| `classification_report_*.txt` | Per-class report for each model         |
| `confusion_matrix_*.png`      | Confusion matrix heatmap for each model |

---

## Notes

- Model loads once at API startup via `@lru_cache` — no reload per request
- Unknown skills or interests at inference time are safely ignored by the fitted `MultiLabelBinarizer`
- Unknown education values fall back gracefully via `handle_unknown="ignore"` in `OneHotEncoder`
- SMOTE is never applied to test data
