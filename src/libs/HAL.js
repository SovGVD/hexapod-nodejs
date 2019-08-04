'use strict'

const SerialPort = require('serialport');


// Hardware abstract layer (HAL)
module.exports = function () {
	this.ID = "HAL";
	this.config = {};
	this.isServoBoardReady = false;
	this.servoBoard = false;
	this.servoRange = {};
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
		if (msg.event == 'IKState') {
			this.servoControllerUpdate(msg.message);
			this.servoControllerSend();
		}
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
		
		// init servo range
		for (var servo_num = 0; servo_num < 18; servo_num++) {
			this.servoRange[servo_num] = this.config.servoBoard.servo[servo_num].max - this.config.servoBoard.servo[servo_num].min;
		}
	}
	
	this.deg2servo = function (deg, servo_num) {
		// TODO limits
		return parseInt((deg/180)*this.servoRange[servo_num]+this.config.servoBoard.servo[servo_num].min);
	}
	
	this.servoControllerUpdate = function (state) {
		var tmp = [
			 //   Servo AngleCoxa         Servo AngleFemur                                            Servo AngleTibia
			90-state.leg.LF.AngC,   180-state.leg.LF.AngF,       state.leg.LF.AngT+this.config.leg.LF.AngT.correction, // Left Front
			90-state.leg.LM.AngC,   180-state.leg.LM.AngF,       state.leg.LM.AngT+this.config.leg.LM.AngT.correction, // Left Middle
			90-state.leg.LB.AngC,   180-state.leg.LB.AngF,       state.leg.LB.AngT+this.config.leg.LB.AngT.correction, // Left Bottom
			90+state.leg.RF.AngC,       state.leg.RF.AngF,   180-state.leg.RF.AngT+this.config.leg.RF.AngT.correction, // Right Front
			90+state.leg.RM.AngC,       state.leg.RM.AngF,   180-state.leg.RM.AngT+this.config.leg.RM.AngT.correction, // Right Middle
			90+state.leg.RB.AngC,       state.leg.RB.AngF,   180-state.leg.RB.AngT+this.config.leg.RB.AngT.correction  // Right Bottom
		 ];
		for (var servo_num = 0; servo_num < 18; servo_num++) {
			this.servoValues[servo_num] = this.deg2servo(tmp[servo_num], servo_num);
		}
	}
	
	this.servoControllerPackage = function () {
		var tmp = Buffer.alloc(2+2*18);
		tmp.writeUInt16BE(0xFFFF,0);
		for (var i = 0; i < 18; i++) {
			tmp.writeUInt16BE(this.servoValues[i],i*2+2);
		}
		return tmp;
	}
	
	this.servoControllerSend = function () {
		var tmp = this.servoControllerPackage();
		this.servoBoard.write(tmp, function(err) {
			if (err) {
				return console.log('Error on write: ', err.message)	// TODO logger and error to event bus
			}
			this.msgOut({ ID: this.ID, event: "servoValues", message: this.servoValues });
		}.bind(this));

	}

}
