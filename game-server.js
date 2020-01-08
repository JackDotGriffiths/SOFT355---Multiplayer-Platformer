var express = require('express');//HTTP and Express used to create the server
var serveStatic = require('serve-static');//FileHander used to ensure correct files are served
var microtime = require('microtime');//Microtime used to ensure accurate ticks on the server for procedural generation
var app = express();
var server = require('http').Server(app);
var io = require('socket.io').listen(server);
var mongoose = require('mongoose');//Mongoose used to control connection to MongoDB for highscore storage on the database.
var bodyParser = require("body-parser");

app.use(bodyParser.urlencoded({extended:true}));


//module.exports.Entry = Entry;
var currentLevel = 1;
var nextLevel = 2;
var previousCamPos = 0;
var previousTime = 0;

//Multiplayer
var possibleNames = ["Koala","Giraffe","Hippo","Gorilla","Elephant","Frog","Cobra","Aardvark","Quoka","Bison","Lion","Deer","Camel","Whale","Mongoose","David","Moose"];
var players = {};
var cameraPosition = 0;
var highscore1 = "#1 - No Data Available";
var highscore2 = "#2 - No Data Available";
var highscore3 = "#3 - No Data Available";




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

app.use(express.static('./'));//Serving static file

//Websockets used to control Multiplayer elements of gameplay.
io.on('connection', function(socket){
  var randomInt = Math.floor(Math.random() * Math.floor(possibleNames.length));
  players[socket.id] = {
    playerId : socket.id,
    playerName : possibleNames[randomInt],
    roomCode : "NONE"
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
    //Send the score to the database.
    saveScoreToDatabase(playerData.socket,playerData.name,playerData.score);
  })

  socket.on('updateScores',function(){
    //Requests the highscores from the database.
    socket.broadcast.emit('updateHighscores');
  })

  socket.on('changeRoomCode',function(roomRequest){
    //changes the room code for the current player.
    players[socket.id].roomCode = roomRequest.roomCode;
    console.log('# JOINING ROOM # '+ players[socket.id].playerName +' ('+ players[socket.id].playerId + ') is joining room ' + roomRequest.roomCode)
    socket.broadcast.emit('updateRoomPlayers', players);
    socket.emit('updateRoomCode', players);
    //players[roomRequest.playerSocket].roomCode = roomRequest.roomCode;
  })

})


server.listen(9000, function() { //Listener for specified port
    previousTime = microtime.now();
    previousCamPos = cameraPosition;
    setInterval(incrementCamera,2);
    console.log("> Server running at: http://localhost:" + 9000)
});


app.get('/data', function(req, res) {
  res.send(nextLevel.toString());
});
app.get('/highscore1',function(req,res){
  res.send(highscore1.toString());
});
app.get('/highscore2',function(req,res){
  res.send(highscore2.toString());
});
app.get('/highscore3',function(req,res){
  res.send(highscore3.toString());
});

app.post('/testConnect/',function(req,res){
  connectNoEmit(req,res);
})

function saveScoreToDatabase(socketID,playerName,playerScore){
  ScoreModel.create({
    playerSocket : socketID,
    playerName : playerName,
    playerScore : playerScore
  });
  console.log("-> SCORE SAVED <- Socket : " + socketID + " | Player Name : " + playerName + " | Player Score : " + playerScore);
  updateHighscores();

}
function updateHighscores(){
  ScoreModel.find({}).sort('-playerScore').exec(function(err,ScoreModels){
    ScoreList = ScoreModels;
    highscore1 = "#1 : " + ScoreList[0].playerScore + " - " + ScoreList[0].playerName + " (" + ScoreList[1].playerSocket + ")";
    highscore2 = "#2 : " + ScoreList[1].playerScore + " - " + ScoreList[1].playerName + " (" + ScoreList[2].playerSocket + ")";
    highscore3 = "#3 : " + ScoreList[2].playerScore + " - " + ScoreList[2].playerName + " (" + ScoreList[3].playerSocket + ")";
    // console.log(highscore1);
    // console.log(highscore2);
    // console.log(highscore3);
  });
}
function incrementCamera(){
  cameraPosition += 0.6;
  createLevel();
}
function createLevel(){
  var difference = cameraPosition-previousCamPos;
  var differenceTicks = microtime.now()-previousTime;
  if (difference >= 1200){
    updateHighscores();
    previousTime = microtime.now();
    currentLevel = nextLevel;
    var randomInt = Math.floor(Math.random() * Math.floor(5)) + 1;
    do{
      randomInt = Math.floor(Math.random() * Math.floor(5)) + 1;
    }
    while(randomInt == currentLevel);
    nextLevel = randomInt;
    previousCamPos = cameraPosition;
    var discrepancy  = differenceTicks - 4000000;
    if (discrepancy > 1500000){
      console.log("-------------------------------------------------------------------------------");
      console.log("-> SERVER DELAY <- Warning: Discrepancy of " + discrepancy + " ticks detected. ");
      console.log("-------------------------------------------------------------------------------");
      //If there's serious delay, just spawn the normal floor platform.
      nextLevel = "0";
      previousTime = microtime.now();
    }
  }
}



//Testing
function connectNoEmit(req, res)
{
  socket = {};
  socket.id = req.body.id;
  players[socket.id] =
  {
      playerId: socket.id,
      playerName : "TestName",
      roomCode : "NONE"
  }
  res.send(players);
}
