var http = require('http');
var express = require('express');
var finalhandler = require('finalhandler');
var serveStatic = require('serve-static');

var serve = serveStatic("./");
var app = express();
var currentLevel = "1";
var nextLevel = "2";


app.use(express.static('./'));//Serving static file

app.listen(9000, function() { //Listener for specified port
    //setInterval(createLevel,1500);
    console.log("Server running at: http://localhost:" + 9000)
});


app.get('/data', function(req, res) {
    res.send(nextLevel)
});

function createLevel(){
  currentLevel = nextLevel;
  var randomInt = Math.floor(Math.random() * Math.floor(5)) + 1;
  nextLevel = randomInt;
  console.log("Current Level is " + currentLevel + ". Next Level is " + nextLevel);
}
