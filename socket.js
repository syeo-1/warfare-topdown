const query = require("./queryPool");
const waitingQueue = require("./waitingQueue")

const players = {};
const bullets = [];

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
                if(result.rowCount == 0){
                    var destination = '/';
                    socket.emit('redirect', destination);
                    return
                }
                if(result.rows[0].in_game){ // user in game already, redirect to home page
                    var destination = '/';
                    socket.emit('redirect', destination);
                    return
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
                    x: x,
                    y: y, // spread out new users
                    playerId: socket.id,
                    team: team,
                    user_id: data.user_id,
                    game_id: data.game_id,
                    username: result.rows[0].username
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
                socket.broadcast.emit('allPlayerInfo', players); // emit to all others
                socket.emit('allPlayerInfo', players); // emit to self

                if(Object.keys(players).length  >= 2){ // enough players, start the game
                    
                    text  = `update games set state = 'started' where game_id = $1;`
                    values = [data.game_id]
                    query(text, values, (err, result) => { // postgres database test
                        if (err) return console.log(err)
                        socket.broadcast.emit('startGame');
                        socket.emit('startGame');
                        setTimeout(function(){
                            text  = `update games set state = 'finished' where game_id = $1;`
                            values = [data.game_id]
                            query(text, values, (err, result) => { // postgres database test
                                if (err) return console.log(err)
                                socket.broadcast.emit('endGame');
                                socket.emit('endGame')
                            })
                        }, 20000)
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

        // when a player shoots, update bullet information
        socket.on('playerShooting', function(shootingData) {
            let projectile = shootingData;
            shootingData.player = socket.id;
            bullets.push(projectile);
        });

    });
}

function check_proj_collisions() {
    // update all projectile information in map
    for (let i = 0 ; i < projectiles.length ; i++) {
        // re-render each bullet based on its speed
        let cur_projectile = projectiles[i];
        cur_projectile.sprite.x += cur_projectile.x_velo; 
        cur_projectile.sprite.y += cur_projectile.y_velo; 
   
        // remove the bullet if it has traveled for 0.75 seconds (750ms) or it's at boundaries of the map
        let date = new Date();
        let cur_time = date.getTime();
        // console.log("curtime: " + cur_time.toString());
        let destroy_time = cur_time-cur_projectile.fire_time;
        if (destroy_time >= 750 || 
         cur_projectile.sprite.x <= 0 || cur_projectile.sprite.x >= 480 ||
         cur_projectile.sprite.y <= 0 || cur_projectile.sprite.y >= 480) {
          //  console.log(destroy_time);
           cur_projectile.sprite.destroy();
           projectiles.splice(i,1);
           i--;
        }
    }
}