const cluster = require('cluster');
const processHandler = require('./libs/process_handler.js');


if (cluster.isMaster) {
// Robot tasks that will be run by process/thread
	const config = require('./config/hexapod.js');
	var tasks = {
		'INTERFACE': { 
			'status': { 'active': false, 'start_ts': 0 }, 
			'class': "interface.js", 
			'config': config.interface 
		},
		'HAL': { 
			'status': { 'active': false, 'start_ts': 0 }, 
			'class': "HAL.js", 
			'config': config.HAL 
		},
		'IK': { 
			'status': { 'active': false, 'start_ts': 0 }, 
			'class': "IK.js", 
			'config': config.hexapod 
		}
	};
	
	function dt() {
		return new Date().toISOString();
	}

	function sendToAll(msg) {
		for (var i in cluster.workers) {
			try {
				cluster.workers[i].send(msg);
			} catch (e) {  }
		}
	}
	
	function messageHandler(w, msg) {
		//console.log(dt(),"[event]", w.process.pid, msg);
		// send message to all workers
		sendToAll(msg);
	}
	// Message from workers
	cluster.on('message', messageHandler);
	
	for (var i in tasks) {
		cluster.fork({ 
			'ID': i, 
			'class': tasks[i].class, 
			'config': JSON.stringify(tasks[i].config)
		});
	}
} else {
	var this_process = new processHandler();
		this_process.msgOut = function (msg) {
			// message to master (event bus)
			process.send(msg);
		};
		process.on('message', function (msg) { this_process.msgIn(msg); } );
		this_process.run({ 
			'ID': process.env.ID, 
			'class': process.env.class, 
			'config': process.env.config
		});
}
