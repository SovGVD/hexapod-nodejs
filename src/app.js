const cluster = require('cluster');
const processHandler = require('./libs/process_handler.js');
const config = require('./config/hexapod.js');

// Robot tasks that will be run by process/thread
var tasks = {
		"IK":        { "status": { "active": false, "start_ts": 0 }, "class": "IK.js" },
		"HAL":       { "status": { "active": false, "start_ts": 0 }, "class": "HAL.js" },
		"INTERFACE": { "status": { "active": false, "start_ts": 0 }, "class": "interface.js" }
	};

if (cluster.isMaster) {
	function messageHandler(w, msg) {
		console.log("DBG", w.process.pid, msg);
	}
	cluster.on('message', messageHandler);
	
	for (var i in tasks) {
		cluster.fork({ 'ID': i+"", 'class': tasks[i].class+"" });
	}
} else {
	var this_process = new processHandler();
		this_process.msgOut = function (msg) {
			// message from to master
			process.send(msg);
		};
		process.on('message', this_process.msgIn);
		this_process.run({ 'ID': process.env.ID, 'class': process.env.class});
}
