#include <Servo.h>

/*
 * ================================ - Arduino Mega Nano
 * USB         S oooooooooooooooooo
 *           +6v oooooooooooooooooo
 *           GND oooooooooooooooooo
 * ================================
 *               DDDDDDDDDDDDDDDDDD
 *               111222223111222223
 *               579135791468024680
 */

/*
 * Serial protocol
 * Expecting that numbers will not be zeros and from 800 to 2200 as 16bits unit  // TODO check it with my real servo
 * [0xFF 0xFF] - package begin marker, as min value is 0x0320 (800) and max is 0x07D0(2200), so it is impossible to get FFFF even if it is between values, e.g. 0x00FF (int 255) 0xFF00 (int 65280) imposible situation
 * [0xXX 0xXX] - first servo (D13) value 
 * ....
 * [0xXX 0xXX] - 18th servo value
 * total package length is 38 bytes (2 + 2*18)
 * with 115200 bps (theoreticaly) I can reseive data on 370Hz 
 * TODO: CRC?
 */

/**
 * Analog read
 * 
 * For Arduino Mega 2560 we can have 10-bit data, from 0 [0x00 0x00] to 1023 [0x03 0xFF]
 * so the same Serial protocol can be used to send data back to "Brain"
 * [0xFF 0xFF] - begin of package
 * [0xXX 0xXX] - first leg
 * ...
 * [0xXX 0xXX] - 6th leg
 * total package length is 14 bytes (2 + 2*6)
 */


//#define DEBUG // comment to disable debug

Servo servoController[18];

int s = 0;

// Servo pins
unsigned int servoPins[18] = {
  // 1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16  17  18 - servo number
    15, 17, 19, 21, 23, 25, 27, 29, 31, 14, 16, 18, 20, 22, 24, 26, 28, 30
};

// Servo defaults (min, mid(default), max)
unsigned int servoDefault[3] = {
    500, 1500, 2500 // TODO, check with real servos
  };

// Servo values
unsigned int servoValues[18];


// Servo status (`true` if it should be updated, `false` by default to not do anything on boot)
bool servoUpdate[18] = {
    false, false, false, false, false, false, false, false, false,
    false, false, false, false, false, false, false, false, false
  };


// Leg status read
unsigned int analogPins[6] = {
  A1, A3, A5, A7, A9, A11
};
bool anyAnalogUpdates = false;
unsigned int currentAnalogPin = 0;  // index of pin we will read on every step
unsigned int currentAnalogPinValue = 0;
unsigned int currentAnalogPinValueThreshold = 10; // value threshold that has meaning
byte analogToByteHigh = 0x00;
byte analogToByteLow = 0x00;
byte analogData[14] = {
  0xFF, 0xFF, 
  0x00, 0x00, 
  0x00, 0x00, 
  0x00, 0x00, 
  0x00, 0x00, 
  0x00, 0x00, 
  0x00, 0x00
};


// Serial communication
int preByte;
int curByte;
int serialPackageServo = 0;
int serialTmpValue = 0;
int serialServo = 0;
bool serialPackageProgress = false;

void setup() {
  Serial.begin(115200);
  Serial.println("init");
  // init default servo
  for (s = 0; s < 18; s++) {
    servoValues[s] = servoDefault[1];
    #ifdef DEBUG
      Serial.print("Init Servo ");
      Serial.print(s);
      Serial.print("-> D");
      Serial.print(servoPins[s]);
    #endif
    servoController[s].attach(servoPins[s], servoDefault[0], servoDefault[1]);
    #ifdef DEBUG
      Serial.println(" OK");
    #endif
  }
  delay(1000);
  Serial.println("ready");
}


void loop() {
  while (Serial.available() > 0) {
    preByte = curByte;
    curByte = Serial.read();
    if (curByte == 255 && preByte == 255) {
      serialPackageProgress = true;
      serialPackageServo = 0;
    } else if (serialPackageProgress) {
      if (serialPackageServo % 2) {
        serialTmpValue = preByte<<8 | curByte;
        serialServo = (serialPackageServo-1)/2;
        #ifdef DEBUG
          Serial.print("Servo ");
          Serial.print(serialServo, DEC);
          Serial.print(" [");
          Serial.print(preByte, HEX);
          Serial.print(" ");
          Serial.print(curByte, HEX);
          Serial.print(" ");
          Serial.print("] = "),
          Serial.print(serialTmpValue, DEC);
          Serial.print(" ");
        #endif
        if (serialTmpValue != servoValues[serialServo] && serialTmpValue >= servoDefault[0] && serialTmpValue <= servoDefault[2]) {
          servoValues[serialServo] = serialTmpValue;
          servoUpdate[serialServo] = true;
        }
      }
      serialPackageServo++;
      if (serialPackageServo > 35) {  // 2*18-1
        serialPackageProgress = false;
        #ifdef DEBUG
          Serial.println("DONE");
        #endif
      }
    }
  }

  for (s = 0; s < 18; s++) {
    if (servoUpdate[s] == true) {
      servoController[s].writeMicroseconds(servoValues[s]);
      servoUpdate[s] = false;
    }
  }

  readLegValues();
}

void readLegValues() {
  // Read one leg per interation
  // This should prevent main loop slow down (probably overkill for that project)
  currentAnalogPinValue = (analogRead(analogPins[currentAnalogPin]) / 10) * 10;
  if (currentAnalogPinValue < currentAnalogPinValueThreshold) currentAnalogPinValue = 0;
  analogToByteHigh = (byte) (currentAnalogPinValue >> 0x08);
  analogToByteLow  = (byte) (currentAnalogPinValue);
  if (analogToByteHigh != analogData[currentAnalogPin*2+2] || analogToByteLow != analogData[currentAnalogPin*2+3]) anyAnalogUpdates = true;
  analogData[currentAnalogPin*2+2] = analogToByteHigh;
  analogData[currentAnalogPin*2+3] = analogToByteLow;
  currentAnalogPin++;
  
  if (currentAnalogPin > 5) {
    if (anyAnalogUpdates) {
      sendLegValues();
    }
    anyAnalogUpdates = false;
    currentAnalogPin = 0;
  }
}

void sendLegValues() {
  for (s = 0; s < 14; s++) {
    Serial.print((char)analogData[s]);
  }
}
