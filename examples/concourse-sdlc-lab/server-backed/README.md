# Server-backed Concourse

This folder contains the integrated Node/SQLite API and React/Vite UI. The older localStorage prototype is retained separately at `..\app` and in the historical report archive.

## Run locally

Use Node.js 24.x and npm. Start the API in one PowerShell window:

```powershell
Set-Location examples\concourse-sdlc-lab\server-backed\server
npm ci
$env:PORT = '4173'
$env:CONCOURSE_ORIGIN = 'http://localhost:5173'
npm run seed
npm start
```

In a second PowerShell window, also starting at the BRAD repository root:

```powershell
Set-Location examples\concourse-sdlc-lab\server-backed\web
npm ci
npm run dev -- --host localhost --port 5173
```

Open `http://localhost:5173`. Development-only seeded users are fictional. The API stores local demo data under `server\data`; never use real or sensitive data. This is not production authentication or a deployable production service.

## Tests

Run from `server`:

```powershell
npm run typecheck
npm test
```

Run from `web`:

```powershell
npm run lint
npm run build
npm test
npm run test:quality
$env:CONCOURSE_SERVER_ROOT = (Resolve-Path '..\server').Path
npm run test:delivery
npx playwright install chromium
npm run test:browser
```

The live integration record and screenshots are in `..\reports\current`. The functional acceptance and automation matrices are in `..\docs\qa`.
