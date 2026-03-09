# 🏋️ GyMate

> A smart gym wristband and performance tracking system for university students — built for the 2026 Designathon at the University of Florida.

GyMate combines embedded hardware with a fullstack web application to track gym rep quality in real time. A Raspberry Pi Sense HAT IMU detects reps through accelerometer threshold crossing, scores them based on timing, and sends instant LED and LCD feedback to the athlete. On workout completion, sessions are posted to a cloud backend and visualized in a React dashboard.

---

## 🎯 Problem Statement

University students go to the gym with no objective way to measure whether their form is improving. GyMate solves this by tracking the *quality* of each rep — classifying it as good or bad based on rep timing — and giving instant on-device feedback without needing to look at a screen.

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| Wristband compute | Raspberry Pi 3B |
| Motion sensing | Sense HAT LSM9DS1 (accel, gyro, mag) + 8×8 LED matrix |
| Display | Arduino Nano + 16×2 LCD |
| Pi–Arduino comms | USB serial UART |
| Backend | FastAPI (Python) |
| Database | MongoDB Atlas |
| Frontend | React + Recharts |

---

## 📁 Project Structure

```
GyMate/
├── main.py               # FastAPI backend
├── pi_controller.py      # Full workout state machine (runs on Raspberry Pi)
├── gymate_arduino.ino    # Arduino Nano LCD sketch (C++)
├── sensor_monitor.py     # Raw IMU data monitor (debugging)
├── live_graph.py         # Real-time matplotlib magnitude graph (debugging)
├── .env                  # MongoDB connection string (not committed)
├── .gitignore
└── my-react-app/
    └── src/
        └── dashboard.jsx # React frontend
```

---

## ⚙️ Hardware

### Components

- **Raspberry Pi 3B** — main compute unit, runs the Python workout state machine and posts sessions to the backend over WiFi
- **Raspberry Pi Sense HAT** — LSM9DS1 IMU (accelerometer, gyroscope, magnetometer) + 8×8 LED matrix for real-time rep feedback. Plugs directly onto the Pi GPIO header
- **Arduino Nano** — receives rep count and state commands from the Pi via USB serial UART, drives the 16×2 LCD display
- **Power** — wall power (no battery)

### Wiring

```
Sense HAT   →  Raspberry Pi 3B   (GPIO header, direct plug-in)
Pi          →  Arduino Nano      (USB serial /dev/ttyUSB0)
Arduino     →  16×2 LCD          (pins 12, 11, 9, 8, 7, 6 | power via A0–A3)
```

### LED Matrix Feedback

The Sense HAT 8×8 LED matrix gives the athlete instant rep feedback:

- 🔵 **Blue (brightening)** — rep in progress, brightness increases over 3 seconds as a pacing guide
- 🟢 **Green flash** — rep completed with good form (2.5–3.5s timing)
- 🔴 **Red flash** — rep too fast (<2.5s) or too slow (>3.5s)

### LCD Display States

| State | Row 1 | Row 2 |
|-------|-------|-------|
| Idle | `GYM REP CNTR` | `Pick Exercise` |
| Menu | Exercise name (flashing) | `< a  select  d >` |
| Set active | `Set: N` | `Rep: N` |
| Rest | `Resting...` | `Time left: Ns` |
| Exercise done | Exercise name | `N sets CMPLT!` |

---

## 🔁 Workout Flow

```
STATE_MENU → STATE_READY → STATE_SET_ACTIVE → STATE_REST → STATE_WAIT_NEXT
```

**Joystick controls:**
- `LEFT / RIGHT` — navigate exercise menu
- `CLICK` — select exercise / start set / end set / start next set
- `DOWN` — end workout immediately and post session to backend

**Rep detection:**
Reps are detected when the IMU magnitude crosses `REP_THRESHOLD = 1.5G` after a minimum interval of `1.5s`. Rep timing is measured between crossings and scored:
- **Good rep** — 2.5s to 3.5s
- **Bad rep** — faster than 2.5s or slower than 3.5s

---

## 📡 Serial Protocol (Pi → Arduino)

```
CMD:IDLE
CMD:MENU|SEL:0
CMD:EXERCISE|NAME:Bench
CMD:SET_START|NAME:Bench|SET:1
CMD:REP|NAME:Bench|SET:1|REPS:3
CMD:SET_END|NAME:Bench|SET:1|REPS:8
CMD:REST|TIME:60
CMD:NEXT_SET
CMD:EXERCISE_END|NAME:Bench|SETS:3
```

---

## 🗄️ Database

MongoDB Atlas — cluster: `GyMate-cluster`, database: `gymate`

**users**
```json
{
  "name": "Nicolas L.",
  "email": "gator@ufl.edu",
  "university": "University of Florida",
  "age": "21",
  "weight": "165",
  "height": "70"
}
```

**sessions**
```json
{
  "email": "gator@ufl.edu",
  "exercise": "Bench",
  "good_reps": 6,
  "bad_reps": 2,
  "total_sets": 3,
  "user_id": "...",
  "timestamp": "2026-03-08T07:38:46.302406"
}
```

---

## 🚀 Getting Started

### 1. Clone the repo
```bash
git clone https://github.com/yourname/gymate.git
cd gymate
```

### 2. Set up environment variables
Create a `.env` file in the root:
```
MONGO_URI=mongodb+srv://<username>:<password>@gymate-cluster.sajixbd.mongodb.net/gymate?appName=GyMate-cluster
```

### 3. Install and run the backend
```bash
py -m pip install fastapi uvicorn motor python-dotenv
py -m uvicorn main:app --reload --host 0.0.0.0
```
Backend runs at `http://127.0.0.1:8000`

> Use `--host 0.0.0.0` so the Raspberry Pi can reach the backend over the local network.

### 4. Install and run the frontend
```bash
cd my-react-app
npm install
npm run dev
```
Frontend runs at `http://localhost:5173`

### 5. Run the Pi controller (on Raspberry Pi)
```bash
pip install sense-hat pyserial requests --break-system-packages
python pi_controller.py
```

> Update `BACKEND_URL` and `USER_EMAIL` at the top of `pi_controller.py` to match your laptop's IP and user.

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/users` | Create or return existing user |
| GET | `/users/{email}` | Fetch user profile by email |
| POST | `/sessions` | Save a completed workout session |
| GET | `/sessions/{email}` | Fetch all sessions for a user |
| GET | `/test` | Test MongoDB connection |

---

## 📊 Dashboard Features

- **Onboarding** — 2-step profile setup saved to MongoDB
- **Dashboard tab** — last session hero card (real data), weekly efficiency chart, rep quality graph, leaderboard preview
- **Session tab** — live rep counter, exercise selector, manual set logger
- **Leaderboard tab** — per-exercise and most active university rankings
- **History tab** — real session data from MongoDB, per-exercise stacked bar charts (good vs bad reps), form score ring, and session averages
- **Sign out** — clears localStorage and resets to onboarding

---

## 🔧 Pi Config Reference

```python
BACKEND_URL      = "http://<laptop-ip>:8000/sessions"
USER_EMAIL       = "your@email.com"
REP_THRESHOLD    = 1.5    # G force
MIN_REP_INTERVAL = 1.5    # seconds between reps
IDEAL_REP_TIME   = 3.0    # seconds
REST_DURATION    = 60     # seconds
EXERCISES        = ["Squat", "Bench", "Lat Pull-Dwn"]
```

---

## 🗺️ Roadmap

- [ ] WebSocket real-time rep streaming to React dashboard
- [ ] Replace hardcoded leaderboard with real MongoDB queries
- [ ] ML model for rep quality scoring beyond timing thresholds
- [ ] Mobile responsive layout
- [ ] Battery pack for fully wireless use

---

## 👥 Team

Built at the University of Florida 2026 Designathon.

---

## 📄 License

MIT
