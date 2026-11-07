"""Investment-conditions layer, called from build_datasets.py.

Adds, per country, dated indicators of investment capacity and current conditions from the World Bank API,
a modelled affluent-population proxy, Dubai survey evidence (with exact definitions and sample), and the
documented-only buyer-motivation table.  Stale indicators are dropped, not shown as current intelligence.
"""

import csv
import json
import math
import os
import statistics
from statistics import NormalDist

RESEARCH_DATE = "2026-11-06"
CURRENT_YEAR = 2026
MIN_YEAR_CONDITIONS = 2024  # growth, inflation, stability, FX: older than this is not "current"
MIN_YEAR_STRUCTURAL = 2022  # inequality, credit depth, outbound FDI move slowly

SANCTIONS_OR_CONTROLS = {
    "RU": ("sanctions_possible", "Broad international sanctions since 2022 can block payments and property purchases"),
    "IR": ("sanctions_possible", "Comprehensive sanctions regime"),
    "KP": ("sanctions_possible", "Comprehensive sanctions regime"),
    "CU": ("sanctions_possible", "US sanctions complicate international payments"),
    "SY": ("sanctions_possible", "Sanctions regime"),
    "BY": ("sanctions_possible", "Sanctions on the state and financial sector"),
    "CN": ("capital_controls_reported", "Annual individual foreign-exchange limits restrict overseas property purchases"),
}
# Compiled from general knowledge; NOT verified against a primary source. Needs confirmation.

AFFLUENT_INCOME_THRESHOLD_PPP = 60_000  # per person per year, international $
WEALTH_SKEW_UPLIFT = 0.20  # income Gini understates how concentrated wealth is; add 20 Gini points (assumption)
WEALTH_GINI_MIN, WEALTH_GINI_MAX = 0.55, 0.85


def wb_series(raw, name):
    d = json.load(open(os.path.join(raw, name), encoding="utf-8"))[1]
    out = {}
    for r in d:
        iso = r["country"]["id"]
        if r["value"] is not None and iso:
            out[iso] = (r["value"], int(r["date"]))
    return out


def pct_rank(values):
    items = sorted(values.items(), key=lambda kv: kv[1])
    n = len(items)
    return {k: (100.0 * i / (n - 1) if n > 1 else 50.0) for i, (k, _) in enumerate(items)}


def clamp01(x):
    return max(0.0, min(1.0, x))


def run(ctx):
    RAW, DATA, REG, sig = ctx["RAW"], ctx["DATA"], ctx["REG"], ctx["sig"]
    write_csv = ctx["write_csv"]

    def fresh(series, min_year):
        return {k: v for k, v in series.items() if k in REG and v[1] >= min_year}

    growth = fresh(wb_series(RAW, "wb_NY.GDP.MKTP.KD.ZG.json"), MIN_YEAR_CONDITIONS)
    infl = fresh(wb_series(RAW, "wb_FP.CPI.TOTL.ZG.json"), MIN_YEAR_CONDITIONS)
    stab = fresh(wb_series(RAW, "wb_pv.json"), MIN_YEAR_CONDITIONS)
    ofdi = fresh(wb_series(RAW, "wb_BM.KLT.DINV.WD.GD.ZS.json"), MIN_YEAR_STRUCTURAL)
    cred = fresh(wb_series(RAW, "wb_FS.AST.PRVT.GD.ZS.json"), MIN_YEAR_STRUCTURAL)
    gini = fresh(wb_series(RAW, "wb_SI.POV.GINI.json"), 2015)
    cons = wb_series(RAW, "wb_NE.CON.PRVT.PP.CD.json")

    # FX: year-on-year change of the official LCU-per-USD rate (positive = local currency weakened)
    fxraw = json.load(open(os.path.join(RAW, "wb_fx.json"), encoding="utf-8"))[1]
    by = {}
    for r in fxraw:
        iso = r["country"]["id"]
        if iso in REG and r["value"] is not None:
            by.setdefault(iso, {})[int(r["date"])] = r["value"]
    fx = {}
    for iso, ys in by.items():
        yrs = sorted(ys)
        if len(yrs) >= 2 and yrs[-1] >= MIN_YEAR_CONDITIONS and yrs[-1] - yrs[-2] == 1 and ys[yrs[-2]] > 0:
            fx[iso] = (ys[yrs[-1]] / ys[yrs[-2]] - 1.0, yrs[-1])

    # Gini fallback: median of the country's World Bank income group, flagged as a fallback
    income = {i: s["income"] for i, s in sig.items()}
    gini_by_group = {}
    for iso, (g, _) in gini.items():
        gini_by_group.setdefault(income.get(iso), []).append(g)
    gini_group_median = {k: statistics.median(v) for k, v in gini_by_group.items() if k and v}

    # Affluent population proxy: lognormal income distribution with GDP per capita (PPP) as the mean and a
    # wealth-skewed Gini. Survey (income or consumption) Ginis understate wealth concentration, so a fixed
    # uplift is added and clamped. Same rule for every country; no country is treated specially.
    nd = NormalDist()
    aff = {}
    for iso, s in sig.items():
        pop = s["pop"]
        mean_pc = s["gdp_ppp"]
        if not pop or not mean_pc or (s["gdp_year"] or 0) < MIN_YEAR_STRUCTURAL:
            continue
        g, gy, gbasis = None, None, ""
        if iso in gini:
            g, gy = gini[iso][0] / 100.0, gini[iso][1]
            gbasis = "country_gini"
        elif income.get(iso) in gini_group_median:
            g, gy = gini_group_median[income[iso]] / 100.0, None
            gbasis = "income_group_median_gini_fallback"
        if g is None or mean_pc <= 0:
            continue
        g_wealth = min(WEALTH_GINI_MAX, max(WEALTH_GINI_MIN, g + WEALTH_SKEW_UPLIFT))
        sigma = math.sqrt(2) * nd.inv_cdf((g_wealth + 1) / 2)
        mu = math.log(mean_pc) - sigma**2 / 2
        share = 1 - nd.cdf((math.log(AFFLUENT_INCOME_THRESHOLD_PPP) - mu) / sigma)
        aff[iso] = dict(mean_pc=mean_pc, gini=g * 100, gini_year=gy, basis=gbasis, share=share, count=share * pop)

    # Component indices (0-100) ------------------------------------------------
    pr_ofdi = pct_rank({k: v[0] for k, v in ofdi.items()})
    pr_cred = pct_rank({k: v[0] for k, v in cred.items()})

    def capability(iso):
        parts = [p for p in (pr_ofdi.get(iso), pr_cred.get(iso)) if p is not None]
        if not parts:
            return None
        v = sum(parts) / len(parts)
        flag = SANCTIONS_OR_CONTROLS.get(iso)
        if flag:
            v *= 0.5
        return v

    def conditions(iso):
        parts = []
        if iso in growth:
            parts.append(clamp01((growth[iso][0] + 2) / 8))  # -2%..6% -> 0..1
        if iso in infl:
            i = max(infl[iso][0], 0.0)
            parts.append(clamp01(1 - math.log1p(max(0.0, i - 2.0)) / math.log1p(28)))  # <=2% best, >=30% worst
        if iso in stab:
            parts.append(clamp01((stab[iso][0] + 2.5) / 5))
        if iso in fx:
            parts.append(clamp01(1 - abs(fx[iso][0]) / 0.25))  # +-25% move = worst
        if len(parts) < 2:
            return None
        v = 100 * sum(parts) / len(parts)
        if iso in SANCTIONS_OR_CONTROLS and SANCTIONS_OR_CONTROLS[iso][0] == "sanctions_possible":
            v *= 0.5
        return v

    rows, app = [], {}
    for iso, r in REG.items():
        a = aff.get(iso)
        flag = SANCTIONS_OR_CONTROLS.get(iso)
        cap, cond = capability(iso), conditions(iso)
        rows.append(dict(
            country_iso2=iso, country_name=r["country_name"],
            gdp_growth_pct=ctx["num"](growth.get(iso, (None,))[0], 2), gdp_growth_year=growth.get(iso, (None, None))[1],
            inflation_pct=ctx["num"](infl.get(iso, (None,))[0], 2), inflation_year=infl.get(iso, (None, None))[1],
            political_stability_wgi=ctx["num"](stab.get(iso, (None,))[0], 2), political_stability_year=stab.get(iso, (None, None))[1],
            currency_change_vs_usd_pct=ctx["num"]((fx[iso][0] * 100) if iso in fx else None, 2), currency_change_year=fx.get(iso, (None, None))[1],
            outbound_fdi_pct_gdp=ctx["num"](ofdi.get(iso, (None,))[0], 2), outbound_fdi_year=ofdi.get(iso, (None, None))[1],
            private_credit_pct_gdp=ctx["num"](cred.get(iso, (None,))[0], 1), private_credit_year=cred.get(iso, (None, None))[1],
            gini=ctx["num"](a["gini"], 1) if a else "", gini_year=a["gini_year"] if a and a["gini_year"] else "",
            gini_basis=a["basis"] if a else "",
            mean_income_per_capita_ppp_used=ctx["num"](a["mean_pc"], 0) if a else "",
            affluent_share_pct_modelled=ctx["num"](a["share"] * 100, 3) if a else "",
            affluent_population_modelled=int(round(a["count"])) if a else "",
            affluent_definition=f"Modelled: people with annual income above international ${AFFLUENT_INCOME_THRESHOLD_PPP:,} (PPP), from a lognormal fit to GDP per capita (PPP) and a wealth-skewed Gini (survey Gini + {int(WEALTH_SKEW_UPLIFT*100)} points, clamped {WEALTH_GINI_MIN}-{WEALTH_GINI_MAX}). A proxy, not a wealth or HNWI count; the same rule for every country." if a else "",
            investment_capability_index_0_100=ctx["num"](cap, 1), conditions_index_0_100=ctx["num"](cond, 1),
            capital_movement_flag=flag[0] if flag else "none_recorded", capital_movement_note=flag[1] if flag else "",
            capital_movement_evidence="general_knowledge_unverified" if flag else "not_assessed_IMF_AREAER_not_accessed",
            hnwi_population="", hnwi_status="unavailable_paid_or_restricted_source",
            international_property_activity="", international_property_status="unavailable_not_collected",
            sources="SRC_WB_WDI;SRC_WB_WGI", evidence_type="official_statistics_with_modelled_indices", confidence="low" if (a and a["basis"].endswith("fallback")) or not a else "medium",
            last_researched_at=RESEARCH_DATE,
        ))
        app[iso] = dict(
            gr=growth.get(iso, (None,))[0], inf=infl.get(iso, (None,))[0], ps=stab.get(iso, (None,))[0],
            fx=fx[iso][0] if iso in fx else None, ofdi=ofdi.get(iso, (None,))[0], cred=cred.get(iso, (None,))[0],
            aff=a["count"] if a else None, affs=a["share"] if a else None,
            ic=ctx["num"](cap, 1), ci=ctx["num"](cond, 1), cm=flag[0] if flag else None,
        )
    fields = list(rows[0].keys())
    write_csv("country-investment-conditions.csv", rows, fields)

    # Dubai survey evidence: secondary summaries of Knight Frank / YouGov 2025. Definitions kept exact.
    sample = "387 HNWI respondents (UK, India, Saudi Arabia, East Asia: China, Hong Kong, Singapore); average net worth about US$22m; fieldwork by YouGov"
    survey = [
        ("SA", "saudi_arabia", "intent_to_purchase_UAE_property_in_2025", 66, "Share of Saudi HNWI respondents planning a UAE property purchase in 2025", "SRC_KF_SECONDARY_2025"),
        ("CN;HK;SG", "east_asia", "intent_to_purchase_UAE_property_in_2025", 17, "Share of East Asian HNWI respondents (China, Hong Kong, Singapore) wanting a UAE purchase in 2025; regional, not per country", "SRC_KF_SECONDARY_2025"),
        ("GB", "united_kingdom", "dubai_preferred_emirate_among_considering_UAE", 74, "Share of British HNWI respondents who are considering a UAE property acquisition and named Dubai as the preferred emirate", "SRC_KF_SECONDARY_2025"),
        ("ALL", "all_respondents", "intent_to_invest_in_UAE_real_estate_this_year", 33, "Share of all survey respondents intending to invest in UAE real estate this year", "SRC_KF_SECONDARY_2025"),
        ("ALL", "all_respondents", "residential_named_most_preferred_asset_class", 68, "Share of the sample naming UAE residential as the most preferred asset class target", "SRC_KF_SECONDARY_2025"),
    ]
    write_csv("dubai-survey-evidence.csv", [dict(
        country_iso2=c, respondent_group=g, metric=m, value_pct=v, definition=d, sample=sample, survey_year=2025,
        evidence_type="survey_intention_not_transactions", source_id=s,
        limitation="Secondary reporting of a Knight Frank/YouGov HNWI survey; HNWI intentions, not purchases; not representative of all residents or of the advertising audience; per-country samples are small.",
        last_researched_at=RESEARCH_DATE) for c, g, m, v, d, s in survey],
        ["country_iso2", "respondent_group", "metric", "value_pct", "definition", "sample", "survey_year", "evidence_type", "source_id", "limitation", "last_researched_at"])

    # Buyer motivations: only what documents support. Not assigned by nationality.
    mot_fields = ["country_iso2", "motivation_category", "evidence_status", "evidence_summary", "sample_or_scope", "source_id", "reference_year", "confidence", "last_researched_at"]
    mot = [
        dict(country_iso2="ALL", motivation_category="lifestyle_and_relocation", evidence_status="documented_market_wide",
             evidence_summary="Access to green space and parks was the top consideration for HNWIs eyeing a Dubai purchase in the 2024 survey edition; reported in secondary coverage and not re-verified for 2025.",
             sample_or_scope="Global HNWI survey sample; not split by nationality in the sources reviewed", source_id="SRC_KF_SECONDARY_2025", reference_year=2024, confidence="low", last_researched_at=RESEARCH_DATE),
        dict(country_iso2="ALL", motivation_category="capital_appreciation", evidence_status="documented_market_wide",
             evidence_summary="36% of HNWIs believed a branded residential purchase would appreciate 5-10% in its first year (2024 edition, secondary report). Expectation, not realised returns.",
             sample_or_scope="Global HNWI survey sample; branded residences only", source_id="SRC_KF_SECONDARY_2025", reference_year=2024, confidence="low", last_researched_at=RESEARCH_DATE),
        dict(country_iso2="ALL", motivation_category="portfolio_expansion_diversification", evidence_status="documented_market_wide_dated",
             evidence_summary="Expanding a property portfolio was the main reason for US$10m+ respondents in the inaugural survey edition; dated and secondary.",
             sample_or_scope="Respondents with net worth above US$10m, earlier edition", source_id="SRC_KF_SECONDARY_2025", reference_year=2023, confidence="low", last_researched_at=RESEARCH_DATE),
        dict(country_iso2="ALL", motivation_category="end_use_vs_investment", evidence_status="documented_transaction_split_market_wide",
             evidence_summary="Betterhomes full-year 2025: 43% of Dubai transactions attributed to end users, 57% to investors. Market-wide; no nationality split published in the source reviewed.",
             sample_or_scope="Betterhomes Dubai transactions, sample size not stated", source_id="SRC_BETTERHOMES_VIA_GULFNEWS_2026", reference_year=2025, confidence="low", last_researched_at=RESEARCH_DATE),
    ]
    write_csv("country-buyer-motivations.csv", mot, mot_fields)
    return app, dict(
        countries_with_current_growth=len(growth), countries_with_current_inflation=len(infl),
        countries_with_political_stability=len(stab), countries_with_currency_change=len(fx),
        countries_with_outbound_fdi=len(ofdi), countries_with_private_credit=len(cred),
        countries_with_affluent_proxy=len(aff),
        affluent_proxy_countries_using_group_gini_fallback=sum(1 for a in aff.values() if a["basis"].endswith("fallback")),
        countries_with_capability_index=sum(1 for r in rows if r["investment_capability_index_0_100"] != ""),
        countries_with_conditions_index=sum(1 for r in rows if r["conditions_index_0_100"] != ""),
        country_specific_motivation_rows=0, market_wide_motivation_rows=len(mot),
        survey_evidence_rows=len(survey),
    )
