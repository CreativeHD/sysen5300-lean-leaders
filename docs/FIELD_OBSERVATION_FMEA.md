# CivicWatch: Field-observation FMEA

**SYSEN 5300 qualitative risk review | Lean Leaders**

This Failure Modes and Effects Analysis (FMEA) addresses **how field-data collection and interpretation can fail**, not the behavior of any particular agency or person. CivicWatch's publicly supplied datasets are fictional, and this FMEA is an educational exercise.

## Scoring approach

The illustrative scores use 1–10 ordinal scales:

- **Severity (S):** 10 = most severe consequence for the validity or safe use of the tool.
- **Occurrence (O):** 10 = most likely under an assumed, uncontrolled field protocol.
- **Detection (D):** 10 = hardest to identify before a result is interpreted.
- **Illustrative RPN:** S × O × D. This is a screening prioritization tool, **not an observed probability, empirical risk estimate, or validated ranking**.

The scores are hypothetical expert-judgment placeholders. Real field deployment requires stakeholder review of severity, frequency, existing controls, and residual risk; a high-severity failure should not be dismissed solely because its RPN is lower.

## Preliminary failure-mode register

| ID | Failure mode | Consequence / effect | S | O | D | Illustrative RPN | Prevention and detection |
|---|---|---|---:|---:|---:|---:|---|
| F-01 | Baseline collected during an atypical enforcement period | Misleading control limits; unusual activity normalized or routine activity falsely flagged | 8 | 6 | 7 | **336** | Prespecify baseline sampling plan; review context, temporal patterns, dispersion, and external changes; approve baseline before monitoring |
| F-02 | Observer misses actual stops or departs early | Understated stop counts, misleading rate, biased group comparisons | 9 | 5 | 7 | **315** | Train observers, reconcile window start/stop, use paired checks or independent sources |
| F-03 | Authorization status is recorded incorrectly or treated as verified | Unsupported legal interpretation and potentially harmful allegations | 9 | 4 | 8 | **288** | Default to \`unknown\`; capture genuine policy citation, jurisdiction, date and scope; independent legal/contextual verification |
| F-04 | Passing vehicles are undercounted | Inflated exposure-adjusted rate and potentially false alerts | 8 | 5 | 6 | **240** | Calibrate traffic counter, double-count selected periods, record camera/observer coverage |
| F-05 | Location or shift windows are inconsistent | Non-comparable baseline and monitoring observations | 8 | 4 | 6 | **192** | Fixed zone boundaries; standard shift definitions; log exact coverage and changes |
| F-06 | Same traffic stop counted multiple times | Inflated event counts and artificial anomalies | 7 | 4 | 6 | **168** | Distinct event protocol and duplicate reconciliation; preserve time-window audit metadata |
| F-07 | Personally identifying details collected or uploaded inadvertently | Privacy and safety harm | 10 | 3 | 5 | **150** | Data minimization; ban names, plates and identifiers; local review before upload; privacy policy and retention planning |
| F-08 | Monitoring rows assigned as baseline or dates out of order | Biased limits or phase leakage | 7 | 4 | 3 | **84** | Prespecify phase assignments and study dates; backend rejects chronology errors and duplicates |

## Controls already implemented

- Required CSV columns and positive vehicle exposure.
- Nonnegative, integer stop counts with stops not greater than vehicles counted.
- Duplicate \`date + zone_id + shift\` record rejection.
- A required baseline, minimum baseline observation count, and chronological phase checking.
- Exposure-adjusted control limits estimated from baseline observations only.
- Pearson dispersion screening warnings, returned by the API and displayed in the enhanced dashboard.
- Display of source type, reported authorization context, and explicit statistical/legal caveats.
- Synthetic datasets and tested expected outcomes.

These controls are useful, but **they do not replace independently validated field observation protocols**. For example, software cannot detect every missed traffic stop, coverage gap, or false claim about an authorization document.

## Recommended follow-up before real deployment

1. Agree on field definitions and an observation schedule with community partners and domain experts.
2. Train observers and independently audit a subset of traffic and stop counts.
3. Define objective baseline inclusion/exclusion rules before examining results.
4. Evaluate model fit, autocorrelation, covariates, and alternative binomial or overdispersed count models using real data.
5. Establish secure data retention, role-based access, privacy review, and correction procedures.
6. Conduct independent policy verification and obtain appropriate legal/ethical review before any external allegation.
7. Update the FMEA with actual evidence and verify that corrective actions reduce residual risk.

**Takeaway:** The highest-priority illustrative failures concern an invalid baseline, missed events, and incorrect policy context. CivicWatch should therefore be presented as a tool for *documenting and reviewing* statistical signals, not for certifying an enforcement violation.
