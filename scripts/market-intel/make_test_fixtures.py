"""Builds a CLEAN copy of the market data (no hand edits, no overrides) for the automated tests.

The tests must not depend on CPLs you edit in country-cpl-estimates.csv, so they read this frozen copy:
  tests/fixtures/intel/docs/   generated CSV/JSON (what the data folder would contain with no edits)
  tests/fixtures/intel/app/    the compact JSON the app reads

Run after changing the model:  python scripts/market-intel/make_test_fixtures.py
"""

import os
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT_DOCS = os.path.join(ROOT, "tests", "fixtures", "intel", "docs")
OUT_APP = os.path.join(ROOT, "tests", "fixtures", "intel", "app")
SKIP = {"country-cpl-estimates.csv", "cpl-overrides.csv"}

tmp = tempfile.mkdtemp(prefix="intel-fixture-")
try:
    s_dir = os.path.join(tmp, "scripts", "market-intel")
    d_dir = os.path.join(tmp, "docs", "dubai-analysis", "data")
    a_dir = os.path.join(tmp, "src", "lib", "market-planning", "data", "intel")
    for d in (s_dir, d_dir, a_dir):
        os.makedirs(d)
    for f in ("build_datasets.py", "investment_intel.py", "language_profiles.py"):
        shutil.copy(os.path.join(ROOT, "scripts", "market-intel", f), s_dir)
    shutil.copytree(os.path.join(ROOT, "scripts", "market-intel", "raw"), os.path.join(s_dir, "raw"))
    src_data = os.path.join(ROOT, "docs", "dubai-analysis", "data")
    for f in os.listdir(src_data):
        p = os.path.join(src_data, f)
        if os.path.isfile(p) and f not in SKIP:
            shutil.copy(p, d_dir)
    r = subprocess.run([sys.executable, "-I", os.path.join(s_dir, "build_datasets.py")], capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stdout[-1500:], r.stderr[-1500:])
        raise SystemExit("fixture build failed")
    for out in (OUT_DOCS, OUT_APP):
        shutil.rmtree(out, ignore_errors=True)
        os.makedirs(out)
    for f in os.listdir(d_dir):
        if f.endswith((".csv", ".json")):
            shutil.copy(os.path.join(d_dir, f), OUT_DOCS)
    for f in os.listdir(a_dir):
        shutil.copy(os.path.join(a_dir, f), OUT_APP)
    print("fixtures written:", len(os.listdir(OUT_DOCS)), "docs files,", len(os.listdir(OUT_APP)), "app files")
finally:
    shutil.rmtree(tmp, ignore_errors=True)
