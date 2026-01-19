#!/usr/bin/env python3
"""
Test script for PIPER ML API
Run locally before deploying to verify everything works
"""

import sys
import requests
import json

# Configuration
API_BASE_URL = (
    "http://127.0.0.1:8000"  # Change to your deployed URL for production testing
)


def test_health():
    """Test health endpoint"""
    print("Testing /health endpoint...")
    try:
        response = requests.get(f"{API_BASE_URL}/health")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        assert response.status_code == 200
        assert response.json()["ok"] == True
        print("✅ Health check passed!\n")
        return True
    except Exception as e:
        print(f"❌ Health check failed: {e}\n")
        return False


def test_recommendations(access_token: str):
    """Test recommendations endpoint"""
    print("Testing /recommendations endpoint...")

    payload = {"mood": "Happy", "access_token": access_token, "limit": 20}

    try:
        response = requests.post(
            f"{API_BASE_URL}/recommendations",
            json=payload,
            headers={"Content-Type": "application/json"},
        )
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")

        if response.status_code == 200:
            data = response.json()
            assert "trackIds" in data
            print(
                f"✅ Recommendations endpoint passed! Got {len(data['trackIds'])} tracks\n"
            )
            return True
        else:
            print(f"⚠️ Recommendations endpoint returned {response.status_code}\n")
            return False
    except Exception as e:
        print(f"❌ Recommendations test failed: {e}\n")
        return False


def test_export_features(access_token: str):
    """Test export features endpoint"""
    print("Testing /export/top-tracks-features endpoint...")

    payload = {"access_token": access_token, "limit": 50, "time_range": "medium_term"}

    try:
        response = requests.post(
            f"{API_BASE_URL}/export/top-tracks-features",
            json=payload,
            headers={"Content-Type": "application/json"},
        )
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")

        if response.status_code == 200:
            data = response.json()
            assert data["ok"] == True
            print(f"✅ Export features passed! Wrote {data['rowsWritten']} rows\n")
            return True
        else:
            print(f"⚠️ Export features returned {response.status_code}\n")
            return False
    except Exception as e:
        print(f"❌ Export features test failed: {e}\n")
        return False


def main():
    print("🧪 PIPER ML API Test Suite\n")
    print(f"Testing API at: {API_BASE_URL}\n")

    # Test health endpoint (no auth required)
    health_passed = test_health()

    if not health_passed:
        print("❌ Health check failed. Make sure the API is running.")
        print("\nStart the API with:")
        print("  cd ml_service")
        print("  uvicorn app:app --reload")
        print("\nOr for serverless:")
        print("  cd api")
        print("  uvicorn index:app --reload")
        sys.exit(1)

    # For endpoints requiring Spotify auth
    print("\n" + "=" * 60)
    print("To test authenticated endpoints, provide a Spotify token:")
    print("=" * 60)
    print("\n1. Get token from your app's Spotify session")
    print("2. Run: python test_api.py YOUR_SPOTIFY_TOKEN\n")

    if len(sys.argv) > 1:
        access_token = sys.argv[1]
        print(f"Using provided access token: {access_token[:20]}...\n")

        test_recommendations(access_token)
        test_export_features(access_token)
    else:
        print("⏭️  Skipping authenticated endpoint tests (no token provided)\n")

    print("✅ Basic tests complete!")


if __name__ == "__main__":
    main()
