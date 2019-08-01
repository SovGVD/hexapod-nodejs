// This module will handle process running

module.exports = function () {
	this.processClass = false;
	this.process = false;
	this.task = false;
	
	this.msgOut = false;

	this.ts = function () {
		return (new Date()).getTime()/1000;
	}
	
	this.run = function (task) {
		this.task = task;
		this.processClass = require(__dirname+"/"+this.task.class);
		this.process = new this.processClass;
		this.process.init(JSON.parse(this.task.config));
		//this.process.msgIn = this.msgIn;
		this.process.msgOut = this.msgOut;
		this.process.run();
		this.msgOut({ID: task.ID, event: "processStatus", message: { active: true, start_ts: this.ts()}});
	};
	
	this.msgIn = function (msg) {
		// message from master
		if (this.process) {
			this.process.msgIn(msg);
		}
	};	
}
