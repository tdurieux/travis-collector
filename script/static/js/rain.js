

// initialize
document.addEventListener("DOMContentLoaded", function() {
	demo.init();
	window.addEventListener('resize', demo.resize);
});

// demo namespace
var demo = {
	// CUSTOMIZABLE PROPERTIES
	// - physics speed multiplier: allows slowing down or speeding up simulation
	speed: 1,
	// - color of particles
	color: {
		r: '80',
		g: '175',
		b: '255',
		a: '0.5'
	},
	images: {},
	
	// END CUSTOMIZATION
	// whether demo is running
	started: false,
	// canvas and associated context references
	canvas: null,
	ctx: null,
	// viewport dimensions (DIPs)
	width: 0,
	height: 0,
	// devicePixelRatio alias (should only be used for rendering, physics shouldn't care)
	dpr: window.devicePixelRatio || 1,
	// time since last drop
	drop_time: 0,
	// ideal time between drops (changed with mouse/finger)
	drop_delay: 25,
	// wind applied to rain (changed with mouse/finger)
	wind: -3,
	// color of rain (set in init)
	rain_color: null,
	rain_color_clear: null,
	// rain particles
	rain: [],
	rain_pool: [],
	// rain droplet (splash) particles
	drops: [],
	drop_pool: []
};

// demo initialization (should only run once)
demo.init = function() {
	if (!demo.started) {
		demo.started = true;
		demo.canvas = document.getElementById('canvas');
		demo.ctx = demo.canvas.getContext('2d');
		var c = demo.color;
		demo.rain_color_clear = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',0)';
		demo.resize();
		Ticker.addListener(demo.step);
	}
}

// (re)size canvas (clears all particles)
demo.resize = function() {
	// localize common references
	var rain = demo.rain;
	var drops = demo.drops;
	// recycle particles
	for (var i = rain.length - 1; i >= 0; i--) {
			rain.pop().recycle();
	}
	for (var i = drops.length - 1; i >= 0; i--) {
			drops.pop().recycle();
	}
	// resize
	demo.width = window.innerWidth;
	demo.height = window.innerHeight;
	demo.canvas.width = demo.width * demo.dpr;
	demo.canvas.height = demo.height * demo.dpr;
}

demo.newRain = function (color, repository_slug) {
    var new_rain = new Rain(color, repository_slug);
    new_rain.init();
    var wind_expand = Math.abs(demo.height / new_rain.speed * demo.wind); // expand spawn width as wind increases
    var spawn_x = Math.random() * (demo.width + wind_expand);
    if (demo.wind > 0) spawn_x -= wind_expand;
    new_rain.x = spawn_x;
    demo.rain.push(new_rain);
}
demo.step = function(time, lag) {
	// localize common references
	var demo = window.demo;
	var speed = demo.speed;
	var width = demo.width;
	var height = demo.height;
	var wind = demo.wind;
	var rain = demo.rain;
	var drops = demo.drops;
	
	// multiplier for physics
	var multiplier = speed * lag;
	
	// rain physics
	for (var i = rain.length - 1; i >= 0; i--) {
		var r = rain[i];
		r.y += r.speed * r.z * multiplier;
		r.x += r.z * wind * multiplier;
		// remove rain when out of view
		if (r.y > height) {
			// if rain reached bottom of view, show a splash
			r.splash();
		}
		// recycle rain
		if (r.y > height + Rain.height * r.z || (wind < 0 && r.x < wind) || (wind > 0 && r.x > width + wind)) {
			r.recycle();
			rain.splice(i, 1);
		}
	}
	
	// splash drop physics
	var drop_max_speed = Drop.max_speed;
	for (var i = drops.length - 1; i >= 0; i--) {
		var d = drops[i];
		d.x += d.speed_x * multiplier;
		d.y += d.speed_y * multiplier;
		// apply gravity - magic number 0.3 represents a faked gravity constant
		d.speed_y += 0.3 * multiplier;
		// apply wind (but scale back the force)
		d.speed_x += wind / 25 * multiplier;
		if (d.speed_x < -drop_max_speed) {
			d.speed_x = -drop_max_speed;
		}else if (d.speed_x > drop_max_speed) {
			d.speed_x = drop_max_speed;
		}
		// recycle
		if (d.y > height + d.radius) {
			d.recycle();
			drops.splice(i, 1);
		}
	}
	
	demo.draw();
}

demo.draw = function() {
	// localize common references
	var demo = window.demo;
	var width = demo.width;
	var height = demo.height;
	var dpr = demo.dpr;
	var rain = demo.rain;
	var drops = demo.drops;
	var ctx = demo.ctx;
	
	// start fresh
	ctx.clearRect(0, 0, width*dpr, height*dpr);
	
	// draw rain (trace all paths first, then stroke once)
	
    var rain_height = Rain.height * dpr;
    ctx.lineWidth = Rain.width * dpr;
	for (var i = rain.length - 1; i >= 0; i--) {
        ctx.beginPath();
		var r = rain[i];
		var real_x = r.x * dpr;
		var real_y = r.y * dpr;
		// ctx.moveTo(real_x, real_y);
		// // magic number 1.5 compensates for lack of trig in drawing angled rain
		// ctx.lineTo(real_x - demo.wind * r.z * dpr * 1.5, real_y - rain_height * r.z*2);
		ctx.font = "20px Arial";
		ctx.strokeStyle = r.color;
		ctx.fillStyle = r.color;
		var message = r.job.commit.message.split('\n')[0]
		ctx.fillText(message, real_x, real_y)

		ctx.drawImage(demo.images[r.job.username], real_x - 43, real_y - 30, 40, 40);
        ctx.stroke();
    }
    
	
	
	// draw splash drops (just copy pre-rendered canvas)
	for (var i = drops.length - 1; i >= 0; i--) {
		var d = drops[i];
		var real_x = d.x * dpr - d.radius;
		var real_y = d.y * dpr - d.radius;
		ctx.drawImage(d.canvas, real_x, real_y);
	}
}


// Rain definition
function Rain(job) {
	this.x = 0;
	this.y = 0;
	this.z = 0;
	this.speed = 10;
    this.splashed = false;
	this.job = job;
	this.job.username = job.repository_slug.substring(0, job.repository_slug.indexOf('/'))

	var color = "green"
	if (job.state == "passed") {
		color = ("green");
	} else if (job.state == "failed") {
		color = ("red");
	} else if (job.state == "errored") {
		color = ("blue");
	} else if (job.state == "canceled") {
		color = ("grey");
	} else if (job.state == "started") {
		color = ("orange");
	} else if (job.state == "created") {
		color = ("yellow");
	} else if (job.state == "received") {
		color = ("purple");
	} else if (job.state == "queued") {
		color = ("purple");
	}

	this.color = colors[color]
}
Rain.width = 2;
Rain.height = 40;
Rain.prototype.init = function() {
	this.y = Math.random() * -100;
	this.z = Math.random() * 0.5 + 0.5;
	this.splashed = false;
}
Rain.prototype.recycle = function() {
	
}
// recycle rain particle and create a burst of droplets
Rain.prototype.splash = function() {
	if (!this.splashed) {
		this.splashed = true;
		var drops = demo.drops;

		for (var i=0; i<50; i++) {
			var drop = new Drop(this.color);
			drops.push(drop);
			drop.init(this.x);
		}
	}
}


// Droplet definition
function Drop(color) {
	this.x = 0;
	this.y = 0;
	this.radius = Math.round(Math.random() * 2 + 2) * demo.dpr;
	this.speed_x = 0;
	this.speed_y = 0;
	this.canvas = document.createElement('canvas');
	this.ctx = this.canvas.getContext('2d');
	
	// render once and cache
	var diameter = this.radius * 2;
	this.canvas.width = diameter;
	this.canvas.height = diameter;

	var grd = this.ctx.createRadialGradient(this.radius, this.radius , 1, this.radius, this.radius, this.radius);
	grd.addColorStop(0, color);
	grd.addColorStop(1, color.replace('rgb', 'rgba').replace(')', ', 0)'));
	this.ctx.fillStyle = grd;
	this.ctx.fillRect(0, 0, diameter, diameter);
}

Drop.max_speed = 7;

Drop.prototype.init = function(x) {
	this.x = x;
	this.y = demo.height;
	var angle = Math.random() * Math.PI - (Math.PI * 0.5);
	var speed = Math.random() * Drop.max_speed;
	this.speed_x = Math.sin(angle) * speed;
	this.speed_y = -Math.cos(angle) * speed;
}
Drop.prototype.recycle = function() {
	
}



// Frame ticker helper module
var Ticker = (function(){
	var PUBLIC_API = {};

	// public
	// will call function reference repeatedly once registered, passing elapsed time and a lag multiplier as parameters
	PUBLIC_API.addListener = function addListener(fn) {
		if (typeof fn !== 'function') throw('Ticker.addListener() requires a function reference passed in.');

		listeners.push(fn);

		// start frame-loop lazily
		if (!started) {
			started = true;
			queueFrame();
		}
	};

	// private
	var started = false;
	var last_timestamp = 0;
	var listeners = [];
	// queue up a new frame (calls frameHandler)
	function queueFrame() {
		if (window.requestAnimationFrame) {
			requestAnimationFrame(frameHandler);
		} else {
			webkitRequestAnimationFrame(frameHandler);
		}
	}
	function frameHandler(timestamp) {
		var frame_time = timestamp - last_timestamp;
		last_timestamp = timestamp;
		// make sure negative time isn't reported (first frame can be whacky)
		if (frame_time < 0) {
			frame_time = 17;
		}
		// - cap minimum framerate to 15fps[~68ms] (assuming 60fps[~17ms] as 'normal')
		else if (frame_time > 68) {
			frame_time = 68;
		}

		// fire custom listeners
		for (var i = 0, len = listeners.length; i < len; i++) {
			listeners[i].call(window, frame_time, frame_time / 16.67);
		}
		
		// always queue another frame
		queueFrame();
	}

	return PUBLIC_API;
}());



var colors = chartColors = {
	red: 'rgb(255, 99, 132)',
	orange: 'rgb(255, 159, 64)',
	yellow: 'rgb(255, 205, 86)',
	green: 'rgb(75, 192, 192)',
	blue: 'rgb(54, 162, 235)',
	purple: 'rgb(153, 102, 255)',
	grey: 'rgb(201, 203, 207)',
	darkBlue: 'rgb(75, 143, 192)',
	darkRed: 'rgb(171, 60, 83)',
	darkOrange: 'rgb(206, 104, 44)'
}

var host = window.location.hostname;
if (window.location.port) {
    host += ":" + window.location.port;
}
var protocol = "ws";
if (window.location.protocol == "https:") {
    protocol = "wss";
}
var ws = null;
var onmessage = function (e) {
	if (e.data[0] != '{') {
		return
	}
	(function (event) { 
		setTimeout(function () {
			event.data.username = event.data.repository_slug.substring(0, event.data.repository_slug.indexOf('/'))
			if (!demo.images[event.data.username]) {
				var myImg = new Image();
				myImg.src = 'https://github.com/' + event.data.username + '.png?size=40';
				demo.images[event.data.username] = myImg
			}
			demo.newRain(event.data)
		}, Math.round(Math.random() * 5000))
	})(JSON.parse(e.data));
};
function startWS(){
    ws = new WebSocket(protocol + '://' + host);
    if (onmessage != null) {
        ws.onmessage = onmessage;
    }
    ws.onclose = function(){
        // Try to reconnect in 5 seconds
        setTimeout(function(){startWS()}, 5000);
    };
}
startWS();