#!/usr/bin/env bash
# Downloads the open datasets used by build_datasets.py into ./raw (git-ignored size is small, safe to re-run).
# All sources are open licences. UN DESA migrant stock is NOT fetched: it blocks scripted access (HTTP 403);
# download it manually in a browser if you want non-EU diaspora data.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p raw && cd raw
for i in SP.POP.TOTL SP.POP.GROW NY.GDP.PCAP.CD NY.GDP.PCAP.PP.CD IT.NET.USER.ZS NY.GDP.MKTP.KD.ZG FP.CPI.TOTL.ZG FS.AST.PRVT.GD.ZS SI.POV.GINI NE.CON.PRVT.PP.CD BM.KLT.DINV.WD.GD.ZS; do
  curl -fsS -m 60 "https://api.worldbank.org/v2/country/all/indicator/$i?format=json&per_page=20000&mrnev=1" -o "wb_$i.json"
done
curl -fsS -m 60 "https://api.worldbank.org/v2/country/all/indicator/GOV_WGI_PV.EST?format=json&per_page=20000&mrnev=1" -o wb_pv.json
curl -fsS -m 90 "https://api.worldbank.org/v2/country/all/indicator/PA.NUS.FCRF?format=json&per_page=20000&date=2023:2025" -o wb_fx.json
curl -fsS -m 60 "https://api.worldbank.org/v2/country?format=json&per_page=400" -o wb_countries.json
curl -fsS -m 60 -o cldr_supplemental.xml "https://raw.githubusercontent.com/unicode-org/cldr/main/common/supplemental/supplementalData.xml"
curl -fsS -m 60 -o cldr_en.xml "https://raw.githubusercontent.com/unicode-org/cldr/main/common/main/en.xml"
curl -fsS -m 60 -o eurostat_ctz.json "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/migr_pop1ctz?format=JSON&lang=EN&age=TOTAL&sex=T&lastTimePeriod=1"
echo "done"
