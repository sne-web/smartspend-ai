"""
Trains the transaction-categorization model on backend/ml/data/seed_transactions.csv
and saves the fitted pipeline to backend/ml/model.joblib.

Pipeline: TF-IDF (word 1-2 grams) -> Logistic Regression. See the module-level
docstring in seed_data.py for why the dataset includes deliberately ambiguous
examples, and the commit/PR description for why this vectorizer+classifier pair
was chosen over Naive Bayes or a heavier embedding-based model.

Run: python train.py
"""

from pathlib import Path

import joblib
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer

DATA_PATH = Path(__file__).parent / "data" / "seed_transactions.csv"
MODEL_PATH = Path(__file__).parent / "model.joblib"


def build_pipeline() -> Pipeline:
    return Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2), stop_words="english", min_df=1)),
        ("clf", LogisticRegression(max_iter=1000)),
    ])


def main() -> None:
    df = pd.read_csv(DATA_PATH)
    # Merchant + description combined: description already contains the
    # merchant name (see seed_data.py's templates), but concatenating again
    # ensures the merchant token is never lost even if that ever changes.
    text = df["merchant"] + " " + df["description"]
    labels = df["category"]

    X_train, X_test, y_train, y_test = train_test_split(
        text, labels, test_size=0.2, random_state=42, stratify=labels
    )

    pipeline = build_pipeline()
    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)

    print(f"Train rows: {len(X_train)}, test rows: {len(X_test)}")
    print(f"Accuracy: {accuracy_score(y_test, y_pred):.3f}\n")

    print("Classification report:")
    print(classification_report(y_test, y_pred, zero_division=0))

    labels_sorted = sorted(labels.unique())
    cm = confusion_matrix(y_test, y_pred, labels=labels_sorted)
    cm_df = pd.DataFrame(cm, index=labels_sorted, columns=labels_sorted)
    print("Confusion matrix (rows = true category, columns = predicted):")
    print(cm_df.to_string())
    print()

    # Refit on the full dataset for the saved artifact - the split above is
    # only to get an honest, held-out accuracy estimate; throwing away 20% of
    # an already-small 168-row dataset for the deployed model would be wasteful.
    final_pipeline = build_pipeline()
    final_pipeline.fit(text, labels)
    joblib.dump(final_pipeline, MODEL_PATH)
    print(f"Saved final model (trained on all {len(text)} rows) to {MODEL_PATH}")


if __name__ == "__main__":
    main()
