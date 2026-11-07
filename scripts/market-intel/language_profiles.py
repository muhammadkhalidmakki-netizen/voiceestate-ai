"""Per-country language profiles: primary / secondary languages with percentages, and language families.

Two measures are kept apart, never blended into one number:
  - first-language % (mother tongue or home language): CIA World Factbook (public domain), parsed from its
    free-text "Languages" field. Reference year and definition are stored per country. Many countries
    publish no percentages; those are left blank, not estimated.
  - total-speaker reach %: Unicode CLDR (first or additional language), already in the distribution file.

language-families.csv (editable) says which related varieties count towards a selectable language
(for example Western Panjabi counts as Punjabi), with a weight. Those weights are planning assumptions
from the linguistic literature, not measurements.
"""

import csv
import html
import json
import os
import re
import unicodedata

RESEARCH_DATE = "2026-11-06"

FB_CODE = {"iv": "CI", "bm": "MM", "mc": "MO", "tw": "TW", "vm": "VN", "tu": "TR", "sv": "SJ", "cf": "CG", "cg": "CD",
           "uk": "GB", "us": "US", "gz": None, "we": "PS", "ee": None}

NAME_ALIAS = {
    "kiswahili": "sw", "swahili": "sw", "panjabi": "pa", "punjabi": "pa", "western panjabi": "lah", "odia": "or", "oriya": "or",
    "northern chinese": "zh", "mandarin": "zh", "standard chinese": "zh", "chinese": "zh", "yue": "yue", "cantonese": "yue",
    "bangla": "bn", "tagalog": "fil", "filipino": "fil", "farsi": "fa", "persian": "fa", "dari": "prs", "bokmal": "nb",
    "norwegian": "nb", "pashtu": "ps", "pushto": "ps", "burmese": "my", "myanmar": "my", "hebrew": "he", "malay": "ms",
    "bahasa indonesia": "id", "indonesian": "id", "castilian": "es", "flemish": "nl", "dutch": "nl", "greek": "el",
    "kurdish": "ku", "serbian": "sr", "croatian": "hr", "bosnian": "bs", "hindustani": "hi", "saraiki": "skr",
    "hindko": "hno", "sindhi": "sd", "bengali": "bn", "balochi": "bal", "baluchi": "bal", "setswana": "tn", "tswana": "tn",
    "tigrigna": "ti", "tigrinya": "ti", "afghan persian or dari": "prs", "chinese languages": "zh", "chinese language": "zh", "uzbek": "uz", "kazakh": "kk", "azeri": "az", "azerbaijani": "az",
}

DIALECT_NAMES = {
    "apc": "Levantine Arabic", "apd": "Sudanese Arabic", "acm": "Mesopotamian (Iraqi) Arabic", "afb": "Gulf Arabic",
    "ars": "Najdi Arabic", "acw": "Hijazi Arabic", "ayp": "North Mesopotamian Arabic", "aeb": "Tunisian Arabic",
    "ayl": "Libyan Arabic", "arq": "Algerian Arabic", "ary": "Moroccan Arabic", "arz": "Egyptian Arabic",
    "lah": "Western Panjabi", "skr": "Saraiki", "hno": "Hindko", "prs": "Dari (Afghan Persian)", "bho": "Bhojpuri",
    "awa": "Awadhi", "mai": "Maithili", "mag": "Magahi", "bgc": "Haryanvi", "hne": "Chhattisgarhi", "mwr": "Marwari",
}

FAMILY_DEFAULTS = [
    # selectable, member, relation, weight, note
    ("pa", "pnb", "same_language_variant", 1.0, "Western Panjabi (Lahnda) is the Punjabi of Pakistan."),
    ("pa", "lah", "same_language_variant", 1.0, "Western Panjabi (CLDR code lah)."),
    ("pa", "skr", "related_language", 0.7, "Saraiki: described as a Punjabi variant in the Factbook; counted separately in Pakistan's census. Partly intelligible."),
    ("pa", "hno", "related_language", 0.7, "Hindko: Punjabi-related; partly intelligible."),
    ("ar", "arz", "dialect_continuum", 0.8, "Egyptian Arabic. Standard/Gulf Arabic agents are widely understood; diglossia lowers the fit."),
    ("ar", "apc", "dialect_continuum", 0.8, "Levantine Arabic."),
    ("ar", "apd", "dialect_continuum", 0.8, "Sudanese Arabic."),
    ("ar", "arq", "dialect_continuum", 0.7, "Algerian Arabic (Maghrebi: furthest from Gulf Arabic)."),
    ("ar", "ary", "dialect_continuum", 0.7, "Moroccan Arabic (Maghrebi)."),
    ("ar", "aeb", "dialect_continuum", 0.7, "Tunisian Arabic (Maghrebi)."),
    ("ar", "acm", "dialect_continuum", 0.8, "Mesopotamian (Iraqi) Arabic."),
    ("ar", "ayl", "dialect_continuum", 0.7, "Libyan Arabic."),
    ("ar", "afb", "dialect_continuum", 0.9, "Gulf Arabic."),
    ("ar", "ars", "dialect_continuum", 0.9, "Najdi Arabic."),
    ("ar", "acw", "dialect_continuum", 0.9, "Hijazi Arabic."),
    ("ar", "ayp", "dialect_continuum", 0.8, "North Mesopotamian Arabic."),
    ("hi", "ur", "mutual_intelligibility", 0.8, "Spoken Hindi and Urdu are largely mutually intelligible (Hindustani); scripts differ."),
    ("ur", "hi", "mutual_intelligibility", 0.8, "Spoken Urdu and Hindi are largely mutually intelligible (Hindustani); scripts differ."),
    ("hi", "bho", "related_language", 0.6, "Bhojpuri: Hindi-belt language; many speakers also use Hindi."),
    ("hi", "awa", "related_language", 0.6, "Awadhi: Hindi-belt language."),
    ("hi", "mai", "related_language", 0.5, "Maithili: Hindi-belt language; less intelligible."),
    ("hi", "mag", "related_language", 0.6, "Magahi: Hindi-belt language."),
    ("hi", "bgc", "related_language", 0.7, "Haryanvi: close to Hindi."),
    ("hi", "hne", "related_language", 0.6, "Chhattisgarhi: Hindi-belt language."),
    ("hi", "mwr", "related_language", 0.6, "Marwari: Rajasthani; many speakers also use Hindi."),
    ("zh", "wuu", "related_language", 0.5, "Wu Chinese: Mandarin is the standard and widely understood second language but is not mutually intelligible."),
    ("zh", "hak", "related_language", 0.5, "Hakka: as for Wu."),
    ("zh", "nan", "related_language", 0.5, "Min Nan: as for Wu."),
    ("zh", "hsn", "related_language", 0.5, "Xiang: as for Wu."),
    ("zh", "gan", "related_language", 0.5, "Gan: as for Wu."),
    ("ms", "id", "mutual_intelligibility", 0.8, "Malay and Indonesian are largely mutually intelligible."),
    ("id", "ms", "mutual_intelligibility", 0.8, "Malay and Indonesian are largely mutually intelligible."),
    ("fa", "prs", "same_language_variant", 0.9, "Dari (Afghan Persian)."),
    ("nb", "nn", "same_language_variant", 1.0, "Nynorsk: the other written standard of Norwegian."),
    ("sr", "hr", "mutual_intelligibility", 0.9, "Serbian and Croatian are mutually intelligible."),
    ("hr", "sr", "mutual_intelligibility", 0.9, "Serbian and Croatian are mutually intelligible."),
    ("de", "bar", "related_language", 0.9, "Bavarian: speakers use Standard German."),
]


def clean(s):
    s = html.unescape(re.sub(r"<[^>]+>", " ", s or ""))
    return re.sub(r"\s+", " ", s.replace("\xa0", " ")).strip()


def split_top(s):
    out, depth, cur = [], 0, ""
    for ch in s:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth = max(0, depth - 1)
        if ch == "," and depth == 0:
            out.append(cur)
            cur = ""
        else:
            cur += ch
    if cur.strip():
        out.append(cur)
    return [x.strip() for x in out if x.strip()]


def parse_languages(text):
    """-> (items, year). items: list of (name, pct|None, official_flag)."""
    text = clean(text)
    years = re.findall(r"\((\d{4})(?: est\.| census)?\)", text)
    year = int(years[-1]) if years else None
    body = text.split(";")[0]
    body = re.sub(r"\s*\(\d{4}(?: est\.| census)?\)\s*$", "", body)
    items = []
    for part in split_top(body):
        m = re.match(r"^(.*?)\s*([<>~]?\s*\d+(?:\.\d+)?)\s*%\s*(?:\(.*\))?$", part)
        pct = float(re.sub(r"[^\d.]", "", m.group(2))) if m else None
        name = (m.group(1) if m else part).strip()
        official = bool(re.search(r"\((?:[^)]*\b)?official\b", name, re.I)) or bool(re.search(r"\bofficial\b", part, re.I))
        name = re.sub(r"\(.*?\)", " ", name)
        name = re.sub(r"\b(only|including|and other)\b", " ", name, flags=re.I)
        name = re.sub(r"\s+", " ", name).strip(" ,;:-")
        if name:
            items.append((name, pct, official))
    return items, year


def definition_of(note, text):
    t = (clean(note) + " " + clean(text)).lower()
    if "mother tongue" in t:
        return "first_language_mother_tongue"
    if "spoken at home" in t or "language spoken at home" in t or "home language" in t:
        return "language_spoken_at_home"
    if "first language" in t:
        return "first_language"
    return "reported_share_definition_not_stated"


def norm(s):
    s = unicodedata.normalize("NFKD", html.unescape(s)).encode("ascii", "ignore").decode().lower()
    s = re.sub(r"\(.*?\)", " ", s).replace("&", "and")
    s = re.sub(r"[^a-z ]", " ", s)
    words = [w for w in s.split() if w != "the"]
    while words and words[-1] in ("language", "languages"):
        words.pop()
    return " ".join(words)


def run(ctx):
    RAW, DATA, REG, names_by_code = ctx["RAW"], ctx["DATA"], ctx["REG"], ctx["cldr_names"]
    write_csv, CAT = ctx["write_csv"], ctx["CAT"]
    dist_rows = ctx["dist_rows"]

    # ---- language families (editable CSV; defaults written once)
    fam_path = os.path.join(DATA, "language-families.csv")
    fam_fields = ["selectable_language", "member_language_code", "relation", "weight", "evidence", "note"]
    if not os.path.exists(fam_path):
        write_csv("language-families.csv", [dict(selectable_language=a, member_language_code=b, relation=c, weight=w,
                                                 evidence="linguistic_literature_planning_assumption", note=n)
                                            for a, b, c, w, n in FAMILY_DEFAULTS], fam_fields)
    fam = {}
    with open(fam_path, encoding="utf-8-sig", newline="") as f:
        for r in csv.DictReader(f):
            try:
                fam.setdefault(r["selectable_language"].strip(), []).append((r["member_language_code"].strip(), float(r["weight"])))
            except (ValueError, KeyError):
                pass

    code_of_name = {}
    for code, nm in names_by_code.items():
        code_of_name.setdefault(norm(nm), code.split("_")[0])
    code_of_name.update({norm(k): v for k, v in NAME_ALIAS.items()})

    # ---- CLDR reach by selectable language (family-aware), per country
    def base(c):
        return c.split("_")[0]

    cldr = {}  # iso -> {cldr_code(base): (pct, official, language_name)}
    for r in dist_rows:
        iso, code = r["country_iso2"], base(r["language_code"])
        pct = float(r["speaker_share_pct_total"])
        cur = cldr.setdefault(iso, {}).get(code)
        off = r["official_status"] not in ("", "none_recorded")
        if cur is None or pct > cur[0]:
            cldr[iso][code] = (pct, off or (cur[1] if cur else False), r["language_name"])
    reach = {}  # iso -> {selectable: pct}
    for iso, langs in cldr.items():
        out = {}
        for code in CAT:
            best = langs.get(code, (0, False, ""))[0]
            for member, w in fam.get(code, []):
                if member in langs:
                    best = max(best, langs[member][0] * w)
            if best > 0:
                out[code] = best
        if out:
            reach[iso] = out

    # ---- Factbook first-language percentages
    fb = {}
    nfiles = 0
    fdir = os.path.join(RAW, "factbook")
    if os.path.isdir(fdir):
        regn = {}
        for iso, r in REG.items():
            for n in (r["country_name"], r["official_name"]):
                if n:
                    regn.setdefault(norm(n), iso)
                    if "," in n:
                        a, b = n.split(",", 1)
                        regn.setdefault(norm(b + " " + a), iso)
        for fn in sorted(os.listdir(fdir)):
            if fn.startswith(("oceans", "world", "meta")):
                continue
            nfiles += 1
            code = fn.split("_")[-1][:-5]
            d = json.load(open(os.path.join(fdir, fn), encoding="utf-8"))
            g = d.get("Government", {}).get("Country name", {})
            cands = [g[k]["text"] for k in ("conventional short form", "conventional long form")
                     if isinstance(g.get(k), dict) and g[k].get("text", "").lower() != "none"]
            iso = FB_CODE[code] if code in FB_CODE else next((regn[norm(c)] for c in cands if norm(c) in regn), None)
            if not iso or iso not in REG or iso in fb:
                continue
            L = d.get("People and Society", {}).get("Languages", {})
            if "Languages" in L and isinstance(L["Languages"], dict):
                text, note = L["Languages"].get("text", ""), (L.get("note") or {}).get("text", "") if isinstance(L.get("note"), dict) else ""
            else:
                text, note = L.get("text", ""), L.get("note", "")
            if not text:
                continue
            items, year = parse_languages(text)
            fb[iso] = dict(items=items, year=year, definition=definition_of(note, text), raw=clean(text)[:300])

    # ---- profile rows
    rows, with_pct, listed_only = [], 0, 0
    for iso, r in REG.items():
        entries = {}  # key -> dict
        f = fb.get(iso)
        if f:
            has_pct = any(p is not None for _, p, _ in f["items"])
            with_pct += has_pct
            listed_only += (not has_pct)
            for order, (name, pct, official) in enumerate(f["items"]):
                nn = norm(name)
                if nn in ("other", "other or not stated", "unspecified", "not specified", "none", "unknown", "other and unspecified", "others") or nn.startswith("other "):
                    continue
                code = code_of_name.get(nn)
                key = code or "name:" + nn
                e = entries.setdefault(key, dict(code=code, name=name, l1=None, order=order, official=False))
                if pct is not None:
                    e["l1"] = (e["l1"] or 0) + pct
                e["official"] = e["official"] or official
        for code, (pct, off, nm) in cldr.get(iso, {}).items():
            if pct < 1 and not off:
                continue
            e = entries.setdefault(code, dict(code=code, name=DIALECT_NAMES.get(code) or (nm if nm and nm != code else code), l1=None, order=99, official=False))
            e["reach"] = pct
            e["official"] = e["official"] or off
            e.setdefault("cldr_name", nm)
        if not entries:
            continue
        for k, e in entries.items():
            e.setdefault("reach", None)
        any_l1 = any(e["l1"] is not None for e in entries.values())
        key_of = (lambda e: (e["l1"] if e["l1"] is not None else -1, e["reach"] or 0)) if any_l1 else (lambda e: (e["reach"] or 0, 0))
        ranked = sorted(entries.values(), key=key_of, reverse=True)[:12]
        for i, e in enumerate(ranked, 1):
            share = e["l1"] if e["l1"] is not None else (e["reach"] or 0)
            role = "primary" if i == 1 else ("secondary" if share >= 10 else "minority")
            sel = e["code"] if e["code"] in CAT else None
            grouped = [s for s, ms in fam.items() if e["code"] and any(m == e["code"] for m, _ in ms)]
            rows.append(dict(
                country_iso2=iso, country_name=r["country_name"], rank=i, role=role,
                language_name=e["name"], language_code=e["code"] or "", selectable_language=sel or (grouped[0] if grouped else ""),
                first_language_pct=e["l1"] if e["l1"] is not None else "",
                first_language_year=f["year"] if (f and e["l1"] is not None and f["year"]) else "",
                first_language_definition=f["definition"] if (f and e["l1"] is not None) else "",
                total_speakers_reach_pct=round(e["reach"], 1) if e["reach"] is not None else "",
                official=("yes" if e["official"] else ""),
                sources=("SRC_CIA_FACTBOOK" if e["l1"] is not None else "") + (";" if e["l1"] is not None and e["reach"] is not None else "") + ("SRC_CLDR_TERRITORY_INFO" if e["reach"] is not None else ""),
                confidence="medium" if e["l1"] is not None else "low",
                note=("Listed by the Factbook without a percentage." if (f and e["l1"] is None and e["reach"] is None) else ""),
            ))
    fields = ["country_iso2", "country_name", "rank", "role", "language_name", "language_code", "selectable_language",
              "first_language_pct", "first_language_year", "first_language_definition", "total_speakers_reach_pct", "official",
              "sources", "confidence", "note"]
    write_csv("country-language-profile.csv", rows, fields)

    stats = dict(
        factbook_files_read=nfiles, countries_with_factbook_language_text=len(fb), countries_with_first_language_percentages=with_pct,
        countries_with_factbook_list_but_no_percentages=listed_only,
        countries_with_total_reach_only=len({r["country_iso2"] for r in rows} - set(fb)),
        profile_rows=len(rows), language_family_rows=sum(len(v) for v in fam.values()),
        first_language_definition_counts={k: sum(1 for x in fb.values() if x["definition"] == k) for k in {x["definition"] for x in fb.values()}},
    )
    return reach, stats
