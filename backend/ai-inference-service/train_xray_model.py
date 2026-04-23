"""
train_xray_model.py
====================
Trains a 3-class Chest X-Ray classifier on the Kaggle chest_xray dataset.

Classes:
  0 → NORMAL
  1 → BACTERIAL_PNEUMONIA   (filename contains "bacteria")
  2 → VIRAL_PNEUMONIA       (filename contains "virus")

Usage:
  python train_xray_model.py

Outputs (in ./models/):
  xray_model.pth            — best checkpoint (by val accuracy)
  xray_class_names.json     — ordered class label list
  xray_model_metrics.json   — final test accuracy, precision, recall, F1 per class
"""

import os
import json
import shutil
import time
import random
from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, WeightedRandomSampler, random_split
from torchvision import datasets, transforms, models
from sklearn.metrics import classification_report, confusion_matrix

# ─────────────────────────────────────────────────────────────────
# CONSTANTS — adjust DATASET_ROOT if your dataset is elsewhere
# ─────────────────────────────────────────────────────────────────
DATASET_ROOT = Path(r"C:\Users\Shubham\Downloads\matrix\chest x ray image dataset\chest_xray")
PREPARED_DIR = Path(__file__).parent / "xray_prepared"
MODELS_DIR   = Path(__file__).parent / "models"

TRAIN_DIR = PREPARED_DIR / "train"
VAL_DIR   = PREPARED_DIR / "val"
TEST_DIR  = PREPARED_DIR / "test"

CLASS_NAMES = ["NORMAL", "BACTERIAL_PNEUMONIA", "VIRAL_PNEUMONIA"]
IMG_SIZE    = 224
BATCH_SIZE  = 32
SEED        = 42

torch.manual_seed(SEED)
random.seed(SEED)


# ─────────────────────────────────────────────────────────────────
# STEP 1: Organise raw dataset into 3-class folder structure
# ─────────────────────────────────────────────────────────────────
def prepare_dataset():
    if PREPARED_DIR.exists():
        print("✓ Prepared dataset already exists — skipping split.")
        return

    print("─" * 60)
    print("STEP 1 — Organising dataset into 3 classes …")
    print("─" * 60)

    for split in ["train", "val", "test"]:
        for cls in CLASS_NAMES:
            (PREPARED_DIR / split / cls).mkdir(parents=True, exist_ok=True)

    def _copy_split(raw_split: str, prep_split: str):
        counts = {c: 0 for c in CLASS_NAMES}

        # NORMAL
        normal_src = DATASET_ROOT / raw_split / "NORMAL"
        for img in normal_src.glob("*"):
            shutil.copy2(img, PREPARED_DIR / prep_split / "NORMAL" / img.name)
            counts["NORMAL"] += 1

        # PNEUMONIA → split by filename keyword
        pneumonia_src = DATASET_ROOT / raw_split / "PNEUMONIA"
        for img in pneumonia_src.glob("*"):
            name_lower = img.name.lower()
            if "bacteria" in name_lower:
                target_cls = "BACTERIAL_PNEUMONIA"
            elif "virus" in name_lower:
                target_cls = "VIRAL_PNEUMONIA"
            else:
                # Unknown sub-type → treat as bacterial (rare edge case)
                target_cls = "BACTERIAL_PNEUMONIA"
            shutil.copy2(img, PREPARED_DIR / prep_split / target_cls / img.name)
            counts[target_cls] += 1

        return counts

    # Copy train split (original "train" folder)
    train_counts = _copy_split("train", "train")
    # Copy test split (original "test" folder)
    test_counts  = _copy_split("test",  "test")
    # Copy val split (original "val" folder; tiny — only used for quick check)
    val_counts   = _copy_split("val",   "val")

    print("\n📊 CLASS DISTRIBUTION AFTER SPLIT:")
    print(f"{'Split':<10} {'NORMAL':>10} {'BACTERIAL':>12} {'VIRAL':>10}")
    print("-" * 46)
    for split_name, counts in [("TRAIN", train_counts), ("VAL", val_counts), ("TEST", test_counts)]:
        print(f"{split_name:<10} {counts['NORMAL']:>10} {counts['BACTERIAL_PNEUMONIA']:>12} {counts['VIRAL_PNEUMONIA']:>10}")

    total = sum(train_counts.values())
    print(f"\n⚠️  Class imbalance detected — Bacterial is ~{train_counts['BACTERIAL_PNEUMONIA']/total*100:.0f}% of training set.")
    print("   → WeightedRandomSampler will be used to compensate.\n")


# ─────────────────────────────────────────────────────────────────
# STEP 2: Transforms
# ─────────────────────────────────────────────────────────────────
def get_transforms(augment: bool):
    mean = [0.485, 0.456, 0.406]   # ImageNet values — required for MobileNetV2
    std  = [0.229, 0.224, 0.225]

    if augment:
        return transforms.Compose([
            transforms.Resize((IMG_SIZE + 20, IMG_SIZE + 20)),
            transforms.RandomCrop(IMG_SIZE),
            transforms.RandomHorizontalFlip(),
            transforms.RandomRotation(10),
            transforms.ColorJitter(brightness=0.2, contrast=0.2),
            transforms.ToTensor(),
            transforms.Normalize(mean=mean, std=std),
        ])
    return transforms.Compose([
        transforms.Resize((IMG_SIZE, IMG_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize(mean=mean, std=std),
    ])


# ─────────────────────────────────────────────────────────────────
# STEP 3: DataLoaders with WeightedRandomSampler
# ─────────────────────────────────────────────────────────────────
def build_loaders():
    full_train = datasets.ImageFolder(TRAIN_DIR, transform=get_transforms(augment=True))

    # 80 / 20 split for local validation
    n_val   = int(len(full_train) * 0.20)
    n_train = len(full_train) - n_val
    train_ds, val_ds = random_split(full_train, [n_train, n_val],
                                    generator=torch.Generator().manual_seed(SEED))

    # WeightedRandomSampler — compensates for class imbalance
    class_counts = [0] * len(CLASS_NAMES)
    for _, label in full_train.samples:
        class_counts[label] += 1
    class_weights = [1.0 / c for c in class_counts]
    sample_weights = [class_weights[full_train.samples[i][1]] for i in train_ds.indices]
    sampler = WeightedRandomSampler(sample_weights, num_samples=len(sample_weights), replacement=True)

    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, sampler=sampler,  num_workers=0)
    val_loader   = DataLoader(val_ds,   batch_size=BATCH_SIZE, shuffle=False,    num_workers=0)

    test_ds      = datasets.ImageFolder(TEST_DIR, transform=get_transforms(augment=False))
    test_loader  = DataLoader(test_ds, batch_size=BATCH_SIZE, shuffle=False,     num_workers=0)

    print(f"✓ Train samples (after 80/20 split): {n_train}  |  Val: {n_val}  |  Test: {len(test_ds)}")
    return train_loader, val_loader, test_loader, full_train.class_to_idx


# ─────────────────────────────────────────────────────────────────
# STEP 4: Model — MobileNetV2 with 3-class head
# ─────────────────────────────────────────────────────────────────
def build_model(num_classes: int = 3, device: torch.device = torch.device("cpu")):
    model = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.IMAGENET1K_V1)

    # Replace classifier head
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, num_classes)

    return model.to(device)


def set_feature_layers_frozen(model: nn.Module, frozen: bool):
    """Freeze / unfreeze everything except the classifier head."""
    for name, param in model.named_parameters():
        if "classifier" not in name:
            param.requires_grad = not frozen


# ─────────────────────────────────────────────────────────────────
# STEP 5: Training loop
# ─────────────────────────────────────────────────────────────────
def train_epoch(model, loader, criterion, optimizer, device):
    model.train()
    running_loss = 0.0
    for imgs, labels in loader:
        imgs, labels = imgs.to(device), labels.to(device)
        optimizer.zero_grad()
        outputs = model(imgs)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()
        running_loss += loss.item() * imgs.size(0)
    return running_loss / len(loader.dataset)


@torch.no_grad()
def eval_epoch(model, loader, criterion, device):
    model.eval()
    running_loss, correct, total = 0.0, 0, 0
    for imgs, labels in loader:
        imgs, labels = imgs.to(device), labels.to(device)
        outputs = model(imgs)
        loss = criterion(outputs, labels)
        running_loss += loss.item() * imgs.size(0)
        _, preds = outputs.max(1)
        correct += preds.eq(labels).sum().item()
        total   += labels.size(0)
    return running_loss / len(loader.dataset), correct / total


# ─────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────
def main():
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    prepare_dataset()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"🖥️  Device: {device}\n")

    train_loader, val_loader, test_loader, class_to_idx = build_loaders()

    # Save class names in index order
    idx_to_class = {v: k for k, v in class_to_idx.items()}
    ordered_classes = [idx_to_class[i] for i in range(len(idx_to_class))]
    with open(MODELS_DIR / "xray_class_names.json", "w") as f:
        json.dump(ordered_classes, f, indent=2)
    print(f"✓ Class order saved: {ordered_classes}\n")

    model     = build_model(num_classes=3, device=device)
    criterion = nn.CrossEntropyLoss()

    best_val_acc = 0.0
    history      = []

    # ── Phase 1: Feature extraction (frozen backbone, 5 epochs, lr=1e-3) ──
    print("─" * 60)
    print("PHASE 1 — Feature extraction  (backbone frozen, lr=1e-3)")
    print("─" * 60)
    set_feature_layers_frozen(model, frozen=True)
    optimizer = torch.optim.Adam(filter(lambda p: p.requires_grad, model.parameters()), lr=1e-3)

    for epoch in range(1, 6):
        t0 = time.time()
        train_loss            = train_epoch(model, train_loader, criterion, optimizer, device)
        val_loss, val_acc     = eval_epoch(model, val_loader,   criterion, device)
        elapsed               = time.time() - t0
        history.append({"phase": 1, "epoch": epoch, "train_loss": round(train_loss, 4),
                         "val_loss": round(val_loss, 4), "val_acc": round(val_acc, 4)})

        print(f"  Epoch {epoch}/5 | train_loss={train_loss:.4f}  val_loss={val_loss:.4f}  val_acc={val_acc:.4f}  [{elapsed:.0f}s]")

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            torch.save(model.state_dict(), MODELS_DIR / "xray_model.pth")
            print(f"    ✅ Best model saved  (val_acc={val_acc:.4f})")

    # ── Phase 2: Fine-tuning (all layers, 5 epochs, lr=1e-4) ──
    print()
    print("─" * 60)
    print("PHASE 2 — Fine-tuning  (all layers unfrozen, lr=1e-4)")
    print("─" * 60)
    set_feature_layers_frozen(model, frozen=False)
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-4)
    scheduler = torch.optim.lr_scheduler.StepLR(optimizer, step_size=2, gamma=0.5)

    for epoch in range(1, 6):
        t0 = time.time()
        train_loss            = train_epoch(model, train_loader, criterion, optimizer, device)
        val_loss, val_acc     = eval_epoch(model, val_loader,   criterion, device)
        scheduler.step()
        elapsed               = time.time() - t0
        history.append({"phase": 2, "epoch": epoch, "train_loss": round(train_loss, 4),
                         "val_loss": round(val_loss, 4), "val_acc": round(val_acc, 4)})

        print(f"  Epoch {epoch}/5 | train_loss={train_loss:.4f}  val_loss={val_loss:.4f}  val_acc={val_acc:.4f}  [{elapsed:.0f}s]")

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            torch.save(model.state_dict(), MODELS_DIR / "xray_model.pth")
            print(f"    ✅ Best model saved  (val_acc={val_acc:.4f})")

    # ── Final evaluation on test set ──
    print()
    print("─" * 60)
    print("FINAL TEST SET EVALUATION")
    print("─" * 60)

    # Load best checkpoint for test evaluation
    model.load_state_dict(torch.load(MODELS_DIR / "xray_model.pth", map_location=device))
    model.eval()

    all_preds, all_labels = [], []
    with torch.no_grad():
        for imgs, labels in test_loader:
            imgs = imgs.to(device)
            outputs = model(imgs)
            _, preds = outputs.max(1)
            all_preds.extend(preds.cpu().numpy().tolist())
            all_labels.extend(labels.numpy().tolist())

    report = classification_report(all_labels, all_preds, target_names=ordered_classes, output_dict=True)
    cm     = confusion_matrix(all_labels, all_preds)

    print(classification_report(all_labels, all_preds, target_names=ordered_classes))
    print("Confusion Matrix:")
    print(f"{'':>22}", "  ".join(f"{c[:6]:>8}" for c in ordered_classes))
    for i, row in enumerate(cm):
        print(f"  Actual {ordered_classes[i][:14]:>14}:  " + "  ".join(f"{v:>8}" for v in row))

    metrics = {
        "best_val_accuracy": round(best_val_acc, 4),
        "test_accuracy": round(report["accuracy"], 4),
        "per_class": {
            cls: {
                "precision": round(report[cls]["precision"], 4),
                "recall":    round(report[cls]["recall"],    4),
                "f1":        round(report[cls]["f1-score"],  4),
                "support":   int(report[cls]["support"]),
            }
            for cls in ordered_classes
        },
        "history": history,
        "model_architecture": "MobileNetV2",
        "num_classes": 3,
        "img_size": IMG_SIZE,
    }

    with open(MODELS_DIR / "xray_model_metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)

    print(f"\n🎉 Training complete!")
    print(f"   Best val accuracy : {best_val_acc:.4f}")
    print(f"   Test accuracy     : {metrics['test_accuracy']:.4f}")
    print(f"   Model saved to    : {MODELS_DIR / 'xray_model.pth'}")
    print(f"   Metrics saved to  : {MODELS_DIR / 'xray_model_metrics.json'}")


if __name__ == "__main__":
    main()
