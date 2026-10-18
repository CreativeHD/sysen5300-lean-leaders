# CivicWatch H-02 validation preview

All checks **PASSED** (before GitHub commit).

- Three CSV files; exactly **280** data rows and **9** columns per CSV.
- Each contains **168 baseline rows**, **112 monitoring rows**, **4 zones**, and **2 shifts** across 35 dates.
- Required columns populated, unique zone/date/shift keys, valid integers and phase labels.
- All baseline and non-intervention observations are identical across the three scenarios.
- Every record is explicitly synthetic; the scenario authorization reference is fictional.
- Generator rerun yields **byte-for-byte identical CSVs**.
- Hand calculation from the project SPEC: baseline center = 20 stops/1,000; UCL = 62.4264/1,000; 7 stops/100 vehicles gives 70/1,000 and exceeds the upper limit.

## Target scenario: Zone_C evening, September 25–29

| File | Vehicles observed | Stops observed | Stops/1,000 vehicles | Out-of-control target periods |
|---|---:|---:|---:|---:|
| baseline.csv | 4,425 | 45 | 10.17 | 0/5 |
| ticket_blitz.csv | 4,425 | 242 | 54.69 | 5/5 |
| traffic_surge.csv | 8,850 | 90 | 10.17 | 0/5 |

Shared Zone_C evening baseline: **10.77 stops per 1,000 vehicles**.

## All monitored observations, including unrelated random alerts

- baseline.csv: **1** SPC limit exceedance(s): [('2026-09-24', 'Zone_A', 'evening', 'upper')].
- ticket_blitz.csv: **6** SPC limit exceedance(s): five injected blitz periods plus the shared incidental alert.
- traffic_surge.csv: **1** SPC limit exceedance(s): the same shared incidental alert only.

A baseline dataset can sometimes produce a false SPC signal; a stable generating process does not guarantee zero flagged observations in a finite sample.

*The full FastAPI application, formal tests, and deployment have not been built or tested. This report validates only the dataset previews and their expected statistical behavior.*
