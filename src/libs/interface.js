'use strict'
// Interface
// - websocket API
// - basic web GUI

const gamepad = require("gamepad");


module.exports = function () {
	this.ID = "INTERFACE";
	this.config = {};
	
	/*
	Gamepad
	       Left Stick           Right Stick
	    -1 ^ Axis1           -1 ^ Axis3
	       |                    |
	-1 <---*---> Axis0   -1 <---*---> Axis2
	       |                    |
	       v                    v
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
	
	this.moveData = {
		x : 0,
		y : 0,
		z : 0,
		AngZ : 0
	};

	
	this.init = function (_config) {
		this.config = _config;
		if (this.config.gamepad.enabled) {
			this.gamepadInit();
		}
	}

	this.run = function () {
		console.log("[RUN]", "interface");
	};
	
	// Communication
	this.msgIn = function (msg) {
	}
	this.msgOut = false;


	// Gamepad controller
	this.gamepads = { };
	this.gamepadInit = function() {
		// NOT TESTED
		gamepad.init();
		// Create a game loop and poll for events
		setInterval(gamepad.processEvents, 16);
		// Scan for new gamepads as a slower rate
		setInterval(gamepad.detectDevices, 500);
		// Check available gamepads
		setInterval(function () { this.gamepadReinit();}.bind(this), 1000);
		
		// TODO check connect/disconnect!!!

		// Listen for move events on all gamepads
		gamepad.on("move", function (id, axis, value) {
			if (typeof this.config.gamepad.axis[axis] != 'undefined') {
				if (Math.abs(value) < this.config.gamepad.axis_deadband[axis]) value = 0;	// not all gamepads perfect, set value to zero (middle)
				this.moveData[this.config.gamepad.axis[axis]] = value*this.config.gamepad.axis_coefficient[axis];
				this.update();
			}
		}.bind(this));

		// Listen for button up events on all gamepads
		gamepad.on("up", function (id, num) {
		}.bind(this));

		// Listen for button down events on all gamepads
		gamepad.on("down", function (id, num) {
		}.bind(this));
	}
	this.gamepadReinit = function () {
		for (var i = 0, l = gamepad.numDevices(); i < l; i++) {
			var device = gamepad.deviceAtIndex(i);
			var device_id = device.vendorID+":"+device.productID;
			if (!this.gamepads[device_id]) {
				this.gamepads[device_id] = { num: parseInt(i), ID: device.deviceID };
				this.msgOut({ ID: this.ID, event: "interfaceConnected", message: { interface: "gamepad", status: true }});
			}
		}
		
		for (var device_id in this.gamepads) {
			if (this.gamepads[device_id] !==false && !gamepad.deviceAtIndex(this.gamepads[device_id].num)) {
				this.gamepads[device_id] = false;
				this.msgOut({ ID: this.ID, event: "interfaceDisconnected", message: { interface: "gamepad", status: false }});
				this.gamepadDisconnected();
			}
		}
	}
	this.gamepadDisconnected = function () {
		// stop
		this.moveData = {
			x : 0,
			y : 0,
			z : 0,
			AngZ : 0
		};
		this.update();
	}
	
	
	this.update = function () {
		this.msgOut({ ID: this.ID, event: "moveData", message: this.moveData});
	}
}
