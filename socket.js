const sql = require("./SQL_strings");
const query = require("./queryPool");

const players = {};
const bullets = [];

exports = module.exports = function(io){
    io.on('connection', function (socket) {
        //update user in database here
        socket.on('new_player', function(data) {
                
            console.log('a user connected: ', socket.id);
            console.log(data)
            var text  = `select * from users where user_id = $1 and game_id = $2` // check to see if user in_game already
            var values = [data.user_id, data.game_id]
            query(text, values, (err, result) => { 
                if (err) {
                    return console.log(err)
                }
                if(result.rows[0].in_game){ // user in game already, redirect to home page
                    var destination = '/';
                    socket.emit('redirect', destination);
                    return
                }
                
                
                if(Object.keys(players).length  >= 8){ // need to create new game here
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
                    team: team,
                    user_id: data.user_id,
                    game_id: data.game_id
                };
                // UPDATE REQUEST TO SAVE USER IN DATABASE
                text  = `update users set team = $1, socket_id = $2, in_game = true where user_id = $3 and game_id = $4;`
                values = [team, socket.id, data.user_id, data.game_id]
                query(text, values, (err, result) => { // postgres database test
                    if (err) {
                        return console.log(err)
                    }
                })

                // send the players object to the new player
                socket.emit('currentPlayers', players);
                // update all other players of the new player
                socket.broadcast.emit('newPlayer', players[socket.id]);
            })
        
            
            
        });
        // when a player disconnects, remove them from our players object
        socket.on('disconnect', function () {
            console.log('user disconnected: ', socket.id);
            var text = "select * from users inner join games on users.game_id = games.game_id where socket_id = $1"
            var values = [socket.id]
            query(text, values, (err, result) => { // postgres database test
                if (err) {
                    console.log(err)
                    return res.status(500).send(err)
                }
                if(result.rowCount == 0){
                    console.log("here")
                    delete players[socket.id];
                    io.emit('disconnect', socket.id);
                    return

                }
                var user = result.rows[0]
                if(user.num_players - 1 == 0){
                    text = "delete from games where game_id = $1;"
                    values = [user.game_id]
                }
                else{
                    //promote another player to being the host of the game while removing the user that wants to leave
                    text = `with a as (delete from users where user_id = $1),
                    b as (select * from users where game_id = $2 and user_id != $1 limit 1),
                    c as (update users set host = true from (select user_id from b) as subquery where users.game_id = $2 and users.user_id = subquery.user_id)
                    update games set num_players = num_players - 1, host = subquery.user_id from (select user_id from b) as subquery 
                    where games.game_id = $2;`
                    values = [user.user_id, user.game_id]
                }
                query(text, values, (err, result) => { // postgres database test
                    if (err) {
                        return console.log(err)
                    }
                    console.log("deleted")
                    
                    delete players[socket.id];
                    //emit a message to all players to remove this player
                    io.emit('disconnect', socket.id);
                    
                })
                
            }) 
        });
    
        // when a plaayer moves, update the player data
        socket.on('playerMovement', function (movementData) {
            //sometimes this data comes in as undefined? bug with phasor.js
            if(typeof movementData.x === 'undefined' || typeof movementData === 'undefined'){
                return
            }
            players[socket.id].x = movementData.x;
            players[socket.id].y = movementData.y;
            players[socket.id].flipX = movementData.flipX;
            // emit a message to all players about the player that moved
            socket.broadcast.emit('playerMoved', players[socket.id]);
        });

        // UNCOMMENT THE BELOW ONCE CLIENT CAN SHOOT BULLETS (SINGLE CLIENT INSTANCE)

        //// when a player shoots, update player information
        // socket.on('playerShooting', function(shootingData) {
        //     if (players[socket.id] == undefined) {
        //         return false;
        //     }
        //     let shot_bullet = shootingData;
        //     shootingData.owner_id = socket.id;
        //     bullets.push(shot_bullet);
        // });

    });
}