"""CivicWatch statistical process control calculations.

This module has no dependencies on FastAPI, React, plotting, pandas, or NumPy.

Method: baseline-only Poisson u-chart for observed traffic stops per vehicle,
reported in stops per 1,000 passing vehicles. Comparable zone/shift groups are
estimated separately. Only monitoring observations are flagged as signals.

A statistical signal is not evidence that enforcement was illegal or biased.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import date
from math import sqrt
from typing import Any, Iterable, Mapping

MIN_BASELINE_PERIODS = 5  # Supports SPEC's 5-period mathematical check; prefer >=20 in real studies.
SCALE = 1000.0


def _nonnegative_integer(value: Any, field: str, row: int, *, positive: bool = False) -> int:
    """Accept CSV-style integer strings or actual ints, but not decimals/booleans."""
    if isinstance(value, bool):
        raise ValueError(f"Row {row}: {field} must be an integer, not a boolean")
    if isinstance(value, int):
        number = value
    elif isinstance(value, str) and value.strip().isdigit():
        number = int(value.strip())
    else:
        raise ValueError(f"Row {row}: {field} must be an integer")
    if number < 0 or (positive and number == 0):
        constraint = "positive" if positive else "nonnegative"
        raise ValueError(f"Row {row}: {field} must be {constraint}")
    return number


def _clean_rows(rows: Iterable[Mapping[str, Any]]) -> list[dict[str, Any]]:
    clean: list[dict[str, Any]] = []
    keys_seen: set[tuple[str, str, str]] = set()
    required = {"date", "zone_id", "shift", "vehicles_observed", "stops_observed", "phase"}
    for i, raw in enumerate(rows, start=1):
        if not isinstance(raw, Mapping):
            raise ValueError(f"Row {i} must be a mapping with named columns")
        missing = required.difference(raw)
        if missing:
            raise ValueError(f"Row {i} missing column(s): {', '.join(sorted(missing))}")
        try:
            day = date.fromisoformat(str(raw["date"]))
        except (ValueError, TypeError) as exc:
            raise ValueError(f"Row {i}: date must be ISO YYYY-MM-DD") from exc
        if str(raw["date"]) != day.isoformat():
            raise ValueError(f"Row {i}: date must be ISO YYYY-MM-DD")
        zone = str(raw["zone_id"]).strip()
        shift = str(raw["shift"]).strip().lower()
        phase = str(raw["phase"]).strip().lower()
        if not zone or not shift:
            raise ValueError(f"Row {i}: zone_id and shift must be nonempty")
        if phase not in {"baseline", "monitoring"}:
            raise ValueError(f"Row {i}: phase must be baseline or monitoring")
        exposure = _nonnegative_integer(raw["vehicles_observed"], "vehicles_observed", i, positive=True)
        stops = _nonnegative_integer(raw["stops_observed"], "stops_observed", i)
        if stops > exposure:
            raise ValueError(f"Row {i}: distinct stops_observed cannot exceed vehicles_observed")
        key = (day.isoformat(), zone, shift)
        if key in keys_seen:
            raise ValueError(f"Row {i}: duplicate date/zone_id/shift observation {key}")
        keys_seen.add(key)
        clean.append({
            "date": day.isoformat(), "zone_id": zone, "shift": shift,
            "phase": phase, "vehicles_observed": exposure, "stops_observed": stops,
            "authorization_status": str(raw.get("authorization_status") or "unknown").strip().lower(),
            "policy_reference": str(raw.get("policy_reference") or ""),
            "source_type": str(raw.get("source_type") or "unknown"),
        })
    if not clean:
        raise ValueError("No observations supplied")
    return clean


def u_chart(rows: Iterable[Mapping[str, Any]], *, min_baseline: int = MIN_BASELINE_PERIODS) -> dict[str, Any]:
    """Compute baseline-fitted 3-sigma u-chart limits and monitoring signals.

    Parameters
    ----------
    rows: iterable of dict-like CSV records with required columns documented in SPEC.md.
    min_baseline: minimum number of baseline time periods per (zone_id, shift).
        Five permits the hand-check in SPEC.md. At least 20 is recommended for
        substantive monitoring; this code emits a warning when fewer than 20.

    Returns a JSON-friendly dictionary: one entry per comparable group, plus
    observation-level rates/limits/monitoring signals and summary totals.

    Raises ValueError on invalid data, absent/insufficient baseline observations,
    zero baseline event counts, or monitoring dates preceding baseline end.

    Control limits are not legal authorization thresholds or specification limits.
    """
    if isinstance(min_baseline, bool) or not isinstance(min_baseline, int) or min_baseline < 2:
        raise ValueError("min_baseline must be an integer of at least 2")
    clean = _clean_rows(rows)
    grouped: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for row in clean:
        grouped[(row["zone_id"], row["shift"])].append(row)
    group_summaries: list[dict[str, Any]] = []
    observation_results: list[dict[str, Any]] = []
    all_warnings: list[str] = []
    for (zone, shift), items in sorted(grouped.items()):
        baseline = [r for r in items if r["phase"] == "baseline"]
        monitoring = [r for r in items if r["phase"] == "monitoring"]
        if len(baseline) < min_baseline:
            raise ValueError(f"{zone}/{shift}: need at least {min_baseline} baseline observations; found {len(baseline)}")
        if monitoring and min(r["date"] for r in monitoring) <= max(r["date"] for r in baseline):
            raise ValueError(f"{zone}/{shift}: monitoring dates must follow all baseline dates")
        base_count = sum(r["stops_observed"] for r in baseline)
        base_exposure = sum(r["vehicles_observed"] for r in baseline)
        if base_count == 0:
            raise ValueError(f"{zone}/{shift}: no baseline stop events; cannot estimate useful 3-sigma Poisson limits")
        center_per_vehicle = base_count / base_exposure
        # Pearson dispersion estimate detects important variance relative to the Poisson model.
        dispersion = sum(
            (r["stops_observed"] - center_per_vehicle * r["vehicles_observed"]) ** 2 /
            (center_per_vehicle * r["vehicles_observed"])
            for r in baseline
        ) / (len(baseline) - 1)
        warnings: list[str] = []
        if len(baseline) < 20:
            warnings.append("Fewer than 20 baseline periods; control limits may be unstable")
        if dispersion > 1.5:
            warnings.append("Baseline shows possible overdispersion (Pearson dispersion > 1.5); Poisson control limits may be too narrow")
        elif dispersion < 0.5:
            warnings.append("Baseline shows possible underdispersion (Pearson dispersion < 0.5); review sampling assumptions")
        all_warnings.extend(f"{zone}/{shift}: {w}" for w in warnings)
        group_summaries.append({
            "zone_id": zone, "shift": shift,
            "baseline_periods": len(baseline),
            "baseline_stops": base_count,
            "baseline_vehicles": base_exposure,
            "center_per_1000": SCALE * center_per_vehicle,
            "pearson_dispersion": dispersion,
            "warnings": warnings,
        })
        for r in sorted(items, key=lambda row: row["date"]):
            exposure = r["vehicles_observed"]
            rate = SCALE * r["stops_observed"] / exposure
            spread = 3 * sqrt(center_per_vehicle / exposure)
            ucl = SCALE * (center_per_vehicle + spread)
            lcl = SCALE * max(0.0, center_per_vehicle - spread)
            # Baseline values inform the limits; only future monitoring values are flagged.
            signal = r["phase"] == "monitoring" and (rate < lcl or rate > ucl)
            direction = "high" if signal and rate > ucl else "low" if signal else None
            observation_results.append({
                **r, "rate_per_1000": rate, "center_per_1000": SCALE * center_per_vehicle,
                "ucl_per_1000": ucl, "lcl_per_1000": lcl,
                "signal": signal, "signal_direction": direction,
            })
    observation_results.sort(key=lambda x: (x["date"], x["zone_id"], x["shift"]))
    return {
        "method": "Poisson u-chart, 3 sigma, baseline-only, by zone and shift",
        "rate_units": "observed enforcement stops per 1,000 vehicles",
        "groups": group_summaries,
        "observations": observation_results,
        "summary": {
            "observations": len(clean),
            "monitoring_observations": sum(r["phase"] == "monitoring" for r in clean),
            "monitoring_signals": sum(bool(r["signal"]) for r in observation_results),
        },
        "warnings": all_warnings,
        "interpretation_note": "A control-chart signal indicates an unusual observed rate under the stated model, not illegal enforcement or causation.",
    }
