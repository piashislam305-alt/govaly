#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Reproducible end-to-end run of the research image-collection pipeline.
#
#   ./run_pipeline.sh              # full run
#   ./run_pipeline.sh --dry-run    # assess + enumerate only, download nothing
#   ./run_pipeline.sh --qc-only    # re-run QC/metadata/reports over raw_images/
#
# Stage order is fixed and each stage refuses to proceed on an unapproved
# source, so the pipeline cannot be coerced into collecting unlicensed images
# by reordering the steps.
# ---------------------------------------------------------------------------
set -euo pipefail
cd "$(dirname "$0")"

DRY_RUN=""
QC_ONLY=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN="--dry-run" ;;
    --qc-only) QC_ONLY=1 ;;
    *) echo "unknown option: $arg" >&2; exit 2 ;;
  esac
done

PYTHON="${PYTHON:-python3}"

echo "=================================================================="
echo " Research dataset pipeline"
echo " Started: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "=================================================================="

# --- 0. dependencies ----------------------------------------------------- #
echo
echo "[0/6] checking dependencies"
$PYTHON - <<'PY'
import importlib, sys
missing = []
for mod, pip in [("requests","requests"), ("PIL","pillow"), ("numpy","numpy"),
                 ("imagehash","imagehash"), ("cv2","opencv-python-headless")]:
    try:
        importlib.import_module(mod)
    except ImportError:
        missing.append(pip)
if missing:
    sys.exit("missing packages: " + " ".join(missing) +
             "\n  install with: pip install -r requirements.txt")
print("  all present")
PY

# --- 1. rights assessment (MUST run first) ------------------------------- #
echo
echo "[1/6] source investigation & rights assessment"
$PYTHON assess_source.py

# --- 2. validation suite ------------------------------------------------- #
echo
echo "[2/6] running QC / rights-gate validation suite"
$PYTHON tests/test_qc.py

if [ "$QC_ONLY" -eq 1 ]; then
  echo
  echo "[3/6] collection SKIPPED (--qc-only)"
else
  # --- 3. collection ----------------------------------------------------- #
  echo
  echo "[3/6] rights-gated collection"
  $PYTHON collect.py $DRY_RUN
fi

# --- 4. annotation preservation ----------------------------------------- #
echo
echo "[4/6] annotation preservation"
if [ -n "$DRY_RUN" ]; then
  echo "  skipped (dry run)"
else
  $PYTHON annotations.py
fi

# --- 5. quality control -------------------------------------------------- #
echo
echo "[5/6] quality control & duplicate detection"
$PYTHON qc.py

# --- 6. metadata + reports ---------------------------------------------- #
echo
echo "[6/6] metadata catalogue & reports"
$PYTHON build_metadata.py
$PYTHON reports.py

echo
echo "=================================================================="
echo " Complete. Read ../README.md, then:"
echo "   ../reports/coverage_reconciliation.md   <- did we get everything?"
echo "   ../reports/progress_tracker.md          <- headline numbers"
echo "   ../metadata/sources_registry.csv        <- rights determinations"
echo "=================================================================="
