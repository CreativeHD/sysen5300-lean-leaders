# CivicWatch synthetic-dataset validation (H-02)

The three demonstration CSVs were generated and validated with deterministic scripts. The dataset-level checks below passed during H-02. Since that initial validation, the complete Python application and public dashboard have also been built, tested, and deployed.

## Dataset construction checks

- Exactly **3 CSVs**, each with **280 data rows** and **9 columns**.
- Each file has **168 baseline rows**, **112 monitoring rows**, **4 zones**, **2 shifts**, and 35 dates.
- Required columns are populated; `(date, zone_id, shift)` keys are unique; integer counts and phase labels are valid.
- All shared baseline and non-intervention observations are identical across the scenarios.
- Every row is explicitly synthetic, and the scenario authorization reference is fictional.
- Re-running the generator with the tested compatible environment yields byte-for-byte identical CSVs.
- Known-answer calculation: the baseline center is **20 stops per 1,000 vehicles**, UCL is **62.4264**, and a monitoring rate of **70** exceeds the UCL.

## Target scenario: Zone_C evening, September 25–29, 2026

| File | Vehicles observed | Stops observed | Stops per 1,000 vehicles | Target observations above limits |
| --- | ---: | ---: | ---: | ---: |
| `baseline.csv` | 4,425 | 45 | 10.17 | **0/5** |
| `ticket_blitz.csv` | 4,425 | 242 | 54.69 | **5/5** |
| `traffic_surge.csv` | 8,850 | 90 | 10.17 | **0/5** |

The shared Zone_C evening historical center line is approximately **10.77 stops per 1,000 vehicles**.

## Monitoring alerts across all groups

| Dataset | Monitoring signals | Explanation |
| --- | ---: | --- |
| `baseline.csv` | **1** | Incidental upper-limit exceedance on September 24 in Zone_A evening |
| `ticket_blitz.csv` | **6** | The same incidental signal, plus five deliberately planted Zone_C evening blitz signals |
| `traffic_surge.csv` | **1** | The same incidental signal; no alerts on the five target surge evenings |

The one shared chance signal demonstrates that a stable generating process can still produce an isolated SPC limit exceedance. A statistical alert requires review of data quality and context; it is **not** evidence of misconduct.

## End-to-end verification completed after H-02

- The team's clean-checkout Python verification reported **30 passing tests** (17 statistical tests and 13 API tests).
- The live FastAPI backend returned the expected monitoring totals **1 / 6 / 1** for the three CSVs.
- The live React dashboard was tested with each CSV on **October 21, 2026**, reproducing **280 observations**, **8 groups**, and the expected **1 / 6 / 1 monitoring alert counts**. These outcomes are illustrated in [`../demo/README.md`](../demo/README.md) with screenshots captured from the public deployment.

The generator, original inputs, statistical code, and tests are available in this public repository. For the variable dictionary, unit definitions, synthetic-data assumptions, and collection requirements for real field data, see [`README.md`](README.md).
