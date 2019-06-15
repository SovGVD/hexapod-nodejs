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



function send() {
	if (isControllerReady) {
		var tmp = servoControllerPackage();
		console.log("Write:", tmp);
		port.write(tmp, function(err) {
		  if (err) {
		    return console.log('Error on write: ', err.message)
		  }
		  console.log('message written');
		 // for (var i = 0; i < 24; i++) {
		  //  servoValues[i] = parseInt(Math.random()*1400+800);
		  //}
		});
	}
}


setInterval(send, 1000);
