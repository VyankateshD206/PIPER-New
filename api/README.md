# PIPER ML API

FastAPI-based machine learning service for mood-based Spotify recommendations.

## Serverless Deployment

This API is configured to run as Vercel serverless functions using Mangum.

## Endpoints

### GET /api/health

Health check endpoint.

**Response:**

```json
{
  "ok": true
}
```

### POST /api/recommendations

Get mood-based track recommendations.

**Request:**

```json
{
  "mood": "Happy",
  "access_token": "spotify_bearer_token",
  "limit": 20
}
```

**Moods:** `"Happy"`, `"Calm"`, `"Neutral"`, `"Sad"`, `"Very Sad"`

**Response:**

```json
{
  "trackIds": ["track_id_1", "track_id_2", ...]
}
```

### POST /api/export/top-tracks-features

Export user's top tracks with audio features to CSV.

**Request:**

```json
{
  "access_token": "spotify_bearer_token",
  "limit": 50,
  "time_range": "medium_term"
}
```

**Time Ranges:** `"short_term"`, `"medium_term"`, `"long_term"`

**Response:**

```json
{
  "ok": true,
  "csvPath": "/tmp/top_tracks_features.csv",
  "rowsWritten": 45,
  "tracksFetched": 50,
  "failedAudioFeatures": 5
}
```

## Model Files

- `models/piper_model.pth` - PyTorch model for mood classification
- `models/scaler1.joblib` - Feature scaler (StandardScaler)

## Local Development

```bash
cd api
pip install -r requirements.txt
uvicorn index:app --reload
```

## Environment Variables

- `PIPER_MODEL_PATH` - Path to PyTorch model (default: `models/piper_model.pth`)
- `PIPER_SCALER_PATH` - Path to scaler file (default: `models/scaler1.joblib`)
- `PIPER_TOP_TRACKS_CSV_PATH` - CSV output path (default: `/tmp/top_tracks_features.csv`)

## Dependencies

- FastAPI - Web framework
- Mangum - ASGI adapter for AWS Lambda/Vercel
- PyTorch - Deep learning framework
- NumPy - Numerical computing
- Joblib - Model serialization
- Requests - HTTP library
- Pydantic - Data validation
