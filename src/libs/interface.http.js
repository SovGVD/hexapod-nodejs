'use strict'
const eventbus = require("./eventbus.js");

const http = require('http');
const fs = require('fs');

module.exports = function () {
	this.ID = "INTERFACE.HTTP";
	this.config = {};
	
	this.file2mime = {
			".html" : { t:'text/html',                e:'utf8'   },
			".js"   : { t:'application/javascript',   e:'utf8'   },
			".wasm" : { t:'application/wasm',         e:'binary' },
			".ico"  : { t:'image/x-icon',             e:'binary' },
			".css"  : { t:'text/css',                 e:'utf8'   },
			".map"  : { t:'application/json',         e:'utf8'   },
			default : { t:'text/plain',               e:'utf8'   },
		};
	
	this.init = function (_config) {
		console.log("[INIT]", this.ID);
		this.config = _config;
	}
	this.run = function () {
		console.log("[RUN]", this.ID);
		http.createServer(
			(req, res) => {this._http_res(req, res)}
		).listen(this.config.port);
	}
	
	
	// HTTP client
	this._http_res = function (req, res) {
		var url = req.url.split("/"); 
			url.shift(); 
			url = (url.join("/")).replace(new RegExp("\\.\\.",'g'),"");
			
		if (url == '') url="index.html";
		url = this.config.path+url;
		var type = url.split("."); 
			type="."+type.pop(); 
			//console.log("HTTPREQ:", req.url, "as", url, "type", type);
			type = (typeof this.file2mime[type] !== undefined)?this.file2mime[type]:this.file2mime.default;
		fs.readFile(url, { encoding: type.e }, function (type, res, err, data) {
			if (err) {
				res.writeHead(404, {'Content-Type': 'text/html'});
				res.end("404 Not Found");
			} else {
				res.writeHead(200, {'Content-Type': type.t});
				res.end(data, type.e);
			}
		}.bind(this, type, res));
	}
	
}
