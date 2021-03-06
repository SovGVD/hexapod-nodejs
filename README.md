# Hexapod NodeJS

Hardware and software still in development and may be changed!

## Hardware
 - SBC: almost any with NodeJS and UART/USB-host, [NanoPi Duo2](http://wiki.friendlyarm.com/wiki/index.php/NanoPi_Duo2) will be used
 - Servo driver: Arduino MEGA based board with custom firmware (see `servo_controller_arduino_mega_2560` folder)
 - Servos: MG996 (or any other)
 - Frame: 18DOF (6 legs, 3 servos each)
 - Power board: 18 DC-DC based on MP2307
 - Power supply: four 18650 20A batteries

## Software

## Inverse kinematics

(to be tested later in code and on real hexapod model, this is just a calculations and can be completely wrong!)


### Leg

Top view (initial state)
```
               |<-- L-Lc -->|
        |<------- L  ------>|
        |      |            |
        |      |            |
 -------0======0===0========X
  robot |.
   body | .
        |  .
        |   AngleCoxa

     +X
      ^
      |
Y+<---Z
```



```
                        ___X  -----
                  ___---        ^
            __0--0              | - - (y1-y0)
         ---                    v
 -------0-  -  -  -  -  -  -  ----- AngC = 0deg
  robot |.
   body | .
        |  .
        |   AngleCoxa


     +X
      ^
      |
Y+<---Z
```

Front view
```
                      0
        femur-.     // \\                               ^    Z=0
               .  //    \\                              |  .
       ||       //       \\                             |.
   .- - 0======0          \\ - - tibia    --------------O---> 
   .   ||   .              \\
   .        .               \\
   .     coxa                \\
   .                          \\
  Leg(id,x0,y0,z0)             X - - ground point Leg(id, x1, y1, z1)
   
+Z
^
|
X---> +Y
```

`x0,y0,z0` - point of connection leg to body



```
              | AngleFemur /
              |   .      /
              |  .     /
              |  .    0
              | .   //.\\
              |.  // .  \\
       ||     | //  .    \\
        0======0   .      \\
       ||     /   .        \\
             /  .           \\
            /  AngleTibia    \\
                              \\
                               X
   
+Z
^
|
X---> +Y
```


This should be easy in the code, as most of the variables just a constants
```
                       Lt^2 + Lf^2 - (D^2 + (L - Lc)^2)
AngleTibia = arccos ( --------------------------------- )
                                 2 * Lt * Lf
```
AngleTibia angle 0...180 deg

```
                            Lf^2 + (D^2 + (L - Lc)^2) - Lt^2                           D
AngleFemur = PI - arccos ( ---------------------------------- ) - arccos ( ------------------------ )
                            2 * Lf * sqrt(D^2 + (L - Lc)^2)                 sqrt(D^2 + (L - Lc)^2)
```
AngleFemur angle 0...180 deg


```
AngleCoxa = atan((y1-y0), (x1-x0)) - ServoAngle
```

AngleCoxa angle shoud be between -90...90 deg (just for easy to use later), so if `AngleCoxa > 180`, then `AngleCoxa = AngleCoxa - 360`; [atan2](https://en.wikipedia.org/wiki/Atan2)

```
ServoAngle = atan((y0 - yBody), (x0 - xBody))
```

 - `Lc` = length of coxa (const)
 - `Lf` = length of femur (const)
 - `Lt` = length of tibia (const)
 - `L`  = length of the leg in top view (should be calculated from given points)
 - `D`  = distance from ground to coxa (or somewhere around)

Distance between AngleFemur point and Ground point of the leg is `D^2 + (L - Lc)^2`

Length of leg (top view): `L = sqrt((x1-x0)^2 + (y1-y0)^2)`



TODO:
 1. check if `(x1,y1,z1)` in the sphere of Leg(id)
 2. check servos limits (or it can be permanently damaged)
 3. calculate on the frequency that servo can handle
 4. Node.JS classes
 5. IMU
 6. sensors on legs to check if it is on ground
 7. calculate in 3D
 8. LIDAR or depth camera
 9. terrain/climbing


### Body


```
   Leg(0) [LF]    FRONT    [RF] Leg(1)
         ---0===============0---
            ||             ||
            ||      ^X     ||
 Leg(2) [LM]||   Y  |      ||[RM] Leg(3)
         ---0    <--Z       0---
            || (0,0,D)     ||
            ||             ||
            ||             ||
         ---0===============0---
   Leg(4) [LB]   BOTTOM    [RB] Leg(5)
```
Body absolute position:

`Xnew = Xold + deltaX*cos(yaw) - deltaY*sin(yaw)`

`Ynew = Yold + deltaX*sin(yaw) + deltaY*cos(yaw)`

 - `r` - angle rotation around `Z` axis
 - `deltaX` - move right(+)/left(-)
 - `deltaY` - move forward(+)/backward(-)

#### Legs position (relative to body)

Should be apply to all XY points of leg:

`XLegNew = XLeg*cos(yaw) - YLeg*sin(yaw))`

`YLegNew = XLeg*sin(yaw) + YLeg*cos(yaw)`


## Gait
Some good explanation of [common used gaits](https://hexyrobot.wordpress.com/2015/11/20/common-walking-gaits-for-hexapods/)

Gait is the sequence of movements that should be finished (e.g. check leg real position on the ground using sensors or calculate based on servo speed) before move to next step. 
In case of stop, gait should be interrupted and legs returned to initial state (after some period of time).

### Actual Gait in the code
`See code`. It is based on prediction of the future position (just move the same frame in time with current heading and speed) and transition from current to future position. 
Legs are moving using "wave" gait. Only sequence of legs are hard coded, angles, steps, etc calculating.

### Smooth movements
`y = x^n` where `n >= 2` for nice return stroke
