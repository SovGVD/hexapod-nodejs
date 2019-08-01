'use strict'
// Hexapod config
module.exports = {
	hexapod: {
		legs: ["LF", "LM", "LB", "RF", "RM", "RB"],
		config: {
			body: {
				x: 0, y: 0, z: 0,
				AngX: 0, AngY: 0, AngZ: 0,
				LF:  { x:  75, y:  40, z: -80 },	// z is the distance from body center
				LM:  { x:   0, y:  65, z: -80 },	// so it is e.g. -50 if we need to be on 50 above ground
				LB:  { x: -75, y:  40, z: -80 },	// ground is mostly for the hexagon plane of legs
				RF:  { x:  75, y: -40, z: -80 },	// TODO getGround
				RM:  { x:   0, y: -65, z: -80 },
				RB:  { x: -75, y: -40, z: -80 }
			},
			leg: {
				LF: { AngC: { min: -50, max: 50, default: 25 }, Lc: 27, Lf: 85, Lt: 120, L: { min: 40, max: 250, default: 120 } },	// TODO min and max!!! AngF (0...90)
				LM: { AngC: { min: -50, max: 50, default: 0 }, Lc: 27, Lf: 85, Lt: 120, L: { min: 40, max: 250, default: 120 } },
				LB: { AngC: { min: -50, max: 50, default: -25 }, Lc: 27, Lf: 85, Lt: 120, L: { min: 40, max: 250, default: 120 } },
				RF: { AngC: { min: -50, max: 50, default: -25 }, Lc: 27, Lf: 85, Lt: 120, L: { min: 40, max: 250, default: 120 } },
				RM: { AngC: { min: -50, max: 50, default: 0 }, Lc: 27, Lf: 85, Lt: 120, L: { min: 40, max: 250, default: 120 } },
				RB: { AngC: { min: -50, max: 50, default: 25 }, Lc: 27, Lf: 85, Lt: 120, L: { min: 40, max: 250, default: 120 } }
			},
			gait: {
				type: "RIPPLE",	// balance between stable (4 legs on the ground) and speed (not so slow as wave 1 by 1, bu not so fast as with tripod)
				gaitZ: 20,	// This is only for 2D model, in real life Z should be calculate by creating 3D surface around robot (sounds cool).
				sequence: [
					{ "LF":  0, "LM":  0, "LB":  2, "RF":  0, "RM": -1, "RB":  0 },	// 0  - on the ground (stance), 
					{ "LF":  0, "LM":  0, "LB": -1, "RF":  2, "RM":  0, "RB":  0 }, // >0 - in the air (swing) number of steps before ground,
					{ "LF":  0, "LM":  2, "LB":  0, "RF": -1, "RM":  0, "RB":  0 }, // -1 - on the way to the ground (any step after), probably just ignore
					{ "LF":  0, "LM": -1, "LB":  0, "RF":  0, "RM":  0, "RB":  2 },
					{ "LF":  2, "LM":  0, "LB":  0, "RF":  0, "RM":  0, "RB": -1 },
					{ "LF": -1, "LM":  0, "LB":  0, "RF":  0, "RM":  2, "RB":  0 },
					{ "LF":  0, "LM":  0, "LB":  2, "RF":  0, "RM": -1, "RB":  0 },
					{ "LF":  0, "LM":  0, "LB": -1, "RF":  2, "RM":  0, "RB":  0 },
					{ "LF":  0, "LM":  2, "LB":  0, "RF": -1, "RM":  0, "RB":  0 },
					{ "LF":  0, "LM": -1, "LB":  0, "RF":  0, "RM":  0, "RB":  2 },
					{ "LF":  2, "LM":  0, "LB":  0, "RF":  0, "RM":  0, "RB": -1 },
					{ "LF": -1, "LM":  0, "LB":  0, "RF":  0, "RM":  2, "RB":  0 }
				]
			}
		}
	},
	
	HAL: {
		servoBoard: {
			port: "/dev/ttyUSB0",
			baudRate: 115200
		}
	},
	
	interface: {
		gamepad: {
			enabled: true,
		},
		control_ws: {
			port: 8081
		},
		control_http: {
			enabled: true,
			port: 8080
		}
	}
	
}
