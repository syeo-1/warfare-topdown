const express = require('express');
const router = express.Router();
const query = require("../queryPool");
const waitingQueue = require("../waitingQueue")

router.post('/add_new_user', function (req, res) {
    var size = waitingQueue.getSize()
    if(size >= 2){ // make 4
        return res.status(200).send({success: false, error: "Waiting Queue Full, Please come back later."})
    }
    
    text = `begin;
    select * from users where username = '${req.body.username}';
    select * from games where num_players <= 4 and state = 'waiting';
    end;`;
    values = [];
    console.log(req.body.username)
    query(text, values, (err, result) => { 
        if (err) {
            console.log(err)
            return res.status(500).send(err)
        }
        if(result[1].rowCount > 0){
            return res.status(200).send({success: false, error: "Username already in use"})
        }
       
        game_id = null;
        game_exists = false;
        if(result[2].rowCount > 0){
            game_id = result[2].rows[0].game_id
            game_exists = true
        }
        
        text = `insert into users (username) values($1) returning *;`;
        values = [req.body.username]


        query(text, values, (err, result) => { 
            if (err) {
                console.log(err)
                return res.status(500).send(err)
            }
            user_id = result.rows[0].user_id
            if(game_exists){ // game available, add user to it
                text = `update users set game_id = $1 where user_id = $2 returning *;`;
                values = [game_id, user_id]
            }
            else{ // create a new game
                
                text = `with a as(update users set host = true where user_id = $1)
                insert into games (host) values($1) returning *;`;
                values = [user_id]
            }

            query(text, values, (err, result) => { // postgres database test
                if (err) {
                    console.log(err)
                    return res.status(500).send(err)
                }
                if(!game_exists){
                    game_id = result.rows[0].game_id
                }
                text = `with a as (update users set game_id = $1 where user_id = $2),
                b as (update games set num_players = num_players + 1 where game_id = $1)
                select num_players from games where game_id = $1`;
                values = [game_id, user_id]
                query(text, values, (err, result) => { // postgres database test
                    if (err) {
                        console.log(err)
                        return res.status(500).send(err)
                    }
                    waitingQueue.enQueue(user_id);
                    res.status(200).send({success: true, error: "", game_id: game_id, user_id: user_id})
                }) 
            })  
        })    
    })  
});


module.exports = router;