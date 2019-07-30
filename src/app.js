const cluster = require('cluster');
const processHandler = require('./libs/process_handler.js');


if (cluster.isMaster) {
// Robot tasks that will be run by process/thread
	const config = require('./config/hexapod.js');
	var tasks = {
		'IK': { 
			'status': { 'active': false, 'start_ts': 0 }, 
			'class': "IK.js", 
			'config': config.hexapod 
		},
		'HAL': { 
			'status': { 'active': false, 'start_ts': 0 }, 
			'class': "HAL.js", 
			'config': config.HAL 
		},
		'INTERFACE': { 
			'status': { 'active': false, 'start_ts': 0 }, 
			'class': "interface.js", 
			'config': config.interface 
		}
	};


	function messageHandler(w, msg) {
		console.log("DBG", w.process.pid, msg);
	}
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
			// message from to master
			process.send(msg);
		};
		process.on('message', this_process.msgIn);
		this_process.run({ 
			'ID': process.env.ID, 
			'class': process.env.class, 
			'config': process.env.config
		});
}
