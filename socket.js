const sql = require("./SQL_strings");
const query = require("./queryPool");

// const express = require('express');
// const app = express();
// const http = require('http').Server(app);
// const server_io = require('socket.io')(http);

const players = {};
const projectiles = [];

let red_killcount = 0;
let blue_killcount = 0;

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
                
                
                
                if(Object.keys(players).length  >= 4){ // need to create new game here
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
                    respawn_x: x,
                    respawn_y: y,
                    x: x,
                    y: y, // spread out new users
                    playerId: socket.id,
                    team: team,
                    user_id: data.user_id,
                    game_id: data.game_id
                };
                

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

        // when a player shoots, update projectile array info
        socket.on('playerShooting', function(shootingData) {
            if (players[socket.id] == undefined) {
                console.log("player id undefined");
                return;
            }
            // console.log("bullet received");
            // console.log(shootingData);
            let projectile = shootingData;
            shootingData.player = socket.id;// to ensure player shooting bullet isn't damaged by own bullet
            projectiles.push(projectile);
        });



    });
    function check_proj_collisions() {
        // update all projectile information in map
        // console.log("hello world");
        for (let i = 0 ; i < projectiles.length ; i++) {
            // console.log(projectiles[i]);
            // re-render each bullet based on its speed
            let cur_projectile = projectiles[i];
            
            cur_projectile.x += cur_projectile.x_velo; 
            cur_projectile.y += cur_projectile.y_velo;

            let player_damaged = false;

            for (let player_id in players) {
                if (cur_projectile.player != player_id) {
                    let player_to_bullet_x = players[player_id].x - cur_projectile.x;
                    let player_to_bullet_y = players[player_id].y - cur_projectile.y;

                    let scaler_dist = Math.sqrt((player_to_bullet_x ** 2) + (player_to_bullet_y ** 2));
                    // console.log(scaler_dist);
                    if (scaler_dist < 10) {
                        killData = {
                            'shooter': players[cur_projectile.player],
                            'killed': players[player_id]
                        }
                        io.emit('playerDamaged', players[player_id]);
                        io.emit('updateLeaderBoard', killData)
                        player_damaged = true;
                    }
                }
            }
       
            // remove the bullet if it has traveled for 0.75 seconds (750ms) or it's at boundaries of the map
            // or... the bullet has hit a person
            let date = new Date();
            let cur_time = date.getTime();
            // console.log("curtime: " + cur_time.toString());
            let destroy_time = cur_time-cur_projectile.fire_time;
            if (destroy_time >= 750 || 
             cur_projectile.x <= 0 || cur_projectile.x >= 480 ||
             cur_projectile.y <= 0 || cur_projectile.y >= 480 ||
             player_damaged) {
               //  console.log(destroy_time);
               //    cur_projectile.sprite.destroy();
               projectiles.splice(i,1);
               i--;
            }
        }
        // console.log("poop");
        io.emit('updateProjectiles', projectiles);
        // console.log("stinky")
    }

    setInterval(check_proj_collisions, 16);

}

// function check_proj_collisions() {
//     // update all projectile information in map
//     // console.log("hello world");
//     for (let i = 0 ; i < projectiles.length ; i++) {
//         // console.log(projectiles[i]);
//         // re-render each bullet based on its speed
//         let cur_projectile = projectiles[i];
//         cur_projectile.x += cur_projectile.x_velo; 
//         cur_projectile.y += cur_projectile.y_velo;
   
//         // remove the bullet if it has traveled for 0.75 seconds (750ms) or it's at boundaries of the map
//         let date = new Date();
//         let cur_time = date.getTime();
//         // console.log("curtime: " + cur_time.toString());
//         let destroy_time = cur_time-cur_projectile.fire_time;
//         if (destroy_time >= 750 || 
//          cur_projectile.x <= 0 || cur_projectile.x >= 480 ||
//          cur_projectile.y <= 0 || cur_projectile.y >= 480) {
//            //  console.log(destroy_time);
//            //    cur_projectile.sprite.destroy();
//            projectiles.splice(i,1);
//            i--;
//         }
//     }
//     console.log("poop");
//     server_io.emit('updateProjectiles', projectiles);
//     console.log("stinky")
// }

// setInterval(check_proj_collisions, 16);