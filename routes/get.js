const express = require('express');
const router = express.Router();
const query = require("../database/queryPool");




router.get('/', function (req, res) {
  var user_id = parseInt(req.query.user_id)
  var game_id = parseInt(req.query.game_id)
  
  if(!Number.isInteger(user_id) || !Number.isInteger(game_id)){
    return res.render('./index.html');
  }
  
  text = `with a as (select user_id from users inner join games on users.game_id = games.game_id where user_id = $1 and users.game_id = $2 and state = 'finished')
  delete from users where user_id in (select * from a)`;
  values = [user_id, game_id];
  query(text, values, (err, result) => {
    if (err) return res.status(500).send(err)
    res.render('./index.html');
  })
});


router.get('/game', function (req, res) {
  var user_id = parseInt(req.query.user_id)
  var game_id = parseInt(req.query.game_id)
  
  if(!Number.isInteger(user_id) || !Number.isInteger(game_id)){
    console.log("nan")
    return res.render('./index.html');
  }

  text = "select * from users where user_id = $1 and game_id = $2";
  values = [user_id, game_id];
  query(text, values, (err, result) => { // postgres database test
    if (err) return res.status(500).send(err)
    if(result.rowCount > 0){ // user and game exists, admit to game
      
      if(result.rows[0].in_game){
        res.render('./index.html', { root: null});
      }
      else{
        res.render('./game.html', { user_id: req.query.user_id, game_id: req.query.game_id, host: result.rows[0].host});
      }
      
    }
    else{ // user or game DNE
      res.render('./index.html', { root: null});
    }
  }) 
});


router.get('/post_game', function (req, res) {
  var user_id = parseInt(req.query.user_id)
  var game_id = parseInt(req.query.game_id)
  
  if(!Number.isInteger(user_id) || !Number.isInteger(game_id)){
    console.log("nan")
    return res.render('./index.html');
  }
  
  text = "select * from game_stats inner join games on game_stats.game_id = games.game_id where games.game_id = $1 and state = 'finished';"
  values = [game_id];
  query(text, values, (err, result) => { // postgres database test
    if (err) return res.status(500).send(err)
    if(result.rowCount > 0){ // user and game exists
      console.log(result.rows)
      res.render('./post_game.html', { user_id: req.query.user_id, game_id: req.query.game_id, result: result.rows});
    }
    else{ // user or game DNE
      res.render('./index.html', { root: null});
    }
  }) 
});




module.exports = router;