#include <LiquidCrystal_I2C.h>

// LCD I2C address (common addresses: 0x27, 0x3F)
#define LCD_ADDRESS 0x27

// LCD dimensions
#define LCD_COLS 16
#define LCD_ROWS 2

// Initialize LCD
LiquidCrystal_I2C lcd(LCD_ADDRESS, LCD_COLS, LCD_ROWS);

void setup() {
  // Initialize serial communication
  Serial.begin(9600);
  Serial.println("LCD Controller Ready. Awaiting commands.");

  // Initialize LCD
  lcd.init();
  lcd.backlight();

  // Display startup message
  lcd.setCursor(0, 0);
  lcd.print("GyMate Ready!");
  lcd.setCursor(0, 1);
  lcd.print("Waiting for data...");
}

void loop() {
  // Check for serial data
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    command.trim();

    // debug: print incoming bytes in hex to see exactly what arrived
    Serial.print("RAW:");
    for (unsigned int i = 0; i < command.length(); ++i) {
      uint8_t b = command[i];
      if (b < 0x10) Serial.print('0');
      Serial.print(b, HEX);
      Serial.print(' ');
    }
    Serial.println();

    if (command.startsWith("LINE1:")) {
      String text = command.substring(6); // Remove "LINE1:" prefix
      lcd.setCursor(0, 0);
      lcd.print("                "); // Clear line
      lcd.setCursor(0, 0);
      lcd.print(text);
      Serial.print("OK: Line 1 -> ");
      Serial.println(text);
    }
    else if (command.startsWith("LINE2:")) {
      String text = command.substring(6); // Remove "LINE2:" prefix
      lcd.setCursor(0, 1);
      lcd.print("                "); // Clear line
      lcd.setCursor(0, 1);
      lcd.print(text);
      Serial.print("OK: Line 2 -> ");
      Serial.println(text);
    }
    else if (command == "CLEAR") {
      lcd.clear();
      Serial.println("OK: LCD cleared");
    }
    else if (command == "BACKLIGHT_ON") {
      lcd.backlight();
      Serial.println("OK: Backlight ON");
    }
    else if (command == "BACKLIGHT_OFF") {
      lcd.noBacklight();
      Serial.println("OK: Backlight OFF");
    }
  }
}