# 🏋️ GyMate

> A portable gym performance tracker for university students — built for the 2026 Designathon at the University of Florida.

GyMate is a fullstack web application paired with a wrist-worn device that tracks gym performance in real time. It measures rep speed and range of motion, computes an efficiency score, ranks users on a university-wide leaderboard, and gives instant visual feedback via an LED matrix on the wristband.

---

## 🎯 Problem Statement

University students go to the gym but have no objective way to measure whether they're actually improving. GyMate solves this by tracking the *quality* of each rep — not just how much weight you lift — and ranking students against their peers on campus.

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Hardware | Raspberry Pi 3B, Arduino Nano, IMU (accelerometer/gyroscope + LED matrix) |
| Bridge | Python serial script (Pi → backend) |
| Backend | FastAPI (Python) |
| Database | MongoDB Atlas |
| Frontend | React + Recharts |
| Real-time | WebSockets |

---

## 📁 Project Structure

```
GyMate/
├── main.py          # FastAPI backend
├── bridge.py        # Serial bridge script (runs on Raspberry Pi)
├── .env             # MongoDB connection string (not committed)
├── dashboard.jsx    # React frontend
└── README.md
```

---

## ⚙️ Hardware

### Components

- **Raspberry Pi 3B** — main computing unit, runs the Python bridge script and communicates with the backend over WiFi
- **Arduino Nano** — reads sensor data from the IMU and sends it to the Pi over serial (USB)
- **IMU (Inertial Measurement Unit)** — accelerometer + gyroscope for tracking rep speed and range of motion. Also includes an onboard LED matrix for real-time feedback
- **Power** — connected via USB/wall power (no battery pack)

### Wiring

```
IMU → Arduino Nano (I2C: SDA/SCL)
Arduino Nano → Raspberry Pi 3B (USB serial)
Raspberry Pi 3B → WiFi → FastAPI Backend
```

### LED Matrix Feedback

The IMU's onboard LED matrix gives the athlete instant visual feedback during a rep:

- 🟢 **Green** — rep detected as good form (quality score above threshold)
- 🔴 **Red** — rep detected as poor form (quality score below threshold)

This means the athlete doesn't need to look at a screen during their workout — the wristband tells them in real time.

### Data Captured Per Rep

```json
{
  "speed_ms": 0.87,
  "rom_degrees": 94,
  "timestamp": "2026-03-06T14:32:01"
}
```

---

## 🗄️ Database

MongoDB Atlas with three collections:

**users** — athlete profile
```json
{
  "name": "Alex Chen",
  "email": "gator@ufl.edu",
  "university": "University of Florida",
  "age": 21,
  "weight_lbs": 165,
  "height_in": 70
}
```

**sessions** — each workout
```json
{
  "user_id": "user_001",
  "exercise": "Bench Press",
  "weight_lbs": 175,
  "date": "2026-03-06",
  "duration_mins": 42,
  "total_reps": 32,
  "efficiency_score": 88
}
```

**reps** — raw sensor data per rep
```json
{
  "session_id": "session_001",
  "rep_number": 1,
  "speed_ms": 0.87,
  "rom_degrees": 94,
  "quality_score": 88,
  "timestamp": "2026-03-06T14:32:01"
}
```

---

## 🚀 Getting Started

### 1. Clone the repo
```bash
git clone https://github.com/yourname/gymate.git
cd gymate
```

### 2. Install backend dependencies
```bash
py -m pip install fastapi uvicorn motor python-dotenv pymongo
```

### 3. Set up environment variables
Create a `.env` file in the root folder:
```
MONGO_URI=mongodb+srv://<username>:<password>@gymate-cluster.mongodb.net/gymate?appName=GyMate-cluster
```

### 4. Run the backend
```bash
py -m uvicorn main:app --reload
```
Backend runs at `http://127.0.0.1:8000`

### 5. Run the frontend
```bash
npm install
npm run dev
```
Frontend runs at `http://localhost:5173`

### 6. Run the bridge script (on Raspberry Pi)
```bash
python bridge.py
```
This reads serial data from the Arduino Nano and POSTs each rep to the FastAPI backend.

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/users` | Create a new user profile |
| GET | `/users/{email}` | Fetch a user by email |
| PUT | `/users/{email}` | Update a user profile |
| POST | `/sessions` | Save a workout session |
| POST | `/reps/live` | Receive live rep data from wristband |
| WS | `/ws/session` | WebSocket for real-time rep streaming |
| GET | `/test` | Test MongoDB connection |

---

## 📊 Features

- **Onboarding** — 2-step profile setup with name, email, university, age, weight, height
- **Live Session Tracking** — real-time rep counter, speed, and range of motion streamed from wristband
- **LED Feedback** — green/red LED matrix on wristband gives instant form feedback without needing to look at a screen
- **Manual Weight Input** — log weight and reps per set
- **Efficiency Score** — algorithm-computed score (0–100) per session
- **Leaderboards** — per-exercise rankings (Bench Press, Squat, Deadlift, OHP, Barbell Row, Curl)
- **Most Active** — leaderboard ranked by total sessions and streak
- **Session History** — past workouts with scores and weight progression chart
- **UF Themed** — University of Florida orange and blue color scheme

---

## 🤖 Efficiency Score Algorithm

The efficiency score is computed from IMU sensor data per rep. Current scoring factors:

- **Rep speed consistency** — penalizes high variance in speed across reps
- **Range of motion** — rewards full ROM relative to the exercise standard
- **Fatigue curve** — measures how much quality drops across a set
- **Tempo** — rewards a controlled eccentric (lowering) phase

The LED matrix threshold is set at a quality score of **70** — reps scoring above 70 show green, below show red.

---

## 🗺️ Roadmap

- [ ] Wire WebSocket real-time data from Arduino/Pi to frontend
- [ ] Train ML model on rep data to improve efficiency scoring
- [ ] Add per-exercise personal records tracking
- [ ] Mobile responsive layout
- [ ] University email verification
- [ ] Battery pack integration for fully wireless use

---

## 👥 Team

Built at the University of Florida 2026 Designathon.

---

## 📄 License

MIT
