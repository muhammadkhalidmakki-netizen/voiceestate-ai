// Tests for the Market Planning calculation layer (src/lib/market-planning).
// Node strips the TypeScript types at import time (Node 22.6+ / 24).
import test from "node:test";
import assert from "node:assert/strict";
import {
  addMarketShare,
  budgetPresets,
  computePlan,
  equalShares,
  leadPresets,
  leadsPerAed,
  removeMarketShare,
  setMarketShare,
  splitChannels,
  syncedAmount,
  validateAmount,
} from "../src/lib/market-planning/model.ts";
import { discoverMarkets, marketCoverage } from "../src/lib/market-planning/coverage.ts";

const point = (v) => ({ lo: v, hi: v, relation: "point", source: "client-regional-proxy" });
const atMost = (v) => ({ lo: null, hi: v, relation: "at_most", source: "client-regional-proxy" });
const range = (lo, hi) => ({ lo, hi, relation: "range", source: "client-regional-proxy" });
const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
const LEARNING = { FR: 120, DE: 120, NL: 120 };

test("budget to leads for one point CPL (Europe AED 12,000 at AED 50 = 240 leads)", () => {
  const r = computePlan({ mode: "budget", amount: 12000, markets: [{ iso2: "FR", share: 1, cpl: point(50) }], learning: {} });
  near(r.leads.lo, 240);
  near(r.leads.hi, 240);
  near(r.blendedCpl.lo, 50);
});

test("lead target to budget for every benchmark point", () => {
  for (const [cpl, want] of [[50, 5000], [70, 7000], [120, 12000]]) {
    const r = computePlan({ mode: "leads", amount: 100, markets: [{ iso2: "XX", share: 1, cpl: point(cpl) }], learning: {} });
    near(r.budget.hi, want);
    near(r.budget.lo, want);
  }
});

test("budget and lead modes are consistent with each other", () => {
  const markets = [
    { iso2: "FR", share: 0.5, cpl: point(50) },
    { iso2: "US", share: 0.5, cpl: point(70) },
  ];
  const a = computePlan({ mode: "budget", amount: 10000, markets, learning: {} });
  const b = computePlan({ mode: "leads", amount: a.leads.lo, markets, learning: {} });
  near(b.budget.hi, 10000, 1e-6);
});

test("multi-market allocation with different CPLs", () => {
  const r = computePlan({
    mode: "budget",
    amount: 10000,
    markets: [
      { iso2: "FR", share: 0.5, cpl: point(50) },
      { iso2: "US", share: 0.5, cpl: point(70) },
    ],
    learning: {},
  });
  near(r.leads.lo, 5000 / 50 + 5000 / 70);
  near(r.blendedCpl.hi, 10000 / (5000 / 50 + 5000 / 70));
});

test("CPL range gives a lead range with the higher CPL producing fewer leads", () => {
  const r = computePlan({ mode: "budget", amount: 9000, markets: [{ iso2: "AE", share: 1, cpl: range(80, 100) }], learning: {} });
  near(r.leads.lo, 90);
  near(r.leads.hi, 112.5);
});

test("'AED 30 or less' gives a lower bound only, never an invented upper bound", () => {
  const r = computePlan({ mode: "budget", amount: 3000, markets: [{ iso2: "IN", share: 1, cpl: atMost(30) }], learning: {} });
  near(r.leads.lo, 100);
  assert.equal(r.leads.hi, null);
  assert.equal(r.blendedCpl.lo, null);
  near(r.blendedCpl.hi, 30);
});

test("lead target with an 'at most' market gives a ceiling budget and an unknown lower bound", () => {
  const r = computePlan({ mode: "leads", amount: 100, markets: [{ iso2: "IN", share: 1, cpl: atMost(30) }], learning: {} });
  near(r.budget.hi, 3000);
  assert.equal(r.budget.lo, null);
});

test("a market without a CPL is never treated as zero and keeps its share", () => {
  const r = computePlan({
    mode: "budget",
    amount: 10000,
    markets: [
      { iso2: "FR", share: 0.5, cpl: point(50) },
      { iso2: "GB", share: 0.5, cpl: null },
    ],
    learning: {},
  });
  near(r.leads.lo, 100); // only the covered half of the budget produces estimated leads
  near(r.coveredShare, 0.5);
  assert.equal(r.pendingCount, 1);
  const gb = r.markets.find((m) => m.iso2 === "GB");
  assert.equal(gb.leads.lo, null);
  near(gb.spend.lo, 5000);
});

test("no covered market at all gives unknown leads, not zero", () => {
  const r = computePlan({ mode: "budget", amount: 5000, markets: [{ iso2: "GB", share: 1, cpl: null }], learning: {} });
  assert.equal(r.leads.lo, null);
  assert.equal(r.blendedCpl.hi, null);
});

test("planning-assumption CPL is flagged", () => {
  const r = computePlan({
    mode: "budget",
    amount: 5000,
    markets: [{ iso2: "GB", share: 1, cpl: { lo: 90, hi: 90, relation: "point", source: "planning-assumption" } }],
    learning: {},
  });
  assert.equal(r.usesAssumption, true);
  near(r.leads.lo, 5000 / 90);
});

test("Europe learning vs mature comparison (120 vs 50)", () => {
  const r = computePlan({ mode: "budget", amount: 12000, markets: [{ iso2: "FR", share: 1, cpl: point(50) }], learning: LEARNING });
  const m = r.maturity;
  near(m.learningCpl, 120);
  near(m.matureCpl, 50);
  near(m.reduction, 70 / 120);
  near(m.leadsLearning, 100);
  near(m.leadsMature, 240);
  near(m.investmentMature, 12000);
  near(m.investmentLearning, 240 * 120);
});

test("no learning comparison outside Europe", () => {
  const r = computePlan({ mode: "budget", amount: 12000, markets: [{ iso2: "US", share: 1, cpl: point(70) }], learning: LEARNING });
  assert.equal(r.maturity, null);
});

test("learning comparison only covers the Europe slice of a mixed plan", () => {
  const r = computePlan({
    mode: "budget",
    amount: 10000,
    markets: [
      { iso2: "FR", share: 0.4, cpl: point(50) },
      { iso2: "US", share: 0.6, cpl: point(70) },
    ],
    learning: LEARNING,
  });
  near(r.maturity.sliceShare, 0.4);
  near(r.maturity.sliceBudget, 4000);
  near(r.maturity.leadsMature, 80);
  near(r.maturity.leadsLearning, 4000 / 120);
});

test("channel split always sums to the total budget", () => {
  for (const m of [0, 0.25, 0.5, 1]) {
    const s = splitChannels(12000, m);
    near(s.meta + s.google, 12000);
    near(s.metaShare + s.googleShare, 1);
  }
  near(splitChannels(12000, 1).google, 0);
  near(splitChannels(12000, 0).meta, 0);
  near(splitChannels(12000, 0.5).meta, 6000);
});

test("share helpers keep shares summing to 1", () => {
  let s = equalShares(["A", "B", "C"]);
  s = setMarketShare(s, "A", 0.7);
  near(Object.values(s).reduce((a, b) => a + b, 0), 1);
  near(s.A, 0.7);
  near(s.B, 0.15);
  s = addMarketShare(s, "D");
  near(Object.values(s).reduce((a, b) => a + b, 0), 1);
  near(s.D, 0.25);
  s = removeMarketShare(s, "A");
  near(Object.values(s).reduce((a, b) => a + b, 0), 1);
  assert.ok(!("A" in s));
});

test("presets are derived from the portfolio and never label a minimum", () => {
  const markets = [
    { iso2: "FR", share: 0.5, cpl: point(50) },
    { iso2: "US", share: 0.5, cpl: point(70) },
  ];
  const b = budgetPresets(markets);
  assert.deepEqual(b.map((p) => p.id), ["entry", "recommended", "expansion"]);
  assert.deepEqual(b.map((p) => p.budget), [5000, 10000, 25000]); // fixed levels, so the picked tile stays highlighted
  assert.deepEqual(b.map((p) => p.label), ["Minimum", "Recommended", "Expansion"]);
  assert.deepEqual(budgetPresets([{ iso2: "FR", share: 1, cpl: point(50) }]).map((p) => p.budget), [5000, 10000, 25000]);
  const l = leadPresets(markets);
  near(l[1].budget.hi, 100 / leadsPerAed(markets).lo);
  assert.equal(budgetPresets([{ iso2: "GB", share: 1, cpl: null }]), null);
});

test("amount validation rejects zero, negative, empty and absurd values", () => {
  assert.equal(validateAmount("budget", 0).ok, false);
  assert.equal(validateAmount("budget", -10).ok, false);
  assert.equal(validateAmount("budget", null).ok, false);
  assert.equal(validateAmount("budget", Number.NaN).ok, false);
  assert.equal(validateAmount("leads", 0).ok, false);
  assert.equal(validateAmount("budget", 12000).ok, true);
  assert.equal(validateAmount("leads", 100).ok, true);
  const r = computePlan({ mode: "budget", amount: -5, markets: [{ iso2: "FR", share: 1, cpl: point(50) }], learning: {} });
  assert.equal(r.valid, false);
  assert.equal(r.leads.lo, null);
});

test("switching mode carries the derived value across", () => {
  const markets = [{ iso2: "FR", share: 1, cpl: point(50) }];
  const b = computePlan({ mode: "budget", amount: 12000, markets, learning: {} });
  assert.equal(syncedAmount(b, "leads"), 240);
  const l = computePlan({ mode: "leads", amount: 240, markets, learning: {} });
  assert.equal(syncedAmount(l, "budget"), 12000);
});

// ---- language coverage ----
const seeds = [
  { code: "ar", language: "Arabic", iso2: "SA", relationship: "official_or_dominant", diaspora: false, confidence: "low", note: "", shareSource: null },
  { code: "ar", language: "Arabic", iso2: "FR", relationship: "diaspora_origin_proxy", diaspora: true, confidence: "low", note: "", shareSource: null },
  { code: "fr", language: "French", iso2: "FR", relationship: "official_or_dominant", diaspora: false, confidence: "low", note: "", shareSource: null },
];

test("language coverage: full, limited, gap and unmapped", () => {
  assert.equal(marketCoverage("SA", { ar: "fluent" }, seeds).status, "full");
  assert.equal(marketCoverage("SA", { ar: "professional" }, seeds).status, "full");
  assert.equal(marketCoverage("SA", { ar: "conversational" }, seeds).status, "limited");
  assert.equal(marketCoverage("SA", { fr: "fluent" }, seeds).status, "gap");
  assert.equal(marketCoverage("JP", { ar: "fluent" }, seeds).status, "unmapped");
});

test("discovery keeps primary-language markets and diaspora proxies separate", () => {
  const d = discoverMarkets({ ar: "fluent" }, seeds);
  assert.deepEqual(d.primary.map((c) => c.iso2), ["SA"]);
  assert.deepEqual(d.diaspora.map((c) => c.iso2), ["FR"]);
  assert.deepEqual(discoverMarkets({}, seeds), { primary: [], diaspora: [] });
});

test("rounded percentages always add up to exactly 100", async () => {
  const { roundedPercents } = await import("../src/lib/market-planning/model.ts");
  for (const n of [1, 2, 3, 7, 9, 13]) {
    const p = roundedPercents(equalShares(Array.from({ length: n }, (_, i) => `M${i}`)));
    assert.equal(Object.values(p).reduce((a, b) => a + b, 0), 100, `n=${n}`);
  }
  const odd = roundedPercents({ A: 0.333, B: 0.333, C: 0.334 });
  assert.equal(Object.values(odd).reduce((a, b) => a + b, 0), 100);
});

// ---- sales timing (provisional) ----
import { cohortProjection, eventualSales, monthlyTimingShares, validateCloseRate } from "../src/lib/market-planning/sales.ts";

const CPS = [
  { day: 30, share_percent: 21 },
  { day: 60, share_percent: 42 },
  { day: 90, share_percent: 53 },
  { day: 120, share_percent: 74 },
  { day: 270, share_percent: 89 },
];
const TAIL = { from_month: 9, to_month: 26, share_percent: 11 };

test("100 leads at a 2% close rate is about 2 eventual sales; unknown stays unknown", () => {
  const s = eventualSales({ lo: 100, hi: 100 }, 0.02);
  near(s.lo, 2);
  near(s.hi, 2);
  const open = eventualSales({ lo: 100, hi: null }, 0.02);
  near(open.lo, 2);
  assert.equal(open.hi, null);
  assert.equal(eventualSales({ lo: null, hi: null }, 0.02).lo, null);
  assert.equal(eventualSales({ lo: 100, hi: 100 }, 0).lo, null);
});

test("changing the close rate scales eventual sales linearly", () => {
  near(eventualSales({ lo: 240, hi: 240 }, 0.05).lo, 12);
  near(eventualSales({ lo: 240, hi: 240 }, 0.01).lo, 2.4);
});

test("close rate validation", () => {
  assert.equal(validateCloseRate(0.02).ok, true);
  assert.equal(validateCloseRate(0).ok, false);
  assert.equal(validateCloseRate(-0.1).ok, false);
  assert.equal(validateCloseRate(null).ok, false);
  assert.equal(validateCloseRate(0.9).ok, false);
});

test("monthly timing shares follow the historical checkpoints and total 100%", () => {
  const sh = monthlyTimingShares(CPS, TAIL, 26);
  near(sh[0], 0.21); // by day 30
  near(sh[0] + sh[1], 0.42); // by day 60
  near(sh[0] + sh[1] + sh[2], 0.53); // by day 90
  near(sh.slice(0, 4).reduce((a, b) => a + b, 0), 0.74); // by day 120
  near(sh.slice(0, 9).reduce((a, b) => a + b, 0), 0.89, 1e-9); // by day 270
  near(sh.reduce((a, b) => a + b, 0), 1, 1e-9);
  assert.ok(sh.every((x) => x >= 0));
});

test("cohort projection: first month only has this month's closes; totals approach the eventual sales", () => {
  const sh = monthlyTimingShares(CPS, TAIL, 26);
  const months = cohortProjection({ monthlyLeads: 100, closeRate: 0.02, shares: sh, horizon: 12 });
  near(months[0].total, 2 * 0.21);
  near(months[0].fromThisMonth, months[0].total);
  assert.equal(months[0].maturingLeads, 0);
  assert.equal(months[1].maturingLeads, 100);
  assert.equal(months[11].maturingLeads, 900);
  near(months[11].cumulative, months.reduce((a, m) => a + m.total, 0));
  // 12 monthly cohorts of 2 eventual sales each cannot have closed more than 24 by month 12
  assert.ok(months[11].cumulative < 24);
  // breakdown always sums to the month total
  for (const m of months) near(m.fromThisMonth + m.fromLastTwoMonths + m.fromThreeToFive + m.fromSixPlus, m.total);
});

test("a higher close rate changes projected closes instantly and proportionally", () => {
  const sh = monthlyTimingShares(CPS, TAIL, 26);
  const a = cohortProjection({ monthlyLeads: 100, closeRate: 0.02, shares: sh });
  const b = cohortProjection({ monthlyLeads: 100, closeRate: 0.04, shares: sh });
  near(b[5].cumulative, a[5].cumulative * 2);
});

// ---- save / share / export ----
import { csvCell, decodePlan, encodePlan, sanitizePlan, toCsv } from "../src/lib/market-planning/plan-io.ts";

const known = (iso) => ["FR", "IN", "US"].includes(iso);
const lang = (c) => ["ar", "fr"].includes(c);

test("a plan survives encode, decode and sanitize", () => {
  const plan = { mode: "leads", amountText: "120", shares: { FR: 0.5, IN: 0.5 }, metaShare: 0.6, languages: { ar: "fluent" }, assumedCpl: {}, closeRate: 0.03, timingProvisional: false };
  const back = sanitizePlan(decodePlan(encodePlan(plan)), known, lang);
  assert.equal(back.mode, "leads");
  assert.equal(back.closeRate, 0.03);
  assert.equal(back.timingProvisional, false);
  near(back.shares.FR, 0.5);
});

test("sanitize drops unknown countries, bad numbers and impossible values", () => {
  const bad = { mode: "budget", amountText: "5000", shares: { FR: 2, ZZ: 1, IN: -1 }, metaShare: 7, languages: { ar: "fluent", xx: "fluent", fr: "wizard" }, assumedCpl: { FR: -3, US: 50 }, closeRate: 9, timingProvisional: true };
  const out = sanitizePlan(bad, known, lang);
  assert.deepEqual(Object.keys(out.shares), ["FR"]);
  near(out.shares.FR, 1);
  assert.equal(out.metaShare, 1);
  assert.deepEqual(out.languages, { ar: "fluent" });
  assert.deepEqual(out.assumedCpl, {});
  assert.equal(out.closeRate, 0.015);
});

test("sanitize rejects junk", () => {
  assert.equal(sanitizePlan(null, known, lang), null);
  assert.equal(sanitizePlan("x", known, lang), null);
  assert.equal(sanitizePlan({ mode: "nope" }, known, lang), null);
  assert.equal(sanitizePlan({ mode: "budget", amountText: "1", shares: {} }, known, lang), null);
  assert.equal(decodePlan("%%%not-base64"), null);
});

test("csv escaping and formula-injection protection", () => {
  assert.equal(csvCell('a,"b"'), '"a,""b"""');
  assert.equal(csvCell("=SUM(A1)"), "'=SUM(A1)");
  assert.equal(csvCell(null), "");
  assert.equal(csvCell(-5), "-5");
  assert.equal(toCsv([["a", 1], ["b,c", 2]]), 'a,1\r\n"b,c",2');
});

// ---- 1st / 2nd / 3rd sale timing ----
import { firstSales, milestoneSales } from "../src/lib/market-planning/sales.ts";

test("milestone sales reproduce 2% of 100 leads: 0.42, 0.84, 1.06, 1.48, 1.78, 2.0", () => {
  const m = milestoneSales(2, CPS, TAIL);
  assert.deepEqual(m.map((x) => +x.sales.toFixed(2)), [0.42, 0.84, 1.06, 1.48, 1.78, 2]);
  assert.equal(m[5].tail, true);
});

test("first sale arrives sooner with more leads, and later sales come later", () => {
  const sh = monthlyTimingShares(CPS, TAIL, 26);
  const small = firstSales({ monthlyLeads: 100, closeRate: 0.02, shares: sh, steps: 3 });
  const big = firstSales({ monthlyLeads: 400, closeRate: 0.02, shares: sh, steps: 3 });
  assert.ok(small[0].days > 0 && small[0].days < 90);
  assert.ok(big[0].days < small[0].days);
  assert.ok(small[0].days < small[1].days && small[1].days < small[2].days);
  assert.ok(big[2].days < big[2].days + 1);
});

test("a sale that cannot be reached stays unknown, never zero", () => {
  const sh = monthlyTimingShares(CPS, TAIL, 26);
  const r = firstSales({ monthlyLeads: 1, closeRate: 0.001, shares: sh, steps: 2, horizonMonths: 12 });
  assert.equal(r[0].days, null);
});

// ---- single batch of leads: when does the 1st sale land? ----
import { batchSaleDays } from "../src/lib/market-planning/sales.ts";

test("100 leads at 2% (2 eventual sales): the first sale is at the typical 78 days, the second at the last checkpoint", () => {
  const r = batchSaleDays(2, CPS, TAIL, 4);
  assert.equal(r[0].days, 78);
  assert.equal(r[1].days, 270); // the 2nd of 2 sales is dated at the last checkpoint (about 9 months), not in the slow tail
  assert.equal(r[2].days, null);
  assert.equal(r[3].days, null);
});

test("the first sale stays at the typical timing at every budget; more leads add sales inside the same window", () => {
  for (const eventual of [0.9, 2, 4.9, 9.9, 18.6]) {
    const r = batchSaleDays(eventual, CPS, TAIL, 4);
    assert.equal(r[0].days, 78, `eventual ${eventual}`);
  }
  const small = batchSaleDays(4.9, CPS, TAIL, 4);
  const big = batchSaleDays(18.6, CPS, TAIL, 4);
  assert.ok(small.every((s) => s.days !== null && s.days <= 270) && big.every((s) => s.days !== null && s.days <= 270));
  // a bigger budget packs the later sales closer together, it never moves the first one
  assert.ok(big[3].days < small[3].days);
  for (const r of [small, big]) for (let i = 1; i < r.length; i++) assert.ok(r[i].days > r[i - 1].days);
});

test("no expected sales means nothing is reached (never zero days)", () => {
  assert.equal(batchSaleDays(0, CPS, TAIL, 2)[0].days, null);
});

// ---- the sales list must agree with the "total sales" figure ----
test("a batch expected to produce 3.98 sales (shown as 4.0) lists four sales, the last at the last checkpoint", () => {
  const r = batchSaleDays(3.98, CPS, TAIL, 5);
  assert.equal(r[0].days, 78);
  assert.equal(r[3].days, 270);
  assert.equal(r[4].days, null);
});

test("a batch expected to produce 2.4 sales lists two, not three", () => {
  const r = batchSaleDays(2.4, CPS, TAIL, 4);
  assert.notEqual(r[1].days, null);
  assert.equal(r[2].days, null);
});

test("under half a sale there is no first-sale date", () => {
  assert.equal(batchSaleDays(0.6, CPS, TAIL, 1)[0].days, null);
});

test("no sale is ever dated beyond day 270, and later sales are never earlier than earlier ones", () => {
  for (const eventual of [1, 2, 3.98, 6, 12]) {
    const r = batchSaleDays(eventual, CPS, TAIL, 12).filter((x) => x.days !== null);
    assert.ok(r.every((x) => x.days <= 270), `eventual ${eventual}`);
    for (let i = 1; i < r.length; i++) assert.ok(r[i].days >= r[i - 1].days);
  }
});

// ---- hero tile silhouettes ----
import { pathBottomRightNotch, pathTopRightNotch, pathTopTab, tabRange } from "../src/components/market-planning/shell/shapes.ts";

test("tile paths are well formed and use only finite numbers", () => {
  for (const p of [pathTopRightNotch(300, 420, 70, 26), pathBottomRightNotch(260, 300, 76, 34), pathTopTab(520, 260, 34, 184, 260)]) {
    assert.match(p, /^path\('M [\d.]+ [\d.]+ /);
    assert.ok(p.endsWith("Z')"));
    assert.ok(!/NaN|Infinity|undefined/.test(p));
  }
});

test("D's tab sits one gap away from B's notch and ends at B's right edge", () => {
  const { x0, x1 } = tabRange(260, { cw: 76, ch: 34, gap: 14 });
  assert.equal(x1, 260);
  assert.equal(x0, 260 - 76 + 14);
});
