from __future__ import annotations

import json
import subprocess
import tempfile
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask
from starlette.datastructures import UploadFile

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
    if "multipart/form-data" not in content_type.lower():
        raise HTTPException(status_code=400, detail="Request must use multipart/form-data.")

    try:
        form = await request.form()
    except Exception as exc:  # pragma: no cover - defensive fallback for malformed requests
        raise HTTPException(
            status_code=400,
            detail="Unable to parse multipart request; include an SCL file and rules JSON.",
        ) from exc

    file = form.get("file")
    rules = form.get("rules", "{}")
    if not isinstance(file, UploadFile):
        raise HTTPException(status_code=400, detail="A file upload is required.")

    if not isinstance(rules, str):
        raise HTTPException(status_code=400, detail="Rules must be supplied as a JSON string.")

    try:
        payload = json.loads(rules)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid JSON rules: {exc}") from exc

    if not file.filename:
        raise HTTPException(status_code=400, detail="File name is required")

    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Rules JSON must be an object with 'hardcodedPatches' and 'rules' entries.")

    temporary_directory = tempfile.TemporaryDirectory()
    try:
        tmp_path = Path(temporary_directory.name)
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

        if not output_path.is_file():
            raise HTTPException(status_code=500, detail="Patch completed without producing an output file.")

        return FileResponse(
            path=str(output_path),
            filename=output_path.name,
            media_type="application/xml",
            background=BackgroundTask(temporary_directory.cleanup),
        )
    except Exception:
        temporary_directory.cleanup()
        raise
