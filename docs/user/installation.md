# Installation Guide

## Requirements

- Node.js `^20.19.0 || >=22.12.0` (Node 21 is not supported)
- npm 10+

## Install dependencies

```bash
npm install
```

## Run in development mode

```bash
npm run dev
```

The app is served by Vite (default: `http://localhost:5173`).

## Configure the patch backend

The SCL patch runner calls a Python FastAPI service to run the patch script. For local development, create a `.env` file from the example:

```bash
cp .env.example .env
```

Set the API URL to your local backend:

```bash
VITE_PATCH_API_URL=http://localhost:8000
```

The backend is implemented under `api/main.py` and can be started with:

```bash
cd api
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Render deployment guidance

Render is the recommended free/low-cost hosting option for the Python backend when the page is served from GitHub Pages.

1. Create a Render Web Service connected to the GitHub repository.
2. Set the service root to `api`.
3. Set the build command to `pip install -r requirements.txt`.
4. Set the start command to:

```bash
python -m uvicorn main:app --host 0.0.0.0 --port $PORT
```

5. Add the following repository secrets to GitHub Actions if you enable the Render deploy workflow:
   - `RENDER_SERVICE_ID`
   - `RENDER_API_KEY`

6. Set the frontend environment variable to the public Render URL when deploying the web UI:

```bash
VITE_PATCH_API_URL=https://your-render-service.onrender.com
```

## Build for production

```bash
npm run build
```

Build the Schneider Pages version with its Schneider-specific asset path and Render backend URL:

```bash
npm run build:schneider
```

For the external GitHub Pages repository, build with its project-page asset path:

```bash
npm run build:schneider-ext
```

Build-time tool availability can be configured with `VITE_ENABLED_TOOLS`, a comma-separated list of tool IDs:

- `scl-patch-runner`
- `compatibility-checker`
- `data-instance-search`

When unset, all tools are enabled. Both Schneider-targeted builds set `VITE_ENABLED_TOOLS=scl-patch-runner`, so only the SCL Patch runner is shown there. The standard `build` uses `/IEC61850ToolBox/`; `build:schneider` uses `/SESA160638/IEC61850ToolBox/`; and `build:schneider-ext` uses `/IEC61850ToolBox/`. These settings hide tools from the navigation; they do not remove their implementation from the client bundle.

## Preview production bundle

```bash
npm run preview
```
