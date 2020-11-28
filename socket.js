const query = require("./queryPool");
const waitingQueue = require("./waitingQueue")

// const express = require('express');
// const app = express();
// const http = require('http').Server(app);
// const server_io = require('socket.io')(http);

const players = {};
const projectiles = [];
const kill_multiplier = 10;


exports = module.exports = function(io){
    io.on('connection', function (socket) {
        
        socket.on('new_player', function(data) {
            console.log('new player: ', socket.id);
            text  = `select * from users where user_id = $1 and game_id = $2` // check to see if user in_game already
            values = [data.user_id, data.game_id]
            query(text, values, (err, result) => { 
                if (err) {
                    return console.log(err)
                }
                if(result.rowCount == 0 && data.user_id != -1){
                    var destination = '/';
                    socket.emit('redirect', destination);
                    return
                }
                if(data.user_id != -1){
                    if(result.rows[0].in_game){ // user in game already, redirect to home page
                        var destination = '/';
                        socket.emit('redirect', destination);
                        return
                    }
                }
                
                
                // assign team and starting location 
                var team = "A"; // team A
                var x = 50;
                var y = 20 + (20 * Object.keys(players).length)
                if(Object.keys(players).length % 2 != 0){ // Team B
                    team = "B" 
                    x = 200
                    y = 20 + (20 * (Object.keys(players).length - 1))
                }
            
                
                // create a new player 
                players[socket.id] = {
                    flipX: false,
                    respawn_x: x,
                    respawn_y: y,
                    health: 100,
                    x: x,
                    y: y, // spread out new users
                    playerId: socket.id,
                    team: team,
                    user_id: data.user_id,
                    game_id: data.game_id,
                    username: result.rows[0].username,
                    kills: 0,
                    deaths: 0,
                };
                
                //update database that user is in game now
                text  = `update users set team = $1, socket_id = $2, in_game = true where user_id = $3 and game_id = $4;`
                values = [team, socket.id, data.user_id, data.game_id]
                query(text, values, (err, result) => { 
                    if (err) {
                        return console.log(err)
                    }
                })

                // send the players object to the new player
                
                socket.emit('currentPlayers', players);
                // update all other players of the new player
                socket.broadcast.emit('newPlayer', players[socket.id]);
                io.emit('allPlayerInfo', players); // emit to all players
                

                if(Object.keys(players).length  >= 2){ // enough players, start the game
                    
                    text  = `update games set state = 'started' where game_id = $1;`
                    values = [data.game_id]
                    query(text, values, (err, result) => { // postgres database test
                        if (err) return console.log(err)
                        io.emit('startGame');
                        setTimeout(function(){
                            io.emit('startGameClock'); // wait 5 seconds for countdown then start
                            setTimeout(function(){
                                var team_a_score = 0;
                                var team_b_score = 0;
                                var team_a_top_player = "";
                                var team_b_top_player = "";
                                var team_a_top_score = 0;
                                var team_b_top_score = 0;
                                Object.keys(players).forEach(function (id) {
                                    
                                    if(players[id].team == 'A'){
                                        var player_score = players[id].kills * kill_multiplier
                                        team_a_score += player_score
                                        if(player_score > team_a_top_score){
                                            team_a_top_score = player_score
                                            team_a_top_player = players[id].username
                                        }
                                    }
                                    else{
                                        var player_score = players[id].kills * kill_multiplier
                                        team_b_score += player_score
                                        if(player_score > team_b_top_score){
                                            team_b_top_score = player_score
                                            team_b_top_player = players[id].username
                                        }
                                    } 
                                })
                                
                                text  = `update games set state = 'finished', team_a_score = $2, team_a_top_player = $3, team_a_top_score = $4, 
                                team_b_score = $5, team_b_top_player = $6, team_b_top_score = $7 where game_id = $1;`
                                values = [data.game_id, team_a_score, team_a_top_player, team_a_top_score, team_b_score, team_b_top_player, team_b_top_score]
                                query(text, values, (err, result) => { 
                                    if (err) return console.log(err)
                                    io.emit('endGame', players);
                                    
                                })
                            }, 10000)
                        }, 5000)
                        
                    })
                    
                    
                }
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
                
                user = result.rows[0]
                if(user.state == "finished"){ // game finished, dont remove user from db
                    waitingQueue.deQueue()
                    console.log("finished")
                    delete players[socket.id];
                    socket.broadcast.emit('allPlayerInfo', players);
                    //emit a message to all players to remove this player
                    io.emit('disconnect', socket.id);
                    return
                }
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
                    if(user.state == "waiting"){ // game hasnt started, remove from queue
                        waitingQueue.deQueue()
                    }
                    
                    delete players[socket.id];
                    socket.broadcast.emit('allPlayerInfo', players);
                    //emit a message to all players to remove this player
                    io.emit('disconnect', socket.id);
                    
                })
                
            }) 
        });
    
        // when a plaayer moves, update the player data
        socket.on('playerMovement', function (movementData) {
            //sometimes this data comes in as undefined? bug with phasor.js
            if(typeof movementData.x === 'undefined' || typeof movementData.y === 'undefined'){
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

                        
                        players[player_id].health -= 20;


                        io.emit('playerDamaged', players[player_id]);


                        if (players[player_id].health <= 0) {
                            players[cur_projectile.player].kills += 1;
                            players[player_id].deaths += 1;
                            players[player_id].x = players[player_id].respawn_x;
                            players[player_id].y = players[player_id].respawn_y;
                            players[player_id].health = 100;
                            io.emit('updateLeaderboard', killData)
                            console.log("player killed!");
                        }

                        io.emit('allPlayerInfo', players);
                        
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
