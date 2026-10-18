# CivicWatch API (H-04)

This is CivicWatch's first working application layer. All statistics are computed by the unchanged `qc.py` module. Only synthetic example data are provided; a statistical signal is not evidence of unlawful enforcement.

## Install (Windows PowerShell)

From the repository root:

```powershell
py -m pip install -r app/requirements-dev.txt
```

## Launch (Windows PowerShell)

```powershell
cd app
py -m uvicorn app:app --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000/docs` and expand `POST /analyze`, click **Try it out**, choose `data/baseline.csv` from your checkout, then click **Execute**. Repeat with the two other CSVs.

For Bash, after installing dependencies run `bash app/testme.sh` from the repository root.

## Endpoints

- `GET /`: health/status information.
- `GET /docs`: interactive API documentation.
- `POST /analyze`: multipart CSV upload (`file` field). Returns the JSON structure produced by `qc.u_chart`: baseline group rates, rates and u-chart control limits for each observation, signal flags, assumptions/warnings, and a summary.

The upload accepts a UTF-8 `.csv` up to 5 MB. Invalid or insufficient measurements receive an HTTP 422 response with an explanatory `detail`; oversized files receive HTTP 413. Required columns are `date`, `zone_id`, `shift`, `vehicles_observed`, `stops_observed`, and `phase`. Optional context is documented in `data/README.md`.

Expected monitoring alerts: `baseline.csv` = **1**, `ticket_blitz.csv` = **6**, `traffic_surge.csv` = **1**. The one common incidental signal is recorded in `data/VALIDATION.md`.

## Verify

From the repository root:

```powershell
py -m pytest tests app/test_app.py -q
```

## Deployment (later H-06)

`manifestme.sh` and `deployme.sh` preserve the instructor's Posit Connect workflow; actual deployment is **not yet configured or tested**. Never commit credentials. The frontend and final demo are separate tasks.
