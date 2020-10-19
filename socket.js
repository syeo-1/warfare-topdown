const sql = require("./SQL_strings");
//const query = require("../queryPool");

const players = {};

exports = module.exports = function(io){
    io.on('connection', function (socket) {
        //update user in database here
        socket.on('ehlo', function(data) {
            console.log(data)
        });
        console.log('a user connected: ', socket.id);
        if(Object.keys(players).length  >= 8){ // no more than 8 players in one game
            // need to create new game here
            var destination = '/';
            socket.emit('redirect', destination);
            return
        }
        var team = "A"; // team A
        var x = 50;
        var y = 20 + (20 * Object.keys(players).length)
        if(Object.keys(players).length % 2 != 0){ // Team B
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
            // text = "select * from users where socket_id = $1"
            // values = [socket.id]
            // query(text, values, (err, result) => { // postgres database test
            //     if (err) {
            //         console.log(err)
            //         return res.status(500).send(err)
            //     }
            //     user = result.rows[0]
            //     if(user.host){
            //         text = "delete from games where game_id = $1;"
            //         values = [user.game_id]
            //     }
            //     else{
            //         text = `with a as (delete from users where user_id = $1)
            //         update games set num_players = num_players - 1 where game_id = $2;`
            //         values = [user.user_id, user.game_id]
            //         query(text, values, (err, result) => { // postgres database test
            //             if (err) {
            //                 console.log(err)
            //                 return res.status(500).send(err)
            //             }
                        console.log('user disconnected: ', socket.id);
                        delete players[socket.id];
                        // emit a message to all players to remove this player
                        io.emit('disconnect', socket.id);
                        
                //     })
                // }
            // }) 
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