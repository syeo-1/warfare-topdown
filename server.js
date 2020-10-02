var express = require('express');
var path = require('path');
// global.app_root = path.resolve(__dirname);

// var query = require("./query");
// var port = process.env.PORT || 5001;
// var cors = require('cors')
var players = {};

var app = express();
var server = require('http').Server(app);
var io = require('socket.io').listen(server);
app.use(express.static(__dirname + '/public'));

// app.use('*', cors())
// app.use(express.json());


app.use("/", require("./endpoints/get"));
// app.use("/", require("./routes/post"));
// app.use("/", require("./routes/patch"));
// app.use("/", require("./routes/delete"));



io.on('connection', function (socket) {
    console.log('a user connected');
    players[socket.id] = {
        rotation: 0,
        x: Math.floor(Math.random() * 700) + 50,
        y: Math.floor(Math.random() * 500) + 50,
        playerId: socket.id,
        team: (Math.floor(Math.random() * 2) == 0) ? 'red' : 'blue'
      };
    // send the players object to the new player
    socket.emit('currentPlayers', players);
    // update all other players of the new player
    socket.broadcast.emit('newPlayer', players[socket.id]);
    socket.on('disconnect', function () {
        console.log('user disconnected');
        delete players[socket.id];
        // emit a message to all players to remove this player
        io.emit('disconnect', socket.id);
    });
});

server.listen(8081, function () {
    console.log(`Listening on ${server.address().port}`);
});
 
