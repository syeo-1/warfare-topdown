const query = require("../database/queryPool");
const waitingQueue = require("../helpers/waitingQueue")

const players = {};
const projectiles = [];
const kill_multiplier = 10;

let barrier_locations = [
    {x:125, y:0},
    {x:125, y:30},
    {x:125, y:50},
    {x:125, y:70},
    {x:125, y:90},
    {x:125, y:110},
    {x:125, y:130},
    {x:125, y:150},
    {x:125, y:170},
    {x:125, y:190},
    {x:145, y:190},
    {x:165, y:190},
    {x:185, y:190},
    {x:205, y:190},
    {x:225, y:190},
    {x:245, y:190},
    {x:265, y:190},
    {x:285, y:190},
    {x:305, y:190},
    {x:325, y:190},
    
    // team barriers
    {x:125, y:300},
    {x:125, y:320},
    {x:125, y:340},
    {x:400, y:300},
    {x:400, y:320},
    {x:400, y:340},

    // barrier scatterings
    {x:260, y: 265},
    {x:260, y: 370},
    {x:193, y: 420},
    {x:330, y: 420},
];

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
                    socket_id: socket.id,
                    user_id: data.user_id,
                    game_id: data.game_id,
                    username: result.rows[0].username,
                    flipX: false,
                    respawn_x: x,
                    respawn_y: y,
                    health: 100,
                    x: x,
                    y: y, // spread out new users
                    team: team,
                    kills: 0,
                    deaths: 0,
                    key_pressed: ""
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
                

                if(Object.keys(players).length  >= 4){ // enough players, start the game, // make 4
                    
                    text  = `update games set state = 'started' where game_id = $1;`
                    values = [data.game_id]
                    query(text, values, (err, result) => { 
                        if (err) return console.log(err)
                        io.emit('startGame');
                        setTimeout(function(){
                            io.emit('startGameClock'); // wait 5 seconds for countdown then start
                            setTimeout(function(){
                                query("BEGIN", [], async (err, result) => { 
                                    if (err) return console.log(err)
                                    var team_a_score = 0;
                                    var team_b_score = 0;
                                    var team_a_top_player = "";
                                    var team_b_top_player = "";
                                    var team_a_top_score = 0;
                                    var team_b_top_score = 0;
                                    var promiseArray = []
                                    
                                    for(var id in players){
                                        
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
                                        
                                        var p = await new Promise((resolve) => {
                                            text = `with a as(insert into game_stats (user_id, username, kills, deaths, game_id, team) values ($1, $2, $3, $4, $5, $6))
                                            delete from users where user_id = $1;`
                                            values = [players[id].user_id, players[id].username, players[id].kills, players[id].deaths, players[id].game_id, players[id].team]
                                            query(text, values, (err, result) => { 
                                                if (err) return console.log(err) 
                                                resolve(id)               
                                            })
                                            
                                        })
                                        promiseArray.push(p)
                                        
                                    }
                                    Promise.all(promiseArray).then(vals => {
                                        text  = `update games set state = 'finished', team_a_score = $2, team_a_top_player = $3, team_a_top_score = $4, 
                                        team_b_score = $5, team_b_top_player = $6, team_b_top_score = $7 where game_id = $1;`
                                        values = [data.game_id, team_a_score, team_a_top_player, team_a_top_score, team_b_score, team_b_top_player, team_b_top_score]
                                        query(text, values, (err, result) => { 
                                            if (err) return console.log(err)

                                            query("END", [], (err, result) => { 
                                                if (err) return console.log(err)
                                                io.emit('endGame', players);
                                                waitingQueue.clear()

                                            })
                                        })
                                        
                                    })
                                })
                            }, 240000) // set to 4:00
                        }, 10000) // set to 0:10
                        
                    })
                    
                    
                }
            })
        
            
        });
        // when a player disconnects, remove them from our players object
        socket.on('disconnect', function () {
            console.log('user disconnected: ', socket.id);
            var text = "select * from users inner join games on users.game_id = games.game_id where socket_id = $1"
            var values = [socket.id]
            query(text, values, (err, result) => { 
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
                query(text, values, (err, result) => { 
                    if (err) {
                        return console.log(err)
                    }

                    console.log("deleted")
                    if(user.state == "waiting"){ // game hasnt started, remove from queue
                        waitingQueue.deQueue()
                    }
                    
                    //delete players[socket.id];
                    socket.broadcast.emit('allPlayerInfo', players);
                    //emit a message to all players to remove this player
                    io.emit('disconnect', socket.id);


                    var num_players_A = 0
                    var num_players_B = 0
                    for(var id in players){
                        if(players[id].team == 'A'){
                            num_players_A++
                        }
                        else if(players[id].team == 'B'){
                            num_players_B++
                        }
                    }

                    if(num_players_A == 0 || num_players_B == 0){
                        query("BEGIN", [], async (err, result) => { 
                            if (err) return console.log(err)
                            var team_a_score = 0;
                            var team_b_score = 0;
                            var team_a_top_player = "";
                            var team_b_top_player = "";
                            var team_a_top_score = 0;
                            var team_b_top_score = 0;
                            var promiseArray = []
                            
                            for(var id in players){
                                
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
                                
                                var p = await new Promise((resolve) => {
                                    text = `with a as(insert into game_stats (user_id, username, kills, deaths, game_id, team) values ($1, $2, $3, $4, $5, $6))
                                    delete from users where user_id = $1;`
                                    values = [players[id].user_id, players[id].username, players[id].kills, players[id].deaths, players[id].game_id, players[id].team]
                                    query(text, values, (err, result) => { 
                                        if (err) return console.log(err) 
                                        resolve(id)               
                                    })
                                    
                                })
                                promiseArray.push(p)
                                
                            }
                            Promise.all(promiseArray).then(vals => {
                                text  = `update games set state = 'finished', team_a_score = $2, team_a_top_player = $3, team_a_top_score = $4, 
                                team_b_score = $5, team_b_top_player = $6, team_b_top_score = $7 where game_id = $1;`
                                values = [players[id].game_id, team_a_score, team_a_top_player, team_a_top_score, team_b_score, team_b_top_player, team_b_top_score]
                                query(text, values, (err, result) => { 
                                    if (err) return console.log(err)

                                    query("END", [], (err, result) => { 
                                        if (err) return console.log(err)
                                        io.emit('endGame', players);
                                        waitingQueue.clear()

                                    })
                                })
                                
                            })
                        })
                    }
                    
                })
                
            }) 
        });
    
        // when a plaayer moves, update the player data
        socket.on('playerMovement', function (movementData) {
            //sometimes this data comes in as undefined? bug with phasor.js
            
            if(typeof players[socket.id] === 'undefined'){
                return
            }
            players[socket.id].x = movementData.x;
            players[socket.id].y = movementData.y;
            players[socket.id].flipX = movementData.flipX;
            players[socket.id].key_pressed = movementData.key_pressed;
            // emit a message to all players about the player that moved
            socket.broadcast.emit('playerMoved', players[socket.id]);
        });

        // when a player shoots, update projectile array info
        socket.on('playerShooting', function(shootingData) {
            if (players[socket.id] == undefined) {
                console.log("player id undefined");
                return;
            }
            
            let projectile = shootingData;
            shootingData.player = socket.id;// to ensure player shooting bullet isn't damaged by own bullet
            projectiles.push(projectile);
        });



    });

    function check_proj_collisions() {
        // update all projectile information in map
        for (let i = 0 ; i < projectiles.length ; i++) {
            // re-render each bullet based on its speed
            let cur_projectile = projectiles[i];
            
            cur_projectile.x += cur_projectile.x_velo; 
            cur_projectile.y += cur_projectile.y_velo;

            let player_damaged = false;

            // remove the bullet if it's too near a barrier
            for (let j = 0 ; j < barrier_locations.length ; j++) {
                let barrier_to_proj_x = barrier_locations[j].x - cur_projectile.x;
                let barrier_to_proj_y = barrier_locations[j].y - cur_projectile.y;

                let scaler_dist = Math.sqrt((barrier_to_proj_x ** 2) + (barrier_to_proj_y ** 2));

                if (scaler_dist < 10) {
                    // remove the projectile
                    projectiles.splice(i,1);
                }
            }

            for (let player_id in players) {
                if (cur_projectile.player != player_id) {
                    let player_to_bullet_x = players[player_id].x - cur_projectile.x;
                    let player_to_bullet_y = players[player_id].y - cur_projectile.y;

                    let scaler_dist = Math.sqrt((player_to_bullet_x ** 2) + (player_to_bullet_y ** 2));
                    if (scaler_dist < 10) {
                        killData = {
                            'shooter': players[cur_projectile.player],
                            'killed': players[player_id]
                        }

                        
                        players[player_id].health -= 20;

                        if(players[player_id].team == players[cur_projectile.player].team){ // target and shooter on same team, ignore
                            return
                        }
                        io.emit('playerDamaged', players[player_id], players[cur_projectile.player]);


                        if (players[player_id].health <= 0) {
                            players[cur_projectile.player].kills += 1;
                            io.emit('kill', players[cur_projectile.player], players[player_id].username);
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

            
       
            // remove the bullet if it has traveled for 0.75 seconds (750ms), it's at boundaries of the map, or the bullet has hit a person
            let date = new Date();
            let cur_time = date.getTime();
            let destroy_time = cur_time-cur_projectile.fire_time;
            if (destroy_time >= 750 || 
             cur_projectile.x <= 0 || cur_projectile.x >= 480 ||
             cur_projectile.y <= 0 || cur_projectile.y >= 480 ||
             player_damaged) {
               projectiles.splice(i,1);
               i--;
            }
        }
        io.emit('updateProjectiles', projectiles);
    }

    setInterval(check_proj_collisions, 16);

}

