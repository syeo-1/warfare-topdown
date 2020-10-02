var express = require('express');
var app = express.Router();
app.get('/', function (req, res) {
    console.log("index")
    res.sendFile(__dirname + '/index.html');
  });

  module.exports = app;