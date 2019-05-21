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
   Leg(0) [LF]    FRONT    [RF] Leg(1)
         ---0===============0---
            ||             ||
            ||      ^Y     ||
 Leg(2) [LM]||      |  X   ||[RM] Leg(3)
         ---0       Z-->    0---
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

Sequence of one-left+two-right, than two-left+one-right.
 - `L` or `R` - mean left ot right side of the hexapod
 - `F`, `M`, `B` - means Front, Middle or Back leg
 - `up` - move leg up (air)
 - `down` - move leg down (ground)
 - `m0` - leg in the middle
 - `m+` - leg move forward
 - `m-` - leg move backward
 - `m0/m+` - move to middle position or move forward, depends on size, speed, frame settings

| Leg | step1 | step2 | step3 | step4 | step5 | step6 |
|-----|:-----:|:-----:|:-----:|:-----:|:-----:|:-----:|
| LF  |   up  | m0/m+ |  down |       |   m-  |       |
| LM  |       |   m-  |       |   up  | m0/m+ |  down |
| LB  |   up  | m0/m+ |  down |       |   m-  |       |
| RF  |       |   m-  |       |   up  | m0/m+ |  down |
| RM  |   up  | m0/m+ |  down |       |   m-  |       |
| RB  |       |   m-  |       |   up  | m0/m+ |  down |

Leg in the middle
```
||
||
 0----
||
||

```
Leg forward
```
||  /
|| /
 0
||
||

```

Leg backward
```
||
||
 0
|| \
||  \

```

### Smooth movements
TODO (Bezier curves? Or easy?), combine steps, etc

