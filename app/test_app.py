"""H-04 API contract tests. All statistics remain in app/qc.py."""

from __future__ import annotations

import csv
from io import StringIO
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app import app

client = TestClient(app)
DATA_DIR = Path(__file__).resolve().parents[1] / "data"


def upload(name: str, data: bytes):
    return client.post("/analyze", files={"file": (name, data, "text/csv")})


def csv_bytes(rows: list[dict]) -> bytes:
    output = StringIO()
    writer = csv.DictWriter(output, fieldnames=list(rows[0]))
    writer.writeheader()
    writer.writerows(rows)
    return output.getvalue().encode("utf-8")


def known_answer_rows() -> list[dict]:
    rows = []
    for i, stops in enumerate((2, 3, 1, 2, 2, 7), start=1):
        rows.append({
            "date": f"2026-01-{i:02d}",
            "zone_id": "Zone_A", "shift": "evening",
            "vehicles_observed": 100, "stops_observed": stops,
            "phase": "baseline" if i < 6 else "monitoring",
        })
    return rows


def test_api_is_live():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["name"] == "CivicWatch"
    assert client.get("/docs").status_code == 200


def test_u_chart_known_answer_via_csv_upload():
    response = upload("known.csv", csv_bytes(known_answer_rows()))
    assert response.status_code == 200, response.text
    result = response.json()
    assert result["groups"][0]["center_per_1000"] == pytest.approx(20.0)
    monitoring = next(row for row in result["observations"] if row["phase"] == "monitoring")
    assert monitoring["ucl_per_1000"] == pytest.approx(62.4264068712)
    assert monitoring["lcl_per_1000"] == 0.0
    assert monitoring["rate_per_1000"] == pytest.approx(70.0)
    assert monitoring["signal"] is True
    assert result["summary"]["monitoring_signals"] == 1


@pytest.mark.parametrize("scenario,expected", [
    ("baseline", 1), ("ticket_blitz", 6), ("traffic_surge", 1),
])
def test_committed_scenario_csvs(scenario, expected):
    response = upload(f"{scenario}.csv", (DATA_DIR / f"{scenario}.csv").read_bytes())
    assert response.status_code == 200, response.text
    result = response.json()
    assert len(result["observations"]) == 280
    assert result["summary"]["monitoring_signals"] == expected
    target = [r for r in result["observations"] if r["zone_id"] == "Zone_C"
              and r["shift"] == "evening" and "2026-09-25" <= r["date"] <= "2026-09-29"]
    assert len(target) == 5
    assert sum(bool(r["signal"]) for r in target) == (5 if scenario == "ticket_blitz" else 0)
    if scenario == "ticket_blitz":
        assert all(r["authorization_status"] == "outside" for r in target)
        assert all(r["policy_reference"] == "SIM-AUTH-001" for r in target)


def test_reject_missing_required_header():
    rows = known_answer_rows()
    for row in rows:
        del row["phase"]
    response = upload("missing.csv", csv_bytes(rows))
    assert response.status_code == 422
    assert "missing column" in response.json()["detail"]


def test_reject_zero_vehicle_exposure():
    rows = known_answer_rows()
    rows[0]["vehicles_observed"] = 0
    response = upload("invalid.csv", csv_bytes(rows))
    assert response.status_code == 422
    assert "positive" in response.json()["detail"]


def test_reject_too_few_baseline_periods():
    rows = known_answer_rows()[0:3]
    response = upload("few.csv", csv_bytes(rows))
    assert response.status_code == 422
    assert "at least 5 baseline" in response.json()["detail"]


def test_reject_malformed_csv_rows():
    response = upload("bad.csv", b"date,zone_id,shift\n2026-01-01,Zone_A,evening,extra\n")
    assert response.status_code == 422
    assert "too many or too few fields" in response.json()["detail"]


def test_reject_duplicate_headers():
    response = upload("bad.csv", b"date,date\n2026-01-01,2026-01-02\n")
    assert response.status_code == 422
    assert "unique" in response.json()["detail"]


def test_reject_non_csv_upload():
    response = upload("data.txt", b"not a CSV")
    assert response.status_code == 422


def test_reject_binary_upload():
    response = upload("data.csv", b"\xff\xfe\x00")
    assert response.status_code == 422
    assert "UTF-8" in response.json()["detail"]


def test_reject_oversized_upload():
    response = upload("data.csv", b"x" * (5 * 1024 * 1024 + 1))
    assert response.status_code == 413
