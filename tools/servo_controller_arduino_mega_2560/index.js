const WebSocket = require('ws');
const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline')
const port = new SerialPort('/dev/ttyUSB0', { baudRate: 115200 });

var isControllerReady = false;

const parser = new Readline()
port.pipe(parser)

var servoValues = [
    1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500,
    1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500
    ];

function servoControllerPackage() {
    var tmp = Buffer.alloc(2+2*24);
    tmp.writeUInt16BE(0xFFFF,0);
    for (var i = 0; i < 24; i++) {
        tmp.writeUInt16BE(servoValues[i],i*2+2);
    }
    return tmp;
}

parser.on('data', line => console.log(`> ${line}`))

port.on('data', function (data) {
	//console.log(data.toString());
	if (data.toString() == "ready\r\n") {
		isControllerReady = true;
	}
});



function send(data) {
	if (isControllerReady) {
		// expect angles from 0 to 180;
		for (var i = 0; i < 24; i++) {
			servoValues[i] = parseInt((data.cmd.value[i]/180)*1600+700);	// 700 ... 2300
		}

		var tmp = servoControllerPackage();
		//console.log("Write:", tmp, servoValues);
		console.log("< ", servoValues.join(" "));
		port.write(tmp, function(err) {
			if (err) {
				return console.log('Error on write: ', err.message)
			}
			//console.log('message written');
		});
	}
}


function ws_init () {

		// Control Feed
		ws_control = new WebSocket.Server({ port: 8082 });
		ws_control.on('connection', function connection(ws) {
			ws.on('message', function (message) {
				try {
					if (message[0] == '{') {
						send(JSON.parse(message));
					} else {
						console.log("WebClient",message);
					}
				} catch (e) {
					ws.send("false");
					console.log("WSTELEMETRYERROR:",e,"Message",message);
				}
			});
		});
	}


ws_init();

//setInterval(send, 3000);
