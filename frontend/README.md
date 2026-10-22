# CivicWatch React dashboard

CivicWatch is a Six Sigma hackathon demonstration of baseline-only Poisson u-charts for field-observed traffic enforcement stops per 1,000 vehicles. The React interface uploads a CSV to the team's FastAPI backend and displays group charts, monitoring alerts, and descriptive comparisons. The datasets are synthetic; a statistical signal is not evidence of unlawful enforcement.

**Public dashboard:** https://connect.systems-apps.com/content/0d9b2040-b25f-4d19-82ff-6f6f20b9511e/

**Public analysis API:** https://connect.systems-apps.com/content/c1c8025f-66c6-46dc-ad09-0cea7e56dca1/

## Local development

Requires Node.js 22+ and the Python 3.12 FastAPI backend, which runs on `http://127.0.0.1:8000` locally.

From the repository root, start the API in one Windows PowerShell terminal:

```powershell
cd app
py -3.12 -m pip install -r requirements-dev.txt
py -3.12 -m uvicorn app:app --host 127.0.0.1 --port 8000
```

In a **second** terminal, from the repository root:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

Open the Vite URL shown in the terminal, typically `http://localhost:5173/`. By default, Vite proxies `/analyze` requests to the locally running API. To exercise the **deployed** API from a local frontend, create a Git-ignored `frontend/.env.local` containing:

```text
VITE_API_BASE=https://connect.systems-apps.com/content/c1c8025f-66c6-46dc-ad09-0cea7e56dca1/
```

Restart Vite after changing `.env.local`. `VITE_API_BASE` is a **public application URL**, never an API key. Do not put credentials in Vite environment variables.

## Build and lint

```powershell
cd frontend
npm.cmd ci
npm.cmd run lint
npm.cmd run build
```

Vite outputs a static `dist/` directory. `base: './'` in `vite.config.js` keeps asset URLs relative so the app works at a Posit Connect `/content/<id>/` address. The production frontend builds with the published API URL set as `VITE_API_BASE`.

## Deployment status

The React frontend and FastAPI backend are **separate Posit Connect content items**. The dashboard is **already published**, responds without a login, and passed GitHub's final public-access check. All three sample datasets were also verified through its public user interface on October 21, 2026.

The workflow is [`.github/workflows/deploy-react-static.yml`](../.github/workflows/deploy-react-static.yml). It uses the instructor's static publishing scripts and the repository's `CONNECT_SERVER` and `CONNECT_API_KEY` **GitHub Actions secrets**. Do not store or print those credentials in the source code or documentation.

**Automatic publishing is intentionally paused.** The workflow currently has `workflow_dispatch` but no `push` trigger, so pushing a frontend change does not update the deployed dashboard. Publishing any further frontend changes must be coordinated with the team and performed by a repository maintainer using an available manual workflow mechanism. Since the workflow lives on `hackathon-civicwatch` rather than default `main`, GitHub's normal **Run workflow** button may not appear. Do not assume the live dashboard has changed just because GitHub source files have changed.

After any redeployment, confirm the dashboard is still accessible anonymously and upload all three CSVs. Do not create a second content item or overwrite the separately managed backend by accident.

## Acceptance test on the live dashboard

From the repository's [`data/`](../data/) folder, download and upload each CSV:

| Dataset | Observations | Groups | Monitoring alerts |
| --- | ---: | ---: | ---: |
| `baseline.csv` | 280 | 8 | **1** |
| `ticket_blitz.csv` | 280 | 8 | **6** |
| `traffic_surge.csv` | 280 | 8 | **1** |

For `ticket_blitz.csv`, select **Zone_C, evening** and inspect five planted upper-limit exceedances on September 25–29. For `traffic_surge.csv`, choose the same group and see changing control limits without signals on those five target days.

A successful CI run alone does not prove statistical behavior. For the illustrated demonstration and measured expected results, see [`../demo/README.md`](../demo/README.md).
