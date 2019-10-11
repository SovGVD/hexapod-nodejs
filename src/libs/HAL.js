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
    
    this.groundThreshold = 300;
    
    this.sensorsValues = {
		leg: {
			ground    : [0, 0, 0, 0, 0, 0],
			on_ground : [false, false, false, false, false, false],
		}
	};
	this.serialPackageBuffer     = Buffer.alloc(14);
	this.serialPackageValueIndex = 0;


	this.init = function (_config) {
		console.log("[INIT]", "HAL");
		this.config = _config;
		this.initServoBoard();
	}

	this.run = function () {
		console.log("[RUN]", "HAL");
	};
	
	// Communication
	this.msgIn = function (msg) {
		if (msg.event == 'IK/State') {
			this.servoControllerUpdate(msg.message);
			this.servoControllerSend();
		} else if (msg.event == 'HAL/RAWAngles') {	// input raw angles, for debug
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
			this.processData(data);
			if (!this.isServoBoardReady) {
				this.isServoBoardReady = true;
				this.msgOut({ ID: this.ID, event: this.ID+'/servoBoard', message: { success: true } });
			}
		}.bind(this));
		this.servoBoard.on('error', function(err) {
			this.msgOut({ ID: this.ID, event: this.ID+'/servoBoard', message: { success: false, error: err.message }});
		}.bind(this));
		
		// init servo range
		for (var servo_num = 0; servo_num < 18; servo_num++) {
			this.servoRange[servo_num] = this.config.servoBoard.servo[servo_num].max - this.config.servoBoard.servo[servo_num].min;
		}
	}
	
	this.processData = function (data) {
		// TODO optimize
		var dataLength = data.length-1;	// there are 2bytes values
		if (dataLength > 0) {
			var offset = 0;
			var sendEvent = false;
			var readPackage = false;
			var value = 0;
			for (offset = 0; offset < dataLength; offset++) {
				if (data.readUInt16BE(offset) == 65535) {
					readPackage = true;
					this.serialPackageValueIndex = 0;
					offset = offset + 2;
				}
				if (readPackage) {
					while (this.serialPackageValueIndex < 6 && offset < dataLength) {
						value = data.readUInt16BE(offset);
						if (value != this.sensorsValues.leg.ground[this.serialPackageValueIndex]) {
							sendEvent = true;
						}
						this.sensorsValues.leg.ground[this.serialPackageValueIndex] = value;
						this.sensorsValues.leg.on_ground[this.serialPackageValueIndex] = value >= this.groundThreshold;
						this.serialPackageValueIndex++;
						offset = offset + 2;
					}
					readPackage = false;
				}
			}
			if (sendEvent) this.msgOut({ ID: this.ID, event: this.ID+'/sensorBoard', message: this.sensorsValues });
		}
	}
	
	this.deg2servo = function (deg, servo_num) {
		if (deg < 0) deg = 0;
		if (deg > 180) deg = 180;
		return parseInt((deg/180)*this.servoRange[servo_num]+this.config.servoBoard.servo[servo_num].min);
	}
	
	this.servoControllerUpdate = function (state) {
		var tmp = [
			 //                                                Servo AngleCoxa                                                       Servo AngleFemur                                                       Servo AngleTibia
			90-state.leg.LF.AngC+this.config.servoBoard.correction.leg.LF.AngC,   180-state.leg.LF.AngF+this.config.servoBoard.correction.leg.LF.AngF,   180-state.leg.LF.AngT+this.config.servoBoard.correction.leg.LF.AngT, // Left Front
			90-state.leg.LM.AngC+this.config.servoBoard.correction.leg.LM.AngC,   180-state.leg.LM.AngF+this.config.servoBoard.correction.leg.LM.AngF,   180-state.leg.LM.AngT+this.config.servoBoard.correction.leg.LM.AngT, // Left Middle
			90-state.leg.LB.AngC+this.config.servoBoard.correction.leg.LB.AngC,   180-state.leg.LB.AngF+this.config.servoBoard.correction.leg.LB.AngF,   180-state.leg.LB.AngT+this.config.servoBoard.correction.leg.LB.AngT, // Left Bottom
			90-state.leg.RF.AngC+this.config.servoBoard.correction.leg.RF.AngC,       state.leg.RF.AngF+this.config.servoBoard.correction.leg.RF.AngF,       state.leg.RF.AngT+this.config.servoBoard.correction.leg.RF.AngT, // Right Front
			90-state.leg.RM.AngC+this.config.servoBoard.correction.leg.RM.AngC,       state.leg.RM.AngF+this.config.servoBoard.correction.leg.RM.AngF,       state.leg.RM.AngT+this.config.servoBoard.correction.leg.RM.AngT, // Right Middle
			90-state.leg.RB.AngC+this.config.servoBoard.correction.leg.RB.AngC,       state.leg.RB.AngF+this.config.servoBoard.correction.leg.RB.AngF,       state.leg.RB.AngT+this.config.servoBoard.correction.leg.RB.AngT  // Right Bottom
		];
		this.msgOut({ ID: this.ID, event: this.ID+'/servoAngles', message: tmp });
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
			this.msgOut({ ID: this.ID, event: this.ID+'/servoValues', message: this.servoValues });
		}.bind(this));

	}

}
