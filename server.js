'use strict';

// Module imports
var restify = require('restify')
  , queue = require('block-queue')
  , log = require('npmlog-ts')
  , commandLineArgs = require('command-line-args')
  , getUsage = require('command-line-usage')
;

log.timestamp = true;

// Initialize input arguments
const optionDefinitions = [
  { name: 'eventserver', alias: 's', type: String },
  { name: 'demozone', alias: 'd', type: String },
  { name: 'help', alias: 'h', type: Boolean },
  { name: 'verbose', alias: 'v', type: Boolean, defaultOption: false }
];

const sections = [
  {
    header: 'IoT Racing - Event Client',
    content: 'Event listener to IoT Racing events'
  },
  {
    header: 'Options',
    optionList: [
      {
        name: 'eventserver',
        typeLabel: '[underline]{ipaddress:port}',
        alias: 's',
        type: String,
        description: 'socket.io server IP address/hostname and port'
      },
      {
        name: 'demozone',
        typeLabel: '[underline]{demozone}',
        alias: 'd',
        type: String,
        description: 'Demo zone events to subscribe to'
      },
      {
        name: 'verbose',
        alias: 'v',
        description: 'Enable verbose logging.'
      },
      {
        name: 'help',
        alias: 'h',
        description: 'Print this usage guide.'
      }
    ]
  }
]
var options = undefined;

try {
  options = commandLineArgs(optionDefinitions);
} catch (e) {
  console.log(getUsage(sections));
  console.log(e.message);
  process.exit(-1);
}

if (options.help) {
  console.log(getUsage(sections));
  process.exit(0);
}

if (!options.eventserver || !options.demozone) {
  console.log(getUsage(sections));
  process.exit(-1);
}

log.level = (options.verbose) ? 'verbose' : 'info';

const demozone = options.demozone.toLowerCase();

// Initializing REST client BEGIN
var client = restify.createJsonClient({
  url: 'http://192.168.1.101:3378',
  connectTimeout: 1000,
  requestTimeout: 1000,
  retry: false,
  headers: {
    "content-type": "application/json"
  }
});
// Initializing REST client END

// Initializing QUEUE variables BEGIN
var q = undefined;
var queueConcurrency = 1;
// Initializing QUEUE variables END

// QUEUE definition and handling BEGIN
log.info("", "Initializing QUEUE system");
q = queue(queueConcurrency, (task, done) => {
  // task = { action: "ON|OFF|BLINK|BLINKONCE", light: "Ground Shock|Skull|Guardian|Thermo|ALL", color: "GREEN|RED|BLUE" }
  var URI = "/hue/" + task.light + "/" + task.action + ((task.color) ? "/" + task.color : "");
  client.put(encodeURI(URI), function(err, req, res, obj) {
    if (err) {
      log.error("",err.message);
    }
    done(); // Let queue handle next task
  });
});
log.info("", "QUEUE system initialized successfully");
// QUEUE definition and handling END

var socket = require('socket.io-client')('http://' + options.eventserver);

// Events to subscribe:
// "speed": get car name and set its light to ON - GREEN
// "highspeed": get car name and set its light to BLINK - GREEN
// "regularspeed": get car name and set its light to ON - GREEN
// "lap: get car name and set its light to BLINKONCE - GREEN
// "offtrack": get car name and set its light to ON - RED
// "race": check if status == "STOPPED" and turn OFF all lights
// "drone": check msg[0].payload.data.status with:
//    "GOING": set drone light to BLINK - GREEN
//    "TAKING PICTURE"; set drone light to BLINKONCE - BLUE
//    "RETURNING"; set drone light to BLINK - GREEN
//    "LANDING"; set drone light to BLINK - GREEN
//    "DOWNLOADING"; set drone light to GREEN
//    "LANDED"; set drone light to OFF

/**
// SPEED
log.info("", "Subscribing to namespace: " + demozone + "," + "speed");
socket.on(demozone + "," + "speed", function(msg, callback) {
  log.verbose("", "Message received: " + JSON.stringify(msg));
  msg.forEach(function(m) {
    if (m.payload.data.data_carname) {
      q.push({ action: "ON", light: m.payload.data.data_carname, color: "GREEN" });
    }
  });
});
**/
// HIGHSPEED
log.info("", "Subscribing to namespace: " + demozone + "," + "highspeed");
socket.on(demozone + "," + "highspeed", function(msg, callback) {
  log.verbose("", "Message received: " + JSON.stringify(msg));
  msg.forEach(function(m) {
    if (m.payload.data.data_carname) {
      q.push({ action: "BLINK", light: m.payload.data.data_carname, color: "GREEN" });
    }
  });
});
// REGULARSPEED
log.info("", "Subscribing to namespace: " + demozone + "," + "regularspeed");
socket.on(demozone + "," + "regularspeed", function(msg, callback) {
  log.verbose("", "Message received: " + JSON.stringify(msg));
  msg.forEach(function(m) {
    if (m.payload.data.data_carname) {
      q.push({ action: "ON", light: m.payload.data.data_carname, color: "GREEN" });
    }
  });
});
// LAP
log.info("", "Subscribing to namespace: " + demozone + "," + "lap");
socket.on(demozone + "," + "lap", function(msg, callback) {
  log.verbose("", "Message received: " + JSON.stringify(msg));
  msg.forEach(function(m) {
    if (m.payload.data.data_carname) {
      q.push({ action: "BLINKONCE", light: m.payload.data.data_carname, color: "GREEN" });
    }
  });
});
// OFFTRACK
log.info("", "Subscribing to namespace: " + demozone + "," + "offtrack");
socket.on(demozone + "," + "offtrack", function(msg, callback) {
  log.verbose("", "Message received: " + JSON.stringify(msg));
  msg.forEach(function(m) {
    if (m.payload.data.data_carname) {
      q.push({ action: "BLINK", light: m.payload.data.data_carname, color: "RED" });
    }
  });
});
// RACE
log.info("", "Subscribing to namespace: " + demozone + "," + "race");
socket.on(demozone + "," + "race", function(msg, callback) {
  log.verbose("", "Message received: " + JSON.stringify(msg));
  msg.forEach(function(m) {
    if (m.payload.data.raceStatus) {
      if ( m.payload.data.raceStatus === "STOPPED") {
        q.push({ action: "OFF", light: ALL });
      }
    }
  });
});
// DRONE
log.info("", "Subscribing to namespace: " + demozone + "," + "drone");
socket.on(demozone + "," + "drone", function(msg, callback) {
  log.verbose("", "Message received: " + JSON.stringify(msg));
  msg.forEach(function(m) {
    if (m.payload.data.status) {
      if ( m.payload.data.status === "GOING") {
        q.push({ action: "BLINK", light: "drone", color: "GREEN" });
      } else if ( m.payload.data.status === "TAKING PICTURE") {
        q.push({ action: "BLINKONCE", light: "drone", color: "BLUE" });
      } else if ( m.payload.data.status === "RETURNING") {
        q.push({ action: "BLINK", light: "drone", color: "GREEN" });
      } else if ( m.payload.data.status === "LANDING") {
        q.push({ action: "BLINK", light: "drone", color: "GREEN" });
      } else if ( m.payload.data.status === "DOWNLOADING") {
        q.push({ action: "ON", light: "drone", color: "GREEN" });
      } else if ( m.payload.data.status === "LANDED") {
        q.push({ action: "OFF", light: "drone" });
      } else {
        // Should never happen
      }
    }
  });
});

socket.on('connect_error', function(err) {
  log.verbose("","[EVENT] connect_error: " + JSON.stringify(err));
});

socket.on('connect_timeout', function() {
  log.verbose("","[EVENT] Econnect_timeout");
});
socket.on('reconnect', function() {
  log.verbose("","[EVENT] reconnect");
});
socket.on('reconnect_attempt', function(attempt) {
  log.verbose("","[EVENT] reconnect_attempt: " + attempt);
});
socket.on('reconnecting', function() {
  log.verbose("","[EVENT] reconnecting");
});
socket.on('reconnect_error', function(err) {
  log.verbose("","[EVENT] reconnect_error: " + JSON.stringify(err));
});
socket.on('reconnect_failed', function(err) {
  log.verbose("","[EVENT] reconnect_failed: " + JSON.stringify(err));
});
socket.on('ping', function() {
  log.verbose("","[EVENT] Heartbeat");
});
socket.on('connect', function() {
  log.verbose("","[EVENT] connect");
});
socket.on('disconnect', function() {
  log.verbose("","[EVENT] disconnect");
});

// ************************************************************************
// Main code STARTS HERE !!
// ************************************************************************

// Main handlers registration - BEGIN
// Main error handler
process.on('uncaughtException', function (err) {
  log.info("","Uncaught Exception: " + err);
  log.info("","Uncaught Exception: " + err.stack);
});
// Detect CTRL-C
process.on('SIGINT', function() {
  log.info("","Caught interrupt signal");
  log.info("","Exiting gracefully");
  process.exit(2);
});
// Main handlers registration - END
