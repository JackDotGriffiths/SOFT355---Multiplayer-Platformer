const http = require('http');
const hostname = '127.0.0.1';
const port = 9000;
const express = require('express');
const app = new express();
var path = require('path');

app.use(express.static(path.join(__dirname + '/assets/')));

app.get('/', function(req, res) {
    console.log(`Server running at http://${hostname}:${port}/`);
    res.sendFile(path.join(__dirname + '/index.html'));
 });

app.listen(port);
