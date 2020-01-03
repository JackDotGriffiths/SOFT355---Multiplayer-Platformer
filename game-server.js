var http = require('http');

var finalhandler = require('finalhandler');
var serveStatic = require('serve-static');

var serve = serveStatic("./");

var server = http.createServer(function(req, res) {
  var done = finalhandler(req, res);
  serve(req, res, done);
});

server.listen(9000, function() {
  console.log("Listening on " + 9000);
  createLevel();
});

var levelLength = 100;
var level = "1";



function createLevel(){
  for (var i = 0; i < levelLength; i++) {
    var randomInt = Math.floor(Math.random() * Math.floor(5)) + 1;
    level += randomInt.toString();
  }
  console.log(level);
}
