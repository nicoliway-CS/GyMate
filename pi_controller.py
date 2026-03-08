"""
GyMate — Raspberry Pi Controller
==================================
Handles:
  - Sense HAT joystick → serial commands to Arduino
  - Rep counting via accelerometer magnitude
  - Full workout state machine
  - LED feedback (blue timer, green/red result)
  - 60-second rest timer
  - HTTP POST to backend on workout end

Requirements:
  pip install sense-hat pyserial requests --break-system-packages

Run:
  python pi_controller.py
"""

from sense_hat import SenseHat
import serial
import requests
import math
import time

# ── Config ────────────────────────────────────────────────────────────────────
BACKEND_URL      = "http://<YOUR_LAPTOP_IP>:8000/sessions"
USER_EMAIL       = "gator@ufl.edu"

REP_THRESHOLD    = 1.5    # G force threshold for rep crossing
MIN_REP_INTERVAL = 1.5    # min seconds between crossings to count as a rep

IDEAL_REP_TIME   = 3.0    # ideal rep duration in seconds
MARGIN           = 0.5
MIN_GOOD_TIME    = IDEAL_REP_TIME - MARGIN   # 2.5s
MAX_GOOD_TIME    = IDEAL_REP_TIME + MARGIN   # 3.5s

REST_DURATION    = 60     # seconds

EXERCISES        = ["Squat", "Bench", "Lat Pull-Dwn"]

# ── Hardware Init ─────────────────────────────────────────────────────────────
sense = SenseHat()
sense.clear()

try:
    arduino = serial.Serial('/dev/ttyUSB0', 9600, timeout=1)
    time.sleep(2)
    arduino_connected = True
    print("Arduino connected!")
except Exception as e:
    arduino = None
    arduino_connected = False
    print(f"Arduino not connected — running without LCD. ({e})")

# ── Serial Send ───────────────────────────────────────────────────────────────
def send(cmd):
    """Send a newline-terminated command to Arduino."""
    if arduino_connected:
        try:
            arduino.write((cmd + "\n").encode())
        except Exception as e:
            print(f"  [SERIAL ERROR] {e}")
    else:
        print(f"  [SERIAL] {cmd}")

# ── Joystick Helpers ──────────────────────────────────────────────────────────
def get_joystick():
    """
    Returns the first joystick press this tick or None.
    Returns: 'left' | 'right' | 'click' | 'down' | None
    """
    for e in sense.stick.get_events():
        if e.action == "pressed":
            if e.direction == "left":   return "left"
            if e.direction == "right":  return "right"
            if e.direction == "middle": return "click"
            if e.direction == "down":   return "down"
    return None

# ── Arduino LCD Commands ──────────────────────────────────────────────────────
def lcd_menu(sel):
    send(f"CMD:MENU|SEL:{sel}")

def lcd_exercise_selected(name):
    send(f"CMD:EXERCISE|NAME:{name}")

def lcd_set_start(name, set_num):
    send(f"CMD:SET_START|NAME:{name}|SET:{set_num}")

def lcd_rep(name, set_num, reps):
    send(f"CMD:REP|NAME:{name}|SET:{set_num}|REPS:{reps}")

def lcd_set_end(name, set_num, reps):
    send(f"CMD:SET_END|NAME:{name}|SET:{set_num}|REPS:{reps}")

def lcd_rest(seconds_remaining):
    send(f"CMD:REST|TIME:{seconds_remaining}")

def lcd_ready_next_set():
    send("CMD:NEXT_SET")

def lcd_exercise_end(name, sets):
    send(f"CMD:EXERCISE_END|NAME:{name}|SETS:{sets}")

# ── Magnitude ─────────────────────────────────────────────────────────────────
def get_magnitude():
    a = sense.get_accelerometer_raw()
    return math.sqrt(a['x']**2 + a['y']**2 + a['z']**2)

# ── Backend POST ──────────────────────────────────────────────────────────────
def post_workout(exercise, good_reps, bad_reps, total_sets):
    payload = {
        "email":      USER_EMAIL,
        "exercise":   exercise,
        "good_reps":  good_reps,
        "bad_reps":   bad_reps,
        "total_sets": total_sets,
    }
    try:
        r = requests.post(BACKEND_URL, json=payload, timeout=5)
        print(f"  [BACKEND] {r.status_code} — {payload}")
    except Exception as e:
        print(f"  [BACKEND ERROR] {e}")

# ── LED State Machine ─────────────────────────────────────────────────────────
# Three LED states, all driven in the main loop — no threads.
LED_OFF   = "off"
LED_BLUE  = "blue"    # blue timer growing during rep
LED_FLASH = "flash"   # green or red flash after rep result

led_state        = LED_OFF
led_color        = (0, 0, 0)
flash_start_time = 0.0
FLASH_SPEED      = 0.15   # seconds per on/off half-cycle
FLASH_TIMES      = 3      # number of full on/off cycles

def start_blue_timer():
    global led_state, rep_start_time, flash_start_time
    rep_start_time   = time.time()
    flash_start_time = rep_start_time   # reuse for red-flash timing inside blue
    led_state        = LED_BLUE

def start_flash(color):
    global led_state, led_color, flash_start_time
    led_color        = color
    flash_start_time = time.time()
    led_state        = LED_FLASH

def update_led():
    """
    Called every main loop tick.
    Drives the LED matrix based on led_state — no blocking sleeps.
    """
    global led_state
    now = time.time()

    if led_state == LED_OFF:
        sense.clear(0, 0, 0)

    elif led_state == LED_BLUE:
        if rep_start_time is None:
            sense.clear(0, 0, 20)
            return
        elapsed = now - rep_start_time
        if elapsed > MAX_GOOD_TIME:
            # taking too long — flash red warning at 5Hz
            tick = int((now - flash_start_time) / 0.2)
            sense.clear(255, 0, 0) if tick % 2 == 0 else sense.clear(0, 0, 0)
        else:
            # blue brightness grows from 20 → 255 over IDEAL_REP_TIME
            progress   = min(elapsed / IDEAL_REP_TIME, 1.0)
            brightness = int(20 + 235 * progress)
            sense.clear(0, 0, brightness)

    elif led_state == LED_FLASH:
        elapsed = now - flash_start_time
        tick    = int(elapsed / FLASH_SPEED)
        if tick >= FLASH_TIMES * 2:
            # flashing done
            sense.clear(0, 0, 0)
            led_state = LED_OFF
        else:
            sense.clear(led_color) if tick % 2 == 0 else sense.clear(0, 0, 0)

# ── Workout State Machine ─────────────────────────────────────────────────────
STATE_MENU       = "menu"
STATE_READY      = "ready"       # exercise chosen, waiting for start press
STATE_SET_ACTIVE = "set_active"  # set in progress
STATE_REST       = "rest"        # 60s rest countdown
STATE_WAIT_NEXT  = "wait_next"   # rest over, waiting for press to start next set

state            = STATE_MENU
menu_sel         = 0
current_exercise = None
current_set      = 0
set_reps         = 0    # reps in the current set only (resets each set)
good_reps        = 0    # session total — does NOT reset between sets
bad_reps         = 0    # session total — does NOT reset between sets
total_sets       = 0

# Rep detection
prev_magnitude     = 0.0
last_crossing_time = None
rep_start_time     = None

# Rest timer
rest_start_time   = 0.0
last_rest_display = -1

# ── Helpers ───────────────────────────────────────────────────────────────────
def reset_session():
    """Reset all session tracking variables for a new exercise."""
    global current_set, set_reps, good_reps, bad_reps, total_sets
    global last_crossing_time, rep_start_time, prev_magnitude, led_state
    current_set        = 0
    set_reps           = 0
    good_reps          = 0
    bad_reps           = 0
    total_sets         = 0
    last_crossing_time = None
    rep_start_time     = None
    prev_magnitude     = 0.0
    led_state          = LED_OFF
    sense.clear(0, 0, 0)

def end_workout():
    """End workout, post data, return to menu."""
    global state, current_exercise, menu_sel, total_sets, set_reps
    print(f"Workout ended → posting data")

    # if a set was active count it
    if state == STATE_SET_ACTIVE:
        total_sets += 1
        lcd_set_end(current_exercise, current_set, set_reps)
        time.sleep(0.5)

    post_workout(current_exercise, good_reps, bad_reps, total_sets)
    lcd_exercise_end(current_exercise, total_sets)
    time.sleep(2)

    reset_session()
    state      = STATE_MENU
    menu_sel   = 0
    lcd_menu(menu_sel)
    print("Returned to menu")

# ── Main Loop ─────────────────────────────────────────────────────────────────
print("=" * 40)
print("       GYMATE STARTING")
print("=" * 40)

lcd_menu(menu_sel)

while True:
    now      = time.time()
    joystick = get_joystick()

    # ── Global: joystick DOWN always ends workout (unless on menu) ────────────
    if joystick == "down" and state != STATE_MENU:
        end_workout()
        joystick = None   # consumed

    # ══════════════════════════════════════════════════════════════════════════
    #  MENU
    # ══════════════════════════════════════════════════════════════════════════
    if state == STATE_MENU:
        if joystick == "left":
            menu_sel = (menu_sel - 1) % len(EXERCISES)
            send("a")   # joystick left → 'a' to Arduino
            lcd_menu(menu_sel)
            print(f"Menu ← {EXERCISES[menu_sel]}")

        elif joystick == "right":
            menu_sel = (menu_sel + 1) % len(EXERCISES)
            send("d")   # joystick right → 'd' to Arduino
            lcd_menu(menu_sel)
            print(f"Menu → {EXERCISES[menu_sel]}")

        elif joystick == "click":
            send("s")   # joystick click → 's' to Arduino
            current_exercise = EXERCISES[menu_sel]
            reset_session()
            state = STATE_READY
            lcd_exercise_selected(current_exercise)
            print(f"Selected: {current_exercise}")

    # ══════════════════════════════════════════════════════════════════════════
    #  READY — exercise selected, waiting for start press
    # ══════════════════════════════════════════════════════════════════════════
    elif state == STATE_READY:
        if joystick == "click":
            send("s")
            current_set = 1
            set_reps    = 0
            state       = STATE_SET_ACTIVE
            lcd_set_start(current_exercise, current_set)
            sense.clear(0, 0, 0)
            print(f"Set {current_set} started")

    # ══════════════════════════════════════════════════════════════════════════
    #  SET ACTIVE — rep counting live
    # ══════════════════════════════════════════════════════════════════════════
    elif state == STATE_SET_ACTIVE:

        # joystick click → end current set
        if joystick == "click":
            send("s")
            total_sets     += 1
            led_state       = LED_OFF
            sense.clear(0, 0, 0)
            lcd_set_end(current_exercise, current_set, set_reps)
            rest_start_time   = now
            last_rest_display = -1
            state             = STATE_REST
            print(f"Set {current_set} ended — {set_reps} reps. Resting...")

        else:
            # ── Rep detection: upward threshold crossing ───────────────────
            magnitude = get_magnitude()
            crossed   = prev_magnitude <= REP_THRESHOLD and magnitude > REP_THRESHOLD

            if crossed:
                if last_crossing_time is None:
                    # first crossing — start of first rep
                    last_crossing_time = now
                    start_blue_timer()
                    print("First crossing — blue timer started")

                else:
                    time_since_last = now - last_crossing_time

                    if time_since_last >= MIN_REP_INTERVAL:
                        # valid rep completed
                        rep_time = time_since_last

                        if MIN_GOOD_TIME <= rep_time <= MAX_GOOD_TIME:
                            good_reps += 1
                            start_flash((0, 255, 0))
                            result = "GOOD ✓"
                        elif rep_time < MIN_GOOD_TIME:
                            bad_reps += 1
                            start_flash((255, 0, 0))
                            result = "TOO FAST ✗"
                        else:
                            bad_reps += 1
                            start_flash((255, 0, 0))
                            result = "TOO SLOW ✗"

                        set_reps          += 1
                        last_crossing_time = now
                        rep_start_time     = now   # restart blue timer base

                        print(f"Rep {set_reps} | {rep_time:.2f}s | {result} | G:{good_reps} B:{bad_reps}")
                        lcd_rep(current_exercise, current_set, set_reps)

                    else:
                        print(f"  Crossing ignored ({time_since_last:.2f}s too soon)")

            prev_magnitude = magnitude

            # after a flash finishes, restart blue timer for next rep
            if led_state == LED_OFF and last_crossing_time is not None:
                start_blue_timer()

        # update LED every tick
        update_led()

    # ══════════════════════════════════════════════════════════════════════════
    #  REST — 60-second countdown
    # ══════════════════════════════════════════════════════════════════════════
    elif state == STATE_REST:
        elapsed_rest = now - rest_start_time
        remaining    = int(REST_DURATION - elapsed_rest)

        # update LCD every second
        if remaining != last_rest_display:
            last_rest_display = remaining
            lcd_rest(remaining)
            print(f"Rest: {remaining}s")

        if remaining <= 0:
            state = STATE_WAIT_NEXT
            lcd_ready_next_set()
            print("Rest over — waiting for button")

    # ══════════════════════════════════════════════════════════════════════════
    #  WAIT NEXT SET — rest over, waiting for button press
    # ══════════════════════════════════════════════════════════════════════════
    elif state == STATE_WAIT_NEXT:
        if joystick == "click":
            send("s")
            current_set       += 1
            set_reps           = 0
            last_crossing_time = None
            rep_start_time     = None
            prev_magnitude     = 0.0
            led_state          = LED_OFF
            state              = STATE_SET_ACTIVE
            lcd_set_start(current_exercise, current_set)
            sense.clear(0, 0, 0)
            print(f"Set {current_set} started")

    time.sleep(0.02)   # 50Hz main loop
