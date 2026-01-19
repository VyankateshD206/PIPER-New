from __future__ import annotations

import os
import csv
import time
from typing import List, Literal, Optional

import joblib
import numpy as np
import requests
import torch
import torch.nn as nn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from mangum import Mangum

SPOTIFY_API_BASE_URL = "https://api.spotify.com/v1"

TRENDING_PLAYLIST_ID = "37i9dQZF1DXbVhgADFy3im"

Mood = Literal["Happy", "Calm", "Neutral", "Sad", "Very Sad"]

MOOD_TO_ID = {
    "Happy": 0,
    "Calm": 1,
    "Neutral": 2,
    "Sad": 3,
    "Very Sad": 4,
}


class MoodClassifier(nn.Module):
    def __init__(self):
        super().__init__()
        self.fc1 = nn.Linear(5, 64)
        self.fc2 = nn.Linear(64, 32)
        self.fc3 = nn.Linear(32, 5)
        self.relu = nn.ReLU()
        self.dropout = nn.Dropout(0.5)

    def forward(self, x):
        x = self.relu(self.fc1(x))
        x = self.dropout(x)
        x = self.relu(self.fc2(x))
        x = self.dropout(x)
        x = self.fc3(x)
        return x


class RecommendationsRequest(BaseModel):
    mood: Mood
    access_token: str = Field(min_length=1)
    limit: int = Field(default=20, ge=1, le=50)


class RecommendationsResponse(BaseModel):
    trackIds: List[str]


class ExportTopTracksCsvRequest(BaseModel):
    access_token: str = Field(min_length=1)
    limit: int = Field(default=50, ge=1, le=50)
    time_range: Literal["short_term", "medium_term", "long_term"] = "medium_term"


class ExportTopTracksCsvResponse(BaseModel):
    ok: bool
    csvPath: str
    rowsWritten: int
    tracksFetched: int
    failedAudioFeatures: int


def _env_path(name: str, default_relative: str) -> str:
    value = os.environ.get(name)
    if value:
        return value
    # For Vercel serverless, use /tmp or relative to this file
    base_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_dir, default_relative)


MODEL_PATH = _env_path("PIPER_MODEL_PATH", "models/piper_model.pth")
SCALER_PATH = _env_path("PIPER_SCALER_PATH", "models/scaler1.joblib")


def _csv_path() -> str:
    # For serverless, use /tmp directory which is writable
    return os.environ.get("PIPER_TOP_TRACKS_CSV_PATH", "/tmp/top_tracks_features.csv")


app = FastAPI(title="PIPER ML Service", version="0.1.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model: MoodClassifier | None = None
scaler = None


def _spotify_get(access_token: str, path: str, params: Optional[dict] = None):
    res = requests.get(
        f"{SPOTIFY_API_BASE_URL}{path}",
        headers={"Authorization": f"Bearer {access_token}"},
        params=params,
        timeout=20,
    )
    trace_id = res.headers.get("sp-trace-id")
    if res.status_code == 401:
        raise HTTPException(status_code=401, detail=f"{path}:spotify_token_invalid")
    if res.status_code == 403:
        www_auth = (res.headers.get("www-authenticate") or "").lower()
        try:
            payload = res.json()
            message = (
                payload.get("error", {}).get("message")
                if isinstance(payload, dict)
                else None
            )
        except Exception:
            message = None

        lowered = (message or "").lower()
        if "insufficient_scope" in www_auth:
            raise HTTPException(
                status_code=403, detail=f"{path}:spotify_insufficient_scope"
            )
        if "invalid_token" in www_auth:
            raise HTTPException(status_code=401, detail=f"{path}:spotify_token_invalid")
        if "insufficient" in lowered and "scope" in lowered:
            raise HTTPException(
                status_code=403, detail=f"{path}:spotify_insufficient_scope"
            )
        if "not registered" in lowered or "user not registered" in lowered:
            raise HTTPException(
                status_code=403, detail=f"{path}:spotify_user_not_registered"
            )

        short = (message or res.text or res.reason)[:300]
        extras: list[str] = []
        if trace_id:
            extras.append(f"sp-trace-id: {trace_id}")
        if www_auth:
            extras.append(f"www-authenticate: {www_auth[:300]}")
        if extras:
            short = f"{short} | " + " | ".join(extras)
        raise HTTPException(status_code=403, detail=f"{path}:spotify_forbidden:{short}")
    if res.status_code == 429:
        raise HTTPException(status_code=429, detail="spotify_rate_limited")
    if not res.ok:
        try:
            payload = res.json()
            message = (
                payload.get("error", {}).get("message")
                if isinstance(payload, dict)
                else None
            )
        except Exception:
            message = None
        short = (message or res.text or res.reason)[:300]
        if trace_id:
            short = f"{short} | sp-trace-id: {trace_id}"
        raise HTTPException(
            status_code=502, detail=f"spotify_error:{res.status_code}:{short}"
        )
    return res.json()


def _spotify_get_with_retry(
    access_token: str,
    path: str,
    params: Optional[dict] = None,
    *,
    max_retries: int = 3,
):
    last_exc: Optional[HTTPException] = None
    for attempt in range(max_retries + 1):
        res = requests.get(
            f"{SPOTIFY_API_BASE_URL}{path}",
            headers={"Authorization": f"Bearer {access_token}"},
            params=params,
            timeout=20,
        )

        if res.status_code == 429 and attempt < max_retries:
            retry_after = res.headers.get("retry-after") or res.headers.get(
                "Retry-After"
            )
            try:
                wait_s = float(retry_after) if retry_after else 1.0
            except Exception:
                wait_s = 1.0
            time.sleep(max(0.5, min(wait_s, 30.0)))
            continue

        if res.status_code == 401:
            raise HTTPException(status_code=401, detail=f"{path}:spotify_token_invalid")

        if res.status_code == 403:
            www_auth = (res.headers.get("www-authenticate") or "").lower()
            try:
                payload = res.json()
                message = (
                    payload.get("error", {}).get("message")
                    if isinstance(payload, dict)
                    else None
                )
            except Exception:
                message = None

            lowered = (message or "").lower()
            if "insufficient_scope" in www_auth:
                raise HTTPException(
                    status_code=403, detail=f"{path}:spotify_insufficient_scope"
                )
            if "invalid_token" in www_auth:
                raise HTTPException(
                    status_code=401, detail=f"{path}:spotify_token_invalid"
                )
            if "insufficient" in lowered and "scope" in lowered:
                raise HTTPException(
                    status_code=403, detail=f"{path}:spotify_insufficient_scope"
                )
            if "not registered" in lowered or "user not registered" in lowered:
                raise HTTPException(
                    status_code=403, detail=f"{path}:spotify_user_not_registered"
                )
            short = (message or res.text or res.reason)[:300]
            raise HTTPException(
                status_code=403, detail=f"{path}:spotify_forbidden:{short}"
            )

        if res.status_code == 429:
            last_exc = HTTPException(status_code=429, detail="spotify_rate_limited")
            break

        if not res.ok:
            try:
                payload = res.json()
                message = (
                    payload.get("error", {}).get("message")
                    if isinstance(payload, dict)
                    else None
                )
            except Exception:
                message = None
            short = (message or res.text or res.reason)[:300]
            last_exc = HTTPException(
                status_code=502, detail=f"spotify_error:{res.status_code}:{short}"
            )
            break

        return res.json()

    if last_exc is not None:
        raise last_exc
    raise HTTPException(status_code=502, detail="spotify_error:unknown")


def _dedupe_preserve_order(values: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for v in values:
        if not v:
            continue
        if v in seen:
            continue
        seen.add(v)
        out.append(v)
    return out


def _spotify_get_audio_features_batch(
    access_token: str, track_ids: list[str]
) -> dict[str, dict]:
    out: dict[str, dict] = {}
    ids = [tid for tid in track_ids if isinstance(tid, str) and tid]
    for i in range(0, len(ids), 100):
        chunk = ids[i : i + 100]
        payload = _spotify_get_with_retry(
            access_token,
            "/audio-features",
            params={"ids": ",".join(chunk)},
        )
        audio_features = (
            payload.get("audio_features") if isinstance(payload, dict) else None
        )
        if not isinstance(audio_features, list):
            continue
        for f in audio_features:
            if not isinstance(f, dict):
                continue
            tid = f.get("id")
            if isinstance(tid, str) and tid:
                out[tid] = f
    return out


def _spotify_get_audio_features_resilient(
    access_token: str,
    track_ids: list[str],
    *,
    max_per_track_attempts: int = 1,
) -> tuple[dict[str, dict], dict[str, int]]:
    ids = [tid for tid in track_ids if isinstance(tid, str) and tid]
    counts = {
        "requested": len(ids),
        "batch_ok": 0,
        "per_track_ok": 0,
        "failed": 0,
        "unauthorized": 0,
        "forbidden": 0,
        "rate_limited": 0,
        "other_error": 0,
    }

    features_by_id: dict[str, dict] = {}
    try:
        features_by_id = _spotify_get_audio_features_batch(access_token, ids)
        counts["batch_ok"] = len(features_by_id)
    except HTTPException as e:
        if e.status_code == 401:
            counts["unauthorized"] += 1
        elif e.status_code == 403:
            counts["forbidden"] += 1
        elif e.status_code == 429:
            counts["rate_limited"] += 1
        else:
            counts["other_error"] += 1

    missing = [tid for tid in ids if tid not in features_by_id]
    if missing and max_per_track_attempts > 0:
        for tid in missing:
            ok = False
            for _ in range(max_per_track_attempts):
                try:
                    f = _spotify_get_with_retry(access_token, f"/audio-features/{tid}")
                    if isinstance(f, dict) and isinstance(f.get("id"), str):
                        features_by_id[f["id"]] = f
                        counts["per_track_ok"] += 1
                        ok = True
                        break
                except HTTPException as e:
                    if e.status_code == 401:
                        counts["unauthorized"] += 1
                    elif e.status_code == 403:
                        counts["forbidden"] += 1
                    elif e.status_code == 429:
                        counts["rate_limited"] += 1
                    else:
                        counts["other_error"] += 1
                    break
                except Exception:
                    counts["other_error"] += 1
                    break
            if not ok:
                counts["failed"] += 1

    return features_by_id, counts


def _load_artifacts():
    global model, scaler

    if not os.path.exists(MODEL_PATH):
        raise RuntimeError(f"Model file not found: {MODEL_PATH}")
    if not os.path.exists(SCALER_PATH):
        raise RuntimeError(f"Scaler file not found: {SCALER_PATH}")

    loaded_model = MoodClassifier()
    loaded_model.load_state_dict(
        torch.load(MODEL_PATH, map_location="cpu", weights_only=True)
    )
    loaded_model.eval()

    model = loaded_model
    scaler = joblib.load(SCALER_PATH)


@app.on_event("startup")
def startup_event():
    _load_artifacts()


@app.get("/")
def root():
    return {"message": "PIPER ML Service API", "version": "0.1.0"}


@app.get("/health")
def health():
    return {"ok": True}


def _atomic_write_csv(csv_path: str, fieldnames: list[str], rows: list[dict]):
    os.makedirs(os.path.dirname(csv_path), exist_ok=True)
    tmp_path = f"{csv_path}.tmp"
    with open(tmp_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)
    os.replace(tmp_path, csv_path)


@app.post("/export/top-tracks-features", response_model=ExportTopTracksCsvResponse)
def export_top_tracks_features(req: ExportTopTracksCsvRequest):
    top = _spotify_get(
        req.access_token,
        "/me/top/tracks",
        params={"limit": req.limit, "time_range": req.time_range},
    )

    items = top.get("items")
    if not isinstance(items, list) or len(items) == 0:
        raise HTTPException(status_code=422, detail="no_top_tracks")

    track_ids: list[str] = [
        t.get("id")
        for t in items
        if isinstance(t, dict) and isinstance(t.get("id"), str)
    ]
    if not track_ids:
        raise HTTPException(status_code=422, detail="no_track_ids")

    all_ids = _dedupe_preserve_order(track_ids)
    rows: list[dict] = []
    failed_audio_features = 0
    first_audio_features_error: Optional[HTTPException] = None

    meta_by_id: dict[str, dict] = {}
    for track in items:
        if not isinstance(track, dict):
            continue
        tid = track.get("id")
        if not isinstance(tid, str) or not tid:
            continue
        meta_by_id[tid] = track

    try:
        features_by_id, counts = _spotify_get_audio_features_resilient(
            req.access_token, all_ids, max_per_track_attempts=2
        )
        failed_audio_features = int(counts.get("failed", 0))
    except HTTPException as e:
        first_audio_features_error = e
        features_by_id = {}

    for tid in all_ids:
        meta = meta_by_id.get(tid)
        if not isinstance(meta, dict):
            continue
        features = features_by_id.get(tid)
        if not isinstance(features, dict):
            continue

        artists = meta.get("artists")
        artist_names = (
            ", ".join(
                [
                    a.get("name")
                    for a in artists
                    if isinstance(a, dict) and isinstance(a.get("name"), str)
                ]
            )
            if isinstance(artists, list)
            else ""
        )

        try:
            rows.append(
                {
                    "track_id": tid,
                    "track_name": (
                        meta.get("name") if isinstance(meta.get("name"), str) else ""
                    ),
                    "artist_names": artist_names,
                    "danceability": float(features["danceability"]),
                    "energy": float(features["energy"]),
                    "valence": float(features["valence"]),
                    "tempo": float(features["tempo"]),
                    "loudness": float(features["loudness"]),
                }
            )
        except Exception:
            failed_audio_features += 1

    if len(rows) == 0:
        if first_audio_features_error is not None:
            raise first_audio_features_error
        raise HTTPException(status_code=422, detail="no_audio_features")

    csv_path = _csv_path()
    fieldnames = [
        "track_id",
        "track_name",
        "artist_names",
        "danceability",
        "energy",
        "valence",
        "tempo",
        "loudness",
    ]
    _atomic_write_csv(csv_path, fieldnames=fieldnames, rows=rows)

    return ExportTopTracksCsvResponse(
        ok=True,
        csvPath=csv_path,
        rowsWritten=len(rows),
        tracksFetched=len(all_ids),
        failedAudioFeatures=failed_audio_features,
    )


@app.post("/recommendations", response_model=RecommendationsResponse)
def recommendations(req: RecommendationsRequest):
    if model is None or scaler is None:
        raise HTTPException(status_code=500, detail="model_not_loaded")

    top = _spotify_get(
        req.access_token,
        "/me/top/tracks",
        params={"limit": 50, "time_range": "medium_term"},
    )

    items = top.get("items")

    if not isinstance(items, list) or len(items) == 0:
        raise HTTPException(status_code=422, detail="no_top_tracks")

    track_ids: List[str] = [
        t.get("id")
        for t in items
        if isinstance(t, dict) and isinstance(t.get("id"), str)
    ]
    track_ids = _dedupe_preserve_order(track_ids)
    if not track_ids:
        raise HTTPException(status_code=422, detail="no_track_ids")

    features_by_id, counts = _spotify_get_audio_features_resilient(
        req.access_token, track_ids, max_per_track_attempts=2
    )

    rows = []
    ordered_ids = []
    for tid in track_ids:
        f = features_by_id.get(tid)
        if not f:
            continue
        try:
            rows.append(
                [
                    float(f["danceability"]),
                    float(f["energy"]),
                    float(f["valence"]),
                    float(f["tempo"]),
                    float(f["loudness"]),
                ]
            )
            ordered_ids.append(tid)
        except Exception:
            continue

    if not rows:
        if counts.get("unauthorized", 0) > 0 and len(features_by_id) == 0:
            raise HTTPException(
                status_code=401,
                detail="audio_features:spotify_token_invalid",
            )
        return RecommendationsResponse(trackIds=track_ids[: req.limit])

    X = np.array(rows, dtype=np.float32)
    X_scaled = scaler.transform(X)
    X_tensor = torch.tensor(X_scaled, dtype=torch.float32)

    with torch.no_grad():
        logits = model(X_tensor)
        preds = torch.argmax(logits, dim=1).cpu().numpy().tolist()

    target = MOOD_TO_ID[req.mood]
    picked = [tid for tid, pred in zip(ordered_ids, preds) if pred == target]

    if len(picked) < req.limit:
        picked_set = set(picked)
        picked.extend([tid for tid in ordered_ids if tid not in picked_set])

    return RecommendationsResponse(trackIds=picked[: req.limit])


# Mangum handler for Vercel serverless
handler = Mangum(app)
