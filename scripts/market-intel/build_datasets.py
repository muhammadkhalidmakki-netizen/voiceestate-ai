"""Build the Dubai market-intelligence datasets from open data.

Inputs (downloaded by fetch_sources.sh into ./raw, all open licences):
  - World Bank WDI API (CC BY 4.0): population, growth, GDP per capita (nominal / PPP), internet users
  - Unicode CLDR supplementalData.xml territoryInfo (Unicode licence): language share by territory
  - Eurostat migr_pop1ctz (CC BY 4.0): population on 1 Jan by citizenship
  - docs/dubai-analysis/data/*  (client-supplied benchmarks + country registry, never overwritten)

Outputs:
  - docs/dubai-analysis/data/*.csv|json|md   (research datasets)
  - src/lib/market-planning/data/intel/*.json (compact copies consumed by the backend engine)

Nothing here invents a measured value. Every derived number is labelled `modelled` and carries
its method. Re-run:  python scripts/market-intel/build_datasets.py
"""

import csv
import json
import math
import os
import statistics
import xml.etree.ElementTree as ET
from collections import defaultdict

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RAW = os.path.join(ROOT, "scripts", "market-intel", "raw")
DATA = os.path.join(ROOT, "docs", "dubai-analysis", "data")
APP = os.path.join(ROOT, "src", "lib", "market-planning", "data", "intel")
os.makedirs(APP, exist_ok=True)

RESEARCH_DATE = "2026-11-06"
MODEL_VERSION = "intel-2026-11-06-v1"


def read_csv(path):
    with open(path, encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def write_csv(name, rows, fields):
    import io
    buf = io.StringIO(newline="")
    w = csv.DictWriter(buf, fieldnames=fields, lineterminator="\n")
    w.writeheader()
    for r in rows:
        w.writerow({k: ("" if r.get(k) is None else r.get(k)) for k in fields})
    text = "\ufeff" + buf.getvalue()
    path = os.path.join(DATA, name)
    if os.path.exists(path):
        try:
            with open(path, encoding="utf-8", newline="") as f:
                if f.read() == text:
                    return  # unchanged: do not touch the file (it may be open in Excel)
        except OSError:
            pass
    try:
        with open(path, "w", encoding="utf-8", newline="") as f:
            f.write(text)
    except PermissionError:
        print(f"\nCANNOT WRITE {name}: the file is open in another program (Excel?). Close it and run the update again.")
        raise SystemExit(2)


def write_json(path, obj):
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1 if "docs" in path else None, separators=None if "docs" in path else (",", ":"))
        f.write("\n")


def num(x, nd=None):
    if x is None:
        return None
    return round(x, nd) if nd is not None else x


# ---------------------------------------------------------------- registry + client benchmarks
master = read_csv(os.path.join(DATA, "country-market-master.csv"))
master_fields = list(master[0].keys())
REG = {r["country_iso2"]: r for r in master}
facts = json.load(open(os.path.join(DATA, "benchmark-facts.json"), encoding="utf-8"))
portfolio = json.load(open(os.path.join(DATA, "recommended-portfolio.json"), encoding="utf-8"))
seeds = read_csv(os.path.join(DATA, "language-market-seeds.csv"))

CLIENT = {}  # iso2 -> mature benchmark dict
LEARNING = {}  # iso2 -> learning point
for b in facts["regional_cpl_benchmarks"]:
    for iso in b["countries"]:
        if b["campaign_stage"] == "learning":
            LEARNING[iso] = b["cpl_point_aed"]
        else:
            CLIENT[iso] = b

# ---------------------------------------------------------------- World Bank
def wb(indicator):
    d = json.load(open(os.path.join(RAW, f"wb_{indicator}.json"), encoding="utf-8"))[1]
    out = {}
    for r in d:
        iso = r["country"]["id"]
        if r["value"] is not None:
            out[iso] = (r["value"], int(r["date"]))
    return out


WB = {k: wb(k) for k in ["SP.POP.TOTL", "SP.POP.GROW", "NY.GDP.PCAP.CD", "NY.GDP.PCAP.PP.CD", "IT.NET.USER.ZS"]}
wbc = json.load(open(os.path.join(RAW, "wb_countries.json"), encoding="utf-8"))[1]
INCOME = {c["iso2Code"]: c["incomeLevel"]["value"] for c in wbc if c["region"]["value"] != "Aggregates"}
WB_UPDATED = json.load(open(os.path.join(RAW, "wb_SP.POP.TOTL.json"), encoding="utf-8"))[0]["lastupdated"]


def wbv(ind, iso):
    v = WB[ind].get(iso)
    return v if v else (None, None)


def percentile_ranks(values):
    """values: {key: float}. Returns {key: 0..100 percentile rank}."""
    items = sorted(values.items(), key=lambda kv: kv[1])
    n = len(items)
    return {k: (100.0 * i / (n - 1) if n > 1 else 50.0) for i, (k, _) in enumerate(items)}


# ---------------------------------------------------------------- country signals
sig = {}
for iso, r in REG.items():
    pop, py = wbv("SP.POP.TOTL", iso)
    gr, _ = wbv("SP.POP.GROW", iso)
    gcd, _ = wbv("NY.GDP.PCAP.CD", iso)
    gpp, gy = wbv("NY.GDP.PCAP.PP.CD", iso)
    net, ny = wbv("IT.NET.USER.ZS", iso)
    sig[iso] = dict(pop=pop, pop_year=py, growth=gr, gdp_pc=gcd, gdp_ppp=gpp, gdp_year=gy, net=net, net_year=ny,
                    income=INCOME.get(iso))

ppp_vals = {i: s["gdp_ppp"] for i, s in sig.items() if s["gdp_ppp"]}
tot_vals = {i: s["gdp_ppp"] * s["pop"] for i, s in sig.items() if s["gdp_ppp"] and s["pop"]}
pr_pc = percentile_ranks(ppp_vals)
pr_tot = percentile_ranks(tot_vals)
for i, s in sig.items():
    s["purchasing_power"] = pr_pc.get(i)
    s["total_ppp_bn"] = tot_vals[i] / 1e9 if i in tot_vals else None
    # Investment-potential proxy: half per-capita purchasing power, half absolute economy size.
    s["invest_potential"] = (0.5 * pr_pc[i] + 0.5 * pr_tot[i]) if i in pr_pc and i in pr_tot else None

signal_rows = []
for iso, r in REG.items():
    s = sig[iso]
    has_dxb = bool(r["dxbinteract_reported_rank"])
    signal_rows.append(dict(
        country_iso2=iso, country_name=r["country_name"], world_region=r["world_region"],
        population=num(s["pop"]), population_year=s["pop_year"], population_growth_pct=num(s["growth"], 3),
        gdp_per_capita_usd=num(s["gdp_pc"], 0), gdp_per_capita_ppp_intl_usd=num(s["gdp_ppp"], 0), gdp_year=s["gdp_year"],
        internet_users_pct=num(s["net"], 1), internet_year=s["net_year"], world_bank_income_group=s["income"] or "",
        total_ppp_gdp_usd_bn=num(s["total_ppp_bn"], 1),
        purchasing_power_index_0_100=num(s["purchasing_power"], 1),
        investment_potential_index_0_100=num(s["invest_potential"], 1),
        indicators_source_id="SRC_WB_WDI", indicators_evidence_type="official_statistics",
        indices_evidence_type="modelled" if s["invest_potential"] is not None else "unavailable",
        hnwi_population="", hnwi_status="unavailable_paid_or_restricted_source",
        outbound_investment_indicator="", outbound_investment_status="unavailable_not_collected",
        dubai_transaction_buyer_origin_evidence="unavailable",
        dubai_transaction_status="research_gap_dld_nationality_series_not_accessed",
        dubai_search_interest_share_pct=r["dxbinteract_reported_interest_share_pct"],
        dubai_search_interest_rank=r["dxbinteract_reported_rank"],
        dubai_search_interest_period=r["demand_signal_period"],
        dubai_search_interest_source_id="SRC_DXBINTERACT_SECONDARY_2026" if has_dxb else "",
        dubai_search_interest_evidence_type="secondary_report_of_search_interest" if has_dxb else "unavailable",
        dubai_survey_evidence="", dubai_survey_source_id="",
        dubai_general_market_potential_note="modelled index only; not Dubai-specific demand",
        confidence="medium" if has_dxb else ("low" if s["invest_potential"] is not None else "insufficient"),
        last_researched_at=RESEARCH_DATE,
    ))
# survey notes come from the client's own research notes only (Knight Frank 2025 coverage); no per-country figures
SURVEY_NOTES = {
    "GB": "Knight Frank/YouGov 2025: 74% of British HNWI respondents considering a UAE purchase named Dubai the preferred emirate (secondary report; intention, not purchases)",
    "IN": "Included in the Knight Frank/YouGov 2025 HNWI survey; the Indian intent percentage could not be read reliably from the sources reviewed",
    "SA": "Knight Frank/YouGov 2025: 66% of Saudi HNWI respondents planned a UAE purchase in 2025 (secondary report; intention, not purchases)",
    "CN": "Included in Knight Frank 2025 East Asia sample (figure not extracted)",
    "HK": "Included in Knight Frank 2025 East Asia sample (figure not extracted)",
    "SG": "Included in Knight Frank 2025 East Asia sample (figure not extracted)",
}
for r in signal_rows:
    if r["country_iso2"] in SURVEY_NOTES:
        r["dubai_survey_evidence"] = SURVEY_NOTES[r["country_iso2"]]
        r["dubai_survey_source_id"] = "SRC_KNIGHT_FRANK_DUBAI_2025"

SIGNAL_FIELDS = list(signal_rows[0].keys())
write_csv("country-market-signals.csv", signal_rows, SIGNAL_FIELDS)

# ---------------------------------------------------------------- CPL model
RESTRICTED_AD_MARKETS = {
    "CN": "Meta products are blocked and Google ads are limited in mainland China",
    "RU": "Google ad sales paused and Meta restricted in Russia since 2022",
    "IR": "Sanctions and platform blocking; ads not purchasable in the normal way",
    "KP": "Sanctioned; no practical ad market",
    "CU": "Sanctions complicate ad buying",
    "SY": "Sanctions complicate ad buying",
}
MIN_POP = 50_000
FACTOR_ELASTICITY = 0.20
FACTOR_MIN, FACTOR_MAX = 0.55, 1.35
MODEL_BAND = (0.70, 1.40)  # low = base*0.70, high = base*1.40
CEILING_GDP_PPP_MAX = 20_000  # South Asia / Africa countries up to this income share the client's AED 30 ceiling scenario
AFRICA_SOUTH_ASIA = ("Africa",)

def region_of(iso):
    r = REG[iso]
    return r["world_region"], r["world_subregion"]

def median_ppp(isos):
    vals = [sig[i]["gdp_ppp"] for i in isos if sig[i]["gdp_ppp"]]
    return statistics.median(vals)

EUROPE_REF = median_ppp([i for i, b in CLIENT.items() if b["region_key"] == "europe"])
NA_OCE_REF = median_ppp([i for i, b in CLIENT.items() if b["region_key"] in ("north_america", "oceania")])
CEIL_REF = median_ppp([i for i, b in CLIENT.items() if b["region_key"] == "south_asia_africa"])
ANCHORS = {
    "europe": dict(cpl=50, ref=EUROPE_REF, label="Europe regional benchmark (AED 50)"),
    "na_oceania": dict(cpl=70, ref=NA_OCE_REF, label="North America / Oceania regional benchmark (AED 70)"),
    "ceiling": dict(cpl=30, ref=CEIL_REF, label="South Asia & Africa ceiling scenario (AED 30 or less)"),
}


def anchor_for(iso):
    region, sub = region_of(iso)
    g = sig[iso]["gdp_ppp"]
    if region == "Africa" and g is not None and g <= CEILING_GDP_PPP_MAX:
        return "ceiling"
    if sub == "Southern Asia" and g is not None and g <= CEILING_GDP_PPP_MAX:
        return "ceiling"
    # Only direct geographic neighbours of the client's North America / Oceania benchmarks use that anchor.
    if sub == "Northern America" or region == "Oceania":
        return "na_oceania"
    return "europe"


cpl_rows = []
for iso, r in REG.items():
    s = sig[iso]
    base = dict(country_iso2=iso, country_name=r["country_name"], currency="AED", research_date=RESEARCH_DATE,
                model_version=MODEL_VERSION)
    if iso in CLIENT:
        b = CLIENT[iso]
        rel = b["cpl_relation"]
        lo = b.get("cpl_point_aed", b.get("cpl_low_aed")) if rel != "at_most" else None
        hi = b.get("cpl_point_aed", b.get("cpl_high_aed"))
        mid = (lo + hi) / 2 if rel == "range" else (hi if rel == "point" else None)
        learn = LEARNING.get(iso)
        cpl_rows.append({**base,
            "cpl_status": "regional_proxy", "evidence_tier": 3, "anchor_id": b["id"], "anchor_cpl_aed": hi, "anchor_distance": "client_benchmark_country",
            "adjustment_factor": "", "cpl_low_aed": lo, "cpl_base_aed": mid, "cpl_high_aed": hi, "cpl_relation": rel,
            "mature_cpl_status": "client_regional_proxy",
            "learning_cpl_status": "client_regional_proxy" if learn else "not_supplied",
            "learning_cpl_aed": learn or "",
            "measurement_type": "client_supplied_blended_regional_benchmark",
            "confidence": b["confidence"], "source_ids": "SRC_CLIENT_BENCHMARK_2026_11",
            "gdp_per_capita_ppp_basis": num(s["gdp_ppp"], 0),
            "methodology": "Client-provided regional benchmark carried unchanged. Not a measured country CPL. " + b["scope_note"]})
        continue

    blocked = RESTRICTED_AD_MARKETS.get(iso)
    pop, g = s["pop"], s["gdp_ppp"] or s["gdp_pc"]
    if blocked or pop is None or pop < MIN_POP or not g:
        why = ("Ad market restricted or unavailable (needs confirmation against current platform policy): " + blocked) if blocked \
            else ("Audience below the %s-person modelling floor" % f"{MIN_POP:,}" if pop and pop < MIN_POP
                  else "No World Bank indicators available for this territory")
        cpl_rows.append({**base,
            "cpl_status": "manual_research_required", "evidence_tier": "", "anchor_id": "", "anchor_cpl_aed": "", "anchor_distance": "",
            "adjustment_factor": "", "cpl_low_aed": "", "cpl_base_aed": "", "cpl_high_aed": "", "cpl_relation": "",
            "mature_cpl_status": "unavailable", "learning_cpl_status": "not_supplied", "learning_cpl_aed": "",
            "measurement_type": "none", "confidence": "insufficient", "source_ids": "SRC_WB_WDI" if pop else "",
            "gdp_per_capita_ppp_basis": num(s["gdp_ppp"], 0),
            "methodology": why + ". No CPL estimated."})
        continue

    a_id = anchor_for(iso)
    a = ANCHORS[a_id]
    gg = s["gdp_ppp"] if s["gdp_ppp"] else s["gdp_pc"] * 1.0
    factor = min(FACTOR_MAX, max(FACTOR_MIN, (gg / a["ref"]) ** FACTOR_ELASTICITY))
    # Conservative rule: a high-income market is never modelled cheaper than its regional anchor.
    if s["income"] == "High income":
        factor = max(1.0, factor)
    used_nominal = not s["gdp_ppp"]
    # nominal GDP understates purchasing power for low-income countries: widen the band slightly
    # Hierarchical uncertainty: a country in the same region as its anchor gets a tighter band than one
    # borrowing a distant region's benchmark. No country gets a band narrower than +-25%.
    region_c, sub_c = region_of(iso)
    same_region = (a_id == "europe" and region_c == "Europe") or (a_id == "na_oceania") or (a_id == "ceiling")
    band_lo, band_hi = (0.75, 1.30) if same_region else (0.65, 1.50)
    if used_nominal:
        band_lo, band_hi = band_lo * 0.9, band_hi * 1.1
    distance = "same_region" if same_region else "cross_region"
    if a_id == "ceiling":
        base_cpl = min(a["cpl"], a["cpl"] * factor)
        lo, hi, rel = None, a["cpl"], "at_most"
        tier = 3
        method = ("Client's broad 'AED 30 or less' South Asia & Africa benchmark used as a planning CEILING (not a measured country "
                  "CPL). Indicative base = 30 x income factor %.2f (capped at 30). No lower CPL bound is set, so no upper lead-volume "
                  "bound is implied." % factor)
        conf = "low"
    else:
        base_cpl = a["cpl"] * factor
        lo, hi, rel = base_cpl * band_lo, base_cpl * band_hi, "range"
        tier = 6
        method = ("Modelled: %s x income factor %.2f (= (GDP/cap PPP %.0f / anchor reference %.0f)^%.2f, clamped %.2f-%.2f; high-income markets floored at 1.00), band x%.2f to x%.2f (%s anchor). "
                  "No campaign data exists for this country." % (a["label"], factor, gg, a["ref"], FACTOR_ELASTICITY, FACTOR_MIN, FACTOR_MAX, band_lo, band_hi, distance))
        conf = "low"
    cpl_rows.append({**base,
        "cpl_status": "modelled", "evidence_tier": tier, "anchor_id": a_id, "anchor_cpl_aed": a["cpl"], "anchor_distance": distance,
        "adjustment_factor": round(factor, 3), "cpl_low_aed": num(lo, 1), "cpl_base_aed": num(base_cpl, 1),
        "cpl_high_aed": num(hi, 1), "cpl_relation": rel,
        "mature_cpl_status": "modelled_estimate", "learning_cpl_status": "not_supplied", "learning_cpl_aed": "",
        "measurement_type": "modelled_from_regional_anchor", "confidence": conf,
        "source_ids": "SRC_CLIENT_BENCHMARK_2026_11;SRC_WB_WDI",
        "gdp_per_capita_ppp_basis": num(s["gdp_ppp"], 0),
        "methodology": method + (" GDP per capita (nominal) used because PPP was unavailable." if used_nominal else "")})

# ---- hand edits: country-cpl-estimates.csv is the file you edit. Rows you changed are kept as typed.
CPL_PATH = os.path.join(DATA, "country-cpl-estimates.csv")
SNAPSHOT_PATH = os.path.join(ROOT, "scripts", "market-intel", ".cpl-snapshot.json")
HAND_EDITS, HAND_EDIT_WARNINGS = [], []


def cpl_tuple(r):
    def f(k):
        raw = r.get(k)
        v = "" if raw is None else str(raw).strip().replace(",", "")
        if not v:
            return None
        try:
            return round(float(v), 4)
        except ValueError:
            return "bad"
    return [f("cpl_low_aed"), f("cpl_base_aed"), f("cpl_high_aed"), (r.get("cpl_relation") or "").strip()]


def normalize_cpl(lo, base, hi, rel):
    if "bad" in (lo, base, hi):
        raise ValueError("a CPL value is not a number")
    if hi is None and base is not None:
        hi = base
    if hi is None or hi <= 0:
        raise ValueError("needs a high CPL (or a base CPL) above 0")
    if rel not in ("point", "range", "at_most"):
        rel = "at_most" if lo is None and base is None else ("point" if lo is None or lo == hi else "range")
    if rel == "point":
        lo = base = hi
    if rel == "at_most":
        lo = None
    if lo is not None and lo > hi:
        raise ValueError("the low CPL is above the high CPL")
    if base is None and rel == "range" and lo is not None:
        base = round((lo + hi) / 2, 4)
    if base is not None and ((lo is not None and base < lo) or base > hi):
        raise ValueError("the base CPL must be between low and high")
    return lo, base, hi, rel


_prev = {r["country_iso2"]: r for r in read_csv(CPL_PATH)} if os.path.exists(CPL_PATH) else {}
_snap = json.load(open(SNAPSHOT_PATH, encoding="utf-8")) if os.path.exists(SNAPSHOT_PATH) else {}
for i, row in enumerate(cpl_rows):
    iso = row["country_iso2"]
    cur = _prev.get(iso)
    if not cur:
        continue
    cur_t = cpl_tuple(cur)
    edited = iso in _snap and cur_t != _snap[iso]
    if edited:
        if cur_t[0] is None and cur_t[1] is None and cur_t[2] is None:
            continue  # you cleared the numbers: go back to the client benchmark or the model
        try:
            lo, base, hi, rel = normalize_cpl(*cur_t)
        except ValueError as e:
            HAND_EDIT_WARNINGS.append(f"{iso}: {e}; your edit was ignored")
            continue
        if [lo, base, hi, rel] == cpl_tuple(row):
            continue  # typed the same numbers the row already had: nothing to override
        cpl_rows[i] = {**row,
            "cpl_status": "user_override", "evidence_tier": 1, "anchor_id": "user_override", "anchor_cpl_aed": hi,
            "anchor_distance": "user_supplied", "adjustment_factor": "",
            "cpl_low_aed": lo if lo is not None else "", "cpl_base_aed": base if base is not None else "",
            "cpl_high_aed": hi, "cpl_relation": rel, "mature_cpl_status": "user_supplied",
            "measurement_type": "user_supplied_override", "confidence": "user", "source_ids": "SRC_USER_OVERRIDE",
            "methodology": "Edited by you in country-cpl-estimates.csv. Used exactly as typed: no safety margin, no modelling. Clear the CPL cells to go back to the original value."}
        HAND_EDITS.append(iso)
    elif cur.get("cpl_status") == "user_override":
        cpl_rows[i] = {k: cur.get(k, row.get(k, "")) for k in row}  # an earlier edit of yours stays

# ---- user overrides (cpl-overrides.csv): the file you edit. Wins over client benchmarks and estimates.
OVERRIDES_PATH = os.path.join(DATA, "cpl-overrides.csv")
OVERRIDE_WARNINGS = []
OVERRIDES = {}
if os.path.exists(OVERRIDES_PATH):
    for o in read_csv(OVERRIDES_PATH):
        iso = (o.get("country_iso2") or "").strip().upper()
        if not iso:
            continue

        def fnum(k):
            v = (o.get(k) or "").strip().replace(",", "")
            return float(v) if v else None

        try:
            lo, base, hi = fnum("cpl_low_aed"), fnum("cpl_base_aed"), fnum("cpl_high_aed")
        except ValueError:
            OVERRIDE_WARNINGS.append(f"{iso}: a CPL value is not a number; row skipped")
            continue
        rel = (o.get("relation") or "").strip().lower()
        if iso not in REG:
            OVERRIDE_WARNINGS.append(f"{iso}: not a country code in the registry; row skipped")
            continue
        if hi is None and base is not None:
            hi = base
        if hi is None or hi <= 0:
            OVERRIDE_WARNINGS.append(f"{iso}: needs cpl_high_aed (or cpl_base_aed) above 0; row skipped")
            continue
        if rel not in ("point", "range", "at_most"):
            rel = "at_most" if lo is None and base is None else ("point" if lo is None or lo == hi else "range")
        if rel == "point":
            lo = base = hi
        if rel == "at_most":
            lo = None
        if lo is not None and lo > hi:
            OVERRIDE_WARNINGS.append(f"{iso}: low CPL is above high CPL; row skipped")
            continue
        if base is None and rel == "range" and lo is not None:
            base = (lo + hi) / 2
        OVERRIDES[iso] = dict(lo=lo, base=base, hi=hi, rel=rel, note=(o.get("note") or "").strip())

for i, row in enumerate(cpl_rows):
    ov = OVERRIDES.get(row["country_iso2"])
    if ov:
        cpl_rows[i] = {**row,
            "cpl_status": "user_override", "evidence_tier": 1, "anchor_id": "user_override", "anchor_cpl_aed": ov["hi"],
            "anchor_distance": "user_supplied", "adjustment_factor": "",
            "cpl_low_aed": ov["lo"] if ov["lo"] is not None else "", "cpl_base_aed": ov["base"] if ov["base"] is not None else "",
            "cpl_high_aed": ov["hi"], "cpl_relation": ov["rel"], "mature_cpl_status": "user_supplied",
            "measurement_type": "user_supplied_override", "confidence": "user", "source_ids": "SRC_USER_OVERRIDE",
            "methodology": "Entered by you in cpl-overrides.csv. Used as supplied: no safety margin, no modelling. " + ov["note"]}

CPL_FIELDS = list(cpl_rows[0].keys())
write_csv("country-cpl-estimates.csv", cpl_rows, CPL_FIELDS)
CPL = {r["country_iso2"]: r for r in cpl_rows}
with open(SNAPSHOT_PATH, "w", encoding="utf-8", newline="\n") as _f:
    json.dump({r["country_iso2"]: cpl_tuple(r) for r in cpl_rows}, _f)

# ---------------------------------------------------------------- advertising cost signals + keyword demand
ad_rows = []
for iso, r in REG.items():
    s = sig[iso]
    ad_rows.append(dict(
        country_iso2=iso, country_name=r["country_name"],
        cost_level_proxy_gdp_ppp_vs_europe_anchor=num((s["gdp_ppp"] / EUROPE_REF) if s["gdp_ppp"] else None, 3),
        cost_level_proxy_note="Income ratio only. NOT an observed CPM, CPC or CPL.",
        internet_users_pct=num(s["net"], 1),
        meta_cpm_usd="", meta_cpm_status="unavailable_no_credible_open_dataset",
        google_avg_cpc_usd="", google_cpc_status="unavailable_requires_google_ads_api_access",
        platform_availability_flag="restricted_or_unavailable_needs_confirmation" if iso in RESTRICTED_AD_MARKETS else "no_known_restriction_recorded",
        platform_availability_note=RESTRICTED_AD_MARKETS.get(iso, ""),
        evidence_type="modelled_proxy" if s["gdp_ppp"] else "unavailable", confidence="low", source_ids="SRC_WB_WDI",
        last_researched_at=RESEARCH_DATE))
AD_FIELDS = list(ad_rows[0].keys())
write_csv("country-advertising-cost-signals.csv", ad_rows, AD_FIELDS)
KW_FIELDS = ["country_iso2", "keyword", "language_code", "avg_monthly_searches", "search_volume_period", "avg_cpc_usd",
             "competition_index", "data_source", "source_id", "evidence_type", "confidence", "last_researched_at"]
write_csv("country-keyword-demand.csv", [], KW_FIELDS)  # header only: no Keyword Planner access in this project

# ---------------------------------------------------------------- CLDR languages
ns = ET.parse(os.path.join(RAW, "cldr_supplemental.xml")).getroot()
names = {}
for el in ET.parse(os.path.join(RAW, "cldr_en.xml")).getroot().iter("language"):
    if "alt" not in el.attrib:
        names[el.attrib["type"]] = el.text
cldr_version = ns.find("./version").attrib.get("cldrVersion", "unknown")

CATALOG = [
    # code, iso639_3, name, native, script, rtl
    ("en", "eng", "English", "English", "Latn", 0), ("ar", "ara", "Arabic", "العربية", "Arab", 1),
    ("fr", "fra", "French", "Français", "Latn", 0), ("de", "deu", "German", "Deutsch", "Latn", 0),
    ("ru", "rus", "Russian", "Русский", "Cyrl", 0), ("ur", "urd", "Urdu", "اردو", "Arab", 1),
    ("hi", "hin", "Hindi", "हिन्दी", "Deva", 0), ("zh", "cmn", "Chinese (Mandarin)", "中文", "Hans", 0),
    ("es", "spa", "Spanish", "Español", "Latn", 0), ("it", "ita", "Italian", "Italiano", "Latn", 0),
    ("tr", "tur", "Turkish", "Türkçe", "Latn", 0), ("pt", "por", "Portuguese", "Português", "Latn", 0),
    ("bn", "ben", "Bengali", "বাংলা", "Beng", 0), ("pa", "pan", "Punjabi", "ਪੰਜਾਬੀ", "Guru/Arab", 0),
    ("id", "ind", "Indonesian", "Bahasa Indonesia", "Latn", 0), ("ja", "jpn", "Japanese", "日本語", "Jpan", 0),
    ("ko", "kor", "Korean", "한국어", "Kore", 0), ("nl", "nld", "Dutch", "Nederlands", "Latn", 0),
    ("fa", "fas", "Persian", "فارسی", "Arab", 1), ("pl", "pol", "Polish", "Polski", "Latn", 0),
    ("uk", "ukr", "Ukrainian", "Українська", "Cyrl", 0), ("ro", "ron", "Romanian", "Română", "Latn", 0),
    ("el", "ell", "Greek", "Ελληνικά", "Grek", 0), ("he", "heb", "Hebrew", "עברית", "Hebr", 1),
    ("th", "tha", "Thai", "ไทย", "Thai", 0), ("vi", "vie", "Vietnamese", "Tiếng Việt", "Latn", 0),
    ("ms", "msa", "Malay", "Bahasa Melayu", "Latn", 0), ("ta", "tam", "Tamil", "தமிழ்", "Taml", 0),
    ("te", "tel", "Telugu", "తెలుగు", "Telu", 0), ("mr", "mar", "Marathi", "मराठी", "Deva", 0),
    ("gu", "guj", "Gujarati", "ગુજરાતી", "Gujr", 0), ("ml", "mal", "Malayalam", "മലയാളം", "Mlym", 0),
    ("kn", "kan", "Kannada", "ಕನ್ನಡ", "Knda", 0), ("sw", "swa", "Swahili", "Kiswahili", "Latn", 0),
    ("am", "amh", "Amharic", "አማርኛ", "Ethi", 0), ("ha", "hau", "Hausa", "Hausa", "Latn", 0),
    ("yo", "yor", "Yoruba", "Yorùbá", "Latn", 0), ("zu", "zul", "Zulu", "isiZulu", "Latn", 0),
    ("af", "afr", "Afrikaans", "Afrikaans", "Latn", 0), ("fil", "fil", "Filipino", "Filipino", "Latn", 0),
    ("cs", "ces", "Czech", "Čeština", "Latn", 0), ("hu", "hun", "Hungarian", "Magyar", "Latn", 0),
    ("sv", "swe", "Swedish", "Svenska", "Latn", 0), ("da", "dan", "Danish", "Dansk", "Latn", 0),
    ("nb", "nob", "Norwegian (Bokmål)", "Norsk bokmål", "Latn", 0), ("fi", "fin", "Finnish", "Suomi", "Latn", 0),
    ("sr", "srp", "Serbian", "Српски", "Cyrl/Latn", 0), ("hr", "hrv", "Croatian", "Hrvatski", "Latn", 0),
    ("bg", "bul", "Bulgarian", "Български", "Cyrl", 0), ("kk", "kaz", "Kazakh", "Қазақша", "Cyrl", 0),
    ("uz", "uzb", "Uzbek", "Oʻzbek", "Latn", 0), ("az", "aze", "Azerbaijani", "Azərbaycan", "Latn", 0),
    ("ka", "kat", "Georgian", "ქართული", "Geor", 0), ("hy", "hye", "Armenian", "Հայերեն", "Armn", 0),
    ("si", "sin", "Sinhala", "සිංහල", "Sinh", 0), ("ne", "nep", "Nepali", "नेपाली", "Deva", 0),
    ("ps", "pus", "Pashto", "پښتو", "Arab", 1), ("ku", "kur", "Kurdish", "Kurdî", "Latn/Arab", 0),
    ("sd", "snd", "Sindhi", "سنڌي", "Arab", 1), ("my", "mya", "Burmese", "မြန်မာ", "Mymr", 0),
    ("km", "khm", "Khmer", "ខ្មែរ", "Khmr", 0), ("yue", "yue", "Chinese (Cantonese)", "粵語", "Hant", 0),
]
CAT = {c[0]: c for c in CATALOG}
UI_CODES = {"en", "ar", "fr", "de", "ru", "ur", "hi", "zh", "es", "it", "tr", "pt", "bn", "pa", "id"}
write_csv("language-master.csv", [dict(
    language_code=c[0], iso639_3=c[1], language_name=c[2], native_name=c[3], script=c[4], direction="rtl" if c[5] else "ltr",
    selectable_in_current_ui="true" if c[0] in UI_CODES else "false",
    default_agent_language="true" if c[0] == "en" else "false",
    note=("Mandarin only; Cantonese is listed separately as yue." if c[0] == "zh" else
          "Spoken Punjabi is written in Gurmukhi (India) and Shahmukhi (Pakistan)." if c[0] == "pa" else ""),
    source_id="SRC_ISO_639", last_researched_at=RESEARCH_DATE) for c in CATALOG],
    ["language_code", "iso639_3", "language_name", "native_name", "script", "direction", "selectable_in_current_ui",
     "default_agent_language", "note", "source_id", "last_researched_at"])

dist_rows, LANG_PCT = [], defaultdict(dict)  # LANG_PCT[iso2][code] = pct
for t in ns.iter("territory"):
    iso = t.attrib["type"]
    if iso not in REG or iso not in {x.attrib["type"] for x in [t]}:
        continue
    pop_cldr = int(t.attrib["population"]) if t.attrib.get("population") else None
    s = sig[iso]
    denom = int(s["pop"]) if s["pop"] else pop_cldr
    for lp in t.findall("languagePopulation"):
        code = lp.attrib["type"]
        pct = float(lp.attrib["populationPercent"])
        off = lp.attrib.get("officialStatus", "")
        base_code = code.split("_")[0]
        key = code if code in CAT else base_code
        if pct < 1 and not off:
            continue
        in_cat = key in CAT
        dist_rows.append(dict(
            country_iso2=iso, language_code=code, language_name=names.get(code) or names.get(base_code) or code,
            iso639_3=CAT[key][1] if in_cat else "", in_catalog="true" if in_cat else "false",
            official_status=off or "none_recorded",
            speaker_share_pct_total=pct,
            share_definition="CLDR territory language share: percent of the territory population using the language (first or additional language, not separated)",
            first_language_pct="", second_language_pct="", native_speakers="",
            denominator_population=denom or "", denominator_year=s["pop_year"] or "",
            est_total_speakers=int(round(denom * pct / 100)) if denom else "",
            english_proficiency_index="", english_proficiency_status="unavailable_EF_EPI_not_accessible",
            source_id="SRC_CLDR_TERRITORY_INFO", source_year=cldr_version,
            confidence="medium" if off else "low",
            notes="Estimated total speakers = share x population; derived, not a census count." ))
        if in_cat:
            LANG_PCT[iso][key] = max(pct, LANG_PCT[iso].get(key, 0))
# ---- researched speaker counts: census figures and estimates that REPLACE the CLDR share for that country and language.
# Rows whose source_id starts with SRC_CENSUS_, SRC_EST_ or SRC_USER_ in country-language-distribution.csv are YOURS: they are
# kept across rebuilds and win over this seed list. Edit est_total_speakers (and the source) there; the share is recomputed.
LANG_SEED = [
    # (country, language, speakers, source_id, confidence, note)
    ("CA", "pa", 942000, "SRC_CENSUS_STATCAN_2021", "high", "Statistics Canada 2021: 942,000 people can speak Punjabi (666,585 mother tongue, 763,785 incl. multiple mother tongues)."),
    ("AU", "pa", 239033, "SRC_CENSUS_ABS_2021", "high", "ABS Census 2021: Punjabi spoken at home (about 0.9% of the population)."),
    ("GB", "pa", 290745, "SRC_CENSUS_ONS_2021", "medium", "ONS Census 2021, England and Wales: Punjabi as main language. Lower bound: people who speak it but list English as main language are not counted."),
    ("US", "pa", 318588, "SRC_CENSUS_ACS_2021", "medium", "US Census Bureau ACS 2021: Punjabi spoken at home (a 2024 secondary source gives about 334,000)."),
    ("NZ", "pa", 34227, "SRC_CENSUS_STATSNZ_2018", "high", "Stats NZ 2018 census (2023 census: 49,656)."),
    ("MY", "pa", 76000, "SRC_EST_JOSHUAPROJECT", "low", "Joshua Project estimate; other estimates 56,000 to over 100,000 (Sikh population 100,000-130,000)."),
    ("SG", "pa", 18624, "SRC_EST_SINGAPORE_CENSUS_2010", "low", "Singapore 2010 census: Sikh 12,952 plus Punjabi 5,672 (ethnic categories, not language)."),
    ("AE", "pa", 300000, "SRC_EST_JOSHUAPROJECT", "low", "Estimates of ethnic Punjabis in the UAE range from 218,000 (Joshua Project) to 331,000 (PeopleGroups); no census."),
    ("AU", "hi", 197132, "SRC_CENSUS_ABS_2021", "high", "ABS Census 2021: Hindi spoken at home (about 0.9% of the population)."),
    ("AE", "hi", 1500000, "SRC_EST_UAE_EXPAT_SHARES", "low", "Rough estimate: about 3 to 4 million Indians live in the UAE and roughly half use Hindi. No census; treat as an order of magnitude."),
    ("AU", "ur", 111873, "SRC_CENSUS_ABS_2021", "medium", "ABS Census 2021 via SBS: about 111,900 Urdu speakers (may count all Urdu speakers, not only home use)."),
    ("GB", "ur", 270000, "SRC_CENSUS_ONS_2021", "medium", "ONS Census 2021: Urdu as main language, about 270,000 (Ethnologue gives over 400,000 in total). Lower bound."),
    ("US", "ur", 397502, "SRC_EST_US_URDU_2013", "low", "A 2013 figure of 397,502 Urdu speakers; the 2021 ACS table was not read."),
    ("AE", "ur", 1500000, "SRC_EST_UAE_EXPAT_SHARES", "low", "Rough estimate: Pakistanis are 12 to 17% of the UAE population (about 1.4 to 1.9 million) and Urdu is their common language. No census."),
    # ---- Arabic
    ("AU", "ar", 367159, "SRC_CENSUS_ABS_2021", "high", "ABS Census 2021: Arabic spoken at home (about 1.4% of the population)."),
    ("GB", "ar", 355977, "SRC_CENSUS_ONS_2021", "low", "ONS Census 2021, England and Wales: British Arab ethnic group (355,977). An ethnicity proxy, not a language count."),
    ("FR", "ar", 3000000, "SRC_EST_UNVERIFIED_RECALL", "low", "No census (France does not record language). Widely quoted order of magnitude for Arabic speakers of Maghreb and Middle Eastern origin; NOT verified by a source in this research."),
    ("US", "ar", 1200000, "SRC_EST_UNVERIFIED_RECALL", "low", "Order of magnitude for ACS Arabic spoken at home; NOT verified in this research. Check Census Bureau table B16001."),
    # ---- Bengali
    ("AU", "bn", 70116, "SRC_CENSUS_ABS_2021", "high", "ABS Census 2021: Bengali spoken at home."),
    ("GB", "bn", 650000, "SRC_EST_BENGALI_DIASPORA", "low", "About 650,000 British Bangladeshis (ethnic origin, not language count; secondary source)."),
    ("US", "bn", 300000, "SRC_EST_BENGALI_DIASPORA", "low", "About 300,000 Bengali Americans reported in 2023 (population, secondary source, not an ACS language count)."),
    ("SA", "bn", 3000000, "SRC_EST_BENGALI_DIASPORA", "low", "A secondary source states three million Bengalis in Saudi Arabia; no year or primary source."),
    ("AE", "bn", 1000000, "SRC_EST_UNVERIFIED_RECALL", "low", "Order of magnitude for Bangladeshis in the UAE (about one million); NOT verified in this research."),
    # ---- Urdu and Hindi in the Gulf: expatriate nationals x share who use the language (assumptions)
    ("SA", "ur", 1361000, "SRC_EST_GULF_EXPAT", "low", "1,814,678 Pakistanis (2022 census) x 0.75 who use Urdu (assumption)."),
    ("KW", "ur", 254000, "SRC_EST_GULF_EXPAT", "low", "339,033 Pakistanis (2020 estimate) x 0.75 who use Urdu (assumption)."),
    ("OM", "ur", 188000, "SRC_EST_GULF_EXPAT", "low", "250,092 Pakistanis (2020 estimate) x 0.75 who use Urdu (assumption)."),
    ("QA", "ur", 177000, "SRC_EST_GULF_EXPAT", "low", "235,505 Pakistanis (2020 estimate) x 0.75 who use Urdu (assumption)."),
    ("BH", "ur", 88000, "SRC_EST_GULF_EXPAT", "low", "117,000 Pakistanis (2019-2020 estimate) x 0.75 who use Urdu (assumption)."),
    ("SA", "hi", 1250000, "SRC_EST_GULF_EXPAT", "low", "About 2.5 million Indians x 0.5 who use Hindi (assumption; counts vary 2.46 to 2.59 million)."),
    ("KW", "hi", 575000, "SRC_EST_GULF_EXPAT", "low", "About 1.15 million Indians x 0.5 who use Hindi (assumption)."),
    ("QA", "hi", 350000, "SRC_EST_GULF_EXPAT", "low", "About 700,000 Indians x 0.5 who use Hindi (assumption; another source says 835,000)."),
    ("OM", "hi", 340000, "SRC_EST_GULF_EXPAT", "low", "About 685,000 Indians x 0.5 who use Hindi (assumption; sources conflict up to 1.38 million)."),
    ("BH", "hi", 160000, "SRC_EST_GULF_EXPAT", "low", "About 324,000 Indians x 0.5 who use Hindi (assumption)."),
    # ---- Russian
    ("AE", "ru", 147000, "SRC_EST_GLMM_RUSSIAN_UAE", "medium", "GLMM 2023 report: about 147,000 Russian speakers in the UAE to end 2021 (other estimates run to 300,000 in 2025)."),
    ("US", "ru", 854955, "SRC_CENSUS_US_2010", "medium", "US Census 2010: Russian spoken at home. Old figure; the 2021 ACS table was not read."),
    ("CY", "ru", 21642, "SRC_CENSUS_CYPRUS_2021", "medium", "Cyprus census 2021 based figure (2.3%); a 2024 share of 3.2% implies more."),
    # ---- Mandarin
    ("US", "zh", 2115000, "SRC_EST_US_CHINESE", "low", "Chinese (all varieties) speakers in the US, about 2.1 million (advocacy summary of Census data; the Census Bureau 2019 report lists 3.5 million). Used as a proxy for Mandarin reach."),
    ("GB", "zh", 149091, "SRC_CENSUS_ONS_2021", "medium", "ONS Census 2021, England and Wales: Mandarin 30,820 plus other Chinese 118,271 (Cantonese excluded)."),
]
_prev_path = os.path.join(DATA, "country-language-distribution.csv")
_user_rows = {}
if os.path.exists(_prev_path):
    with open(_prev_path, encoding="utf-8-sig", newline="") as _f:
        for _r in csv.DictReader(_f):
            if _r["source_id"].startswith(("SRC_CENSUS_", "SRC_EST_", "SRC_USER_")):
                _user_rows[(_r["country_iso2"], _r["language_code"])] = _r
_override = {(c, l): dict(speakers=n, src=s, conf=cf, note=nt) for c, l, n, s, cf, nt in LANG_SEED}
for (c, l), r in _user_rows.items():  # your edits win over the seed
    try:
        _override[(c, l)] = dict(speakers=int(float(r["est_total_speakers"])), src=r["source_id"], conf=r["confidence"], note=r["notes"])
    except ValueError:
        pass
dist_rows = [r for r in dist_rows if (r["country_iso2"], r["language_code"]) not in _override]
for (iso, code), o in sorted(_override.items()):
    pop = int(sig[iso]["pop"]) if iso in sig and sig[iso]["pop"] else None
    if not pop:
        continue
    pct = round(o["speakers"] * 100.0 / pop, 3)
    in_cat = code in CAT
    dist_rows.append(dict(
        country_iso2=iso, language_code=code, language_name=names.get(code) or code,
        iso639_3=CAT[code][1] if in_cat else "", in_catalog="true" if in_cat else "false",
        official_status="none_recorded", speaker_share_pct_total=pct,
        share_definition="Researched speaker count divided by population (census figure or estimate; see source and notes)",
        first_language_pct="", second_language_pct="", native_speakers="",
        denominator_population=pop, denominator_year=sig[iso]["pop_year"] or "",
        est_total_speakers=o["speakers"], english_proficiency_index="", english_proficiency_status="unavailable_EF_EPI_not_accessible",
        source_id=o["src"], source_year="", confidence=o["conf"], notes=o["note"]))
    if in_cat:
        LANG_PCT[iso][code] = pct
dist_rows.sort(key=lambda r: (r["country_iso2"], r["language_code"]))
DIST_FIELDS = list(dist_rows[0].keys())
write_csv("country-language-distribution.csv", dist_rows, DIST_FIELDS)

# ---- per-country language profiles (primary/secondary with %), language families, family-aware reach
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import language_profiles
LANG_REACH, LANG_STATS = language_profiles.run(dict(RAW=RAW, DATA=DATA, REG=REG, cldr_names=names, CAT=CAT,
                                                    write_csv=write_csv, dist_rows=dist_rows))
LANG_PCT = defaultdict(dict, LANG_REACH)  # selectable language -> reach %, now counting related varieties

# ---------------------------------------------------------------- diaspora (Eurostat citizenship stocks)
es = json.load(open(os.path.join(RAW, "eurostat_ctz.json"), encoding="utf-8"))
cit_idx = es["dimension"]["citizen"]["category"]["index"]
geo_idx = es["dimension"]["geo"]["category"]["index"]
nG = len(geo_idx)
fix = {"EL": "GR", "UK": "GB"}
def iso_of(code):
    code = fix.get(code, code)
    return code if len(code) == 2 and code in REG else None
stock = {}
for cit, ci in cit_idx.items():
    o = iso_of(cit)
    if not o:
        continue
    for geo, gi in geo_idx.items():
        res = iso_of(geo)
        v = es["value"].get(str(ci * nG + gi))
        if res and v and res != o:
            stock[(o, res)] = v
es_year = es["dimension"]["time"]["category"]["index"]
es_year = list(es_year)[0]

# ---- bilateral migrant stock by country of birth (Mendeley, imputed, 2020) for destinations Eurostat does not cover:
# the UK, the US, Canada, Australia, New Zealand, the Gulf, Malaysia, Singapore and so on. Same method as above:
# origin-country language share applied to the people born in that origin.
MIG_PATH = os.path.join(RAW, "migration_imputed_RIKS_dec2021.csv")
MIG_YEAR = "2020"
mig_stock = {}
mig_all = {}
mig_unmatched = set()
if os.path.exists(MIG_PATH):
    _wb = json.load(open(os.path.join(RAW, "wb_countries.json"), encoding="utf-8"))[1]
    _name2iso = {c["name"].lower(): c["iso2Code"] for c in _wb if c.get("iso2Code") and c["iso2Code"] in REG}
    _alias = {"korea, rep.": "KR", "iran, islamic rep.": "IR", "russian federation": "RU", "turkiye": "TR", "turkey": "TR", "czechia": "CZ", "slovak republic": "SK", "egypt, arab rep.": "EG"}
    def _iso(name):
        key = name.replace(";", ",").strip().lower()
        return _alias.get(key) or _name2iso.get(key)
    _covered = {res for (_, res) in stock}
    with open(MIG_PATH, encoding="utf-8", newline="") as _f:
        for _r in csv.DictReader(_f):
            if _r["year"] != MIG_YEAR or not _r["stock"]:
                continue
            try:
                n = float(_r["stock"])
            except ValueError:
                continue
            o, res = _iso(_r["origin"]), _iso(_r["destination"])
            if not o or not res:
                if n >= 3000:
                    mig_unmatched.add(_r["origin"] if not o else _r["destination"])
                continue
            if o != res:
                mig_all[(o, res)] = n
    # People born in a Gulf state who live in India are Indians who returned or were born abroad, not Arabic speakers.
    # When the flow the other way is much larger, the origin-country language share does not describe these migrants.
    for (o, res), n in mig_all.items():
        if n < 3000 or res in _covered:
            continue
        if n < 0.1 * mig_all.get((res, o), 0):
            continue
        mig_stock[(o, res)] = int(round(n))
print("migrant stock pairs added:", len(mig_stock), "| unmatched country names:", len(mig_unmatched))

dia_rows = []
DIA_POOL = defaultdict(lambda: defaultdict(lambda: [0, []]))  # [lang][residence] -> [compat_pop, top origins]
for (o, res), n in stock.items():
    if n < 3000:
        continue
    for code, pct in LANG_PCT[o].items():
        if pct < 25 or code not in UI_CODES and code not in CAT:
            continue
        compat = n * pct / 100
        if compat < 2000:
            continue
        dia_rows.append(dict(
            language_code=code, language_name=CAT[code][2], residence_country_iso2=res, origin_country_iso2=o,
            relationship_type="diaspora_proxy_by_citizenship",
            origin_citizen_population_in_residence=n, population_reference=f"{es_year}-01-01",
            origin_language_share_pct=pct, estimated_language_compatible_population=int(round(compat)),
            confirmed_speaking_population="", language_compatibility_basis="origin-country CLDR share applied to citizen stock; migration origin does not prove proficiency",
            data_basis="Eurostat migr_pop1ctz (citizenship, not country of birth)", source_id="SRC_EUROSTAT_MIGR_POP_2025",
            confidence="low", last_researched_at=RESEARCH_DATE))
        pool = DIA_POOL[code][res]
        pool[0] += compat
        pool[1].append((o, int(round(compat))))
for (o, res), n in mig_stock.items():
    for code, pct in LANG_PCT[o].items():
        if pct < 25 or code not in UI_CODES and code not in CAT:
            continue
        compat = n * pct / 100
        if compat < 2000:
            continue
        dia_rows.append(dict(
            language_code=code, language_name=CAT[code][2], residence_country_iso2=res, origin_country_iso2=o,
            relationship_type="diaspora_proxy_by_birth_country",
            origin_citizen_population_in_residence=n, population_reference=f"{MIG_YEAR}-07-01",
            origin_language_share_pct=pct, estimated_language_compatible_population=int(round(compat)),
            confirmed_speaking_population="", language_compatibility_basis="origin-country CLDR share applied to the people born in the origin country; second generation not counted; migration origin does not prove proficiency",
            data_basis="Bilateral migrant stock by country of birth, 2020 (imputed; Mendeley Data cpt3nh6jct)", source_id="SRC_MENDELEY_MIGRATION_2020",
            confidence="low", last_researched_at=RESEARCH_DATE))
        pool = DIA_POOL[code][res]
        pool[0] += compat
        pool[1].append((o, int(round(compat))))
# preserve the client's seed diaspora proxies as qualitative rows (no counts)
for sd in seeds:
    if sd["is_diaspora_proxy"].lower() == "true":
        dia_rows.append(dict(
            language_code=sd["language_code"], language_name=sd["language_name"], residence_country_iso2=sd["country_iso2"],
            origin_country_iso2="", relationship_type="diaspora_origin_proxy_seed",
            origin_citizen_population_in_residence="", population_reference="", origin_language_share_pct="",
            estimated_language_compatible_population="", confirmed_speaking_population="",
            language_compatibility_basis=sd["notes"], data_basis="Client research-queue seed; no population figure yet",
            source_id=sd["source_id"] or "SRC_CLIENT_LANGUAGE_SEEDS", confidence=sd["confidence"], last_researched_at=RESEARCH_DATE))
DIA_FIELDS = ["language_code", "language_name", "residence_country_iso2", "origin_country_iso2", "relationship_type",
              "origin_citizen_population_in_residence", "population_reference", "origin_language_share_pct",
              "estimated_language_compatible_population", "confirmed_speaking_population", "language_compatibility_basis",
              "data_basis", "source_id", "confidence", "last_researched_at"]
dia_rows.sort(key=lambda r: (r["language_code"], r["residence_country_iso2"], -(r["estimated_language_compatible_population"] or 0) if r["estimated_language_compatible_population"] != "" else 0))
write_csv("diaspora-market-opportunities.csv", dia_rows, DIA_FIELDS)

# ---------------------------------------------------------------- source register
SRC = [
    ("SRC_CLIENT_BENCHMARK_2026_11", "client_supplied", "Client-provided regional CPL, channel and sales-cycle facts", "2026-11", "", "client", "n/a", "high_authority_blended_not_country_level", "Preserved unchanged."),
    ("SRC_DXBINTERACT_SECONDARY_2026", "directional_external", "DXBinteract-derived international Dubai property-interest data as reported by Palmstone Properties and V Capital Research", "2026-06 to 2026-08", "https://www.palmstone.ae/en/insights/articles/buyer-nationalities-dubai-2026", "secondary report", "n/a", "directional", "Search/interest share, not transactions or buyers. Independent validation against DXBinteract/DLD pending."),
    ("SRC_KNIGHT_FRANK_DUBAI_2025", "external_research", "Knight Frank Destination Dubai 2025 HNWI survey", "2025-05", "https://www.knightfrank.ae/research/reports/destination-series/destination-dubai", "public summary", "n/a", "survey", "Survey of 387 HNWIs in India, UK, Saudi Arabia, East Asia. Country figures not extracted."),
    ("SRC_UN_MIGRANT_STOCK_2024", "external_official", "UN DESA International Migrant Stock 2024", "2024", "https://www.un.org/development/desa/pd/content/international-migrant-stock", "UN open data terms", "NOT_ACCESSED", "official", "Download blocked for scripted access (HTTP 403), so it is not used. Diaspora outside the EU comes from the Mendeley bilateral migrant-stock dataset instead."),
    ("SRC_EUROSTAT_MIGR_POP_2025", "external_official", "Eurostat migr_pop1ctz: population on 1 January by age, sex and citizenship", es_year, "https://ec.europa.eu/eurostat/databrowser/view/migr_pop1ctz/default/table", "CC BY 4.0", "RETRIEVED", "official", "Citizenship, not country of birth. EU/EFTA residence countries only."),
    ("SRC_OECD_MIGRATION", "external_official", "OECD migration flows and migrant population data", "", "https://www.oecd.org/en/data/datasets/overview-data-on-migration-flows-and-migrant-populations.html", "OECD terms", "NOT_ACCESSED", "official", "Listed in client source list; not used."),
    ("SRC_WB_WDI", "external_official", "World Bank World Development Indicators (API v2): SP.POP.TOTL, SP.POP.GROW, NY.GDP.PCAP.CD, NY.GDP.PCAP.PP.CD, IT.NET.USER.ZS; most recent non-empty value per country", WB_UPDATED, "https://api.worldbank.org/v2/", "CC BY 4.0", "RETRIEVED", "official", "Reference year differs by indicator and country; see *_year columns."),
    ("SRC_WB_WGI", "external_official", "World Bank Worldwide Governance Indicators: Political Stability and Absence of Violence (GOV_WGI_PV.EST)", WB_UPDATED, "https://api.worldbank.org/v2/", "CC BY 4.0", "RETRIEVED", "official", "Perception-based composite index; estimate range about -2.5 to +2.5."),
    ("SRC_KF_SECONDARY_2025", "external_research_secondary", "Knight Frank / YouGov Destination Dubai 2025 survey, as summarised in public search results and press coverage", "2025-05", "https://www.knightfrank.ae/destinationdubai", "public summaries", "RETRIEVED_SECONDARY", "survey_intention", "Figures were read from secondary summaries; the infographic PDF could not be mapped label-to-number reliably. 387 HNWI respondents. Intentions, not purchases."),
    ("SRC_BETTERHOMES_VIA_GULFNEWS_2026", "industry_secondary", "Betterhomes Dubai transaction split (end user vs investor), as reported by Gulf News", "2025", "https://gulfnews.com/business/corporate-news/leos-developments-data-links-british-demand-to-purchase-purpose-1.500676328", "press", "RETRIEVED_SECONDARY", "industry_data_unverified", "Market-wide only; sample size not stated; no nationality split."),
    ("SRC_CIA_FACTBOOK", "external_official", "CIA World Factbook, People and Society: Languages (public domain), via the factbook.json mirror; first-language / home-language percentages as published, with the reference year given in each entry", "2026-09 (mirror); entry years vary", "https://github.com/factbook/factbook.json", "public domain", "RETRIEVED", "official_statistics_dated", "Census or estimate years differ by country (often 2010-2021). Definitions differ (mother tongue, home language). Many countries publish no percentages."),
    ("SRC_CLDR_TERRITORY_INFO", "external_reference", "Unicode CLDR supplementalData territoryInfo (language population percent by territory)", cldr_version, "https://github.com/unicode-org/cldr/blob/main/common/supplemental/supplementalData.xml", "Unicode License v3", "RETRIEVED", "reference_dataset", "Does not separate first and second language; figures for some territories are old. Used as a language-reach proxy, not a census."),
    ("SRC_CENSUS_STATCAN_2021", "external_official", "Statistics Canada, 2021 Census of Population: language", "2021", "https://www150.statcan.gc.ca/n1/daily-quotidien/220817/dq220817a-eng.pdf", "open government licence", "RETRIEVED_VIA_SEARCH_SUMMARY", "official_statistics_dated", "Ability to speak versus mother tongue differ; the figure used is ability to speak."),
    ("SRC_CENSUS_ABS_2021", "external_official", "Australian Bureau of Statistics, Census 2021: language used at home", "2021", "https://www.abs.gov.au/statistics/people/people-and-communities/cultural-diversity-census/latest-release", "CC BY", "RETRIEVED_VIA_SEARCH_SUMMARY", "official_statistics_dated", "Counts language used at home only."),
    ("SRC_CENSUS_ONS_2021", "external_official", "Office for National Statistics, Census 2021 England and Wales: main language", "2021", "https://www.ons.gov.uk/", "open government licence", "RETRIEVED_VIA_SEARCH_SUMMARY", "official_statistics_dated", "Main language only, England and Wales only; undercounts speakers who list English as main language."),
    ("SRC_CENSUS_ACS_2021", "external_official", "US Census Bureau, American Community Survey 2021: language spoken at home", "2021", "https://data.census.gov/", "public domain", "RETRIEVED_VIA_SEARCH_SUMMARY", "official_statistics_dated", "Survey estimate; the figure was read from a secondary summary, not the table itself."),
    ("SRC_CENSUS_STATSNZ_2018", "external_official", "Stats NZ, 2018 Census: languages spoken", "2018", "https://www.stats.govt.nz/", "CC BY", "RETRIEVED_VIA_SEARCH_SUMMARY", "official_statistics_dated", "The 2023 census gives 49,656 for Punjabi."),
    ("SRC_EST_JOSHUAPROJECT", "external_estimate", "Joshua Project / PeopleGroups people-group population estimates", "2025", "https://joshuaproject.net/", "see site terms", "RETRIEVED_VIA_SEARCH_SUMMARY", "estimate_unverified", "Mission-research estimates of ethnic groups, not a census. Sources disagree by up to 50%."),
    ("SRC_EST_SINGAPORE_CENSUS_2010", "external_official", "Singapore Department of Statistics, Census 2010 (ethnic and religious categories)", "2010", "https://www.singstat.gov.sg/", "open data licence", "RETRIEVED_VIA_SEARCH_SUMMARY", "official_statistics_dated", "Ethnic and religious categories, not language."),
    ("SRC_EST_UAE_EXPAT_SHARES", "external_estimate", "UAE expatriate nationality shares from public summaries (Indians about 27-35%, Pakistanis about 12-17% of roughly 11 million)", "2025", "https://en.wikipedia.org/wiki/Demographics_of_the_United_Arab_Emirates", "secondary", "RETRIEVED_VIA_SEARCH_SUMMARY", "estimate_unverified", "No census by language. Language shares inside each nationality are assumptions."),
    ("SRC_EST_US_URDU_2013", "external_estimate", "United States Urdu speakers, 2013 figure quoted on Wikipedia language pages", "2013", "https://en.wikipedia.org/wiki/Geographical_distribution_of_Urdu_speakers", "secondary", "RETRIEVED_VIA_SEARCH_SUMMARY", "estimate_unverified", "Old figure from a secondary source; the current ACS table was not read."),
    ("SRC_EST_UNVERIFIED_RECALL", "external_estimate", "Order-of-magnitude figures not verified by a source in this research", "2026-11", "", "n/a", "NOT_VERIFIED", "estimate_unverified", "Included so a country with a large known community is not shown as zero. Replace with a census figure when checked."),
    ("SRC_EST_BENGALI_DIASPORA", "external_estimate", "Bengali diaspora population figures from secondary summaries (UK, US, Saudi Arabia)", "2023", "https://www.ebsco.com/research-starters/language-and-linguistics/bengali-people/", "secondary", "RETRIEVED_VIA_SEARCH_SUMMARY", "estimate_unverified", "Ethnic or population figures, not language counts."),
    ("SRC_EST_GULF_EXPAT", "external_estimate", "Pakistani and Indian expatriate populations in Saudi Arabia, Kuwait, Qatar, Oman and Bahrain (Wikipedia compilations of national and IDSA figures)", "2019-2022", "https://en.wikipedia.org/wiki/Pakistani_diaspora", "secondary", "RETRIEVED_VIA_SEARCH_SUMMARY", "estimate_unverified", "Nationals multiplied by an assumed share who use Urdu or Hindi. Years and sources differ; Oman Indian figures conflict by 2x."),
    ("SRC_EST_GLMM_RUSSIAN_UAE", "external_estimate", "Gulf Labour Markets and Migration, Migratory Flows of Russian-speaking Populations to the UAE", "2023", "https://gulfmigration.grc.net/wp-content/uploads/2023/05/Magdalena-Karolak-Migratory-flows-of-Russian-speaking-population-to-the-UAE-Final-2023-05-08.pdf", "research report", "RETRIEVED_VIA_SEARCH_SUMMARY", "estimate_unverified", "No official breakdown by language; estimates differ widely."),
    ("SRC_CENSUS_US_2010", "external_official", "US Census 2010 language spoken at home", "2010", "https://www.census.gov/", "public domain", "RETRIEVED_VIA_SEARCH_SUMMARY", "official_statistics_dated", "Old; use the latest ACS table when verified."),
    ("SRC_CENSUS_CYPRUS_2021", "external_official", "Cyprus census 2021 language figures (via Wikipedia table)", "2021", "https://en.wikipedia.org/wiki/Geographical_distribution_of_Russian_speakers", "secondary", "RETRIEVED_VIA_SEARCH_SUMMARY", "official_statistics_dated", "Read from a secondary table."),
    ("SRC_EST_US_CHINESE", "external_estimate", "US Chinese speakers, advocacy summary of Census data (AAJC) and Census Bureau 2019 report", "2021", "https://aajc.medium.com/new-census-data-on-language-lift-up-the-importance-of-language-access-for-asian-americans-5ed1364089d5", "secondary", "RETRIEVED_VIA_SEARCH_SUMMARY", "estimate_unverified", "All Chinese varieties; Mandarin alone not separated."),
    ("SRC_MENDELEY_MIGRATION_2020", "external_research_dataset", "Annual bilateral migrant stocks by country of birth, 1960-2022 (imputed), Mendeley Data cpt3nh6jct, file migration_imputed_RIKS_dec2021.csv, year 2020", "2020", "https://data.mendeley.com/datasets/cpt3nh6jct/2", "open research data licence (check the dataset page)", "RETRIEVED", "academic_imputation", "Foreign-born people only (second generation not counted); values are imputed from census and register data, so they are modelled, not counted. Used for destinations Eurostat does not cover."),
    ("SRC_WB_MOTIVATION_INDICATORS", "external_official", "World Bank indicators behind the investment-motivation estimate: stock market capitalisation (% of GDP), personal remittances received (% of GDP), outward investment, consumer price inflation and exchange-rate change", WB_UPDATED, "https://api.worldbank.org/v2/", "CC BY 4.0", "RETRIEVED", "official", "Used as proxies for the wish to diversify wealth abroad. A proxy for motive, not evidence that anyone buys Dubai property."),
    ("SRC_BROKER_DLD_NATIONALITY_2025", "industry_secondary", "Brokerage analyses of Dubai Land Department buyer nationalities, 2024-2025 (Benhams, Dubai Tax and Property, Smart Zones, Hanok International, Alsro and others)", "2024-2025", "https://www.benhams.ae/news/property-advice/whos-buying-in-dubai-2025-recap/", "published blog and market reports", "RETRIEVED_VIA_SEARCH_SUMMARY", "industry_data_unverified", "Shares quoted by brokers (India about 22%, UK about 17%, China about 14%, Saudi Arabia about 11%, Russia about 9%). The Dubai Land Department does not publish exact nationality percentages, so these vary by source and period."),
    ("SRC_WB_CPL_MODEL_INPUTS", "external_official", "World Bank GDP per capita (PPP) used to scale the modelled cost per lead by country wealth", WB_UPDATED, "https://api.worldbank.org/v2/", "CC BY 4.0", "RETRIEVED", "official", "The modelled CPL is an estimate anchored on the client's regional benchmarks, not a measured cost."),
    ("SRC_COUNTRY_OPPORTUNITY_SHEET", "internal_model", "Country opportunity scores: six dimensions (Dubai demand, financial capacity, motivations, capital access, reachable audience, acquisition economics) with editable weights and client-sales boosts", RESEARCH_DATE, "", "internal", "n/a", "model_output", "Built from the sources above. Missing data counts as a cautious 40 and lowers the score. A model of potential, not a forecast of sales."),
    ("SRC_IMF_CAPITAL_CONTROLS", "external_research_gap", "IMF Annual Report on Exchange Arrangements and Exchange Restrictions (capital controls by country)", "", "https://www.elibrary-areaer.imf.org/", "IMF terms", "NOT_ACCESSED", "gap", "Capital-access scores for countries with controls, sanctions or currency stress are my judgement from general knowledge, not read from this report."),
    ("SRC_WEALTH_REPORTS", "external_research_gap", "Wealth reports with millionaire and HNWI counts by country (Knight Frank Wealth Report, UBS Global Wealth Report, Henley Private Wealth Migration)", "", "https://www.knightfrank.com/wealthreport", "published reports, redistribution terms apply", "NOT_ACCESSED", "gap", "Financial capacity currently uses GDP per head, purchasing power and affluent-audience estimates. Real millionaire counts would be a better signal."),
    ("SRC_ETHNOLOGUE", "external_research_gap", "Ethnologue language population estimates by country", "", "https://www.ethnologue.com/", "paid", "NOT_ACCESSED", "gap", "Would give speaker numbers for more languages and countries than CLDR and the census figures used."),
    ("SRC_ISO_639", "standard", "ISO 639-1 / ISO 639-3 language codes", "", "https://iso639-3.sil.org/", "public code list", "n/a", "standard", "Codes only."),
    ("SRC_USER_OVERRIDE", "client_supplied", "CPL values entered by you in cpl-overrides.csv", RESEARCH_DATE, "", "client", "n/a", "user_supplied", "Used exactly as entered. Not verified by this project."),
    ("SRC_CLIENT_LANGUAGE_SEEDS", "client_supplied", "Client language-market research queue (language-market-seeds.csv)", "2026-11", "", "client", "n/a", "seed", "Qualitative seeds without counts."),
    ("SRC_DLD_NATIONALITY", "official_research_gap", "Dubai Land Department / Dubai Pulse / DXBinteract buyer-nationality transaction series", "", "https://dubailand.gov.ae/", "see site terms", "NOT_ACCESSED", "gap", "Research gap: no verified nationality-level transaction counts were obtained."),
    ("SRC_PROPERTY_CONSULTANCIES", "external_research_gap", "Knight Frank, CBRE, JLL, Savills buyer-origin research", "", "", "mostly paid / restricted", "NOT_ACCESSED", "gap", "Not scraped. Only the client-listed Knight Frank public summary is referenced."),
    ("SRC_GOOGLE_KEYWORD_PLANNER", "advertising_research_gap", "Google Ads Keyword Planner / API", "", "https://developers.google.com/google-ads/api/docs/keyword-planning/overview", "requires Google Ads API access", "NOT_ACCESSED", "gap", "Needs a Google Ads developer token and OAuth. Volumes/CPC would be supporting signals, never CPL."),
    ("SRC_EF_EPI", "external_research_gap", "EF English Proficiency Index", "", "https://www.ef.com/epi/", "published report, redistribution terms apply", "NOT_ACCESSED", "gap", "English proficiency band left unavailable rather than recalled from memory."),
]
write_csv("research-source-register.csv", [dict(zip(
    ["source_id", "evidence_type", "label", "reference_period", "url", "licence_or_access", "access_status", "reliability_class", "limitations"], s)) for s in SRC],
    ["source_id", "evidence_type", "label", "reference_period", "url", "licence_or_access", "access_status", "reliability_class", "limitations"])

# ---------------------------------------------------------------- sources page data (for the dashboard)
USED_FOR = {
    "SRC_CLIENT_BENCHMARK_2026_11": "Regional cost-per-lead benchmarks, channel rates and the 19-case sales timing. The anchor for every cost per lead.",
    "SRC_DXBINTERACT_SECONDARY_2026": "Dubai demand: each country's share of international Dubai property searches (top countries only).",
    "SRC_KNIGHT_FRANK_DUBAI_2025": "Background on buyer intent (HNWI survey). Not turned into country scores.",
    "SRC_UN_MIGRANT_STOCK_2024": "Would have given diaspora numbers outside Europe. Not used (download blocked).",
    "SRC_EUROSTAT_MIGR_POP_2025": "Diaspora communities in Europe: people by citizenship, used with each origin country's language share.",
    "SRC_OECD_MIGRATION": "Not used.",
    "SRC_WB_WDI": "Population, wealth per head (GDP per capita and PPP) and internet use: purchasing power, reachable audience and the modelled cost per lead.",
    "SRC_WB_WGI": "Political stability, one input to capital access (cross-border readiness).",
    "SRC_KF_SECONDARY_2025": "Background on buyer intent, read from press summaries.",
    "SRC_BETTERHOMES_VIA_GULFNEWS_2026": "Background only: end-user versus investor share of Dubai buyers.",
    "SRC_CIA_FACTBOOK": "First-language percentages by country, used to fill language data where CLDR is thin.",
    "SRC_CLDR_TERRITORY_INFO": "Share of each country's population that uses each language: the main language reach figure.",
    "SRC_CENSUS_STATCAN_2021": "Punjabi speakers in Canada (language reach).",
    "SRC_CENSUS_ABS_2021": "Punjabi, Hindi, Urdu, Arabic and Bengali speakers in Australia (language reach).",
    "SRC_CENSUS_ONS_2021": "Punjabi, Urdu, Arabic and Chinese speakers in England and Wales (language reach).",
    "SRC_CENSUS_ACS_2021": "Punjabi speakers in the US (language reach).",
    "SRC_CENSUS_STATSNZ_2018": "Punjabi speakers in New Zealand (language reach).",
    "SRC_EST_JOSHUAPROJECT": "Punjabi communities in the UAE and Malaysia (language reach, rough).",
    "SRC_EST_SINGAPORE_CENSUS_2010": "Punjabi communities in Singapore (language reach, rough).",
    "SRC_EST_UAE_EXPAT_SHARES": "Hindi, Urdu and Punjabi in the UAE, from expatriate nationality shares (language reach, rough).",
    "SRC_EST_US_URDU_2013": "Urdu speakers in the US (language reach, old figure).",
    "SRC_EST_UNVERIFIED_RECALL": "A few large communities with no source found (for example Arabic in France and the US). Placeholders to replace.",
    "SRC_EST_BENGALI_DIASPORA": "Bengali communities in the UK, US and Saudi Arabia (language reach, rough).",
    "SRC_EST_GULF_EXPAT": "Hindi and Urdu in Saudi Arabia, Kuwait, Qatar, Oman and Bahrain, from expatriate counts (language reach, rough).",
    "SRC_EST_GLMM_RUSSIAN_UAE": "Russian speakers in the UAE (language reach).",
    "SRC_CENSUS_US_2010": "Russian speakers in the US (language reach, old figure).",
    "SRC_CENSUS_CYPRUS_2021": "Russian speakers in Cyprus (language reach).",
    "SRC_EST_US_CHINESE": "Chinese speakers in the US (language reach, rough).",
    "SRC_MENDELEY_MIGRATION_2020": "Diaspora communities outside Europe (UK, US, Canada, Australia, Gulf and more): people by country of birth, used with each origin's language share.",
    "SRC_ISO_639": "Language codes and names.",
    "SRC_USER_OVERRIDE": "Cost-per-lead figures you typed into the CPL sheet. Used exactly as entered.",
    "SRC_CLIENT_LANGUAGE_SEEDS": "Your language and market research queue (qualitative).",
    "SRC_DLD_NATIONALITY": "Would give verified buyer nationalities. Not available yet.",
    "SRC_PROPERTY_CONSULTANCIES": "Would give buyer-origin research. Not used.",
    "SRC_GOOGLE_KEYWORD_PLANNER": "Would give search volumes and costs per country. Not connected yet.",
    "SRC_EF_EPI": "Would give English proficiency by country. Not used.",
    "SRC_WB_MOTIVATION_INDICATORS": "Investment motivations: stock market size, remittances, outward investment, inflation and currency change.",
    "SRC_BROKER_DLD_NATIONALITY_2025": "Dubai demand for countries with no search data: reported share of buyers by nationality.",
    "SRC_WB_CPL_MODEL_INPUTS": "Scaling the modelled cost per lead by country wealth.",
    "SRC_COUNTRY_OPPORTUNITY_SHEET": "The country scores behind Market comparison, the map colours and the close rate for each market.",
    "SRC_IMF_CAPITAL_CONTROLS": "Would back the capital-access scores. Not used; they are judgement for now.",
    "SRC_WEALTH_REPORTS": "Would give millionaire counts for financial capacity. Not used yet.",
    "SRC_ETHNOLOGUE": "Would give speaker counts for more languages. Not used.",
}


def _category(s):
    ev, status = s[1], s[6]
    if status == "NOT_ACCESSED" or ev.endswith("_gap"):
        return "gap"
    if ev == "client_supplied":
        return "client"
    if ev == "external_official":
        return "official"
    if ev == "external_estimate":
        return "estimate"
    return "research"


_sources = []
for s in SRC:
    cat = _category(s)
    _sources.append(dict(
        id=s[0], category=cat, label=s[2], period=s[3], url=s[4], access=s[5], status=s[6], reliability=s[7],
        limitation=s[8], used_for=USED_FOR.get(s[0], ""), used=cat != "gap"))
_order = {"client": 0, "official": 1, "research": 2, "estimate": 3, "gap": 4}
_sources.sort(key=lambda d: (_order[d["category"]], d["label"]))
write_json(os.path.join(APP, "sources.json"), _sources)

# ---------------------------------------------------------------- client input template (header only)
write_csv("client-cpl-input-template.csv", [], [
    "country", "country_iso2", "region", "platform", "campaign_type", "campaign_maturity", "language", "spend", "leads", "cpl",
    "start_date", "end_date", "currency", "raw_lead_count", "qualified_lead_count", "sales_count", "notes"])

# ---------------------------------------------------------------- update master status columns (client columns untouched)
CLIENT_COLS = {"client_benchmark_region", "client_cpl_low_aed", "client_cpl_high_aed", "client_cpl_relation", "client_cpl_scope",
               "dxbinteract_reported_rank", "dxbinteract_reported_interest_share_pct", "demand_signal_definition", "demand_signal_period"}
for r in master:
    iso = r["country_iso2"]
    c = CPL[iso]
    if c["cpl_status"] == "modelled":
        r["country_specific_cpl_status"] = "modelled_estimate"
    elif c["cpl_status"] == "manual_research_required":
        r["country_specific_cpl_status"] = "manual_research_required"
    r["language_profile_status"] = "cldr_distribution_available" if LANG_PCT.get(iso) else "research_pending"
    r["last_researched_at"] = RESEARCH_DATE
    ids = [x for x in r["source_ids"].split(";") if x]
    for sid in ("SRC_WB_WDI", "SRC_CLDR_TERRITORY_INFO") + (("SRC_CLIENT_BENCHMARK_2026_11",) if c["cpl_status"] == "modelled" else ()):
        if sid not in ids:
            ids.append(sid)
    r["source_ids"] = ";".join(ids)
    if r["research_notes"].startswith("Worldwide country registry row only"):
        r["research_notes"] = "Registry row enriched 2026-11-06: open indicators, modelled CPL range and language distribution added in the intel datasets. Dubai buyer-origin and Dubai-specific demand remain research gaps unless a client or DXBinteract signal is shown."
write_csv("country-market-master.csv", master, master_fields)

# ---------------------------------------------------------------- investment conditions layer
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import investment_intel
INV_APP, INV_COVERAGE = investment_intel.run(dict(RAW=RAW, DATA=DATA, REG=REG, sig=sig, write_csv=write_csv, num=num))

def cpl_num(v):
    """CPL cells may be text (a row kept from the CSV) or numbers (a freshly built row): always emit a number or null."""
    if v is None or str(v).strip() == "":
        return None
    return float(str(v).replace(",", ""))


# ---------------------------------------------------------------- compact app JSON
app_c = {}
for iso, r in REG.items():
    s, c = sig[iso], CPL[iso]
    app_c[iso] = dict(
        n=r["country_name"], rg=r["world_region"], pop=s["pop"], gdp=s["gdp_ppp"], net=s["net"],
        ip=num(s["invest_potential"], 1), pp=num(s["purchasing_power"], 1),
        dx=float(r["dxbinteract_reported_interest_share_pct"]) if r["dxbinteract_reported_interest_share_pct"] else None,
        dxr=int(r["dxbinteract_reported_rank"]) if r["dxbinteract_reported_rank"] else None,
        cs=("regional_proxy" if c["cpl_status"] == "user_override" else c["cpl_status"]), ov=(c["cpl_status"] == "user_override"), cr=c["cpl_relation"] or None,
        cl=cpl_num(c["cpl_low_aed"]),
        cb=cpl_num(c["cpl_base_aed"]),
        ch=cpl_num(c["cpl_high_aed"]),
        cc=c["confidence"], ad=iso in RESTRICTED_AD_MARKETS,
        ad_note=RESTRICTED_AD_MARKETS.get(iso),
        **INV_APP[iso],
    )
write_json(os.path.join(APP, "countries.json"), app_c)
write_json(os.path.join(APP, "language-share.json"), {iso: v for iso, v in LANG_PCT.items() if v})
write_json(os.path.join(APP, "diaspora.json"), {
    code: {res: [int(round(p[0])), sorted(p[1], key=lambda x: -x[1])[:5]] for res, p in by.items()}
    for code, by in DIA_POOL.items()})

# ---------------------------------------------------------------- coverage report
n = len(REG)
st = defaultdict(int)
for c in cpl_rows:
    st[c["cpl_status"]] += 1
with_dxb = [i for i, r in REG.items() if r["dxbinteract_reported_rank"]]
lang_cov = [i for i in REG if LANG_PCT.get(i)]
wb_cov = {k: sum(1 for i in REG if i in v) for k, v in WB.items()}
dia_pairs = [r for r in dia_rows if r["relationship_type"] == "diaspora_proxy_by_citizenship"]
report = dict(
    model_version=MODEL_VERSION, research_date=RESEARCH_DATE, registry_countries_and_territories=n,
    indicators=dict(world_bank_last_updated=WB_UPDATED, coverage_by_indicator=wb_cov,
                    countries_with_investment_potential_index=sum(1 for s in sig.values() if s["invest_potential"] is not None)),
    dubai_demand=dict(
        countries_with_search_interest_signal_secondary_dxbinteract=len(with_dxb),
        countries_with_verified_transaction_buyer_origin=0,
        countries_with_survey_coverage_noted=len(SURVEY_NOTES),
        note="No nationality-level DLD transaction series was accessed. Search interest is not purchases."),
    cpl=dict(measured_country_specific=0, regional_proxy=st["regional_proxy"], user_overrides=st["user_override"], modelled=st["modelled"],
             modelled_under_client_ceiling=sum(1 for c in cpl_rows if c["cpl_status"] == "modelled" and c["cpl_relation"] == "at_most"),
             manual_research_required=st["manual_research_required"],
             manual_research_countries=[c["country_iso2"] for c in cpl_rows if c["cpl_status"] == "manual_research_required"],
             countries_with_learning_cpl=len(LEARNING)),
    language=dict(languages_in_catalog=len(CATALOG), countries_with_language_distribution=len(lang_cov),
                  countries_without_language_distribution=n - len(lang_cov),
                  distribution_rows=len(dist_rows), first_vs_second_language_split="unavailable_for_all",
                  native_speaker_counts="unavailable_for_all", english_proficiency_index="unavailable_for_all"),
    diaspora=dict(eurostat_citizenship_pairs=len(dia_pairs), languages_with_computed_pools=len(DIA_POOL),
                  residence_countries_covered="EU/EFTA only (Eurostat)",
                  not_covered="UK, US, Canada, Australia, Gulf states and other non-EU residence countries (needs UN DESA or national statistics import)"),
    investment_conditions=INV_COVERAGE,
    language_profiles=LANG_STATS,
    advertising=dict(meta_cpm_rows=0, google_cpc_rows=0, keyword_demand_rows=0,
                     restricted_ad_markets_flagged=sorted(RESTRICTED_AD_MARKETS)),
    sources_used=[s[0] for s in SRC if s[6] in ("RETRIEVED", "n/a")],
    sources_not_accessed=[s[0] for s in SRC if s[6] == "NOT_ACCESSED"],
)
write_json(os.path.join(DATA, "data-coverage-report.json"), report)
print(json.dumps(report, indent=1)[:3500])
for w in OVERRIDE_WARNINGS + HAND_EDIT_WARNINGS:
    print("OVERRIDE WARNING:", w)
print("overrides applied:", len(OVERRIDES))
print("your edits kept:", len([r for r in cpl_rows if r["cpl_status"] == "user_override"]))
print("signals", len(signal_rows), "cpl", len(cpl_rows), "dist", len(dist_rows), "dia", len(dia_rows))

# ---------------------------------------------------------------- scoring config copy for the backend
import shutil
shutil.copyfile(os.path.join(DATA, "market-scoring-config.json"), os.path.join(APP, "scoring-config.json"))
