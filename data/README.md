# CivicWatch synthetic datasets: H-02 codebook

These **fictional, synthetic demonstration datasets** were made for the Cornell SYSEN 5300 Six Sigma Hackathon, Virtual DL Challenge. They do **not** describe an actual city, real residents, actual police activity, or authentic government policies. The goal is to test a statistical monitoring application, not to establish unlawful enforcement.

## File inventory

| File | Rows of observations | Intent |
|---|---:|---|
| `baseline.csv` | 280 | Stable underlying stop rates with ordinary random variability; includes baseline and monitoring observations. |
| `ticket_blitz.csv` | 280 | Same observations as baseline except an injected five-day, fivefold underlying stop-rate increase for Zone_C evening. |
| `traffic_surge.csv` | 280 | Same observations as baseline except a five-day doubling of observed vehicle exposure for Zone_C evening, without changing the underlying stop rate. |

All three CSVs have **9 identical headers**, **4 fictional zones**, **2 shifts per day**, **35 consecutive days**, and **280 data rows** each (35 days × 4 zones × 2 shifts). The first **21 days** (2026-09-01 to 2026-09-21 inclusive) are baseline; the remaining **14 days** (2026-09-22 to 2026-10-05 inclusive) are monitoring. In each file there are 168 baseline rows and 112 monitoring rows. Dates and identifiers are synthetic.

## Data dictionary

**Unit of observation:** one zone during one standardized observation shift on one date. All stop and traffic counts in a row refer to the **same window and location**.

| Column | Data type | Units / permissible values | Meaning | How it could be collected in the field |
|---|---|---|---|---|
| `date` | ISO 8601 date string | `YYYY-MM-DD` | Day monitoring occurred | Observer log timestamp converted to local date |
| `zone_id` | Categorical string | `Zone_A`, `Zone_B`, `Zone_C`, `Zone_D` | One of four fictional, predefined monitoring areas | Predefined public observation boundary identifier |
| `shift` | Categorical string | `morning`, `evening` | Standardized observation window; shifts should be comparable in duration within each type | Observer selects from preset time blocks |
| `vehicles_observed` | Positive integer | vehicles | Total passing vehicles counted in the observation window | Manual traffic counter or traffic counting device |
| `stops_observed` | Nonnegative integer | distinct observed traffic enforcement stops | Number of stops witnessed by the observer in that same window/area (not number of tickets) | Standardized event tally with duplicate exclusion |
| `phase` | Categorical string | `baseline`, `monitoring` | Whether the observation contributes to estimating historical control limits or is checked against those limits | Predefined study protocol; never assigned based on observed stop count |
| `authorization_status` | Categorical string | `authorized`, `outside`, `unknown` | Whether activity is within a **documented** authorization context, if known; `unknown` means no determination can be made | Review an applicable, actual public authorization document; otherwise record `unknown` |
| `policy_reference` | Optional string | blank or fictional policy identifier | Reference to the policy used to classify authorization, if applicable | Record source title, public URL, and scope; no real policies are represented here |
| `source_type` | Categorical string | `synthetic`, `field_observation`, `agency_record` | Provenance of a row | Identify the original collection channel; all supplied rows are `synthetic` |

**Required application columns:** `date`, `zone_id`, `shift`, `vehicles_observed`, `stops_observed`, and `phase`. The remaining three columns are optional context fields; all nine are included in the sample CSVs for consistency. A blank `policy_reference` is valid when `authorization_status` is `unknown`.

## Synthetic data-generating assumptions

- Fixed pseudorandom seed: **5300** for ordinary baseline observations; 5301 and 5302 for the scenario modifications.
- Four nominal rates, in stops per 1,000 observed vehicles: Zone_A **8**, Zone_B **10**, Zone_C **10**, Zone_D **12**. The nominal rates do not change by shift; actual vehicle counts do.
- Nominal vehicles/shift before modifiers: Zone_A **650**, Zone_B **780**, Zone_C **900**, Zone_D **1,100**. Morning volume is multiplied by **1.10** and weekends by **0.83**. A modest random volume multiplier is generated for each observation.
- Given vehicles observed (exposure) and the scenario's underlying rate, stops are drawn from a **Poisson count distribution**. Because data are sampled, observed rates will not equal nominal rates exactly.
- The **first 21 days are identical across all three CSVs**, as are all non-targeted observations.
- The special intervention window is **2026-09-25 to 2026-09-29 inclusive**, for **Zone_C evening** only (five rows).
- `ticket_blitz.csv`: underlying stop rate in those five rows is multiplied by **five**; `authorization_status` is `outside` with hypothetical `policy_reference` = `SIM-AUTH-001`. **SIM-AUTH-001 is entirely fictional**, created only to test whether the interface clearly displays authorization context. This is not evidence of a violation.
- `traffic_surge.csv`: traffic exposure in the same five rows is multiplied by **two**, and stop counts are freshly sampled at the **unchanged** per-vehicle rate. Authorization remains `unknown`.
- All `source_type` values are `synthetic`; no personally identifiable data are generated.

## How the dashboard should analyze the data

The **primary measure** is observed traffic enforcement stops per 1,000 vehicles, calculated for each row:

`rate_per_1000 = 1000 * stops_observed / vehicles_observed`

For each comparable **zone + shift** group, the proposed Poisson **u-chart** uses the baseline portion only:

- `u_bar = sum(baseline stops) / sum(baseline vehicles)` (stops per vehicle)
- `center_line = 1000 * u_bar` (stops per 1,000 vehicles)
- `UCL_i = 1000 * (u_bar + 3 * sqrt(u_bar / vehicles_observed_i))`
- `LCL_i = 1000 * max(0, u_bar - 3 * sqrt(u_bar / vehicles_observed_i))`

Flag a monitoring observation if its rate lies **outside** its group-specific control limits. This is a statistical signal prompting **review**, not a finding of unlawful conduct. Rates are observations, not statements about the underlying traffic-violation rate or officers' intent.

**Assumptions and limitations:** An approximately Poisson event-count process, comparable observation windows, consistent and representative coverage, no duplicate tallying, and a stable baseline. Variation in observer coverage, vehicle behavior, enforcement hours, neighborhoods, seasonal patterns, or officer deployment can confound rate comparisons. Increased traffic alone does not logically imply increased enforcement intensity. Checking many observations may produce occasional false SPC alerts under a stable process.

The five-row scenario comparison is designed to demonstrate contrasting outcomes. Across the **full 112 monitoring rows**, the ordinary baseline sample happens to contain a single incidental upper-control-limit exceedance (Zone_A evening, 2026-09-24). This is stochastic variation and is **not** a planted blitz. It also appears in the other two files because shared observations are identical. CivicWatch should report this transparently rather than promising zero false positives.

For use with actual observational data, the team would need a written sampling protocol, trained observers, appropriately documented time windows and locations, reliable exposure counts, duplicate checks, coverage-quality metrics, and authenticated policy references before attempting legal or policy interpretations. Do not upload sensitive personal information to a public prototype.

## Reproduce the CSV files

From the project root, with Python and NumPy installed:

```bash
python -m pip install numpy
python data/generate_data.py
```

This regenerates the three CSVs in `data/`. The generator is deterministic with the same NumPy version and compatible Python environment. The output file contents can be regenerated from source; no real-world data or access credentials are required.

## Expected behavior in the MVP

1. `baseline.csv`: Stable nominal enforcement intensity; an isolated chance signal may occur.
2. `ticket_blitz.csv`: Clearly flag all five injected Zone_C evening observations in the intervention window, with rates markedly above the Zone_C evening baseline limits.
3. `traffic_surge.csv`: Show greater **raw** vehicle and stop counts for those same five observations without incorrectly concluding that the **normalized** rate increased. Do not flag those five observations solely because exposure doubled.

### Known-answer mathematical check (independent of the CSV generator)

Five baseline rows, each with 100 vehicles, have stop counts `2, 3, 1, 2, 2`:

- Pooled center line: **20 stops per 1,000 vehicles**.
- UCL for 100 vehicles: **62.43 stops per 1,000 vehicles**.
- LCL: **0 stops per 1,000 vehicles**.
- A monitoring row of 7 stops in 100 vehicles: **70 stops per 1,000 vehicles**, above the UCL.

This arithmetic example is a calculation test only, **not** an assertion that five baseline rows are sufficient for real process monitoring.
