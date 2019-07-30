'use strict'

// Inverse Kinematics
module.exports = function () {
	this.hexapod = { };
	
	this.constants = {
		leg: {
			LF: { Lf2: false, Lt2: false, LtLf: false, AngToBody: false },
			LM: { Lf2: false, Lt2: false, LtLf: false, AngToBody: false },
			LB: { Lf2: false, Lt2: false, LtLf: false, AngToBody: false },
			RF: { Lf2: false, Lt2: false, LtLf: false, AngToBody: false },
			RM: { Lf2: false, Lt2: false, LtLf: false, AngToBody: false },
			RB: { Lf2: false, Lt2: false, LtLf: false, AngToBody: false }
		}
	};
	
	this.state = {
		body: {
			x: 0, y: 0, z: 0, 
			AngX: 0, AngY: 0, AngZ: 0,
			LF: { x: false, y: false, z: false },
			LM: { x: false, y: false, z: false },
			LB: { x: false, y: false, z: false },
			RF: { x: false, y: false, z: false },
			RM: { x: false, y: false, z: false },
			RB: { x: false, y: false, z: false },
		},
		leg: {
			LF: { AngC: false, AngF: false, AngT: false, x: false, y:false, z: false, L: false },
			LM: { AngC: false, AngF: false, AngT: false, x: false, y:false, z: false, L: false },
			LB: { AngC: false, AngF: false, AngT: false, x: false, y:false, z: false, L: false },
			RF: { AngC: false, AngF: false, AngT: false, x: false, y:false, z: false, L: false },
			RM: { AngC: false, AngF: false, AngT: false, x: false, y:false, z: false, L: false },
			RB: { AngC: false, AngF: false, AngT: false, x: false, y:false, z: false, L: false }
		}
	};

	this.run = function () {
		console.log("[RUN]", "IK");	// TODO logger
		this.initConstants();
		this.initBody();
	};
	
	this.init = function (_config) {
		this.hexapod = _config;
		this.initConstants();
	}

	// IK helpers
	this._degNorm = function (deg) {
		while (deg > 360 || deg < 0) {
			if (deg < 0) deg += 360;
			if (deg > 360) deg -= 360;
		}
		return deg;
	}
	this._deg2rad = function (deg) {
		return Math.PI/180*deg;
	}

	this._rad2deg = function (rad) {
		return this._degNorm(180/Math.PI*rad);
	}

	// Init methods
	this.initConstants = function () {
		for (var i = 0; i < this.hexapod.legs.length; i++) {
			var ID = this.hexapod.legs[i];
			this.constants.leg[ID].Lf2 = Math.pow(this.hexapod.config.leg[ID].Lf, 2);
			this.constants.leg[ID].Lt2 = Math.pow(this.hexapod.config.leg[ID].Lt, 2);
			this.constants.leg[ID].LtLf = this.hexapod.config.leg[ID].Lt * this.hexapod.config.leg[ID].Lf;
			this.constants.leg[ID].AngCRad = Math.atan2((this.hexapod.config.body[ID].y - this.hexapod.config.body.y), (this.hexapod.config.body[ID].x - this.hexapod.config.body.x));
			this.constants.leg[ID].defaultX = Math.cos(this._deg2rad(this.hexapod.config.leg[ID].AngC.default+this._rad2deg(this.constants.leg[ID].AngCRad))) * this.hexapod.config.leg[ID].L.default + this.hexapod.config.body[ID].x;
			this.constants.leg[ID].defaultY = Math.sin(this._deg2rad(this.hexapod.config.leg[ID].AngC.default+this._rad2deg(this.constants.leg[ID].AngCRad))) * this.hexapod.config.leg[ID].L.default + this.hexapod.config.body[ID].y;
		}
		// TODO init min/max 3d polygon for legs
	}
	
	this.initBody = function () {
		// TODO save last positions before "stop"/"shutdown" and transform from it to initial position
		this.state.body.x    = parseFloat(this.hexapod.config.body.x);
		this.state.body.y    = parseFloat(this.hexapod.config.body.y);
		this.state.body.z    = parseFloat(this.hexapod.config.body.z);
		this.state.body.AngX = parseFloat(this.hexapod.config.body.AngX);
		this.state.body.AngY = parseFloat(this.hexapod.config.body.AngY);
		this.state.body.AngZ = parseFloat(this.hexapod.config.body.AngZ);

		var tmp = this.getDefaultBodyState( {
				x: parseFloat(this.state.body.x),
				y: parseFloat(this.state.body.y),
				z: parseFloat(this.state.body.z),
				AngX: parseFloat(this.state.body.AngX),
				AngY: parseFloat(this.state.body.AngY),
				AngZ: parseFloat(this.state.body.AngZ)
			}, false );
		for (var i = 0; i < this.hexapod.legs.length; i++) {
			var ID = this.hexapod.legs[i];
			this.state.body[ID].x = parseFloat(tmp.body[ID].x);
			this.state.body[ID].y = parseFloat(tmp.body[ID].y);
			this.state.body[ID].z = parseFloat(tmp.body[ID].z);
			this.state.leg[ID].x  = parseFloat(tmp.leg[ID].x);
			this.state.leg[ID].y  = parseFloat(tmp.leg[ID].y);
			this.state.leg[ID].z  = parseFloat(tmp.leg[ID].z);
		}
	}
	
	// IK
	this.getGround = function (x,y) {	// TODO this will be used for 3D surface only
		return -80;
	}
	
	this.isLegOnTheGround = function (ID) {
		// TODO check with sensors
		if (this.state.leg[ID].z == this.getGround(this.state.leg[ID].x, this.state.leg[ID].y)) {
			return true;
		}
		return false;
	}
	
	function legAng (ID) {
		// TODO, precheck leg limits:
		// 1. create 3D polygon of max/min available positions, including angles limits
		// 2. check if x1,y1,z1 in that polygon
		this.state.leg[ID].L = Math.sqrt(Math.pow(this.state.leg[ID].x - this.state.body[ID].x, 2) + Math.pow(this.state.leg[ID].y - this.state.body[ID].y, 2));

		/*
		                      
		AngleCoxa = atan2 ( (y1-y0), (x1-x0) )
								
		*/
		this.state.leg[ID].AngC = this._rad2deg(Math.atan2((this.state.leg[ID].y - this.state.body[ID].y), (this.state.leg[ID].x - this.state.body[ID].x)) - this.constants.leg[ID].AngCRad);	// -90...90
		this.state.leg[ID].AngC -= this.state.body.AngZ;
		this.state.leg[ID].AngC = this._degNorm(this.state.leg[ID].AngC);
		if (this.state.leg[ID].AngC > 180) this.state.leg[ID].AngC -= 360;
		/*
								   Lf^2 + (D^2 + (L - Lc)^2) - Lt^2       PI             L - Lc
			AngleFemur = arccos ( ---------------------------------- ) - ---- + arctan( -------- )
								   2 * Lf * sqrt(D^2 + (L - Lc)^2)         2               D

										Lf^2 + (D^2 + (L - Lc)^2) - Lt^2                           D
			AngleFemur = PI - arccos ( ---------------------------------- ) - arccos ( ------------------------ )
										2 * Lf * sqrt(D^2 + (L - Lc)^2)                 sqrt(D^2 + (L - Lc)^2)

		*/
		var tmp = Math.pow(this.state.body.z - this.state.leg[ID].z, 2) + Math.pow( this.state.leg[ID].L - this.config.leg[ID].Lc, 2);
		this.state.leg[ID].AngF = this._rad2deg(Math.PI - Math.acos( (this.constants.leg[ID].Lf2 + tmp - this.constants.leg[ID].Lt2) / (2 * this.hexapod.config.leg[ID].Lf * Math.sqrt(tmp)) ) - Math.acos((this.state.body.z - this.state.leg[ID].z)/Math.sqrt(tmp)));

		/*
							   Lt^2 + Lf^2 - (D^2 + (L - Lc)^2)
		AngleTibia = arccos ( --------------------------------- )
										 2 * Lt * Lf
		*/
		this.state.leg[ID].AngT = this._rad2deg(Math.acos((this.constants.leg[ID].Lt2 + this.constants.leg[ID].Lf2 - tmp) / (2 * this.constants.leg[ID].LtLf)));
	}


	this.getDefaultBodyState = function (body, _ID) {
		// this function should return default hexapod state at body.x, body.y, body.z point, rotated body.AngX (TODO and don't forgot about balance), body.AngY(TODO...), boby.AngZ
		var ret = {
				body: {
				},
				leg: {
				}
			};
		var _tmp_cos = Math.cos(this._deg2rad(body.AngZ));
		var _tmp_sin = Math.sin(this._deg2rad(body.AngZ));

		for (var i = 0; i < this.hexapod.legs.length; i++) {
			if (_ID === false || _ID == this.hexapod.legs[i] ) {
				var ID = this.hexapod.legs[i];
				ret.body[ID] = { };
				ret.leg[ID] = { };

				ret.body[ID].x = body.x + (this.hexapod.config.body[ID].x)*_tmp_cos - (this.hexapod.config.body[ID].y)*_tmp_sin;
				ret.body[ID].y = body.y + (this.hexapod.config.body[ID].x)*_tmp_sin + (this.hexapod.config.body[ID].y)*_tmp_cos;
				ret.body[ID].z = parseFloat(body.z);
				
				ret.leg[ID].x = body.x + (this.constants.leg[ID].defaultX)*_tmp_cos - (this.constants.leg[ID].defaultY)*_tmp_sin;
				ret.leg[ID].y = body.y + (this.constants.leg[ID].defaultX)*_tmp_sin + (this.constants.leg[ID].defaultY)*_tmp_cos;
				ret.leg[ID].z = parseFloat(this.getGround(ret.leg[ID].x, ret.leg[ID].y));
			}
		}
		return ret;
	}
	
	this.preCalculcate = function (vector, ID) {
		// this function should return hexapod expected state
		// for more advanced solution that can be changed to anything else to predict/choose new state of the hexapod
		var _tmp = this._degNorm(this.state.body.AngZ + vector.AngZ);
		var _tmp_sin = Math.sin(this._deg2rad(_tmp));
		var _tmp_cos = Math.cos(this._deg2rad(_tmp));
		// return position of the hexapod in future
		return this.getDefaultBodyState( {
				x: this.state.body.x + vector.x*_tmp_cos - vector.y*_tmp_sin,
				y: this.state.body.y + vector.x*_tmp_sin + vector.y*_tmp_cos,
				z: this.state.body.z,
				AngX: this.state.body.AngX,
				AngY: this.state.body.AngY,
				AngZ: _tmp
			}, ID );
	}

	this.updateBody = function () {
		// init body position and angle
		var _tmp_sin = Math.sin(this._deg2rad(this.state.body.AngZ));
		var _tmp_cos = Math.cos(this._deg2rad(this.state.body.AngZ));
		for (var i = 0; i < this.hexapod.legs.length; i++) {
			var ID = this.hexapod.legs[i];
			this.state.body[ID].x = this.state.body.x + this.hexapod.config.body[ID].x*_tmp_cos - this.hexapod.config.body[ID].y*_tmp_sin;
			this.state.body[ID].y = this.state.body.y + this.hexapod.config.body[ID].x*_tmp_sin + this.hexapod.config.body[ID].y*_tmp_cos;
		}
	}

	this.updateLeg = function () {
		for (var i = 0; i < this.hexapod.legs.length; i++) {
			this.legAng(this.hexapod.legs[i]);
		}
	}
	
	this.update = function () {
		updateBody();
		updateLeg();
	}

}
