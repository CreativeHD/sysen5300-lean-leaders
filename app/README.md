# CivicWatch API (H-04)

CivicWatch's FastAPI backend validates a user-uploaded CSV and delegates all statistical calculations to [`qc.py`](qc.py). It is **deployed and publicly accessible** on the course Posit Connect server. All supplied example datasets are synthetic, and a statistical signal is not evidence of unlawful enforcement.

**Public API:** https://connect.systems-apps.com/content/c1c8025f-66c6-46dc-ad09-0cea7e56dca1/

**Interactive API docs:** https://connect.systems-apps.com/content/c1c8025f-66c6-46dc-ad09-0cea7e56dca1/docs

**Public dashboard:** https://connect.systems-apps.com/content/0d9b2040-b25f-4d19-82ff-6f6f20b9511e/

## Install (Windows PowerShell)

From the repository root, using Python 3.12:

```powershell
py -3.12 -m pip install -r app/requirements-dev.txt
```

## Launch locally (Windows PowerShell)

```powershell
cd app
py -3.12 -m uvicorn app:app --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000/docs` and expand **POST /analyze**, click **Try it out**, choose `data/baseline.csv` from your checkout, then click **Execute**. Repeat with the other two CSVs. In Bash, after installing dependencies, you can run `bash app/testme.sh` from the repository root.

## API endpoints and inputs

- `GET /`: health and service-status information.
- `GET /docs`: interactive OpenAPI documentation.
- `POST /analyze`: multipart CSV upload with the form field named `file`. Returns the results of `qc.u_chart`, including baseline group rates, observed rates, center lines, UCL/LCL values, monitoring signal flags, warnings, and summary counts.

The endpoint accepts a UTF-8 `.csv` file up to **5 MB**. Invalid or insufficient observations return HTTP **422** with an explanatory `detail`; oversized files return HTTP **413**.

**Required CSV columns:** `date`, `zone_id`, `shift`, `vehicles_observed`, `stops_observed`, `phase`.

**Optional CSV columns:** `authorization_status`, `policy_reference`, `source_type`. See [`../data/README.md`](../data/README.md) for the complete codebook. Optional policy context is passed through in API results; the dashboard does not determine legal authorization.

## Test datasets and verified results

| Dataset | Rows | Zone/shift groups | Monitoring alerts |
| --- | ---: | ---: | ---: |
| [`baseline.csv`](../data/baseline.csv) | 280 | 8 | **1** |
| [`ticket_blitz.csv`](../data/ticket_blitz.csv) | 280 | 8 | **6** |
| [`traffic_surge.csv`](../data/traffic_surge.csv) | 280 | 8 | **1** |

The common incidental signal is documented in [`../data/VALIDATION.md`](../data/VALIDATION.md). The five planted blitz signals occur in Zone_C evening, September 25–29, 2026. The five targeted traffic-surge observations do not exceed their exposure-adjusted limits. The team verified all three datasets through the deployed dashboard on October 21, 2026.

## Verify from a checkout

From the repository root:

```powershell
py -3.12 -m pytest tests app/test_app.py -q
```

The team previously reported **30 passing Python tests**: 17 statistical tests and 13 API tests. See [`../demo/README.md`](../demo/README.md) for a browser-based, screenshot-illustrated demonstration.

## Deployment and security

The FastAPI service is deployed to Posit Connect as a **separate application** from the React dashboard. Deployment scripts are [`manifestme.sh`](manifestme.sh) and [`deployme.sh`](deployme.sh); `manifest.json` and `.python-version` record the Connect-compatible environment. The team has already validated the public API and its example dataset results.

**Do not redeploy over a teammate's content without coordinating on [GitHub Issue #1](https://github.com/CreativeHD/sysen5300-lean-leaders/issues/1).** Publishing credentials belong only in GitHub Actions secrets or Git-ignored local environment files. Never commit an API key, and exclude `.env` and `.venv` from deployment bundles.
