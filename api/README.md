# Patch backend service

This backend runs the SCL patch script used by the web UI.

## Local development

```bash
cd api
python -m pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The local API is then available at:

```text
http://localhost:8000/health
```

## Render deployment

1. Create a new Web Service on Render and connect the GitHub repository.
2. Set the service root to `api`.
3. Set the build command to:

```bash
pip install -r requirements.txt
```

4. Set the start command to:

```bash
python -m uvicorn main:app --host 0.0.0.0 --port $PORT
```

If you keep the repository root as the service root instead, use these commands:

```bash
pip install -r api/requirements.txt
python -m uvicorn api.main:app --host 0.0.0.0 --port $PORT
```

5. Copy the public Render URL and set it in the frontend environment variable:

```bash
VITE_PATCH_API_URL=https://your-render-service.onrender.com
```

The GitHub Actions workflow `.github/workflows/deploy-render-backend.yml`
triggers a Render deployment for pushes to `main` and the Schneider ClientLN
ordering feature branch. It passes the pushed commit SHA to Render so the
backend script is deployed from the same revision as the frontend rules.

## Endpoint

### `POST /patch`

Upload an SCL file and the active JSON rules payload.

Form fields:

- `file`: the SCL file to patch
- `rules`: JSON string containing the active `hardcodedPatches` and `rules`

The service runs the Python script in the repository root and returns the patched XML file as the response body.
