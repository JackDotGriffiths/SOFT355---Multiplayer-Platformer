var http = require('http');
var express = require('express');
var finalhandler = require('finalhandler');
var serveStatic = require('serve-static');
var microtime = require('microtime');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io').listen(server);


var serve = serveStatic("./");
var currentLevel = 1;
var nextLevel = 2;
var previousTime;

//Multiplayer
var players = {};


app.use(express.static('./'));//Serving static file

io.on('connection', function(socket){
  var possibleNames = ["Koala","Giraffe","Hippo","Gorilla","Elephant","Frog"];
  var randomInt = Math.floor(Math.random() * Math.floor(possibleNames.length));
  players[socket.id] = {
    playerId : socket.id,
    playerName : possibleNames[randomInt]
  };
  console.log('+ PLAYER CONNECTED + ' + players[socket.id].playerName + ' has connected from ' + socket.id);
  socket.emit('currentPlayers', players);
  socket.broadcast.emit('newPlayer', players[socket.id]);

  socket.on('disconnect', function(){
  console.log('- PLAYER DISCONNECTED - A user has disconnected from ' + socket.id)
  delete players[socket.id];
  io.emit('disconnect',socket.id);
  })
})

server.listen(9000, function() { //Listener for specified port
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
    console.log("     -> GENERATING- Incoming section : " + nextLevel + " | Delay : " + difference + " ticks | Discrepancy : " + (difference -5000000));
    previousTime = microtime.now();
  }
}
