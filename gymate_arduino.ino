// ============================================================
//  GyMate — Arduino LCD Display Controller
// ============================================================
//
//  WIRING:
//    LCD RS  → Arduino pin 12
//    LCD EN  → Arduino pin 11
//    LCD D4  → Arduino pin 9
//    LCD D5  → Arduino pin 8
//    LCD D6  → Arduino pin 7
//    LCD D7  → Arduino pin 6
//    LCD VDD → A1 (set HIGH in setup)
//    LCD VSS → A0 (set LOW in setup)
//    LCD RW  → A0 (GND)
//    LCD V0  → middle pin of potentiometer
//    LCD A   → A3 (backlight+)
//    LCD K   → A2 (backlight-)
//
//  SERIAL COMMANDS FROM PI:
//    a                              — menu left
//    d                              — menu right
//    s                              — select / confirm
//    CMD:IDLE
//    CMD:MENU|SEL:0
//    CMD:EXERCISE|NAME:Bench
//    CMD:SET_START|NAME:Bench|SET:1
//    CMD:REP|NAME:Bench|SET:1|REPS:3
//    CMD:SET_END|NAME:Bench|SET:1|REPS:8
//    CMD:REST|TIME:60
//    CMD:NEXT_SET
//    CMD:EXERCISE_END|NAME:Bench|SETS:3
//
// ============================================================

#include <LiquidCrystal.h>

LiquidCrystal lcd(12, 11, 9, 8, 7, 6);

String inputBuffer = "";

// Menu flash state
bool          inMenu     = false;
int           menuSel    = 0;
bool          flashState = false;
unsigned long lastFlash  = 0;
const unsigned long FLASH_MS = 500;

// Current display state — used to avoid redundant lcd.clear()
String lastRow0 = "";
String lastRow1 = "";

const char* MENU_NAMES[3] = {"Squat", "Bench", "Lat Pull-Dwn"};

// ================================
void setup() {
  pinMode(A0, OUTPUT); digitalWrite(A0, LOW);
  pinMode(A1, OUTPUT); digitalWrite(A1, HIGH);
  pinMode(A2, OUTPUT); digitalWrite(A2, LOW);
  pinMode(A3, OUTPUT); digitalWrite(A3, HIGH);

  delay(500);
  Serial.begin(9600);
  lcd.begin(16, 2);
  delay(200);
  showIdle();
}

// ================================
void loop() {
  // Handle menu flashing independently of serial input
  if (inMenu) {
    unsigned long now = millis();
    if (now - lastFlash >= FLASH_MS) {
      lastFlash  = now;
      flashState = !flashState;
      updateMenuFlash();
    }
  }

  // Read serial commands from Pi
  while (Serial.available() > 0) {
    char c = Serial.read();
    if (c == '\n') {
      parseCommand(inputBuffer);
      inputBuffer = "";
    } else if (c != '\r') {
      inputBuffer += c;
    }
  }
}

// ================================
//  HELPERS
// ================================
String centerText(String s) {
  int len    = s.length();
  int spaces = (16 - len) / 2;
  String out = "";
  for (int i = 0; i < spaces; i++) out += ' ';
  out += s;
  while ((int)out.length() < 16) out += ' ';
  return out;
}

String padRight(String s, int width) {
  while ((int)s.length() < width) s += ' ';
  if ((int)s.length() > width) s = s.substring(0, width);
  return s;
}

// Write a row only if it has changed — prevents LCD flicker on rapid updates
void writeRow(int row, String text) {
  text = padRight(text, 16);
  if (row == 0 && text == lastRow0) return;
  if (row == 1 && text == lastRow1) return;
  lcd.setCursor(0, row);
  lcd.print(text);
  if (row == 0) lastRow0 = text;
  if (row == 1) lastRow1 = text;
}

void clearDisplay() {
  lcd.clear();
  lastRow0 = "";
  lastRow1 = "";
}

// ================================
//  MENU FLASH
// ================================
void updateMenuFlash() {
  lcd.setCursor(0, 0);
  if (flashState) {
    lcd.print(centerText(String(MENU_NAMES[menuSel])));
  } else {
    lcd.print("                ");
  }
}

// ================================
//  COMMAND PARSER
// ================================
void parseCommand(String msg) {
  msg.trim();
  if (msg.length() == 0) return;

  // ── Single-char joystick commands ────────────────────────────────────────
  // The Pi sends 'a', 'd', 's' for joystick events alongside CMD strings.
  // These are informational — the Pi manages all state; Arduino just displays.
  if (msg == "a" || msg == "d" || msg == "s") return;

  // ── Full CMD strings ──────────────────────────────────────────────────────
  String cmd = extractField(msg, "CMD");

  if (cmd == "IDLE") {
    inMenu = false;
    showIdle();

  } else if (cmd == "MENU") {
    menuSel    = extractField(msg, "SEL").toInt();
    inMenu     = true;
    flashState = true;
    lastFlash  = millis();
    lcd.noBlink();
    clearDisplay();
    writeRow(1, "< a  select  d >");
    updateMenuFlash();

  } else if (cmd == "EXERCISE") {
    inMenu = false;
    showExerciseSelected(extractField(msg, "NAME"));

  } else if (cmd == "SET_START") {
    inMenu = false;
    showSetInProgress(
      extractField(msg, "NAME"),
      extractField(msg, "SET").toInt(),
      0
    );

  } else if (cmd == "REP") {
    // Only update row 1 — avoids full clear and prevents flicker
    // during rapid rep updates
    int reps = extractField(msg, "REPS").toInt();
    writeRow(1, "Rep: " + String(reps));

  } else if (cmd == "SET_END") {
    showSetComplete(
      extractField(msg, "NAME"),
      extractField(msg, "SET").toInt(),
      extractField(msg, "REPS").toInt()
    );

  } else if (cmd == "REST") {
    // Only update row 1 each second — row 0 stays "   Resting...  "
    int t = extractField(msg, "TIME").toInt();
    showRest(t);

  } else if (cmd == "NEXT_SET") {
    showNextSet();

  } else if (cmd == "EXERCISE_END") {
    showExerciseComplete(
      extractField(msg, "NAME"),
      extractField(msg, "SETS").toInt()
    );
  }
}

// ================================
//  FIELD EXTRACTOR
// ================================
String extractField(String msg, String key) {
  String search = key + ":";
  int start = msg.indexOf(search);
  if (start == -1) return "";
  start += search.length();
  int end = msg.indexOf("|", start);
  if (end == -1) end = msg.length();
  return msg.substring(start, end);
}

// ================================
//  DISPLAY FUNCTIONS
// ================================
void showIdle() {
  clearDisplay();
  writeRow(0, "  GYM REP CNTR");
  writeRow(1, " Pick Exercise");
}

void showExerciseSelected(String name) {
  lcd.noBlink();
  clearDisplay();
  writeRow(0, centerText(name));
  writeRow(1, "  Press START");
}

void showSetInProgress(String name, int set, int reps) {
  lcd.noBlink();
  clearDisplay();
  writeRow(0, "Set: " + String(set));
  writeRow(1, "Rep: " + String(reps));
}

void showSetComplete(String name, int set, int reps) {
  lcd.noBlink();
  clearDisplay();
  writeRow(0, "Set " + String(set) + " DONE!");
  writeRow(1, String(reps) + " reps  Rest...");
}

void showRest(int secondsRemaining) {
  // Write row 0 only once to avoid flicker (writeRow handles deduplication)
  writeRow(0, "   Resting...");
  writeRow(1, "Time left: " + String(secondsRemaining) + "s");
}

void showNextSet() {
  lcd.noBlink();
  clearDisplay();
  writeRow(0, "Click button to");
  writeRow(1, "begin next set");
}

void showExerciseComplete(String name, int sets) {
  lcd.noBlink();
  clearDisplay();
  writeRow(0, centerText(name));
  writeRow(1, String(sets) + " sets CMPLT!");
}
