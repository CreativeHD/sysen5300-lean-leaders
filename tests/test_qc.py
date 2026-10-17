"""Independent reproducibility, known-answer, and degenerate-case tests for CivicWatch."""
from __future__ import annotations

import csv
from datetime import date, timedelta
from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "app"))
from qc import u_chart


def example_rows(counts=(2, 3, 1, 2, 2), exposure=100):
    result = []
    for i, stops in enumerate(counts):
        result.append({"date": (date(2026, 1, 1) + timedelta(days=i)).isoformat(),
                       "zone_id": "Zone_A", "shift": "evening",
                       "vehicles_observed": exposure, "stops_observed": stops,
                       "phase": "baseline"})
    return result


def test_spec_known_answer_and_planted_signal():
    rows = example_rows()
    rows.append({"date": "2026-01-06", "zone_id": "Zone_A", "shift": "evening",
                 "vehicles_observed": 100, "stops_observed": 7, "phase": "monitoring"})
    result = u_chart(rows)
    group = result["groups"][0]
    assert group["baseline_stops"] == 10
    assert group["baseline_vehicles"] == 500
    assert group["center_per_1000"] == pytest.approx(20.0)
    monitoring = next(r for r in result["observations"] if r["phase"] == "monitoring")
    assert monitoring["ucl_per_1000"] == pytest.approx(62.4264068712)
    assert monitoring["lcl_per_1000"] == pytest.approx(0)
    assert monitoring["rate_per_1000"] == pytest.approx(70)
    assert monitoring["signal"] is True
    assert monitoring["signal_direction"] == "high"
    assert result["summary"]["monitoring_signals"] == 1


def test_normal_point_not_flagged():
    rows = example_rows()
    rows.append({"date": "2026-01-06", "zone_id": "Zone_A", "shift": "evening",
                 "vehicles_observed": 100, "stops_observed": 2, "phase": "monitoring"})
    result = u_chart(rows)
    assert result["summary"]["monitoring_signals"] == 0


def test_traffic_doubles_without_rate_increase():
    rows = example_rows()
    rows.append({"date": "2026-01-06", "zone_id": "Zone_A", "shift": "evening",
                 "vehicles_observed": 200, "stops_observed": 4, "phase": "monitoring"})
    result = u_chart(rows)
    last = result["observations"][-1]
    assert last["rate_per_1000"] == pytest.approx(20.0)
    assert last["signal"] is False
    assert last["ucl_per_1000"] < 62.43  # variable exposure is reflected in limits


@pytest.mark.parametrize("field,value", [
    ("vehicles_observed", 0), ("vehicles_observed", -1),
    ("stops_observed", -1), ("stops_observed", 1.1),
    ("phase", "future"), ("date", "wrong-date"),
])
def test_invalid_inputs(field, value):
    rows = example_rows()
    rows[0][field] = value
    with pytest.raises(ValueError):
        u_chart(rows)


def test_missing_field_rejected():
    rows = example_rows()
    del rows[0]["vehicles_observed"]
    with pytest.raises(ValueError, match="missing column"):
        u_chart(rows)


def test_insufficient_baseline_rejected():
    with pytest.raises(ValueError, match="at least 5 baseline"):
        u_chart(example_rows(counts=(1,)))


def test_all_zero_events_rejected_without_false_certainty():
    with pytest.raises(ValueError, match="no baseline stop events"):
        u_chart(example_rows(counts=(0, 0, 0, 0, 0)))


def test_duplicate_observation_rejected():
    rows = example_rows()
    rows.append(rows[0].copy())
    with pytest.raises(ValueError, match="duplicate"):
        u_chart(rows)


def test_no_baseline_after_monitoring():
    rows = example_rows()
    rows.append({"date": "2025-12-31", "zone_id": "Zone_A", "shift": "evening",
                 "vehicles_observed": 100, "stops_observed": 7, "phase": "monitoring"})
    with pytest.raises(ValueError, match="monitoring dates must follow"):
        u_chart(rows)


def test_production_scenarios_from_real_demo_csvs():
    data_root = Path(__file__).resolve().parents[1] / "data"
    assert data_root.exists(), "Expected project data/ folder with committed H-02 CSVs"
    expected = {"baseline": 1, "ticket_blitz": 6, "traffic_surge": 1}
    for scenario, count in expected.items():
        with (data_root / f"{scenario}.csv").open(newline="", encoding="utf-8") as f:
            result = u_chart(csv.DictReader(f))
        assert len(result["observations"]) == 280
        assert result["summary"]["monitoring_signals"] == count
        if scenario == "ticket_blitz":
            target = [r for r in result["observations"]
                      if r["zone_id"] == "Zone_C" and r["shift"] == "evening"
                      and "2026-09-25" <= r["date"] <= "2026-09-29"]
            assert len(target) == 5
            assert all(r["signal_direction"] == "high" for r in target)
        if scenario == "traffic_surge":
            target = [r for r in result["observations"]
                      if r["zone_id"] == "Zone_C" and r["shift"] == "evening"
                      and "2026-09-25" <= r["date"] <= "2026-09-29"]
            assert not any(r["signal"] for r in target)


def test_constant_positive_baseline_warns_instead_of_crashing():
    result = u_chart(example_rows(counts=(2, 2, 2, 2, 2)))
    group = result["groups"][0]
    assert group["pearson_dispersion"] == pytest.approx(0)
    assert any("underdispersion" in message for message in group["warnings"])


def test_reject_event_counts_above_observed_exposure():
    rows = example_rows()
    rows[0]["stops_observed"] = 101
    with pytest.raises(ValueError, match="cannot exceed"):
        u_chart(rows)
