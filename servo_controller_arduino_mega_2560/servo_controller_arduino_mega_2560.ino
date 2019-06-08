#include <Servo.h>

/*
 *  G+S    +----USB----+
 * [ooo]  1|D13        |13
 * [ooo]  2|D15
 * [ooo]  3|D17
 *         |
 * [ooo]  4|
 *        ...         ...
 * [ooo] 12|D30        |24
 *         +-----------+
 * 
 */

/*
 * Serial protocol
 * Expecting that numbers will not be zeros and from 800 to 2200 as 16bits unit  // TODO check it with my real servo
 * [0xFF 0xFF] - package begin marker, as min value is 0x0320 (800) and max is 0x07D0(2200), so it is impossible to get FFFF even if it is between values, e.g. 0x00FF (int 255) 0xFF00 (int 65280) imposible situation
 * [0xXX 0xXX] - first servo (D13) value 
 * ....
 * [0xXX 0xXX] - 24th servo value
 * total package length is 50 bytes (2 + 2*24)
 * with 115200 bps (theoreticaly) I can reseive data on 288Hz 
 * TODO: CRC?
 */

#define DEBUG // comment to disable debug
 
Servo servoController[24];

int s = 0;

// Servo pins
unsigned int servoPins[24]={
  // 1   2   3   4   5   6   7   8   9  10  11  12
    13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 28, 30, // left row

  //13  14  15  16  17  18  19  20  21  22  23  24
    33, 32, 35, 34, 37, 36, 38, 39, 40, 41, 42, 43  // right row
  };

// Servo defaults (min, mid(default), max)
unsigned int servoDefault[3]={
    800, 1500, 2200
  };

// Servo values
unsigned int servoValues[24];


// Servo status (`true` if it should be updated)
bool servoUpdate[24]={
    true, true, true, true, true, true, true, true, true, true, true, true,
    true, true, true, true, true, true, true, true, true, true, true, true
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
  for (s = 0; s < 24; s++) {
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
          Serial.print("Servo ");
          Serial.print(serialServo, DEC);
          Serial.print(" [");
          Serial.print(preByte, HEX);
          Serial.print(curByte, HEX);
          Serial.print("] = "),
          Serial.println(serialTmpValue, DEC);
        #endif
        if (serialTmpValue != servoValues[serialServo]) {
          servoValues[serialServo] = serialTmpValue;
          servoUpdate[serialServo] = true;
        }
      }
      serialPackageServo++;
      if (serialPackageServo > 47) {
        serialPackageProgress = false;
      }
    }
  }
  
  for (s = 0; s < 24; s++) {
    if (servoUpdate[s] == true) {
      if (servoValues[s] >= servoDefault[0] && servoValues[s] <= servoDefault[2]) {
        servoController[s].writeMicroseconds(servoValues[s]);
      }
      servoUpdate[s] = false;
    }
  }
}
