//HTTP and Express used to create the server
var http = require('http');
var express = require('express');

//FileHander used to ensure correct files are served
var finalhandler = require('finalhandler');
var serveStatic = require('serve-static');

//Microtime used to ensure accurate ticks on the server for procedural generation
var microtime = require('microtime');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io').listen(server);

//Mongoose used to control connection to MongoDB for highscore storage on the database.
var mongoose = require('mongoose');
//const uri = "mongodb+srv://gameServer:la3hStfpuh5hdGvh@cluster0-5gxvf.mongodb.net/SOFT356?retryWrites=true&w=majority";
const uri = "mongodb+srv://gameServer:gameServerUser@cluster0-5gxvf.mongodb.net/test?retryWrites=true&w=majority"
mongoose.connect(uri, {useNewUrlParser: true, useUnifiedTopology : true});
const db = mongoose.connection;
db.on("error", () => {
    console.log("> Error occurred from the database");
});
db.once("open", () => {
    console.log("> Successfully connected to the database");
});
const schema = {
  playerSocket : { type: mongoose.SchemaTypes.String, required: true },
  playerName: { type: mongoose.SchemaTypes.String, required: true },
  playerScore : { type: mongoose.SchemaTypes.Number, required: true }
};
const collectionName = "highscores";
const scoreSchema = mongoose.Schema(schema);
const ScoreModel = mongoose.model(collectionName,scoreSchema);
var ScoreList = [];

//module.exports.Entry = Entry;
var serve = serveStatic("./");
var currentLevel = 1;
var nextLevel = 2;
var previousTime;

//Multiplayer
var players = {};
var cameraPosition = 0;
var highscore1;
var highscore2;
var highscore3;

app.use(express.static('./'));//Serving static file

//Websockets used to control Multiplayer elements of gameplay.
io.on('connection', function(socket){
  var possibleNames = ["Koala","Giraffe","Hippo","Gorilla","Elephant","Frog","Cobra","Aardvark","Quoka","Bison","Lion","Deer","Camel","Whale","Mongoose","David"];
  var randomInt = Math.floor(Math.random() * Math.floor(possibleNames.length));
  players[socket.id] = {
    playerId : socket.id,
    playerName : possibleNames[randomInt]
  };
  console.log('+ PLAYER CONNECTED + ' + players[socket.id].playerName + ' has connected from ' + socket.id);
  socket.emit('currentPlayers', players);
  socket.broadcast.emit('newPlayer', players[socket.id]);

  socket.on('camPosRequest',function(){
    io.emit('camPos',cameraPosition);
  })

  socket.on('disconnect', function(){
  console.log('- PLAYER DISCONNECTED - '+ players[socket.id].playerName +' has disconnected from ' + socket.id)
  delete players[socket.id];
  io.emit('disconnect',socket.id);
  })

  socket.on('playerMovement',function(movementData){
    players[socket.id].x = movementData.x;
    players[socket.id].y = movementData.y;
    socket.broadcast.emit('playerMoved',players[socket.id]);
  })

  socket.on('sendScore',function(playerData){
    //console.log("Store the score of " + playerData.socket + " name of " + playerData.name + " score of " + playerData.score)
    saveScoreToDatabase(playerData.socket,playerData.name,playerData.score);
  })


})
server.listen(9000, function() { //Listener for specified port
    previousTime = microtime.now();
    setInterval(createLevel,100);
    setInterval(incrementCamera,2);
    console.log("> Server running at: http://localhost:" + 9000)
});
app.get('/data', function(req, res) {
  res.send(nextLevel.toString());
});
app.get('/highscore1',function(req,res){
  res.send(highscore1);
});
app.get('/highscore2',function(req,res){
  res.send(highscore2);
});
app.get('/highscore3',function(req,res){
  res.send(highscore3);
});

function saveScoreToDatabase(socketID,playerName,playerScore){
  ScoreModel.create({
    playerSocket : socketID,
    playerName : playerName,
    playerScore : playerScore
  });
  console.log("-> SCORE SAVED <- Socket : " + socketID + " | Player Name : " + playerName + " | Player Score : " + playerScore);
  ScoreModel.find({}).sort('-playerScore').exec(function(err,ScoreModels){
    ScoreList = ScoreModels;
    highscore1 = "#1 : " + ScoreList[1].playerScore + " - " + ScoreList[1].playerName + " (" + ScoreList[1].playerSocket + ")";
    highscore2 = "#2 : " + ScoreList[2].playerScore + " - " + ScoreList[2].playerName + " (" + ScoreList[2].playerSocket + ")";
    highscore3 = "#3 : " + ScoreList[3].playerScore + " - " + ScoreList[3].playerName + " (" + ScoreList[3].playerSocket + ")";
    console.log(highscore1);
    console.log(highscore2);
    console.log(highscore3);
  });


}


function incrementCamera(){
  cameraPosition += 0.5;
}
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
    console.log("     -> GENERATING <- Incoming section : " + nextLevel + " | Delay : " + difference + " ticks | Discrepancy : " + discrepancy + " | Camera Position : " + cameraPosition);
    previousTime = microtime.now();
  }
}
