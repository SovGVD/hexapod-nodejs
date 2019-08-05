'use strict'
const eventbus = require("./eventbus.js");

const WebSocket = require('ws');

module.exports = function () {
	this.ID = "INTERFACE.WS";
	this.config = {};
	this.ws = false;
	this.ws_client = false;
	
	this.subscriptions = {
		// Interface events
		'interfaceConnected': false,
		'interfaceDisconnected': false,
		'moveData': false,
		
		//HAL events
		'servoValues': false,
		'servoBoard': false,
		
		//IK events
		'IKInitConstants': false,
		'IKInitDMove': false,
		'IKInitState': false,
		'IKState': false,
	};
	
	this.init = function (_config) {
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
				console.log("[event]", "\x1b[32m", this.ID, "\x1b[33m", event, "\x1b[0m" , JSON.stringify(message));
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
			this.subscriptions[message.eventName] = true;
		} else if (message.event == 'unsubscribe') {
			this.subscriptions[message.eventName] = false;
		}
	}
	
	this.wsSend = function (event, message) {
		// send event data to client on subscription
		if (this.subscriptions[event]) {
			this.ws_client.send({ event: event, payload: message });
		}
	}
}
