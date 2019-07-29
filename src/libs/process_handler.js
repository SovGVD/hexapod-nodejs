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
		this.processClass = require(__dirname+"/"+task.class);
		this.process = new this.processClass;
		//this.process.msgOut = this.msgOut;
		this.process.run();
		this.msgOut({ID: task.ID, status: { active: true, start_ts: this.ts()}});
	};
	
	this.msgIn = function (msg) {
		// message from master
		if (this.process) {
			//this.process.msgIn(src.msg);
		}
	};	
}
