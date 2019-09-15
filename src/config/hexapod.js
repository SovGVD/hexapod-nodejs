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
				LF: { 
					AngC: { min: -25, max:  75, default:  25 }, Lc: 28, 
					AngF: { min:  10, max: 170, default:  90 }, Lf: 86, 
					AngT: { min:  20, max: 160, default:  90 }, Lt: 125, 
					L: { min: 40, max: 200, default: 130 } 
				},
				LM: { 
					AngC: { min: -50, max:  50, default:   0 }, Lc: 28, 
					AngF: { min:  10, max: 170, default:  90 }, Lf: 86, 
					AngT: { min:  20, max: 160, default:  90 }, Lt: 125, 
					L: { min: 40, max: 200, default: 130 } 
				},
				LB: { 
					AngC: { min: -75, max:  25, default: -25 }, Lc: 28, 
					AngF: { min:  10, max: 170, default:  90 }, Lf: 86, 
					AngT: { min:  20, max: 160, default:  90 }, Lt: 125, 
					L: { min: 40, max: 200, default: 130 } 
				},
				RF: { 
					AngC: { min: -75, max:  25, default: -25 }, Lc: 28, 
					AngF: { min:  10, max: 170, default:  90 }, Lf: 86, 
					AngT: { min:  20, max: 160, default:  90 }, Lt: 125, 
					L: { min: 40, max: 200, default: 130 } 
				},
				RM: { 
					AngC: { min: -50, max:  50, default:   0 }, Lc: 28, 
					AngF: { min:  10, max: 170, default:  90 }, Lf: 86, 
					AngT: { min:  20, max: 160, default:  90 }, Lt: 125, 
					L: { min: 40, max: 200, default: 130 } 
				},
				RB: { 
					AngC: { min: -25, max:  75, default:  25 }, Lc: 28, 
					AngF: { min:  10, max: 170, default:  90 }, Lf: 86, 
					AngT: { min:  20, max: 160, default:  90 }, Lt: 125, 
					L: { min: 40, max: 200, default: 130 } 
				}
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
			baudRate: 115200,
			servo: {
					 0: { min: 530, max: 2470 },
					 1: { min: 530, max: 2470 },
					 2: { min: 530, max: 2470 },
					 3: { min: 530, max: 2470 },
					 4: { min: 530, max: 2470 },
					 5: { min: 530, max: 2470 },
					 6: { min: 530, max: 2470 },
					 7: { min: 530, max: 2470 },
					 8: { min: 530, max: 2470 },
					 9: { min: 530, max: 2470 },
					10: { min: 530, max: 2470 },
					11: { min: 530, max: 2470 },
					12: { min: 530, max: 2470 },
					13: { min: 530, max: 2470 },
					14: { min: 530, max: 2470 },
					15: { min: 530, max: 2470 },
					16: { min: 530, max: 2470 },
					17: { min: 530, max: 2470 }
			},
			correction: {
				leg: {
					// servo angles correction (values only for HAL output)
					LF: { AngC: 0, AngF: -3, AngT:  12+5 },
					LM: { AngC: 0, AngF:  5, AngT:  12+14 },
					LB: { AngC: 0, AngF:  0, AngT:  12-3 },
					RF: { AngC: 0, AngF:  0, AngT: -12-2 },
					RM: { AngC: 0, AngF: -2, AngT: -12-7 },
					RB: { AngC: 0, AngF:  2, AngT: -12 }
				}
			}
		}
	},
	
	interface: {
		gamepad: {
			enabled: true,
			axis: {
				// Mode2 as on drones
				0: 'AngZ', 	// rotate left/right
				1: 'z',		// body up/down (not implemented)
				2: 'y',		// move left/right
				3: 'x',		// move forward/backward
			},
			axis_coefficient: {
				0: -0.5,
				1: -1,
				2: -1,
				3: -1
			},
			axis_deadband: {
				0: 0.004,
				1: 0.004,
				2: 0.004,
				3: 0.004
			}
		},
		control_ws: {
			enabled: true,
			port: 8081
		},
		control_http: {
			enabled: true,
			port: 8080,
			path: './public_html/',
		}
	}
	
}
