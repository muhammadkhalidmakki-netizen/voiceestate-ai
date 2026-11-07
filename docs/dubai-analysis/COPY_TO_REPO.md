# Copy to the project

Copy the folder `dubai-analysis-knowledge-pack` contents into:

`web-apps/voiceestate-ai/docs/dubai-analysis/`

The expected final structure is:

```text
web-apps/
└── voiceestate-ai/
    └── docs/
        └── dubai-analysis/
            ├── 00_README.md
            ├── 01_PRODUCT_BRIEF.md
            ├── 02_CLAUDE_CODE_WORKING_RULES.md
            ├── 03_UX_COPY_AND_EXPERIENCE.md
            ├── 04_FORECAST_MODEL_AND_CALCULATION_RULES.md
            ├── 05_MARKET_RESEARCH_METHOD.md
            ├── 06_LANGUAGE_AND_AGENT_COVERAGE.md
            ├── 07_DATA_DICTIONARY_AND_SCHEMA.md
            ├── 08_RESEARCH_SOURCES_AND_EVIDENCE.md
            ├── 09_BUILD_SEQUENCE_AND_ACCEPTANCE_TESTS.md
            ├── CLAUDE_CODE_FIRST_TASK_PROMPT.md
            └── data/
                ├── README.md
                ├── benchmark-facts.json
                ├── country-market-master.csv
                ├── language-market-seeds.csv
                ├── recommended-portfolio.json
                └── research-source-ids.json
```

Then open `CLAUDE_CODE_FIRST_TASK_PROMPT.md` and paste its contents into Claude Code. The prompt deliberately limits Claude Code to the KPI card only, because the client wants each component approved before the next is started.
