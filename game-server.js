var http = require('http');
var express = require('express');
var finalhandler = require('finalhandler');
var serveStatic = require('serve-static');
var microtime = require('microtime');

var serve = serveStatic("./");
var app = express();
var currentLevel = 1;
var nextLevel = 2;
var previousTime;


app.use(express.static('./'));//Serving static file

app.listen(9000, function() { //Listener for specified port
    previousTime = microtime.now();
    setInterval(createLevel,100);
    console.log("Server running at: http://localhost:" + 9000)
});


app.get('/data', function(req, res) {
  res.send(nextLevel.toString());
});

function createLevel(){ // Generates the id for the next level.
  var difference = microtime.now()-previousTime;
  //If there has been enough ticks since the previous execution, This keeps the game timing consistant.
  if(difference >= 5000000){
    previousTime = microtime.now();
    currentLevel = nextLevel;
    var randomInt = Math.floor(Math.random() * Math.floor(5)) + 1;
    do{
      randomInt = Math.floor(Math.random() * Math.floor(5)) + 1;
    }
    while(randomInt == currentLevel);
    nextLevel = randomInt;

    var discrepancy  = difference - 5000000;
    if (discrepancy > 70000){
      console.log("-------------------------------------------------------------------------------");
      console.log("-> SERVER DELAY <- Warning: Discrepancy of " + discrepancy + " ticks detected. ");
      console.log("-------------------------------------------------------------------------------");
    }
    console.log("-GENERATING- Incoming section " + nextLevel + " | Delay of " + difference + " ticks | Discrepancy of " + (difference -5000000));
    previousTime = microtime.now();
  }
}
