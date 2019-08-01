#include <Servo.h>

/*
 * 
 * ================================ - Arduino Mega
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

/*
#define DEBUG // comment to disable debug
*/

Servo servoController[18];

int s = 0;

// Servo pins
unsigned int servoPins[18]={
  // 1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16  17  18 - servo number
    15, 17, 19, 21, 23, 25, 27, 29, 31, 14, 16, 18, 20, 22, 24, 26, 28, 30
};

// Servo defaults (min, mid(default), max)
unsigned int servoDefault[3]={
    700, 1500, 2300 // TODO, check with real servos
  };

// Servo values
unsigned int servoValues[18];


// Servo status (`true` if it should be updated)
bool servoUpdate[18]={
    true, true, true, true, true, true, true, true, true,
    true, true, true, true, true, true, true, true, true
  };

// Serial communication
int preByte;
int curByte;
bool serialPackageProgress = false;
int serialPackageServo = 0;
int serialTmpValue = 0;
int serialServo = 0;

void setup() {
  Serial.begin(115200);
  Serial.println("init");
  // init default servo
  for (s = 0; s < 18; s++) {
    servoValues[s] = servoDefault[1];
    servoController[s].attach(servoPins[s], servoDefault[0], servoDefault[1]);
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
          //Serial.print("Servo ");
          //Serial.print(serialServo, DEC);
          //Serial.print(" [");
          //Serial.print(preByte, HEX);
          //Serial.print(" ");
          //Serial.print(curByte, HEX);
          //Serial.print(" ");
          //Serial.print("] = "),
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
        Serial.println("");
      }
    }
  }
  
  for (s = 0; s < 18; s++) {
    if (servoUpdate[s] == true) {
      servoController[s].writeMicroseconds(servoValues[s]);
      servoUpdate[s] = false;
    }
  }
}
