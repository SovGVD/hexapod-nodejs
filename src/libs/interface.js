'use strict'
// Interface
// - gamepad
// - websocket API
// - basic web GUI

const eventbus = require("./eventbus.js");

const gamepad = require("./interface.gamepad.js");
const http = require("./interface.http.js");
const ws = require("./interface.ws.js");

module.exports = function () {
	this.ID = "INTERFACE";
	this.config = {};
	this.gamepad = {};
	
	this.moveData = {
		x : 0,
		y : 0,
		z : 0,
		AngZ : 0
	};

	
	this.init = function (_config) {
		console.log("[INIT]", "interface");
		this.config = _config;

		this.initEvents();

		if (this.config.gamepad.enabled) {
			this.gamepad = new gamepad();
			this.gamepad.init(this.config.gamepad);
		}
		if (this.config.control_http.enabled) {
			this.http = new http();
			this.http.init(this.config.control_http);
		}
		if (this.config.control_ws.enabled) {
			this.ws = new ws();
			this.ws.init(this.config.control_ws);
		}
	}

	this.run = function () {
		console.log("[RUN]", "interface");
		if (this.config.gamepad.enabled) {
			this.gamepad.run();
		}
		if (this.config.control_http.enabled) {
			this.http.run();
		}
		if (this.config.control_ws.enabled) {
			this.ws.run();
		}
	};
	
	// Communication
	this.initEvents = function () {
		eventbus.eventBus.on('interfaceConnected', message => {
			this.msgOut({ ID: this.ID, event: 'interfaceConnected', message: message.message});
		});
		eventbus.eventBus.on('interfaceDisconnected', message => {
			this.msgOut({ ID: this.ID, event: 'interfaceDisconnected', message: message.message});
		});
		eventbus.eventBus.on('moveData', message => {
			this.msgOut({ ID: this.ID, event: 'moveData', message: message.message});
		});
	}
	
	this.msgIn = function (msg) {
		// all extra messages should emit event
		if (msg && msg.event) {
			eventbus.eventBus.sendEvent('_'+msg.event, { ID: msg.ID, message: msg.message });
		}
	}
	this.msgOut = false;

}
