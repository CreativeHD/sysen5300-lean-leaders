# SYSEN 5300 methodology and course alignment

**CivicWatch | Lean Leaders | Six Sigma Hackathon, Virtual Distance Learning**

CivicWatch uses statistical process control (SPC) to identify *field-observed* traffic-enforcement stop rates that warrant careful follow-up. This note explains the statistical decisions, the course methods applied, the limits of the demonstration, and the methods intentionally excluded.

**Textbook:** [Timothy Fraser, Six Sigma and Quality Engineering](https://timothyfraser.com/sigma/contents.html).

## Problem framing and the Six Sigma workflow

| Stage | CivicWatch application | Evidence or limitation |
|---|---|---|
| **Define** | A civic field coordinator asks whether observed stop rates in a zone/shift differ unusually from a documented historical baseline. | This is a screening decision, not a legal finding. |
| **Measure** | Record one date, zone, shift, vehicles observed, and distinct stops observed for the same location and observation window. | Collection and sampling protocols matter; today's CSVs are entirely synthetic. |
| **Analyze** | Estimate a zone/shift-specific baseline rate and compare later observations with exposure-adjusted three-sigma Poisson u-chart limits. | Tested in plain Python and across three controlled scenarios. |
| **Improve** | Investigate recording errors, policy context, and process changes before taking action. | Improvement actions cannot be justified from synthetic data or SPC flags alone. |
| **Control** | Repeat observations with a consistent protocol, review baseline adequacy, and track future rates against justified limits. | The hackathon MVP uses CSV upload, not streaming or an operational governance system. |

## Why a Poisson u-chart?

An ordinary count chart can mistake increased traffic volume for an enforcement surge. A **u-chart** monitors the number of observed events per exposure unit, accommodating different vehicle counts.

For a group defined by zone and shift, let:

- \`c_i\`: observed stops in one observation period;
- \`n_i\`: vehicles observed during that same period;
- \`u_bar = sum(baseline c_i) / sum(baseline n_i)\`: historical stops per vehicle.

The plotted observed rate per 1,000 is \`1,000 * c_i / n_i\`, with limits:

- Center: \`1,000 * u_bar\`
- UCL: \`1,000 * (u_bar + 3 * sqrt(u_bar / n_i))\`
- LCL: \`1,000 * max(0, u_bar - 3 * sqrt(u_bar / n_i))\`

Only monitoring observations strictly beyond the limits count as u-chart alerts. Each zone/shift has its own baseline. The underlying calculations and signal decisions live only in [\`app/qc.py\`](../app/qc.py); the frontend summarizes the returned results without recalculating SPC limits.

### Binomial versus Poisson modeling

If each counted vehicle is either stopped or not stopped, a **p-chart** using a binomial model is conceptually more exact. CivicWatch uses a Poisson approximation for **rare stop events**, yielding an interpretable event rate per 1,000 vehicles. On the three demonstration datasets, a separate binomial p-chart calculation flagged the same records as the Poisson u-chart (1, 6, and 1 alerts, respectively), but this agreement does **not** establish equivalence on arbitrary future datasets.

The Poisson model also assumes approximately independent events and comparable observation coverage. In actual fieldwork, repeated patrol patterns, weather, time-of-day effects, incomplete observation, and clustering can affect the validity of these limits.

## Understanding the baseline

The three synthetic datasets have identical baselines: 21 observation dates per zone/shift (September 1–21, 2026), followed by 14 monitoring dates per group.

The Python engine enforces a minimum baseline count, warns when fewer than 20 baseline periods are available, and calculates an approximate Pearson dispersion diagnostic for each zone/shift. Heuristic warnings appear when dispersion is above 1.5 or below 0.5.

For these synthetic data, two groups trigger warnings:

| Zone / shift | Pearson dispersion | Screening message |
|---|---:|---|
| Zone_B evening | 1.738 | Possible overdispersion |
| Zone_C evening | 0.448 | Possible underdispersion |

These are **screening heuristics, not formal stability certifications**. The baseline must still be evaluated for sampling consistency, temporal dependence, process shifts, and representativeness. The MVP implements only the single-point beyond-three-sigma SPC rule. Western Electric/Nelson run and trend rules are discussed in the textbook but are not implemented in this prototype; transplanting normal-theory rules onto discrete, variable-exposure counts would require careful adjustment and independent testing.

## Known-answer and scenario validation

A hand-check uses five baseline records of 100 vehicles each, with 2, 3, 1, 2, and 2 stops. The pooled historical rate is **20 stops per 1,000**, UCL approximately **62.43**, LCL **0**; a monitoring record of 7 stops in 100 vehicles has rate **70**, exceeding the UCL.

| Dataset | Total monitoring alerts | Planted Zone_C evening alerts (Sept 25–29) | Meaning |
|---|---:|---:|---|
| \`baseline.csv\` | 1 | 0 | An incidental chance exceedance remains possible in a stable generating model. |
| \`ticket_blitz.csv\` | 6 | 5 | A fivefold injected underlying event rate triggers five intended alerts plus the shared incidental alert. |
| \`traffic_surge.csv\` | 1 | 0 | Doubling vehicles with an unchanged underlying rate does not trigger a false surge alarm in the five target windows. |

These tests are deterministic synthetic demonstrations, **not field validation**. See [\`data/VALIDATION.md\`](../data/VALIDATION.md), [\`data/README.md\`](../data/README.md), and [the guided demo](../demo/README.md).

## Descriptive summaries are not inferential tests

The interface also calculates pooled stop counts, vehicle exposure, rates, and a monitoring-to-baseline rate ratio by zone/shift. These are **descriptive**; they do not come with confidence intervals, do not account for all possible confounders, and do not replace the Python u-chart's observation-level decisions.

Because the monitoring data contain 112 checks across eight groups, **some chance alerts are expected when many observations are screened**. Control-chart limits are not the same as legal policy thresholds, process specification limits, or confidence intervals about the intent of individual officers.

## Distinguishing statistical signals from legal conclusions

The optional \`authorization_status\`, \`policy_reference\`, and \`source_type\` fields are **reported context**, not authenticated legal evidence. CivicWatch does not independently check laws, validate policy references, infer discrimination, or decide legality. Synthetic scenario labels such as \`outside\` and \`SIM-AUTH-001\` are wholly fictional.

A responsible coordinator should verify traffic counts, duplicate exclusions, observer coverage, time and location definitions, baseline stability, and authentic policy documentation before escalating any finding. See our [field-observation FMEA](FIELD_OBSERVATION_FMEA.md) for plausible failure modes and preventive controls.

## What the tool deliberately does not include

- **Cp/Cpk/Pp/Ppk:** no externally justified upper or lower **specification** limits exist for traffic-stop rates. A statistical control limit cannot be substituted for a policy limit.
- **Eight special-cause tests:** only the first three-sigma exceedance test is implemented. Other run rules need validation for rare, discrete counts with variable exposure.
- **Regression, ANOVA, DOE or causal modeling:** current synthetic data are not an observational design sufficient to infer reasons for stops or an intervention's effects.
- **Reliability/Weibull/survival models:** the data contain counted field observations, not time-to-failure outcomes.
- **Rate-ratio confidence intervals or independent hypothesis tests:** potentially useful future statistical work; not implemented in this MVP.
- **Live ingestion, identity management, sensitive personal data, or automated enforcement findings:** intentionally outside scope.

**Bottom line:** CivicWatch is a reproducible, bounded example of the SPC, probability, measurement, and risk-aware reasoning taught in SYSEN 5300. It is a statistical screening and educational tool, not a validated enforcement surveillance or legal decision system.
