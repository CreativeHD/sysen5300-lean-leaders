# CivicWatch React dashboard

CivicWatch is a Six Sigma hackathon demonstration of baseline-only Poisson u-charts for field-observed traffic enforcement stops per 1,000 vehicles. The web dashboard uploads a CSV to the team's FastAPI backend and displays group charts and monitoring alerts. The datasets are synthetic; a statistical signal is not evidence of unlawful enforcement.

## Local development

Requires Node.js 22+ and the Python FastAPI backend, which runs on `http://127.0.0.1:8000`.

From the repo root, start the API in one terminal:

```powershell
cd app
py -m uvicorn app:app --host 127.0.0.1 --port 8000
```

In a second terminal:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

Open the Vite URL shown in the terminal (typically `http://localhost:5173/`). By default, Vite proxies `/analyze` to the locally running API. If you want to exercise a deployed API locally, create a Git-ignored `frontend/.env.local` containing:

```
VITE_API_BASE=https://connect.systems-apps.com/content/c1c8025f-66c6-46dc-ad09-0cea7e56dca1/
```

Restart Vite after changing `.env.local`. `VITE_API_BASE` is a **public app URL**, not an API key. Never put credentials in Vite environment variables.

## Build and lint

```powershell
cd frontend
npm.cmd ci
npm.cmd run lint
npm.cmd run build
```

Vite outputs a static `dist/` directory. `base: './'` in `vite.config.js` keeps asset URLs relative so the app works at Posit Connect's `/content/<id>/` URL.

## Deploy to Posit Connect

The API and this static frontend are separate content items on Posit Connect. The existing public API is:

https://connect.systems-apps.com/content/c1c8025f-66c6-46dc-ad09-0cea7e56dca1/

GitHub Actions workflow `.github/workflows/deploy-react-static.yml` builds and publishes `frontend/dist/` using the instructor's scripts from [connect-publish](https://github.com/timothyfraser/sixsigmahackathon/tree/main/.claude/skills/connect-publish). Its `VITE_API_BASE` build variable points to the published API.

Before triggering the workflow, a repository administrator must add **two GitHub Actions secrets** in Settings > Secrets and variables > Actions:

- `CONNECT_SERVER` = `https://connect.systems-apps.com`
- `CONNECT_API_KEY` = a Posit Connect publisher key authorized to deploy the team's frontend content

Do not commit or share the key. The workflow runs for frontend changes on `hackathon-civicwatch` and can later be updated to deploy from `main` after team coordination. If the professor needs anonymous access, set the published frontend's sharing permissions in Posit Connect to **Anyone, no login** and check from an incognito window.

## Acceptance test after deployment

From the repo's `data/` folder, upload each CSV through the public dashboard:

| Dataset | Observations | Groups | Monitoring alerts |
| --- | ---: | ---: | ---: |
| `baseline.csv` | 280 | 8 | 1 |
| `ticket_blitz.csv` | 280 | 8 | 6 |
| `traffic_surge.csv` | 280 | 8 | 1 |

For `ticket_blitz.csv`, Zone_C evening contains five planted exceedances on September 25 through 29. For `traffic_surge.csv`, the changing control limits should accommodate doubled traffic volume without false alerts on those five target days.

A successful CI publish only establishes that a page responds. Perform the browser upload checks with the local API stopped before calling the tool fully deployed.
