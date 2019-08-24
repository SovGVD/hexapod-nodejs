'use strict'

const eventbus = require("./eventbus.js");
const gamepad = require("gamepad");

	/*	
	Gamepad	
	       Left Stick           Right Stick	
	    -1 ^ Axis1           -1 ^ Axis3	(x - forward/backward)
	       |                    |	
	-1 <---*---> Axis0   -1 <---*---> Axis2	(y - left/right)
	       |     (AngZ)         |	
	       v     rotate         v	
	Dpad	
	     Axis7	
	     +--+	
	     |-1|	
	  +--+  +--+	
	  |-1    +1|  Axis6	
	  +--+  +--+	
	     |+1|	
	     +--+	
		
	X: Button3	
	Y: Button4	
	A: Button0	
	B: Button1	
		
	Select: Button10	
	Start: Button11	
		
	L1: Button6	
	L2: Button2 and Axis5 with value -1 (??)	
	R1: Button7	
	R2: Button9 and Axis4 with value -1 (??)	
	*/

module.exports = function () {
	this.ID = "INTERFACE.GAMEPAD";
	this.config = {};

	this.gamepads = { };
	this.moveData = {
		x : 0,
		y : 0,
		z : 0,
		AngZ : 0
	};

	
	this.init = function (_config) {
		this.config = _config;
		this.gamepadInit();
	}
	this.run = function () {
		console.log("[RUN]", this.ID);
	}
	
	
	this.gamepadInit = function() {
		gamepad.init();
		// Create a game loop and poll for events
		setInterval(gamepad.processEvents, 16);
		// Scan for new gamepads as a slower rate
		setInterval(gamepad.detectDevices, 500);
		// Check available gamepads
		setInterval( () => { this.gamepadReinit(); }, 1000);
		
		// Listen for move events on all gamepads
		gamepad.on("move", (id, axis, value) => {
			if (typeof this.config.axis[axis] != 'undefined') {
				if (Math.abs(value) < this.config.axis_deadband[axis]) value = 0;	// not all gamepads perfect, set value to zero (middle)
				this.moveData[this.config.axis[axis]] = value*this.config.axis_coefficient[axis];
				this.update();
			}
		});

		// Listen for button up events on all gamepads
		gamepad.on("up", (id, num) => {
			// TODO something
		});

		// Listen for button down events on all gamepads
		gamepad.on("down", (id, num) => {
			// TODO something
		});
	}
	
	this.gamepadReinit = function () {
		for (var i = 0, l = gamepad.numDevices(); i < l; i++) {
			var device = gamepad.deviceAtIndex(i);
			var device_id = device.vendorID+":"+device.productID;
			if (!this.gamepads[device_id]) {
				this.gamepads[device_id] = { num: parseInt(i), ID: device.deviceID };
				eventbus.eventBus.sendEvent(this.ID+'/interfaceConnected', { ID: this.ID, message: true });
			} else {
				// update data
				//for (var axis in this.config.axis) {
					//this.moveData[this.config.axis[axis]] = Math.abs(device.axisStates[axis]) < this.config.axis_deadband[axis]?0:device.axisStates[axis];
					//this.update();
				//}
			}
		}
		
		for (var device_id in this.gamepads) {
			if (this.gamepads[device_id] !==false && !gamepad.deviceAtIndex(this.gamepads[device_id].num)) {
				this.gamepads[device_id] = false;
				eventbus.eventBus.sendEvent(this.ID+'/interfaceDisconnected', { ID: this.ID, message: false });
				this.gamepadDisconnected();
			}
		}
	}
	
	this.gamepadDisconnected = function () {
		// Stop move
		this.moveData = {
			x : 0,
			y : 0,
			z : 0,
			AngZ : 0
		};
		this.update();
	}
	
	this.update = function () {
		eventbus.eventBus.sendEvent(this.ID+'/move', { ID: this.ID, message: this.moveData });
	}
}
