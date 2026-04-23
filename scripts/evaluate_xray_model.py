"""
evaluate_xray_model.py
=======================
Standalone script that loads the trained xray_model.pth and evaluates
it against the FULL test set. Prints a confusion matrix and per-class
accuracy. Run after training to generate pitch-deck quality results.

Usage:
  cd c:\\Users\\Shubham\\Downloads\\matrix\\codex
  python scripts/evaluate_xray_model.py
"""

import json
import sys
from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import datasets, models, transforms
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    accuracy_score,
)

# ─────────────────────────────────────────────────────────────────
INFERENCE_DIR = Path(__file__).parent.parent / "backend" / "ai-inference-service"
MODELS_DIR    = INFERENCE_DIR / "models"
PREPARED_DIR  = INFERENCE_DIR / "xray_prepared"
TEST_DIR      = PREPARED_DIR / "test"

WEIGHTS_PATH = MODELS_DIR / "xray_model.pth"
CLASSES_PATH = MODELS_DIR / "xray_class_names.json"
IMG_SIZE     = 224
BATCH_SIZE   = 32
# ─────────────────────────────────────────────────────────────────


def load_class_names() -> list[str]:
    if not CLASSES_PATH.exists():
        print(f"ERROR: {CLASSES_PATH} not found. Train the model first.")
        sys.exit(1)
    with open(CLASSES_PATH) as f:
        return json.load(f)


def load_model(class_names: list[str], device: torch.device) -> nn.Module:
    if not WEIGHTS_PATH.exists():
        print(f"ERROR: {WEIGHTS_PATH} not found. Train the model first.")
        sys.exit(1)

    model = models.mobilenet_v2(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, len(class_names))
    model.load_state_dict(torch.load(WEIGHTS_PATH, map_location=device))
    model.to(device)
    model.eval()
    return model


def build_test_loader() -> DataLoader:
    if not TEST_DIR.exists():
        print(f"ERROR: {TEST_DIR} not found. Run train_xray_model.py first.")
        sys.exit(1)

    transform = transforms.Compose([
        transforms.Resize((IMG_SIZE, IMG_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406],
                             std=[0.229, 0.224, 0.225]),
    ])
    ds = datasets.ImageFolder(TEST_DIR, transform=transform)
    return DataLoader(ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=0), ds


def main():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}")

    class_names = load_class_names()
    print(f"Classes: {class_names}\n")

    model = load_model(class_names, device)
    total_params = sum(p.numel() for p in model.parameters())
    print(f"Model: MobileNetV2  |  Parameters: {total_params:,}\n")

    loader, ds = build_test_loader()
    print(f"Test samples: {len(ds)}\n")

    all_preds, all_labels = [], []
    with torch.no_grad():
        for imgs, labels in loader:
            imgs = imgs.to(device)
            outputs = model(imgs)
            _, preds = outputs.max(1)
            all_preds.extend(preds.cpu().numpy().tolist())
            all_labels.extend(labels.numpy().tolist())

    # ── Print Results ──────────────────────────────────────────
    print("=" * 64)
    print("CLASSIFICATION REPORT")
    print("=" * 64)
    print(classification_report(all_labels, all_preds, target_names=class_names))

    acc = accuracy_score(all_labels, all_preds)
    print(f"Overall Test Accuracy: {acc * 100:.2f}%\n")

    # ── Confusion Matrix ───────────────────────────────────────
    cm = confusion_matrix(all_labels, all_preds)
    print("=" * 64)
    print("CONFUSION MATRIX")
    print("=" * 64)

    col_width = max(len(c) for c in class_names) + 2

    # Header
    print(" " * (col_width + 2), end="")
    for c in class_names:
        print(f"{c[:10]:>12}", end="")
    print()

    # Rows
    for i, row in enumerate(cm):
        print(f"  {class_names[i][:col_width]:<{col_width}}", end="")
        for val in row:
            print(f"{val:>12}", end="")
        print()

    print()

    # Per-class accuracy
    print("=" * 64)
    print("PER-CLASS ACCURACY")
    print("=" * 64)
    for i, cls in enumerate(class_names):
        total = cm[i].sum()
        correct = cm[i][i]
        pct = correct / total * 100 if total > 0 else 0
        print(f"  {cls:<28} {correct:>4}/{total:<4}  ({pct:.1f}%)")

    print()
    print("Done. Screenshot this output for your pitch deck! ✅")


if __name__ == "__main__":
    main()
