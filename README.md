# CivicWatch

**Community Traffic Enforcement Monitoring | Cornell SYSEN 5300 Six Sigma Hackathon | Lean Leaders**

CivicWatch is a browser-based statistical process control (SPC) dashboard for examining **observed traffic enforcement stops per 1,000 passing vehicles**. It helps community organizations and field coordinators identify observations that are unusual relative to an established local baseline and worth reviewing further.

**CivicWatch does not determine whether enforcement was unlawful, discriminatory, or unauthorized.** Its alerts are statistical signals, not legal findings. The three datasets provided with this project are **entirely synthetic** and are not records of any actual police department or municipality.

## Try the live dashboard

**[Open CivicWatch on Posit Connect](https://connect.systems-apps.com/content/0d9b2040-b25f-4d19-82ff-6f6f20b9511e/)**

The public dashboard can be used from a desktop browser without installing Python, Node.js, or VS Code. It uses this separate [FastAPI analysis service](https://connect.systems-apps.com/content/c1c8025f-66c6-46dc-ad09-0cea7e56dca1/), which also provides [interactive API documentation](https://connect.systems-apps.com/content/c1c8025f-66c6-46dc-ad09-0cea7e56dca1/docs).

1. Download one of the example CSVs from [`data/`](data/) using GitHub's **Download raw file** control.
2. Open the dashboard, choose the CSV file, then select **Analyze Dataset**.
3. Read the summary results: number of observations, zone/shift groups, and monitoring alerts.
4. Select a zone and shift to inspect its time-series control chart. Scroll down for alerts and the additional zone comparisons.
5. Repeat with the other datasets to see how the method distinguishes increased stop *rates* from increased traffic volume.

The [illustrated, three-scenario demonstration](demo/README.md) explains exactly what to expect. Professor Fraser confirmed that a screenshot-based or guided walkthrough is an acceptable demonstration format for the Distance Learning Hackathon.

## Three reproducible test scenarios

| File | Scenario | Observations | Zone/shift groups | Monitoring alerts |
| --- | --- | ---: | ---: | ---: |
| [`data/baseline.csv`](data/baseline.csv) | Routine variation under a stable generating process | 280 | 8 | **1** |
| [`data/ticket_blitz.csv`](data/ticket_blitz.csv) | Five simulated elevated-rate observations in Zone_C evening | 280 | 8 | **6** |
| [`data/traffic_surge.csv`](data/traffic_surge.csv) | Doubled vehicle exposure, with no underlying enforcement-rate increase | 280 | 8 | **1** |

All three datasets have 168 baseline observations (September 1–21, 2026) and 112 monitoring observations (September 22–October 5, 2026), across four fictional zones and two shifts. The one shared alert is a chance upper-limit exceedance in **Zone_A, evening, September 24**, not a planted enforcement blitz. The five additional signals in `ticket_blitz.csv` correspond to **Zone_C evening, September 25–29**. The traffic-surge scenario produces no signals in those five target observations.

These expected results have been checked with the statistical tests and through the deployed dashboard. The [data codebook](data/README.md) documents the generation method, every column, units, assumptions, and limitations; [`data/VALIDATION.md`](data/VALIDATION.md) records reference calculations.

## Intended user and workflow

**Intended user:** A civil-rights or civic-oversight organization's field coordinator who gathers consistent observational counts of traffic and enforcement activity.

**Question the tool answers:** Does a particular zone/shift have an enforcement stop rate sufficiently different from its own historical baseline to trigger further review?

**Data requirement:** Standardized observations with passing-vehicle exposure and distinct observed stops counted in the same location and time window. Zone and shift comparisons should follow a documented collection protocol.

CivicWatch analyzes a user-selected CSV in the browser via its API. It does not continuously monitor live traffic, collect personal information, or store user accounts.

## CSV inputs

The upload must be a UTF-8 `.csv` file up to **5 MB**. Every record represents one date, zone, and shift. Six columns are required:

| Column | Type and meaning |
| --- | --- |
| `date` | `YYYY-MM-DD` observation date |
| `zone_id` | Nonempty zone identifier, such as `Zone_C` |
| `shift` | Nonempty shift identifier, such as `morning` or `evening` |
| `vehicles_observed` | Positive integer count of passing vehicles during that observation window |
| `stops_observed` | Nonnegative integer count of distinct observed enforcement stops in the same window; cannot exceed observed vehicles |
| `phase` | `baseline` or `monitoring` |

Optional context fields are `authorization_status`, `policy_reference`, and `source_type`; see the [full data dictionary](data/README.md). The provided datasets use all nine fields. A missing optional authorization status is treated as `unknown`, not as proof of authorization or a violation.

The statistical engine checks data types, uniqueness of `(date, zone_id, shift)`, sufficient baseline periods, chronological phases, and valid exposure. API validation errors are returned with HTTP 422; files over 5 MB return HTTP 413.

## Statistical method

The core analysis uses a **baseline-only Poisson u-chart** with **3-sigma control limits** for each `(zone_id, shift)` group. A u-chart adjusts for unequal numbers of passing vehicles in different observation windows. The rate shown in the dashboard is:

`observed_rate_per_1000 = 1000 * stops_observed / vehicles_observed`

For each group, estimate the baseline rate in stops per vehicle:

`u_bar = total_baseline_stops / total_baseline_vehicles`

For each observation with `n` passing vehicles, the displayed limits are:

- `Center = 1000 * u_bar`
- `UCL(n) = 1000 * (u_bar + 3 * sqrt(u_bar / n))`
- `LCL(n) = 1000 * max(0, u_bar - 3 * sqrt(u_bar / n))`

A **monitoring** observation is flagged if its observed rate is **strictly above the UCL or below the LCL**. Baseline observations establish the limits and are not counted as monitoring alerts. Limits narrow with greater traffic exposure because sampling uncertainty decreases under the Poisson model.

The Python entry point is [`app/qc.py`](app/qc.py), function `u_chart(rows, min_baseline=5)`. It accepts iterable records and returns group summaries, per-observation rate/limits/signal indicators, a summary, and warnings. Five baseline periods is only the minimum used to support a mathematical test case; the function warns when a group has fewer than 20. It also computes a Pearson dispersion diagnostic and warns about possible overdispersion or underdispersion.

**Hand-checked example:** Five baseline observations with 100 vehicles each and stop counts `2, 3, 1, 2, 2` have a center of **20** stops per 1,000 vehicles, a UCL of **62.43**, and a LCL of **0**. A subsequent observation of seven stops among 100 vehicles yields **70** stops per 1,000 and is flagged above the UCL.

### Interpreting the dashboard

- **Observed rate:** Stops per 1,000 vehicles for the selected date/zone/shift.
- **Center line:** Estimated historical baseline rate for that zone and shift.
- **UCL and LCL:** Exposure-sensitive statistical control limits, not policy or legal thresholds.
- **Monitoring alerts:** Number of monitoring observations outside their limits across all groups.
- **Zone summaries and distributions:** Exploratory comparisons of observed rates and alerts across zones; these do not establish causes.

The dashboard also includes a box-and-whisker visualization of monitoring rates by zone. It provides a descriptive view of the rates, not a numerical standard-deviation statistic. The independent Poisson u-chart, rather than this comparison plot, determines monitoring alerts.

### Assumptions and limitations

The method assumes reasonably comparable observation windows, consistently recorded distinct stops and vehicle exposure, approximately Poisson-distributed counts, and a representative, reasonably stable baseline. Observer coverage, officer deployment, seasonality, changing traffic patterns, or shifts in recording practices can confound results. Multiple tested observations can produce occasional chance signals even without any actual process change.

**An SPC signal calls for data-quality checks and further context, not an accusation.** No actual legal authorization status has been determined from the synthetic datasets. Do not upload names, license plates, or other sensitive personal information to this demonstration application.

The project's [`SPEC.md`](SPEC.md) describes proposed future enhancements, including rate-ratio confidence intervals and evidence export. **Those proposed extensions are not implemented in the current MVP** and are not required to use the existing Poisson u-chart dashboard.

## Architecture and source files

| Path | Purpose |
| --- | --- |
| [`app/qc.py`](app/qc.py) | Pure-Python validation, Poisson u-chart, SPC signal detection |
| [`app/app.py`](app/app.py) | FastAPI HTTP endpoints and CSV upload validation |
| [`frontend/`](frontend/) | React/Vite static dashboard and interactive charts |
| [`data/`](data/) | Three synthetic example CSVs, generator, codebook, and checks |
| [`tests/test_qc.py`](tests/test_qc.py) | Statistical known-answer, scenario, and edge-case tests |
| [`app/test_app.py`](app/test_app.py) | Backend HTTP endpoint tests |
| [`demo/README.md`](demo/README.md) | Guided three-dataset demonstration |
| [`CONTRACT.yaml`](CONTRACT.yaml) | Hackathon task and verification ledger |

`POST /analyze` accepts a multipart form upload with field name `file`. `GET /` returns service status, and `GET /docs` provides FastAPI's interactive endpoint documentation. The server delegates all statistical calculations to `u_chart` and returns JSON; the React UI renders the returned results.

## Run locally and reproduce

**Prerequisites:** Python 3.12, Node.js 22+, npm, and Git. The published dashboard above does not require any of these tools. While this work remains on `hackathon-civicwatch`, switch to that branch after cloning; the team plans a reviewed merge into the default `main` branch before submission.

### Windows PowerShell

```powershell
# From a new directory:
git clone https://github.com/CreativeHD/sysen5300-lean-leaders.git
cd sysen5300-lean-leaders
git switch hackathon-civicwatch

# Install and verify the Python backend:
py -3.12 -m pip install -r app/requirements-dev.txt
py -3.12 -m pytest tests app/test_app.py -q

# Terminal 1, start the API:
cd app
py -3.12 -m uvicorn app:app --host 127.0.0.1 --port 8000
```

In a **second terminal**, from the repository root:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

Open the local Vite URL (typically `http://localhost:5173/`) and upload one of the CSVs from `data/`. The local Vite proxy sends `/analyze` requests to FastAPI on port 8000. `npm.cmd` is used to avoid common PowerShell restrictions on `npm.ps1`.

### macOS or Linux

From the repository root after cloning and switching to `hackathon-civicwatch`:

```bash
python3 -m pip install -r app/requirements-dev.txt
python3 -m pytest tests app/test_app.py -q
cd app
python3 -m uvicorn app:app --host 127.0.0.1 --port 8000
```

In another terminal, from the repository root:

```bash
cd frontend
npm ci
npm run dev
```

### Regenerate synthetic data

```bash
python3 -m pip install numpy
python3 data/generate_data.py
```

On Windows, use `py -3.12` instead of `python3` if preferred. The sample CSVs are already committed; regeneration is optional. Tests use the committed datasets to verify the expected alert counts. A clean-checkout run previously passed **30 Python tests** (17 QC + 13 API).

## Deployment and submission

The frontend and API are **separate** Posit Connect content items. The [frontend deployment workflow](.github/workflows/deploy-react-static.yml) builds the frontend, publishes its static `dist/` assets, and checks the published URL. Automatic push deployment is intentionally paused; future frontend changes need a coordinated manual publish. The existing public application remains live.

**Hackathon:** Virtual Distance Learning Challenge, Cornell SYSEN 5300. The Canvas submission requires the team's public repository link and Devpost project link. Confirm the published project is accessible without a login. The confirmed deadline is **October 23, 2026, at 3:00 PM Eastern**.

**Credits:** Lean Leaders team. The application builds on the [Cornell Six Sigma Hackathon starter materials](https://github.com/timothyfraser/sixsigmahackathon) and uses FastAPI, React/Vite, Recharts, and Plotly. Statistical findings must be interpreted within the stated sampling assumptions.
