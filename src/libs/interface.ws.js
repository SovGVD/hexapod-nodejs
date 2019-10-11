'use strict'
const eventbus = require("./eventbus.js");

const WebSocket = require('ws');

module.exports = function () {
	this.ID = "INTERFACE.WS";
	this.config = {};
	this.ws = false;
	this.ws_client = false;
	
	this.currentData = {
	};
	
	this.hideEventFromLog = {
		// Interface websocket events
		'INTERFACE.WS/subscribed': false,
		'INTERFACE.WS/unsubscribed': false,
		
		// INTERFACE events
		// INTERFACE.INOUT events
		'INTERFACE.INPUT/interfaceConnected': false,
		'INTERFACE.INPUT/interfaceDisconnected': false,
		'INTERFACE.INPUT/move': false,
		
		// HAL events
		'HAL/servoAngles': false,
		'HAL/servoValues': false,
		'HAL/sensorBoard': false,
		'HAL/servoBoard': false,
		
		// IK events
		'IK/InitHexapod': false,
		'IK/InitConstants': false,
		'IK/InitDMove': false,
		'IK/InitState': false,
		'IK/State': false,
	};
	
	this.subscriptions = {
		// Interface websocket events
		'INTERFACE.WS/subscribed': true,
		'INTERFACE.WS/unsubscribed': true,
		
		// INTERFACE events
		// INTERFACE.INOUT events
		'INTERFACE.INPUT/interfaceConnected': false,
		'INTERFACE.INPUT/interfaceDisconnected': false,
		'INTERFACE.INPUT/move': false,
		
		// HAL events
		'HAL/servoAngles': false,
		'HAL/servoValues': false,
		'HAL/sensorBoard': false,
		'HAL/servoBoard': false,
		
		// IK events
		'IK/InitHexapod': false,
		'IK/InitConstants': false,
		'IK/InitDMove': false,
		'IK/InitState': false,
		'IK/State': false,
	};
	
	this.init = function (_config) {
		console.log("[INIT]", this.ID);
		this.config = _config;
	}
	this.run = function () {
		console.log("[RUN]", this.ID);
		this.wsInit();
		this.initEvents();
		this.wsEvents();
	}
	
	this.initEvents = function () {
		for (var event in this.subscriptions) {
			eventbus.eventBus.on('_'+event, function (event, message) {
				if (!this.hideEventFromLog[event]) {
					console.log("[event]", "\x1b[32m", this.ID, "\x1b[33m", event, "\x1b[0m" , JSON.stringify(message));
				}
				if (typeof this.subscriptions[event] !== undefined) {
					this.currentData[event] = message;	// save latest details
				}
				this.wsSend(event, message);
			}.bind(this, event));
		}
	}
	
	// WS client
	this.wsInit = function () {
		this.ws = new WebSocket.Server({ port: this.config.port });
	}
	
	this.wsEvents = function () {
		this.ws.on('connection', function connection(ws) {
			ws.on('message', function (message) {
				this.ws_client = ws;
				try {
					if (message[0] == '{') {
						this.wsCommand(JSON.parse(message));
					} 
				} catch (e) {
					ws.send("false");
				}
			}.bind(this));
		}.bind(this));
	}
	
	this.wsCommand = function (message) {
		if (message.event == 'subscribe') {
			this.subscriptions[message.message.eventName] = true;
			this.wsSend('subscribed', { eventName: message.message.eventName });
		} else if (message.event == 'unsubscribe') {
			this.subscriptions[message.message.eventName] = false;
			this.wsSend('unsubscribed', { eventName: message.message.eventName });
		
		
		} else if (message.event == 'get') {
			// TODO isset
			if (typeof this.currentData[message.message.eventName] != undefined) {
				this.wsSend(message.message.eventName, this.currentData[message.message.eventName], true);
			} else {
				// TODO request data when eventName available
				this.wsSend(message.message.eventName, false, true);	// send fail
			}
		
		
		} else if (message.event == 'set') {
			// Input from WS.interface (browser)
			// TODO
			// - all process should register his events/routes
			if (message.message.eventName == 'HAL/RAWAngles') {
				
				eventbus.eventBus.sendEvent(message.message.eventName, { ID: this.ID, message: message.message.message });
			} else if (message.message.eventName == 'INTERFACE.WS/move') {
				// lets move!
				eventbus.eventBus.sendEvent(message.message.eventName, { ID: this.ID, message: message.message.message });
			} else {
				console.log("UNKNOWN EVENT", message)
			}
		} else {
			this.wsSend(message.event, false, true);	// send fail
		}
	}
	
	this.wsSend = function (event, message, force) {
		// send event data to client on subscription
		if (this.subscriptions[event] || force) {
			this.ws_client.send(JSON.stringify({ event: event, message: message }));
		}
	}
}
