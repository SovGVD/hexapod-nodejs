'use strict'

const SerialPort = require('serialport');


// Hardware abstract layer (HAL)
module.exports = function () {
	this.ID = "HAL";
	this.config = {};
	this.isServoBoardReady = false;
	this.servoBoard = false;
	this.servoValues = [
		1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500,
		1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500
    ];


	this.init = function (_config) {
		this.config = _config;
		this.initServoBoard();
	}

	this.run = function () {
		console.log("[RUN]", "HAL");
	};
	
	// Communication
	this.msgIn = function (msg) {
		// message from master (event bus)
	}
	this.msgOut = false;

	
	// Servo board
	// TODO separate into extra module
	this.initServoBoard = function () {
		// TODO timeout and error message if unvailable
		this.servoBoard = new SerialPort(this.config.servoBoard.port, { baudRate: this.config.servoBoard.baudRate });
		this.servoBoard.on('data', function (data) {
			if (data.toString() == "ready\r\n") {
				this.isServoBoardReady = true;
				this.msgOut({ ID: this.ID, event: "servoBoard", message: true });
			}
		}.bind(this));
		this.servoBoard.on('error', function(err) {
			this.msgOut({ ID: this.ID, event: "servoBoard", message: false, error: err.message });
		}.bind(this));
	}
	
	this.servoControllerPackage = function () {
		var tmp = Buffer.alloc(2+2*24);
		tmp.writeUInt16BE(0xFFFF,0);
		for (var i = 0; i < 18; i++) {
			tmp.writeUInt16BE(servoValues[i],i*2+2);
		}
		return tmp;
	}

}
