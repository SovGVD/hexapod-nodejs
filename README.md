# Hexapod NodeJS

## Hardware
 - SBC: any with i2c and nodejs
 - Servo driver: PCA9685 based
 - Servos: MG996 (or any other)
 - Frame: 18DOF (3 servos to 6 legs)

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
  robot |\
   body | \
        |  \
        |   AngleCoxa

+Y
^
|
Z---> +X
```



```
                        ___X  -----
                  ___---        ^
            __0--0              | -- (y1-y0)
         ---                    v
 -------0-  -  -  -  -  -  -  -----
  robot |\
   body | \
        |  \
        |   AngleCoxa


+Y
^
|
Z---> +X
```

Front view
```
                   0--AngleTibia
        femur-.  // \\
               \//   \\
       ||      //     \\
   .----0======0       \\--tibia
   |   ||   |   \       \\
   |        |    \       \\
   |     coxa     \       \\
   |          AngleFemur   \\
  Leg(id,x0,y0,z0)          X--ground point Leg(id, x1, y1, z1)
   
+Z
^
|
Y---> +X
```

`x0,y0,z0` - point of connection leg to body



This should be easy in the code, as most of the variables just a constants
```
                       Lt^2 + Lf^2 - (D^2 + (L - Lc)^2)
AngleTibia = arccos ( --------------------------------- )
                                 2 * Lt * Lf
```
AngleTibia angle 0...180 deg


```
                       Lf^2 + (D^2 + (L - Lc)^2) - Lt^2       PI             L - Lc
AngleFemur = arccos ( ---------------------------------- ) - ---- + arctan( -------- )
                       2 * Lf * sqrt(D^2 + (L - Lc)^2)         2               D
```
AngleFemur angle -90...90 deg


```
                      y1-y0
AngleCoxa = arcsin ( ------- )
                        L
```
AngleCoxa angle -90...90 deg

 - `Lc` = length of coxa (const)
 - `Lf` = length of femur (const)
 - `Lt` = length of tibia (const)
 - `L`  = length of the leg in top view (should be calculated from given points)
 - `D`  = distance from ground to coxa (or somewhere around)

Distance between AngleFemur point and Ground point of the leg is `D^2 + (L - Lc)^2`

Length of leg (top view): `L = sqrt((x1-x0)^2 + (y1-y0)^2)`



TODO:
 1. check if `(x1,y1,z1)` in the sphere of Leg(id)
 2. check servos limits (or it can be permanenlty damaged)


### Body


```
     Leg(0)       FRONT       Leg(1)
         ---0===============0---
            ||             ||
            ||      ^Y     ||
     Leg(2) ||      |  X   || Leg(3)
         ---0       Z-->    0---
            || (0,0,D)     ||
            ||             ||
            ||             ||
         ---0===============0---
     Leg(4)                   Leg(5)
```
Body absolute position:

`Xnew = Xold + deltaX*cos(r) - deltaY*sin(r)`

`Ynew = Yold + deltaX*sin(r) + deltaY*cos(r)`

 - `r` - angle rotation around `Z` axis
 - `deltaX` - move right(+)/left(-)
 - `deltaY` - move forward(+)/backward(-)

#### Legs position (relative to body)

Should be apply to all XY points of leg:

`Xnew = Xold*cos(r) - Yold*sin(r)`

`Ynew = Xold*sin(r) + Yold*cos(r)`


## Gait
Some good explanation of [common used gaits](https://hexyrobot.wordpress.com/2015/11/20/common-walking-gaits-for-hexapods/)

### Smooth movements
TODO (Bezier curves? Or easy?)

