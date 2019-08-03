'use strict'

const SerialPort = require('serialport');


// Hardware abstract layer (HAL)
module.exports = function () {
	this.ID = "HAL";
	this.config = {};
	this.isServoBoardReady = false;
	this.servoBoard = false;
	this.servoMin = 530;	// TODO move to config
	this.servoMax = 2470;
	this.servoRange = this.servoMax - this.servoMin;
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
		if (msg.event == 'legsAngles') {
			//console.log("DBG", this.ID, msg.message);
			for (var i = 0; i < 18; i++) {
				//if (i >=12 && i <= 14 ) {
					this.servoValues[i] = parseInt((msg.message[i]/180)*this.servoRange+this.servoMin);
				/*}else if (i >=3 && i <= 5 ) {
					this.servoValues[i] = parseInt((msg.message[i]/180)*this.servoRange+this.servoMin);
				} else {
					this.servoValues[i] = 1500;
				}*/
			}
			//console.log("DBG", this.servoValues);
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
		//console.log("Write:", tmp, this.servoValues);
		//console.log("< ", this.servoValues.join(" "));
		this.servoBoard.write(tmp, function(err) {
			if (err) {
				return console.log('Error on write: ', err.message)
			}
			//console.log('message written');
		});

	}

}
