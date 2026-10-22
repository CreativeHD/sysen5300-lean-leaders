# SPEC: Six Sigma Hackathon Team Project

**Project:** CivicWatch: Traffic Enforcement Monitoring Dashboard

This specification documents the Lean Leaders team's implemented CivicWatch MVP for the Cornell SYSEN 5300 Six Sigma Hackathon and distinguishes future enhancements from delivered functionality.

## 1. Team and Prompt

- **Team name:** Lean Leaders
- **Track:** Virtual DL Challenge (7 days)
- **Prompt we chose:** Urban Systems — Civil Liberties
- **Project name:** CivicWatch
- **Public repository:** https://github.com/CreativeHD/sysen5300-lean-leaders

## 2. User and Use Case

**User:** A civil rights NGO field coordinator who reviews citizen-reported traffic enforcement observations.

**Decision the tool supports:** Determine whether an observed increase in traffic enforcement is statistically unusual and merits further documentation or investigation.

**When this decision occurs:** During or immediately after an observation shift, as newly gathered field-observation CSV records become available. The hackathon MVP supports rapid repeat uploads, not automatic live data streaming.

**Why this matches the prompt:** CivicWatch helps concerned citizens and civil rights organizations document and analyze traffic enforcement patterns, including suspected enforcement blitzes occurring outside documented authorized contexts.

The tool does not independently determine whether government conduct is unlawful or discriminatory.

## 3. Inputs

The application accepts a CSV file containing standardized field observations.

**Unit of observation:** One geographic monitoring zone during one observation shift.

### Required variables

| Column | Type and units | Collection method |
|---|---|---|
| `date` | Date (YYYY-MM-DD) | Field observation log |
| `zone_id` | Categorical identifier | Predefined monitoring locations |
| `shift` | Categorical (morning, afternoon, evening) | Standardized observation schedule |
| `vehicles_observed` | Positive integer, vehicles | Manual or automated traffic count |
| `stops_observed` | Nonnegative integer, enforcement stops | Citizen field observations |
| `phase` | Baseline or monitoring | Defined study periods |

### Optional variables

| Column | Type and units | Collection method |
|---|---|---|
| `authorization_status` | Authorized, Outside, Unknown | Documented authorization policy |
| `policy_reference` | Text or URL | Applicable public policy document |
| `source_type` | Agency record, field observation, synthetic | Data provenance |

Monitoring shifts must use a documented observation protocol. Vehicles and stops must be counted within the same geographic area and observation window.

No personally identifiable motorist information is required.

## 4. Statistical Methods

### Primary Method: Poisson u-Chart

CivicWatch uses a u-chart to monitor enforcement stops per 1,000 observed vehicles.

The method is appropriate for monitoring event counts when the number of vehicles observed varies across monitoring periods.

**Enforcement rate:**

Rate = (Stops Observed / Vehicles Observed) × 1,000

**Baseline center line:**

u-bar = Total Baseline Stops / Total Baseline Vehicles

**Control limits:**

UCL = u-bar + 3 × sqrt(u-bar / Vehicles Observed)

LCL = max(0, u-bar - 3 × sqrt(u-bar / Vehicles Observed))

The center line and control limits are multiplied by 1,000 for display.

Control limits are calculated using baseline observations only. Separate baselines are preferred for comparable zones and shifts.

### Statistical Assumptions

- Field observations represent the same defined process over time.
- Vehicle counts and enforcement stop counts cover the same observation window.
- Enforcement stops are distinct, consistently defined events.
- Event counts are approximately Poisson-distributed.
- The baseline process is sufficiently stable.
- Observation periods are sufficiently comparable.
- Changes in traffic conditions, observation coverage, or enforcement deployment can affect interpretation.

The tool will validate input values and flag insufficient baseline information.

### Known-Answer Validation

Use five baseline monitoring periods, each containing 100 observed vehicles.

Observed stop counts: 2, 3, 1, 2, 2.

Expected results:

- Total baseline stops: 10
- Total baseline vehicles: 500
- Center line: 20 stops per 1,000 vehicles
- Upper control limit: approximately 62.43 stops per 1,000 vehicles
- Lower control limit: 0 stops per 1,000 vehicles

A subsequent observation containing 7 enforcement stops among 100 vehicles has a rate of 70 stops per 1,000 vehicles and must trigger an upper-limit signal.

This small example is for validating the calculation. Operational datasets will require more baseline observations.

### Proposed Future Method: Poisson Rate Comparison (Not Implemented)

A future version could compare monitoring periods or comparable zones after this secondary method is implemented and independently validated. The current MVP uses the Poisson u-chart for statistical alerts.

**Rate ratio:**

RR = (Stops B / Vehicles B) / (Stops A / Vehicles A)

A future version could report:

- Enforcement rate in each group.
- Rate ratio.
- Confidence interval.
- Statistical interpretation.

A statistically unusual observation or rate difference does not establish unlawful enforcement, intent, or causation.

### Edge Cases

The statistical functions must handle:

- Missing measurements.
- Zero or negative vehicle exposure.
- Negative enforcement stop counts.
- Insufficient baseline observations.
- No observed baseline enforcement stops.
- Constant observations.
- Invalid phase labels.

For invalid or insufficient data, the tool will return a clear explanation rather than an unsupported numerical result.

**Implementation rule:** Statistical calculations must reside in a plain, independently tested Python module (`app/qc.py`). The API and user interface will only call the statistical module and display its results.

Each statistical function must pass a known-answer test and relevant edge-case tests before integration.

## 5. Delivery

**Technology stack:**

- Statistical analysis: Python
- Backend: FastAPI
- Frontend: React with Vite
- Data interchange: CSV and JSON
- Deployment: Cornell Posit Connect server

**Starting demonstration:** Instructor-provided `demos/fastapi/`, copied into `app/`.

The instructor's React frontend template will guide the interface implementation.

The application will preserve the starter framework's required workflow:

- `testme`: Start the application locally.
- `manifestme`: Generate the deployment manifest.
- `deployme`: Deploy to Posit Connect.
- `README.md`: Document usage and setup.

Frontend-to-backend communication and deployment compatibility must be verified early.

## 6. Outputs

The implemented MVP provides:

1. **CSV upload and validation:** Accept UTF-8 CSV observations and return descriptive errors for missing, malformed, or invalid data.
2. **Summary counts and rates:** Display observation counts, vehicles observed, stops observed, pooled baseline/monitoring rates, and the monitoring-to-baseline descriptive rate comparison. Show stop rates per 1,000 vehicles in charts and group comparisons.
3. **SPC control charts:** Plot observed rates, baseline-only center lines, and exposure-adjusted upper and lower limits by zone and shift.
4. **Statistical signals:** Flag monitoring observations with rates outside their Poisson u-chart limits.
5. **Descriptive comparisons:** Show monitoring rates by zone, a zone-by-shift alert heatmap, and box-and-whisker distributions of monitoring rates by zone.
6. **Investigation log:** Show flagged dates, zones, shifts, stop counts, vehicle exposures, stop rates, estimated center lines, control limits, source provenance, and *reported, unverified* authorization context. Provide an alert-only CSV export.
7. **Statistical cautions:** Expose the API's Pearson dispersion and insufficient-baseline warnings, without treating the screening heuristics as proof of baseline stability.
8. **Six Sigma interpretation:** Explain measurement review, baseline assumptions, limitations of multiple monitoring checks, and the distinction between a statistical flag and a legal finding.

**Proposed future enhancements (not implemented in the MVP):** Validated rate-ratio confidence intervals and inferential tests; additional appropriately adapted SPC run/trend rules; formal stability and independence assessments; authenticated policy and field-data verification; and a complete, governed evidence-report package beyond the current alert-only CSV download.

Displayed rates have units, and the UI explains that statistical signals call for further investigation rather than establishing legal conclusions. Additional measurement risks and course-method distinctions are documented in [`docs/FIELD_OBSERVATION_FMEA.md`](docs/FIELD_OBSERVATION_FMEA.md) and [`docs/COURSE_ALIGNMENT.md`](docs/COURSE_ALIGNMENT.md).

## 7. Test Datasets and Codebook

Three synthetic datasets will be created and stored in `data/`.

### Dataset A: `baseline.csv`

Represents an approximately stable enforcement process across normal monitoring periods.

Expected behavior: The tool calculates baseline rates and does not detect any deliberately introduced sustained enforcement increase.

### Dataset B: `ticket_blitz.csv`

Represents routine enforcement followed by an artificially introduced period of elevated enforcement stops in a selected zone.

Expected behavior: The tool detects and highlights statistically unusual increases.

### Dataset C: `traffic_surge.csv`

Represents an increase in traffic volume that produces more observed enforcement stops without a substantial increase in enforcement stops per vehicle.

Expected behavior: The tool accounts for traffic exposure and avoids treating higher raw counts alone as evidence of unusual enforcement rates.

All datasets will be explicitly labeled as synthetic.

### Codebook

`data/README.md` will document:

- The purpose of each dataset.
- Every variable, its type, and measurement units.
- How each measurement would be collected in actual field conditions.
- The observation and baseline protocols.
- Any simulated enforcement changes.
- Limitations and assumptions.

A reproducible data-generation procedure will use a fixed random seed.

## 8. Documentation and Reproducibility

The project's README will explain:

- The intended user and purpose.
- How to install dependencies and start CivicWatch.
- How to structure and upload CSV files.
- All parameters, statistical methods, and assumptions.
- How to interpret the control chart and rate comparisons.
- How to reproduce results using the three test datasets.
- How to execute automated tests.
- The publicly accessible deployed application URL.

The repository will contain the complete source code, tests, data codebook, and demonstration instructions.

The final Devpost submission will include the public GitHub repository link and a working demonstration.

## 9. Out of Scope

The hackathon prototype will not implement:

- User logins or authentication.
- Persistent databases.
- Collection of motorists' personal information.
- Automatic ingestion of live police or government data.
- Automated findings of discrimination or illegality.
- Predictive policing.
- Machine-learning crime prediction.
- Automated legal complaints or filings.
- Advanced mapping or geographic optimization.
- Additional statistical techniques before the initial analysis is validated.

**Project priority:** Deliver a statistically correct, reproducible, and understandable monitoring tool before adding optional functionality.
