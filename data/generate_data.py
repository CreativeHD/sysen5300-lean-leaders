"""Generate CivicWatch's synthetic, reproducible SYSEN 5300 demonstration data.

Usage: python data/generate_data.py
Output: data/baseline.csv, data/ticket_blitz.csv, data/traffic_surge.csv

All observations, locations, and policies in these datasets are fictional.
"""

from __future__ import annotations

import csv
from datetime import date, timedelta
from pathlib import Path

import numpy as np

SEED = 5300
START_DATE = date(2026, 9, 1)
DAYS = 35
BASELINE_DAYS = 21
ZONES = ("Zone_A", "Zone_B", "Zone_C", "Zone_D")
SHIFTS = ("morning", "evening")
BLITZ_DAYS = set(range(24, 29))  # 2026-09-25 through 2026-09-29
TARGET_ZONE = "Zone_C"
TARGET_SHIFT = "evening"

FIELDNAMES = [
    "date",
    "zone_id",
    "shift",
    "vehicles_observed",
    "stops_observed",
    "phase",
    "authorization_status",
    "policy_reference",
    "source_type",
]


def generate() -> dict[str, list[dict[str, object]]]:
    rng = np.random.default_rng(SEED)
    blitz_rng = np.random.default_rng(SEED + 1)
    surge_rng = np.random.default_rng(SEED + 2)

    base_exposure = {"Zone_A": 650, "Zone_B": 780, "Zone_C": 900, "Zone_D": 1100}
    base_rates_per_1000 = {"Zone_A": 8.0, "Zone_B": 10.0, "Zone_C": 10.0, "Zone_D": 12.0}
    base: list[dict[str, object]] = []
    baseline_parameters: list[float] = []

    for day_index in range(DAYS):
        this_date = START_DATE + timedelta(days=day_index)
        for zone in ZONES:
            for shift in SHIFTS:
                weekday_modifier = 0.83 if this_date.weekday() >= 5 else 1.0
                shift_modifier = 1.10 if shift == "morning" else 1.0
                traffic_noise = float(np.clip(rng.normal(1.0, 0.075), 0.78, 1.25))
                vehicles = max(1, round(base_exposure[zone] * weekday_modifier * shift_modifier * traffic_noise))
                rate = base_rates_per_1000[zone] / 1000.0
                stops = int(rng.poisson(vehicles * rate))
                base.append(
                    {
                        "date": this_date.isoformat(),
                        "zone_id": zone,
                        "shift": shift,
                        "vehicles_observed": vehicles,
                        "stops_observed": stops,
                        "phase": "baseline" if day_index < BASELINE_DAYS else "monitoring",
                        "authorization_status": "unknown",
                        "policy_reference": "",
                        "source_type": "synthetic",
                    }
                )
                baseline_parameters.append(rate)

    blitz = [r.copy() for r in base]
    surge = [r.copy() for r in base]
    for idx, base_row in enumerate(base):
        day_index = (date.fromisoformat(str(base_row["date"])) - START_DATE).days
        is_target = (
            day_index in BLITZ_DAYS
            and base_row["zone_id"] == TARGET_ZONE
            and base_row["shift"] == TARGET_SHIFT
        )
        if not is_target:
            continue
        # Scenario 2: five-fold intervention in underlying stop rate.
        blitz[idx]["stops_observed"] = int(
            blitz_rng.poisson(5.0 * int(base_row["vehicles_observed"]) * baseline_parameters[idx])
        )
        blitz[idx]["authorization_status"] = "outside"
        blitz[idx]["policy_reference"] = "SIM-AUTH-001"

        # Scenario 3: twice as much traffic; underlying stop rate remains unchanged.
        vehicles_doubled = 2 * int(base_row["vehicles_observed"])
        surge[idx]["vehicles_observed"] = vehicles_doubled
        surge[idx]["stops_observed"] = int(
            surge_rng.poisson(vehicles_doubled * baseline_parameters[idx])
        )

    return {"baseline": base, "ticket_blitz": blitz, "traffic_surge": surge}


def main() -> None:
    destination = Path(__file__).resolve().parent
    datasets = generate()
    for name, rows in datasets.items():
        output = destination / f"{name}.csv"
        with output.open("w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=FIELDNAMES, lineterminator="\n")
            writer.writeheader()
            writer.writerows(rows)
        print(f"{output.name}: {len(rows)} data rows")


if __name__ == "__main__":
    main()
