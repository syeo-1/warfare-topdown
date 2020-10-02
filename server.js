var express = require('express');
var path = require('path');
// global.app_root = path.resolve(__dirname);

// var query = require("./query");
// var port = process.env.PORT || 5001;
// var cors = require('cors')

var app = express();
var server = require('http').Server(app);
var io = require('socket.io').listen(server);
app.use(express.static(__dirname + '/public'));

// app.use('*', cors())
// app.use(express.json());


// app.use("/", require("./routes/get"));
// app.use("/", require("./routes/post"));
// app.use("/", require("./routes/patch"));
// app.use("/", require("./routes/delete"));
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
  });


io.on('connection', function (socket) {
console.log('a user connected');
socket.on('disconnect', function () {
    console.log('user disconnected');
});
});

server.listen(8081, function () {
    console.log(`Listening on ${server.address().port}`);
});
 
