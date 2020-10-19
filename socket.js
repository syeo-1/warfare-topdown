const players = {};

exports = module.exports = function(io){
    io.on('connection', function (socket) {
        console.log('a user connected: ', socket.id);
        if(Object.keys(players).length  >= 8){ // no more than 8 players in one game
            // need to create new game here
            var destination = '/';
            socket.emit('redirect', destination);
            return
        }
        var team = "A";
        var x = 50;
        var y = 20 + (20 * Object.keys(players).length)
        if(Object.keys(players).length % 2 != 0){ // alternate teams
            team = "B" 
            x = 200
            y = 20 + (20 * (Object.keys(players).length - 1))
        }
        console.log(team)
        
        // create a new player and add it to Team A 
        players[socket.id] = {
            flipX: false,
            x: x,
            y: y, // spread out new users
            playerId: socket.id,
            team: team
        };
        // POST REQUEST TO SAVE USER IN DATABASE
    
        
        // send the players object to the new player
        socket.emit('currentPlayers', players);
        // update all other players of the new player
        socket.broadcast.emit('newPlayer', players[socket.id]);
  
        // when a player disconnects, remove them from our players object
        socket.on('disconnect', function () {
            console.log('user disconnected: ', socket.id);
            delete players[socket.id];
            // emit a message to all players to remove this player
            io.emit('disconnect', socket.id);
        });
    
        // when a plaayer moves, update the player data
        socket.on('playerMovement', function (movementData) {
            players[socket.id].x = movementData.x;
            players[socket.id].y = movementData.y;
            players[socket.id].flipX = movementData.flipX;
            // emit a message to all players about the player that moved
            socket.broadcast.emit('playerMoved', players[socket.id]);
        });
    });
}