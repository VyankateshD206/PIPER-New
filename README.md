# PIPER — Personalized Mood-Based Song Recommendation 🎵

PIPER is a personalized music recommendation platform that combines **machine learning** with the **Spotify Web API** to recommend songs based on a user's musical preferences and listening history.

The system analyzes Spotify audio features and uses a trained **Artificial Neural Network (ANN)** to classify songs into different mood categories. Users can explore recommendations and create mood-based playlists directly in their Spotify account.

![PIPER Logo](assets/piper_banner_img.png)
---

## ✨ Features

### 🎯 Personalized Song Recommendations

PIPER generates personalized song recommendations by analyzing the user's Spotify listening data and extracting relevant musical characteristics.

### 🧠 Mood-Based Song Classification

A trained **Artificial Neural Network (ANN)** classifies songs into different mood categories using Spotify audio features such as:

- Danceability
- Energy
- Valence
- Tempo
- Loudness

### 🎵 Spotify Integration

PIPER integrates with the **Spotify Web API** to:

- Authenticate Spotify users
- Retrieve listening history and top tracks
- Access track metadata and audio features
- Search and retrieve songs
- Create personalized playlists

### 📋 Automated Playlist Creation

Users can generate mood-based playlists from recommended songs and save them directly to their Spotify account.

### 🔐 Secure Authentication

The application uses Spotify's authentication flow to securely connect users' Spotify accounts and access authorized music data.

### 🖥️ Interactive Web Interface

PIPER provides an intuitive interface for users to:

- Connect their Spotify account
- Analyze their listening preferences
- Explore recommended songs
- View mood classifications
- Generate personalized playlists

---

## 🏗️ System Architecture

PIPER follows a modular architecture consisting of a web application, backend APIs, machine-learning inference service, database, and Spotify integration.

```text
                    ┌──────────────────────┐
                    │      User / Web UI   │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │    Next.js / API     │
                    │       Layer          │
                    └───────┬───────┬──────┘
                            │       │
                ┌───────────┘       └──────────────┐
                ▼                                  ▼
       ┌──────────────────┐              ┌──────────────────┐
       │   PostgreSQL     │              │   Spotify API    │
       │    Database      │              │                  │
       └──────────────────┘              └────────┬─────────┘
                                                  │
                                                  ▼
                                        ┌──────────────────┐
                                        │ Spotify Audio    │
                                        │ Features         │
                                        └────────┬─────────┘
                                                 │
                                                 ▼
                                        ┌──────────────────┐
                                        │  ML Inference    │
                                        │  PyTorch / ANN   │
                                        └────────┬─────────┘
                                                 │
                                                 ▼
                                        ┌──────────────────┐
                                        │ Mood-Based       │
                                        │ Recommendations  │
                                        └──────────────────┘
```

---

## 🤖 Machine Learning Pipeline

The recommendation pipeline uses Spotify's audio features as input to a trained neural network.

```text
Spotify User Data
       │
       ▼
Retrieve Top Tracks
       │
       ▼
Extract Audio Features
       │
       ├── Danceability
       ├── Energy
       ├── Valence
       ├── Tempo
       └── Loudness
       │
       ▼
Feature Preprocessing
       │
       ▼
ANN / PyTorch Model
       │
       ▼
Mood Classification
       │
       ▼
Personalized Recommendations
       │
       ▼
Spotify Playlist
```

The model maps the extracted audio characteristics of songs to predefined mood categories, which are then used to generate mood-based recommendations.

---

## 🛠️ Tech Stack

### Frontend
- Next.js
- TypeScript
- React

### Backend
- FastAPI
- Python
- REST APIs

### Machine Learning
- PyTorch
- Artificial Neural Network (ANN)
- Feature preprocessing and normalization

### Database
- PostgreSQL
- Drizzle ORM

### External APIs
- Spotify Web API

### Deployment
- Vercel
- Cloud-based API deployment

---

## 🔄 Application Workflow

1. User opens the PIPER web application.
2. User authenticates using their Spotify account.
3. PIPER retrieves authorized Spotify listening data.
4. The application fetches relevant audio features for the user's tracks.
5. Audio features are preprocessed and passed to the trained ANN model.
6. The model classifies tracks into different mood categories.
7. PIPER generates personalized song recommendations.
8. Users explore the recommendations.
9. Users create a mood-based Spotify playlist.
10. The generated playlist becomes available directly in the user's Spotify account.

---

## 🎼 Spotify Integration

PIPER uses the Spotify Web API to interact with users' music data.

The integration supports:

- Spotify authentication
- User profile access
- Top tracks retrieval
- Track information retrieval
- Audio feature extraction
- Playlist creation
- Playlist management

All Spotify operations are performed through authorized API access.

---

## 📂 Project Structure

```text
PIPER-New/
│
├── api/
│   ├── model/
│   ├── inference/
│   ├── routes/
│   └── ...
│
├── next_web/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   └── ...
│   ├── drizzle/
│   └── ...
│
├── README.md
└── ...
```

---

