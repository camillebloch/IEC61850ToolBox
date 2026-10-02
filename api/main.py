from __future__ import annotations

import json
import subprocess
import tempfile
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

app = FastAPI(title="IEC61850ToolBox patch service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/patch")
async def patch_scl(request: Request) -> FileResponse:
    content_type = request.headers.get("content-type", "")
    if isinstance(content_type, bytes):
        content_type = content_type.decode("latin-1")

    try:
        if "multipart/form-data" in content_type.lower():
            form = await request.form()
            file = form.get("file")
            rules = form.get("rules", "{}")
            if isinstance(rules, (bytes, bytearray)):
                rules = rules.decode("utf-8")
        else:
            payload = await request.json()
            file = payload.get("file")
            rules = payload.get("rules", "{}")
            if isinstance(rules, (bytes, bytearray)):
                rules = rules.decode("utf-8")
    except Exception as exc:  # pragma: no cover - defensive fallback for malformed requests
        raise HTTPException(
            status_code=400,
            detail="Request body must be multipart/form-data with a file and rules JSON, or a JSON payload with matching fields.",
        ) from exc

    if file is None:
        raise HTTPException(status_code=400, detail="A file upload is required.")

    if not hasattr(file, "filename"):
        raise HTTPException(status_code=400, detail="The uploaded file is missing its filename metadata.")

    try:
        payload = json.loads(rules)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid JSON rules: {exc}") from exc

    if not file.filename:
        raise HTTPException(status_code=400, detail="File name is required")

    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Rules JSON must be an object with 'hardcodedPatches' and 'rules' entries.")

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        input_path = tmp_path / file.filename
        rules_path = tmp_path / "rules.json"
        output_path = tmp_path / f"{input_path.stem}_patched{input_path.suffix}"

        input_path.write_bytes(await file.read())
        rules_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

        command = [
            "python",
            "scripts/update-scl-for-ples.py",
            str(input_path),
            str(output_path),
            "--rules",
            str(rules_path),
        ]

        result = subprocess.run(command, capture_output=True, text=True, cwd=Path(__file__).resolve().parent.parent)
        if result.returncode != 0:
            detail = result.stderr.strip() or result.stdout.strip() or "Unknown patch error"
            raise HTTPException(status_code=500, detail=f"Patch failed: {detail}")

        return FileResponse(
            path=str(output_path),
            filename=output_path.name,
            media_type="application/xml",
        )
