"""
Serves predictions from the transaction-categorization model trained by
backend/ml/train.py. This module is the request-serving side of that model;
the training/data-prep code stays out of app/ entirely (see backend/ml/).

The fitted pipeline is loaded once, at import time, and reused for every
prediction - re-deserializing model.joblib from disk on every request would
add needless latency and I/O for a model that never changes between deploys.
"""

from dataclasses import dataclass
from pathlib import Path

import joblib

MODEL_PATH = Path(__file__).resolve().parent.parent.parent / "ml" / "model.joblib"

_pipeline = joblib.load(MODEL_PATH)


@dataclass
class Prediction:
    category: str
    confidence: float


def predict_category(merchant: str, description: str) -> Prediction:
    text = f"{merchant} {description}"
    category = _pipeline.predict([text])[0]
    probabilities = _pipeline.predict_proba([text])[0]
    confidence = float(max(probabilities))
    return Prediction(category=category, confidence=confidence)
