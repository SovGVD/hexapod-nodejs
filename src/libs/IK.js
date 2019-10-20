'use strict'

const insidePolygon = require('point-in-polygon');
const polygon = require('concaveman');

// Inverse Kinematics
// And a lot of other logic for movements
// TODO this is already not only IK, and it is become a mess, this needs to be separated
module.exports = function () {
	this.ID = "IK";	// namespace
	this.loop = false;
	this.hexapod = { };
	
	this.tmp_ground = -80;
	
	// some useful constants for calculations
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
	
	// current state of the hexapod
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
			LF: { AngC: false, AngF: false, AngT: false, x: false, y:false, z: false, L: false, on_ground: true, out_of_limit: false, restoring: false },
			LM: { AngC: false, AngF: false, AngT: false, x: false, y:false, z: false, L: false, on_ground: true, out_of_limit: false, restoring: false },
			LB: { AngC: false, AngF: false, AngT: false, x: false, y:false, z: false, L: false, on_ground: true, out_of_limit: false, restoring: false },
			RF: { AngC: false, AngF: false, AngT: false, x: false, y:false, z: false, L: false, on_ground: true, out_of_limit: false, restoring: false },
			RM: { AngC: false, AngF: false, AngT: false, x: false, y:false, z: false, L: false, on_ground: true, out_of_limit: false, restoring: false },
			RB: { AngC: false, AngF: false, AngT: false, x: false, y:false, z: false, L: false, on_ground: true, out_of_limit: false, restoring: false }
		}
	};
	
	// move data for loop/event
	this.dmove = {
		speed: 0,
		angspeed: 0,
		inProgress: false,
		dx: false,	// delta of full move
		dy: false,
		dAngZ: false,
		
		gait_z: 0,
		
		gaitsteps: 0,
		current_gaitstep: 0,
		
		gaitTypeID: 0,
		
		smooth: 0,	// event per gaitstep (smooth)
		current_smooth: 0,
		
		step_delay: 10,	// loop delay, TODO calculate steps using servo board frequency
		leg: {
			LF: { inProgress: false, gait_z: 0, ground_z: false, current_subgaitstep: false, subgaitsteps: false },
			LM: { inProgress: false, gait_z: 0, ground_z: false, current_subgaitstep: false, subgaitsteps: false },
			LB: { inProgress: false, gait_z: 0, ground_z: false, current_subgaitstep: false, subgaitsteps: false },
			RF: { inProgress: false, gait_z: 0, ground_z: false, current_subgaitstep: false, subgaitsteps: false },
			RM: { inProgress: false, gait_z: 0, ground_z: false, current_subgaitstep: false, subgaitsteps: false },
			RB: { inProgress: false, gait_z: 0, ground_z: false, current_subgaitstep: false, subgaitsteps: false }
		}
	};
	// moveData with vector x,y,z + AngZ (yaw)
	// TODO failsafe on lost data from interface
	this.moveData = {
		x : 0,
		y : 0,
		z : 0,
		AngZ : 0
	};

	this.init = function (_config) {
		console.log("[INIT]", "IK");	// TODO logger
		this.hexapod = _config;
	}

	this.run = function () {
		console.log("[RUN]", "IK");	// TODO logger
		
		this.msgOut({ ID: this.ID, event: this.ID+'/InitHexapod', message: this.hexapod});
		
		this.initConstants();
		this.msgOut({ ID: this.ID, event: this.ID+'/InitConstants', message: this.constants});
		
		this.initBody();
		this.update();
		this.msgOut({ ID: this.ID, event: this.ID+'/InitState', message: this.state});
		
		this.initDMove();
		this.msgOut({ ID: this.ID, event: this.ID+'/InitDMove', message: this.dmove});
		
		this.initLoop();
	};
	
	// Communication
	this.msgIn = function (msg) {
		if (msg.event == 'INTERFACE.INPUT/move') {
			this.msgIn_moveData(msg.message);
		}
	}
	this.msgIn_moveData = function (data) {
		this.moveData.x = parseFloat(data.x);
		this.moveData.y = parseFloat(data.y);
		this.moveData.z = parseFloat(data.z);
		this.moveData.AngZ = parseFloat(data.AngZ);
		this.move();
	}
	
	this.msgOut = false;
	
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
	this.initLoop = function () {
		this.loop = setInterval(
			function () { 
				this.moveToNext();
			}.bind(this),
		this.dmove.step_delay);
	}
	this.initDMove = function () {
		this.dmove.gaitTypeID = this.hexapod.config.defaultGait;	// this should be in the beggining
		
		this.dmove.smooth     = this.hexapod.config.gait[this.dmove.gaitTypeID].smooth;
		this.dmove.speed      = this.hexapod.config.gait[this.dmove.gaitTypeID].speed;
		this.dmove.angspeed   = this.hexapod.config.gait[this.dmove.gaitTypeID].angspeed;
		this.dmove.gaitsteps  = parseInt(this.hexapod.config.gait[this.dmove.gaitTypeID].sequence.length);
		this.dmove.totalsteps = this.dmove.gaitsteps*this.dmove.smooth;
		this.dmove.gait_z     = this.hexapod.config.gait[this.dmove.gaitTypeID].gaitZ;
	}
	
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
		// TODO init min/max 3d polygon for legs, including this polygons intersection
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
		return this.tmp_ground;
	}
	
	this.checkLegOnTheGround = function (ID) {
		// TODO check with sensors
		if (this.state.leg[ID].z == this.getGround(this.state.leg[ID].x, this.state.leg[ID].y)) {
			this.state.leg[ID].on_ground = true;
			return true;
		}
		this.state.leg[ID].on_ground = false;
		return false;
	}
	
	this.isLegOnTheGround = function (ID) {
		return this.state.leg[ID].on_ground;
	}

	this.isAllLegsOnGround = function () {
		for (var i = 0; i < this.hexapod.legs.length; i++) {
			var ID = this.hexapod.legs[i];
			if (!this.isLegOnTheGround(ID)) {
				return false;
			}
		}
		return true;
	}
	
	this.isLegSamePosition = function (ID, tmp) {
		var precision = 5;
		// This is not too precision values, but should be fine for current solution
		// see https://stackoverflow.com/questions/10015027/javascript-tofixed-not-rounding/32605063#32605063
		if (tmp.x.toFixed(precision) == this.state.leg[ID].x.toFixed(precision) 
			&& tmp.y.toFixed(precision) == this.state.leg[ID].y.toFixed(precision) 
			&& tmp.z.toFixed(precision) == this.state.leg[ID].z.toFixed(precision)
		) {
			return true;
		}
		return false;
	}
	
	this.legAng = function (ID) {
		// TODO this is useless for position prediction
		// TODO, precheck leg limits:
		// 1. create 3D polygon of max/min available positions, including angles limits
		// 2. check if x1,y1,z1 in that polygon
		//console.log("DBG init body", this.state.body);
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
		var tmp = Math.pow(this.state.body.z - this.state.leg[ID].z, 2) + Math.pow( this.state.leg[ID].L - this.hexapod.config.leg[ID].Lc, 2);
		this.state.leg[ID].AngF = this._rad2deg(Math.PI - Math.acos( (this.constants.leg[ID].Lf2 + tmp - this.constants.leg[ID].Lt2) / (2 * this.hexapod.config.leg[ID].Lf * Math.sqrt(tmp)) ) - Math.acos((this.state.body.z - this.state.leg[ID].z)/Math.sqrt(tmp)));

		/*
							   Lt^2 + Lf^2 - (D^2 + (L - Lc)^2)
		AngleTibia = arccos ( --------------------------------- )
										 2 * Lt * Lf
		*/
		this.state.leg[ID].AngT = this._rad2deg(Math.acos((this.constants.leg[ID].Lt2 + this.constants.leg[ID].Lf2 - tmp) / (2 * this.constants.leg[ID].LtLf)));
	}
	
	this.checkLegOutOfLimits = function (ID) {
		if (   this.state.leg[ID].AngC < this.hexapod.config.leg[ID].AngC.min || this.state.leg[ID].AngC > this.hexapod.config.leg[ID].AngC.max
			|| this.state.leg[ID].AngF < this.hexapod.config.leg[ID].AngF.min || this.state.leg[ID].AngF > this.hexapod.config.leg[ID].AngF.max
			|| this.state.leg[ID].AngT < this.hexapod.config.leg[ID].AngT.min || this.state.leg[ID].AngT > this.hexapod.config.leg[ID].AngT.max
			|| this.state.leg[ID].L    < this.hexapod.config.leg[ID].L.min    || this.state.leg[ID].L    > this.hexapod.config.leg[ID].L.max
		) {
			this.state.leg[ID].out_of_limit = true;
			return true;
		}
		this.state.leg[ID].out_of_limit = false;
		return false;
	}
	
	this.isLegOutOfLimits = function (ID) {
		return this.state.leg[ID].out_of_limit;
	}
	
	this.isSomeLegsOutOfLimits = function () {
		for (var i = 0; i < this.hexapod.legs.length; i++) {
			var ID = this.hexapod.legs[i];
			if (this.isLegOutOfLimits(ID)) {
				return true;
			}
		}
		return false;
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
			var ID = this.hexapod.legs[i];
			this.legAng(ID);
			this.checkLegOutOfLimits(ID);
		}
	}
	
	this.update = function () {
		this.updateBody();
		this.updateLeg();
	}
	
	// move
	// LOOP(moveToNext) -> moveToNextGait -> movetoNextGaitUpdateLeg
	this.isInMove = function () {
		return this.dmove.dx !=0 || this.dmove.dy !=0 || this.dmove.dAngZ !=0
	}
	
	this.isZeroState = function () {
		// check if hexapod legs returned to zero state
		for (var i = 0; i < this.hexapod.legs.length; i++) {
			var ID = this.hexapod.legs[i];
			var tmp = this.preCalculcate({
					x: 0,
					y: 0,
					z: 0,
					AngZ: 0
				}, ID);
			if (!this.isLegSamePosition(ID, tmp.leg[ID])) {
				return false
			}
		}
		return true;
	}
	
	this.startMove = function () {
		this.dmove.inProgress = true;
	}
	
	this.stopMove = function () {
		this.dmove.inProgress = false;
	}
	
	this.move = function() {
		this.dmove.dAngZ = this.moveData.AngZ*this.dmove.angspeed;

		this.dmove.dx = this.moveData.x*this.dmove.speed;
		this.dmove.dy = this.moveData.y*this.dmove.speed;
		if (this.isInMove() || !this.isAllLegsOnGround()) {
			//console.log("DBGMOVE", this.moveData, this.dmove.dx, this.dmove.dy, this.dmove.dAngZ);
			this.startMove();
		} else {
			this.stopMove();
		}
	}


	this.movetoNextGaitUpdateLeg = function (ID) {
		if (this.dmove.leg[ID].inProgress) {
			var g_move_progress = this.dmove.leg[ID].current_subgaitstep / this.dmove.leg[ID].subgaitsteps;
			if (this.isLegOutOfLimits(ID) && !this.state.leg[ID].restoring) {
				// don't move leg any more, just put it on the ground
				// TODO this is a little bit useless, as Z axis still in calculate and it can cause and issue
				// recalculate nearest (default to make it simple, later this should find available position near default) safe position on the ground and move leg to it
				var tmp = this.preCalculcate({
						x: 0,
						y: 0,
						z: 0,
						AngZ: 0
					}, ID);
				// set new deltas for leg to move to the safe position ASAP
				//if (g_move_progress > 0.7) {
					// as most the gait finished, it is better to restart gait
					//this.dmove.current_smooth = 0;
					//this.dmove.leg[ID].subgaitsteps = 0;
				//}
				this.dmove.leg[ID].dx = (tmp.leg[ID].x - this.state.leg[ID].x) / (this.dmove.leg[ID].subgaitsteps - this.dmove.leg[ID].current_subgaitstep);
				this.dmove.leg[ID].dy = (tmp.leg[ID].y - this.state.leg[ID].y) / (this.dmove.leg[ID].subgaitsteps - this.dmove.leg[ID].current_subgaitstep);
				this.state.leg[ID].restoring = true;
			} else {
				this.state.leg[ID].x += this.dmove.leg[ID].dx;
				this.state.leg[ID].y += this.dmove.leg[ID].dy;
			}

			// Z axis on flat surface will use y=-(2*x-1)^2+1
			// this will get us `x` [0...1] where `y` will be `0` to `1` to `0`, looks like perfect (and simple!) for leg 
			// as in the middle it will be max and zeros at the begin and end
			this.state.leg[ID].z = (-Math.pow(2*g_move_progress-1,2)+1) * this.dmove.leg[ID].gait_z + this.dmove.leg[ID].ground_z;
			this.checkLegOnTheGround(ID);
		}
	}
	
	this.moveToNextGait = function () {
		
		// TODO check center of gravity (GC) somewhere there by legs on the ground
		// if GC is too ouside of safe boundaries, don't move leg and/or put some/all of it to the ground
		
		//this.checkBalance();

		for (var i = 0; i < this.hexapod.legs.length; i++) {
			var ID = this.hexapod.legs[i];
			var leg_steps = this.hexapod.config.gait[this.dmove.gaitTypeID].sequence[parseInt(this.dmove.current_gaitstep)][ID];
			
			if (this.dmove.leg[ID].inProgress) {
				if (this.dmove.leg[ID].current_subgaitstep < this.dmove.leg[ID].subgaitsteps) {
					// continue gait
					this.dmove.leg[ID].current_subgaitstep++;
					this.movetoNextGaitUpdateLeg(ID);
				} else {
					// gait finished
					this.dmove.leg[ID].subgaitsteps = false;
					this.dmove.leg[ID].current_subgaitstep = false;
					this.dmove.leg[ID].inProgress = false;	// looks like the same
					this.state.leg[ID].restoring = false;
				}
			}

			if (leg_steps > 0) {
				if (!this.dmove.leg[ID].inProgress) {
					var tmp = this.preCalculcate({
							x: this.dmove.dx/this.hexapod.config.gait[this.dmove.gaitTypeID].deltaStep,
							y: this.dmove.dy/this.hexapod.config.gait[this.dmove.gaitTypeID].deltaStep,
							z: 0,
							AngZ: this.dmove.dAngZ
						}, ID);

					if (!this.isLegSamePosition(ID, tmp.leg[ID])
						&& (!this.isSomeLegsOutOfLimits() || this.isLegOutOfLimits(ID) )
					) {
						// begin gait
						this.dmove.leg[ID].inProgress = true;
						this.dmove.leg[ID].current_subgaitstep = 0;
						this.dmove.leg[ID].gait_z = this.dmove.gait_z;
						this.dmove.leg[ID].ground_z = this.tmp_ground;
						this.dmove.leg[ID].subgaitsteps = parseInt(this.dmove.smooth)*leg_steps;

						this.dmove.leg[ID].dx = (tmp.leg[ID].x - this.state.leg[ID].x) / this.dmove.leg[ID].subgaitsteps;
						this.dmove.leg[ID].dy = (tmp.leg[ID].y - this.state.leg[ID].y) / this.dmove.leg[ID].subgaitsteps;
					} else {
						this.dmove.current_smooth = this.dmove.smooth;	// this will skip this gait
					}
				}
			}
		}
		this.dmove.current_smooth++;
		if (this.dmove.current_smooth >= this.dmove.smooth) {
			this.dmove.current_smooth = 0;
			this.dmove.current_gaitstep++;
			if (this.dmove.current_gaitstep >= this.dmove.gaitsteps) {
				this.dmove.current_gaitstep = 0;
			}
		}

		if (this.isAllLegsOnGround() && !this.isInMove()) {
			if (this.isZeroState()) {
				this.stopMove();
			}
		}
	}
	
	this.moveToNext = function () {
		if (this.dmove.inProgress) {
			//console.log("DBG", "move");
			this.state.body.AngZ += this.dmove.dAngZ/this.dmove.gaitsteps;
			this.state.body.AngZ = this._degNorm(this.state.body.AngZ);

			// TODO check if some of this value can be precalculated before
			var _tmp_cos = Math.cos(this._deg2rad(this.state.body.AngZ));
			var _tmp_sin = Math.sin(this._deg2rad(this.state.body.AngZ));
			if (!this.isSomeLegsOutOfLimits()) {
				// don't move body if some legs out of limit
				this.state.body.x += (this.dmove.dx/this.dmove.totalsteps)*_tmp_cos - (this.dmove.dy/this.dmove.totalsteps)*_tmp_sin;
				this.state.body.y += (this.dmove.dx/this.dmove.totalsteps)*_tmp_sin + (this.dmove.dy/this.dmove.totalsteps)*_tmp_cos;
			}
			
			this.moveToNextGait();
			this.update();
			
			this.msgOut({ ID: this.ID, event: this.ID+'/State', message: this.state});
		} else {
			// ping
		}
	}
	
	// https://hackaday.io/project/21904-hexapod-modelling-path-planning-and-control
	// https://hackaday.io/project/21904-hexapod-modelling-path-planning-and-control/log/62326-3-fundamentals-of-hexapod-robot
	this.checkBalance = function () {
		// body should be inside of leg_on_the_ground polygon
		// TODO optimize
		var supportedPolygon = [];
		var supportedPolygonFlat = [];
		for (var i = 0; i < this.hexapod.legs.length; i++) {
			var ID = this.hexapod.legs[i];
			if (this.state.leg[ID].on_ground) {
				supportedPolygon.push({
					ID: ID, 
					x: parseFloat(this.state.leg[ID].x), 
					y: parseFloat(this.state.leg[ID].y), 
				});
				supportedPolygonFlat.push([parseFloat(this.state.leg[ID].x), parseFloat(this.state.leg[ID].y)]);
			}
		}
		supportedPolygonFlat = polygon(supportedPolygonFlat);
		var legsOnTheGround = supportedPolygon.length;
		if (legsOnTheGround => 3) {
			// al least 3 legs on the ground!
			var supportedPolygonCenter = {
				x: 0,
				y: 0,
			};
			
			for (var i = 0; i < legsOnTheGround; i++) {
				supportedPolygonCenter.x += supportedPolygon[i].x;
				supportedPolygonCenter.y += supportedPolygon[i].y;
			}
			supportedPolygonCenter.x = supportedPolygonCenter.x/legsOnTheGround;
			supportedPolygonCenter.y = supportedPolygonCenter.y/legsOnTheGround;
			
			var stableDistance = Math.sqrt( Math.pow(this.state.body.x - supportedPolygonCenter.x, 2) + Math.pow(this.state.body.y - supportedPolygonCenter.y, 2));
			/*console.log("DBG stable distance", 
				stableDistance, 
				{ 
					x: this.state.body.x, 
					y: this.state.body.y, 
				}, 
				supportedPolygonFlat,
				supportedPolygonCenter, 
				legsOnTheGround, 
				{ 
					x: this.state.body.x - supportedPolygonCenter.x,  
					y: this.state.body.y - supportedPolygonCenter.y,  
				},
				insidePolygon([this.state.body.x, this.state.body.y], supportedPolygonFlat)	// does not looks like correct, probably something wrong with polygon points
			);*/
		}
		return false;
	}
}
