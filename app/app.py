"""CivicWatch HTTP interface.

The API intentionally delegates every statistical calculation to qc.u_chart.
"""

from __future__ import annotations

import csv
from io import StringIO

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from qc import u_chart

MAX_CSV_BYTES = 5 * 1024 * 1024

app = FastAPI(
    title="CivicWatch",
    description="Analyze field-observed traffic enforcement rates with baseline Poisson u-charts.",
    version="0.1.0",
)

# The hackathon's local React dev server has a separate origin.
# No authentication or private data is supported by this demo API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root() -> dict[str, str]:
    """Identify the service and available interactive documentation."""
    return {"name": "CivicWatch", "status": "ready", "docs": "/docs"}


@app.get("/__docs__/")
async def docs_redirect() -> RedirectResponse:
    """Keep the instructor starter's documentation redirect."""
    return RedirectResponse(url="/docs")


@app.post("/analyze")
async def analyze_csv(file: UploadFile = File(...)) -> dict:
    """Analyze one UTF-8 CSV using qc.u_chart without changing its calculations.

    The JSON response contains group baseline rates, observation-level control
    limits and signals, and summary counts. Invalid input returns HTTP 422.
    """
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=422, detail="Upload a file with a .csv extension")

    payload = await file.read(MAX_CSV_BYTES + 1)
    if len(payload) > MAX_CSV_BYTES:
        raise HTTPException(status_code=413, detail="CSV file exceeds the 5 MB limit")

    try:
        text = payload.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=422, detail="CSV must be UTF-8 encoded") from exc

    try:
        reader = csv.DictReader(StringIO(text, newline=""), strict=True)
        headers = reader.fieldnames
        if not headers:
            raise HTTPException(status_code=422, detail="CSV header is missing")
        if any(not header.strip() for header in headers) or len(headers) != len(set(headers)):
            raise HTTPException(status_code=422, detail="CSV headers must be nonempty and unique")
        rows = list(reader)
        if any(None in row or any(value is None for value in row.values()) for row in rows):
            raise HTTPException(status_code=422, detail="CSV contains a row with too many or too few fields")
    except csv.Error as exc:
        raise HTTPException(status_code=422, detail=f"Malformed CSV: {exc}") from exc

    try:
        return u_chart(rows)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
