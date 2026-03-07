// ============================================================
//  LCD UART Controller for Arduino
//  Controlled via Raspberry Pi over Serial (UART)
//
//  WIRING (16x2 LCD in 4-bit mode):
//    LCD RS  → Arduino Pin 12
//    LCD EN  → Arduino Pin 11
//    LCD D4  → Arduino Pin 5
//    LCD D5  → Arduino Pin 4
//    LCD D6  → Arduino Pin 3
//    LCD D7  → Arduino Pin 2
//    LCD VSS → GND
//    LCD VDD → 5V
//    LCD V0  → Potentiometer middle pin (contrast)
//    LCD A   → 5V (backlight anode, add 220Ω resistor)
//    LCD K   → GND (backlight cathode)
//
//  SERIAL SETTINGS:
//    Baud Rate : 9600
//    Arduino TX → Raspberry Pi RX (GPIO 15)
//    Arduino RX → Raspberry Pi TX (GPIO 14)
//    Shared GND between Arduino and Raspberry Pi
// ============================================================

#include <LiquidCrystal.h>

// --- LCD Pin Configuration (change these if needed) ---
const int PIN_RS = 12;
const int PIN_EN = 11;
const int PIN_D4 = 5;
const int PIN_D5 = 4;
const int PIN_D6 = 3;
const int PIN_D7 = 2;

// --- LCD Dimensions (change for 20x4 or other sizes) ---
const int LCD_COLS = 16;
const int LCD_ROWS = 2;

// --- Serial Baud Rate ---
const long BAUD_RATE = 9600;

LiquidCrystal lcd(PIN_RS, PIN_EN, PIN_D4, PIN_D5, PIN_D6, PIN_D7);

String inputBuffer = "";
bool newData = false;

// ============================================================
//  COMMAND PROTOCOL (send these strings from Raspberry Pi):
//
//  CLEAR                   → Clears the entire display
//  PRINT:Hello World       → Prints text at current cursor
//  LINE1:Top row text      → Sets text on row 1 (clears row first)
//  LINE2:Bottom row text   → Sets text on row 2 (clears row first)
//  CURSOR:col,row          → Moves cursor (e.g. CURSOR:0,1)
//  SCROLL:Your message     → Scrolls text across row 1
//  BACKLIGHT:ON or OFF     → Turn backlight on/off (needs transistor circuit)
//  RESET                   → Clears display and shows welcome message
//
//  All commands end with newline '\n'
// ============================================================

void setup() {
  Serial.begin(BAUD_RATE);
  inputBuffer.reserve(64);

  lcd.begin(LCD_COLS, LCD_ROWS);
  lcd.clear();

  // Startup message
  lcd.setCursor(0, 0);
  lcd.print("  LCD Ready!    ");
  lcd.setCursor(0, 1);
  lcd.print(" Waiting UART.. ");

  Serial.println("LCD Controller Ready. Awaiting commands.");
}

void loop() {
  receiveSerial();

  if (newData) {
    processCommand(inputBuffer);
    inputBuffer = "";
    newData = false;
  }
}

// --- Read serial data until newline ---
void receiveSerial() {
  while (Serial.available() > 0) {
    char c = Serial.read();
    if (c == '\n') {
      inputBuffer.trim();
      if (inputBuffer.length() > 0) {
        newData = true;
      }
    } else if (c != '\r') {
      inputBuffer += c;
    }
  }
}

// --- Parse and execute command ---
void processCommand(String cmd) {
  cmd.trim();

  // CLEAR
  if (cmd.equalsIgnoreCase("CLEAR")) {
    lcd.clear();
    Serial.println("OK: Display cleared.");
  }

  // RESET
  else if (cmd.equalsIgnoreCase("RESET")) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("  LCD Ready!    ");
    lcd.setCursor(0, 1);
    lcd.print(" Waiting UART.. ");
    Serial.println("OK: Display reset.");
  }

  // PRINT:<text>
  else if (cmd.startsWith("PRINT:")) {
    String text = cmd.substring(6);
    lcd.print(text);
    Serial.println("OK: Printed -> " + text);
  }

  // LINE1:<text>
  else if (cmd.startsWith("LINE1:")) {
    String text = cmd.substring(6);
    text = padOrTrim(text, LCD_COLS);
    lcd.setCursor(0, 0);
    lcd.print(text);
    Serial.println("OK: Line 1 -> " + text);
  }

  // LINE2:<text>
  else if (cmd.startsWith("LINE2:")) {
    String text = cmd.substring(6);
    text = padOrTrim(text, LCD_COLS);
    lcd.setCursor(0, 1);
    lcd.print(text);
    Serial.println("OK: Line 2 -> " + text);
  }

  // CURSOR:col,row
  else if (cmd.startsWith("CURSOR:")) {
    String coords = cmd.substring(7);
    int commaIndex = coords.indexOf(',');
    if (commaIndex != -1) {
      int col = coords.substring(0, commaIndex).toInt();
      int row = coords.substring(commaIndex + 1).toInt();
      col = constrain(col, 0, LCD_COLS - 1);
      row = constrain(row, 0, LCD_ROWS - 1);
      lcd.setCursor(col, row);
      Serial.println("OK: Cursor at col=" + String(col) + " row=" + String(row));
    } else {
      Serial.println("ERR: CURSOR format is CURSOR:col,row");
    }
  }

  // SCROLL:<text>  — scrolls message across row 1
  else if (cmd.startsWith("SCROLL:")) {
    String text = cmd.substring(7);
    scrollText(text, 0);
    Serial.println("OK: Scrolled -> " + text);
  }

  // Unknown command
  else {
    Serial.println("ERR: Unknown command -> " + cmd);
    Serial.println("     Valid: CLEAR, RESET, PRINT:<text>, LINE1:<text>,");
    Serial.println("            LINE2:<text>, CURSOR:col,row, SCROLL:<text>");
  }
}

// --- Pad text with spaces or trim to fit LCD columns ---
String padOrTrim(String text, int width) {
  while ((int)text.length() < width) text += ' ';
  if ((int)text.length() > width) text = text.substring(0, width);
  return text;
}

// --- Scroll text across a given LCD row ---
void scrollText(String text, int row) {
  String padded = "                " + text + "                ";
  // 16 leading spaces + text + 16 trailing spaces
  for (int i = 0; i <= (int)(padded.length() - LCD_COLS); i++) {
    lcd.setCursor(0, row);
    lcd.print(padded.substring(i, i + LCD_COLS));
    delay(300); // Scroll speed (ms) — adjust as needed
  }
}
