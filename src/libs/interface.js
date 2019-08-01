'use strict'
// Interface
// - websocket API
// - basic web GUI

const gamepad = require("gamepad");


module.exports = function () {
	this.ID = "INTERFACE";
	this.config = {};
	
	this.moveData = {
		x : 0,
		y : 0,
		z : 0,
		AngZ : 0
	};

	
	this.init = function (_config) {
		this.config = _config;
		if (this.config.gamepad.enabled) {
			this.initGamepad();
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
	this.initGamepad = function() {
		// NOT TESTED
		gamepad.init();
		// Create a game loop and poll for events
		setInterval(gamepad.processEvents, 16);
		// Scan for new gamepads as a slower rate
		setInterval(gamepad.detectDevices, 500);

		// Listen for move events on all gamepads
		gamepad.on("move", function (id, axis, value) {
			console.log("stick", {
				id: id,
				axis: axis,
				value: value,
			});
		});

		// Listen for button up events on all gamepads
		gamepad.on("up", function (id, num) {
			console.log("button_up", {
				id: id,
				num: num,
			});
		});

		// Listen for button down events on all gamepads
		gamepad.on("down", function (id, num) {
			console.log("button_down", {
				id: id,
				num: num,
			});
		});

	}
}
